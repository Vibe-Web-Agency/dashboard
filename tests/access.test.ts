// Droits : ce que chaque rôle peut lire et écrire, vérifié sous de vraies sessions (RLS).
import { DEMO, FIFI, OWNER, VIEWER, admin, anon, mark, signIn } from './helpers'
import { addCustomerNote, getCustomerDetail, setCustomerTags } from '../lib/v2/data/customers'
import { NotAllowedError } from '../lib/v2/data/errors'
import { claimGooglePlace } from '../lib/v2/google-places'
import { resetGoogleListing } from '../lib/v2/admin'
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

    it('notes et étiquettes d\'un client : le propriétaire écrit, le lecteur lit seulement', async () => {
        const { data: customer } = await admin.from('customers').insert({ business_id: FIFI.id, first_name: tag, source: 'manual' }).select('id').single()
        await addCustomerNote(owner.client, FIFI.id, customer!.id, '  préfère la terrasse  ', owner.userId)
        await setCustomerTags(owner.client, FIFI.id, customer!.id, ['VIP', 'vip', ' Terrasse '])
        const seen = await getCustomerDetail(viewer.client, FIFI.id, customer!.id)
        assert.deepEqual(seen?.notes.map((n) => n.content), ['préfère la terrasse'])
        assert.deepEqual(seen?.customer.tags, ['VIP', 'Terrasse'])
        await assert.rejects(addCustomerNote(viewer.client, FIFI.id, customer!.id, 'x', viewer.userId), NotAllowedError)
        await assert.rejects(setCustomerTags(viewer.client, FIFI.id, customer!.id, []), NotAllowedError)
        // Une note ne se rattache pas au client d'un autre commerce.
        await assert.rejects(addCustomerNote(owner.client, DEMO.id, customer!.id, 'x', owner.userId), NotAllowedError)
    })

    it('la fiche Google ne se relie qu\'une fois ; seule l\'agence la délie', async () => {
        const { data: before } = await admin.from('businesses').select('gbp_place_id').eq('id', DEMO.id).single()
        await admin.from('businesses').update({ gbp_place_id: null }).eq('id', DEMO.id)
        try {
            assert.equal(await claimGooglePlace(viewer.client, FIFI.id, 'autotest-lecteur'), false)
            assert.equal(await claimGooglePlace(owner.client, DEMO.id, 'autotest-premiere'), true)
            assert.equal(await claimGooglePlace(owner.client, DEMO.id, 'autotest-seconde'), false)
            // Même en écrivant directement dans la table, le propriétaire ne la change ni ne la vide (trigger businesses_guard).
            for (const value of ['autotest-directe', null]) {
                const direct = await owner.client.from('businesses').update({ gbp_place_id: value }).eq('id', DEMO.id).select('id')
                assert.equal(direct.error?.code, '42501')
            }
            // Le reste de la fiche du commerce se modifie toujours.
            const other = await owner.client.from('businesses').update({ gbp_place_id: 'autotest-premiere' }).eq('id', DEMO.id).select('id')
            assert.equal(other.data?.length, 1)
            assert.equal((await admin.from('businesses').select('gbp_place_id').eq('id', DEMO.id).single()).data?.gbp_place_id, 'autotest-premiere')
            await resetGoogleListing(admin, DEMO.id)
            assert.equal((await admin.from('businesses').select('gbp_place_id').eq('id', DEMO.id).single()).data?.gbp_place_id, null)
        } finally {
            await admin.from('businesses').update({ gbp_place_id: before!.gbp_place_id }).eq('id', DEMO.id)
        }
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
