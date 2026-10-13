// Droits : ce que chaque rôle peut lire et écrire, vérifié sous de vraies sessions (RLS).
import { DEMO, FIFI, OWNER, VIEWER, admin, anon, mark, signIn } from './helpers'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

describe('droits', () => {
    let owner: Awaited<ReturnType<typeof signIn>>, viewer: Awaited<ReturnType<typeof signIn>>
    let reservation: { id: string; internal_note: string | null }
    const tag = mark('acces')

    before(async () => {
        owner = await signIn(OWNER)
        viewer = await signIn(VIEWER)
        const { data } = await admin.from('reservations').select('id, internal_note').eq('business_id', FIFI.id).limit(1).single()
        reservation = data!
    })
    after(async () => {
        await admin.from('customers').delete().eq('first_name', tag)
        await admin.from('reservations').delete().eq('guest_name', tag)
        await owner.close()
        await viewer.close()
    })

    it('un lecteur ne voit que son commerce, même dans la même agence', async () => {
        const { data: businesses } = await viewer.client.from('businesses').select('id')
        assert.deepEqual(businesses?.map((b) => b.id), [FIFI.id])
        const { data: others } = await admin.from('businesses').select('id').eq('agency_id', FIFI.agency_id).neq('id', FIFI.id)
        for (const b of others ?? []) {
            const { data } = await viewer.client.from('customers').select('id').eq('business_id', b.id)
            assert.equal(data?.length, 0, `clients du commerce ${b.id}`)
        }
    })

    it('un lecteur lit mais n\'écrit pas', async () => {
        const read = await viewer.client.from('reservations').select('id').eq('business_id', FIFI.id)
        assert.ok((read.data?.length ?? 0) > 0)
        const update = await viewer.client.from('reservations').update({ internal_note: reservation.internal_note }).eq('id', reservation.id).select('id')
        assert.equal(update.data?.length ?? 0, 0, 'modification d\'une réservation')
        const insert = await viewer.client.from('customers').insert({ business_id: FIFI.id, first_name: tag, source: 'manual' }).select('id')
        assert.ok(insert.error, 'création d\'un client')
    })

    it('un lecteur ne peut ni s\'attribuer un plan ni lire la numérotation', async () => {
        const { data: plan } = await admin.from('business_plans').select('plan_id').eq('business_id', FIFI.id).limit(1).single()
        const insert = await viewer.client.from('business_plans').insert({ business_id: FIFI.id, agency_id: FIFI.agency_id, plan_id: plan!.plan_id, status: 'cancelled' }).select('id')
        assert.ok(insert.error)
        assert.ok((await viewer.client.from('document_sequences').select('*')).error)
    })

    it('le propriétaire écrit dans son commerce', async () => {
        const update = await owner.client.from('reservations').update({ internal_note: reservation.internal_note }).eq('id', reservation.id).select('id')
        assert.equal(update.data?.length, 1)
    })

    it('personne ne modifie son email, son statut, ni le profil d\'un autre', async () => {
        assert.equal((await viewer.client.from('profiles').update({ email: OWNER }).eq('id', viewer.userId).select('id')).error?.code, '42501')
        assert.equal((await viewer.client.from('profiles').update({ status: 'invited' }).eq('id', viewer.userId).select('id')).error?.code, '42501')
        assert.equal((await viewer.client.from('profiles').update({ first_name: 'x' }).eq('id', owner.userId).select('id')).data?.length ?? 0, 0)
    })

    it('les jetons d\'intégration sont illisibles sous une session', async () => {
        assert.ok((await owner.client.from('business_integrations').select('*')).error)
        assert.ok((await owner.client.from('google_connexions').select('*')).error)
    })

    it('un visiteur anonyme lit la vitrine mais n\'insère rien directement', async () => {
        const visitor = anon()
        assert.equal((await visitor.from('businesses').select('id, name').eq('id', FIFI.id)).data?.length, 1)
        assert.ok((await visitor.from('menu_items').select('id').eq('business_id', FIFI.id)).data)
        assert.ok((await visitor.from('reservations').insert({ business_id: FIFI.id, starts_at: new Date(Date.now() + 864e5).toISOString(), party_size: 2, guest_name: tag })).error, 'réservation')
        assert.ok((await visitor.from('customers').insert({ business_id: FIFI.id, first_name: tag, source: 'form' })).error, 'client')
        assert.equal((await visitor.from('invitations').select('id')).data?.length ?? 0, 0)
        assert.ok((await visitor.rpc('enabled_modules', { p_business: DEMO.id })).error, 'fonction d\'accès')
    })
})
