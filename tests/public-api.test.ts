// API publique : ce qu'un site client peut envoyer, et ce qui est refusé. Demande un serveur local.
import { BASE, DEMO, admin, mark, serverUp } from './helpers'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

describe('API publique des réservations', () => {
    const tag = mark('api')
    const email = `${tag}@vwa.local`
    // Adresse IP propre à ce test : son compteur de débit ne gêne personne.
    const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`
    const body = (extra: object = {}) => JSON.stringify({ business_id: DEMO.id, customer: { first_name: tag, last_name: 'Web', email: email.toUpperCase() }, booking_details: { starts_at: '2032-06-01T19:30:00+02:00', party_size: 2 }, ...extra })
    const post = (payload: string, origin?: string) => fetch(`${BASE}/api/v1/public/reservations`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(origin ? { origin } : {}) }, body: payload })

    after(async () => {
        const { data: customers } = await admin.from('customers').select('id').eq('business_id', DEMO.id).eq('email', email)
        const { data: reservations } = await admin.from('reservations').select('id').eq('business_id', DEMO.id).eq('guest_name', `${tag} Web`)
        const ids = (reservations ?? []).map((r) => r.id)
        if (ids.length) {
            await admin.from('outbound_messages').delete().in('reservation_id', ids)
            await admin.from('reservations').delete().in('id', ids)
        }
        if (customers?.length) await admin.from('customers').delete().in('id', customers.map((c) => c.id))
        await admin.from('api_rate_limits').delete().like('key', `pub:ip:${ip}:%`)
        await admin.from('businesses').update({ allowed_origins: null }).eq('id', DEMO.id)
    })

    it('crée la réservation et un seul client, refuse le reste', async (t) => {
        if (!(await serverUp())) return t.skip(`aucun serveur sur ${BASE}`)

        const created = await post(body(), 'https://un-site.example')
        assert.equal(created.status, 201)
        assert.ok((await created.json()).reservation_id)
        assert.equal((await post(body())).status, 201, 'seconde demande du même client')
        const { data: customers } = await admin.from('customers').select('email').eq('business_id', DEMO.id).eq('email', email)
        assert.equal(customers?.length, 1, 'un seul client, email en minuscules')

        assert.equal((await post(body({ business_id: '00000000-0000-0000-0000-000000000000' }))).status, 404, 'commerce inconnu')
        const invalid = await post(body({ booking_details: { starts_at: 'demain', party_size: 0 } }))
        assert.equal(invalid.status, 400)
        assert.ok((await invalid.json()).details)

        // Limite de débit : on pose le compteur à sa limite plutôt que d'envoyer dix demandes.
        await admin.from('api_rate_limits').update({ count: 10 }).like('key', `pub:ip:${ip}:%`)
        const limited = await post(body())
        assert.equal(limited.status, 429)
        assert.ok(limited.headers.get('retry-after'))
        await admin.from('api_rate_limits').delete().like('key', `pub:ip:${ip}:%`)

        // Origine : une fois un site déclaré, les autres origines sont refusées.
        await admin.from('businesses').update({ allowed_origins: ['https://mon-site.example'] }).eq('id', DEMO.id)
        assert.equal((await post(body(), 'https://pirate.example')).status, 403)
        assert.equal((await post(body(), 'https://mon-site.example')).status, 201)
    })
})
