// Messages automatiques : confirmation, rappels, et SMS réservés aux commerces dont l'offre en inclut.
import { DEMO, admin, mark } from './helpers'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { sendReservationConfirmation, sendReservationReminders } from '../lib/v2/notifications'
import { setSmsAddon } from '../lib/v2/admin'
import { getAllowance, recordUsage } from '../lib/v2/usage'
import { writeModuleSetting, readModuleSettings } from '../lib/v2/data/module-settings'

describe('messages automatiques', () => {
    const tag = mark('messages')
    // Dates lointaines : la fenêtre des rappels ne contient que les réservations de ce test.
    const STARTS = '2032-05-10T12:00:00Z'
    const EVE = new Date('2032-05-09T12:00:00Z')
    let customerId: string
    let settingsBefore: Awaited<ReturnType<typeof readModuleSettings>>
    const reservationIds: string[] = []

    async function reservation() {
        const { data, error } = await admin.from('reservations').insert({ business_id: DEMO.id, customer_id: customerId, guest_name: tag, starts_at: STARTS, party_size: 2, status: 'confirmed', source: 'dashboard' }).select('id').single()
        if (error) throw error
        reservationIds.push(data.id)
        return data.id
    }
    const smsUsed = async () => (await getAllowance(admin, DEMO.id, 'sms', EVE)).used

    before(async () => {
        settingsBefore = await readModuleSettings(admin, DEMO.id, 'reservations')
        const { data, error } = await admin.from('customers').insert({ business_id: DEMO.id, first_name: tag, email: `${tag}@vwa.local`, phone: '0612345678', source: 'manual' }).select('id').single()
        if (error) throw error
        customerId = data.id
        // Le commerce demande des SMS de rappel.
        await writeModuleSetting(admin, DEMO.id, 'reservations', 'notifications', { confirmation_email: true, reminder_email: true, reminder_sms: true, notify_business: true })
    })
    after(async () => {
        if (reservationIds.length) {
            await admin.from('outbound_messages').delete().in('reservation_id', reservationIds)
            await admin.from('reservations').delete().in('id', reservationIds)
        }
        await admin.from('usage_events').delete().like('idempotency_key', `${tag}%`)
        await admin.from('business_addons').delete().eq('business_id', DEMO.id).eq('meter', 'sms')
        await admin.from('customers').delete().eq('id', customerId)
        const { data: mod } = await admin.from('modules').select('id').eq('slug', 'reservations').single()
        await admin.from('business_module_settings').update({ settings: settingsBefore as never }).eq('business_id', DEMO.id).eq('module_id', mod!.id)
    })

    it('la confirmation est composée une fois, journalisée, jamais renvoyée', async () => {
        const id = await reservation()
        assert.equal(await sendReservationConfirmation(admin, id), 'failed', 'sans clé d\'envoi')
        assert.equal(await sendReservationConfirmation(admin, id), 'skipped', 'second appel')
        const { data } = await admin.from('outbound_messages').select('template, to_address').eq('reservation_id', id)
        assert.deepEqual(data, [{ template: 'reservation_confirmation', to_address: `${tag}@vwa.local` }])
    })

    it('les rappels ne traitent que la veille, une seule fois', async () => {
        const id = await reservation()
        assert.equal((await sendReservationReminders(admin, new Date('2032-05-07T12:00:00Z'))).reservations, 0, 'trois jours avant')
        const run = await sendReservationReminders(admin, EVE)
        assert.ok(run.reservations >= 1)
        assert.ok((await admin.from('reservations').select('reminder_sent_at').eq('id', id).single()).data!.reminder_sent_at)
        assert.equal((await sendReservationReminders(admin, EVE)).reservations, 0, 'second passage')
    })

    it('sans SMS dans son offre, un commerce n\'en envoie aucun, même s\'il les a activés', async () => {
        await setSmsAddon(admin, DEMO.id, 0)
        assert.equal((await getAllowance(admin, DEMO.id, 'sms', EVE)).limit, 0)
        const id = await reservation()
        const run = await sendReservationReminders(admin, EVE)
        assert.equal(run.sms, 0)
        assert.ok(run.smsSkipped >= 1)
        const { data } = await admin.from('outbound_messages').select('channel').eq('reservation_id', id)
        assert.ok(!data?.some((m) => m.channel === 'sms'), 'aucun SMS tenté')
    })

    it('avec une option SMS, le rappel est tenté ; le quota mensuel le borne', async () => {
        await setSmsAddon(admin, DEMO.id, 2)
        assert.deepEqual(await getAllowance(admin, DEMO.id, 'sms', EVE), { limit: 2, used: 0, remaining: 2 })
        const id = await reservation()
        const run = await sendReservationReminders(admin, EVE)
        assert.equal(run.smsSkipped, 0)
        const { data } = await admin.from('outbound_messages').select('channel, status, to_address').eq('reservation_id', id).eq('channel', 'sms')
        // Sans jeton Twilio, le SMS est tenté puis marqué en échec : il n'est donc pas compté.
        assert.deepEqual(data, [{ channel: 'sms', status: 'failed', to_address: '+33612345678' }])
        assert.equal(await smsUsed(), 0, 'un SMS en échec ne consomme pas le quota')

        // Quota atteint : deux SMS comptés ce mois-là, le suivant n'est pas tenté.
        for (const n of [1, 2]) await admin.from('usage_events').insert({ business_id: DEMO.id, agency_id: DEMO.agency_id, meter: 'sms', event_type: 'test', quantity: 1, idempotency_key: `${tag}-${n}`, created_at: '2032-05-02T10:00:00Z' })
        assert.equal((await getAllowance(admin, DEMO.id, 'sms', EVE)).remaining, 0)
        await reservation()
        assert.ok((await sendReservationReminders(admin, EVE)).smsSkipped >= 1)
    })

    it('une consommation n\'est comptée qu\'une fois', async () => {
        const before = await smsUsed()
        const key = `${tag}-double`
        await admin.from('usage_events').delete().eq('idempotency_key', key)
        for (let i = 0; i < 2; i++) await recordUsage(admin, { businessId: DEMO.id, agencyId: DEMO.agency_id, meter: 'sms', eventType: 'test', idempotencyKey: key })
        const { count } = await admin.from('usage_events').select('id', { count: 'exact', head: true }).eq('idempotency_key', key)
        assert.equal(count, 1)
        assert.ok((await getAllowance(admin, DEMO.id, 'sms')).used >= before)
    })
})
