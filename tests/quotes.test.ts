// Devis : contenu chiffré, PDF, lien public, réponse du client.
import { BASE, DEMO, FIFI, OWNER, admin, failure, mark, serverUp, signIn } from './helpers'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { listQuoteItems, saveQuoteDraft } from '../lib/v2/data/quote-items'
import { loadQuoteDocument } from '../lib/v2/quote-document'
import { renderQuotePdf } from '../lib/v2/quote-pdf'
import { quoteLink, quoteToken } from '../lib/v2/quote-link'
import { answerQuote } from '../lib/v2/quote-response'
import { notifyBusinessOfQuoteAnswer, sendQuoteEmail } from '../lib/v2/notifications'

const DRAFT = {
    title: 'Privatisation', valid_until: '2031-01-31', notes: 'Acompte 30 %', discount_cents: 1300,
    buyer: { company: 'Agence & Cie', name: 'Camille Durand', address_line: '12 rue de la Paix', postal_code: '75002', city: 'Paris', vat_number: '' },
    items: [{ description: 'Menu', quantity: 2, unit_price_cents: 5000, tax_rate: 10 }, { description: 'Boissons', quantity: 1.5, unit_price_cents: 2000, tax_rate: 20 }],
}

describe('devis', () => {
    const tag = mark('devis')
    let owner: Awaited<ReturnType<typeof signIn>>
    let customerId: string
    const quoteIds: string[] = []

    /** Une demande neuve sur le commerce de démonstration, créée comme l'API publique le ferait. */
    async function newQuote() {
        const { data, error } = await admin.from('quotes').insert({ business_id: DEMO.id, customer_id: customerId, status: 'request', request_message: tag }).select('id').single()
        if (error) throw error
        quoteIds.push(data.id)
        return data.id
    }
    /** Un devis envoyé : contenu enregistré puis statut `sent` avec un numéro, comme après « Envoyer au client ». */
    async function sentQuote(validUntil: string | null = '2031-01-31') {
        const id = await newQuote()
        await saveQuoteDraft(owner.client, DEMO.id, id, { ...DRAFT, valid_until: validUntil })
        const { error } = await admin.from('quotes').update({ status: 'sent', number: `${tag}-${quoteIds.length}`, sent_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
        return id
    }

    before(async () => {
        owner = await signIn(OWNER)
        const { data, error } = await admin.from('customers').insert({ business_id: DEMO.id, first_name: 'Camille', last_name: tag, email: `${tag}@vwa.local`, source: 'quote' }).select('id').single()
        if (error) throw error
        customerId = data.id
    })
    after(async () => {
        if (quoteIds.length) {
            await admin.from('outbound_messages').delete().in('quote_id', quoteIds)
            await admin.from('quote_items').delete().in('quote_id', quoteIds)
            await admin.from('quotes').delete().in('id', quoteIds)
        }
        await admin.from('customers').delete().eq('id', customerId)
        await owner.close()
    })

    it('enregistre les lignes, calcule les totaux et passe la demande en brouillon', async () => {
        const id = await newQuote()
        await saveQuoteDraft(owner.client, DEMO.id, id, DRAFT)
        const { data: q } = await admin.from('quotes').select('status, subtotal_cents, discount_cents, tax_cents, total_cents, buyer').eq('id', id).single()
        assert.deepEqual({ status: q!.status, total: q!.total_cents, tax: q!.tax_cents }, { status: 'draft', total: 13140, tax: 1440 })
        assert.equal((q!.buyer as { company: string }).company, 'Agence & Cie')
        assert.deepEqual((await listQuoteItems(owner.client, DEMO.id, id)).map((i) => i.description), ['Menu', 'Boissons'])
        // Un second enregistrement remplace les lignes au lieu de les ajouter.
        await saveQuoteDraft(owner.client, DEMO.id, id, { ...DRAFT, discount_cents: 0, items: [DRAFT.items[0]] })
        assert.equal((await listQuoteItems(owner.client, DEMO.id, id)).length, 1)
    })

    it('refuse d\'écrire dans le devis d\'un autre commerce, ou dans un devis figé', async () => {
        const id = await newQuote()
        assert.ok(await failure(() => saveQuoteDraft(owner.client, FIFI.id, id, DRAFT)), 'autre commerce')
        await admin.from('quotes').update({ status: 'cancelled' }).eq('id', id)
        assert.equal(await failure(() => saveQuoteDraft(owner.client, DEMO.id, id, DRAFT)), "Ce devis n'est plus modifiable.")
    })

    it('produit un PDF avec l\'émetteur et le destinataire', async () => {
        const id = await sentQuote()
        const doc = (await loadQuoteDocument(owner.client, id))!
        assert.equal(doc.buyer.company, 'Agence & Cie')
        assert.ok(doc.seller.name)
        const pdf = await renderQuotePdf(doc)
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
        assert.ok(pdf.length > 2000)
    })

    it('compose l\'email du devis avec le lien et le PDF, sans rien envoyer', async () => {
        const id = await sentQuote()
        // Sans clé d'envoi, l'email est composé, journalisé, et marqué en échec.
        assert.equal(await sendQuoteEmail(admin, id, BASE), 'failed')
        const { data: log } = await admin.from('outbound_messages').select('template, status').eq('quote_id', id)
        assert.deepEqual(log, [{ template: 'quote_sent', status: 'failed' }])
        assert.ok(quoteLink(BASE, id).startsWith(`${BASE}/devis/${id}?t=`))
    })

    it('prend une seule réponse du client, et seulement pour un devis envoyé et valable', async () => {
        const id = await sentQuote()
        assert.deepEqual((await answerQuote(admin, id, 'accepted')).kind, 'answered')
        const { data: q } = await admin.from('quotes').select('status, accepted_at').eq('id', id).single()
        assert.equal(q!.status, 'accepted')
        assert.ok(q!.accepted_at)
        // Une seconde réponse, contraire, ne change rien.
        const again = await answerQuote(admin, id, 'declined')
        assert.deepEqual([again.kind, again.kind === 'answered' && again.answer], ['answered', 'accepted'])
        assert.equal(await notifyBusinessOfQuoteAnswer(admin, id, BASE), 'skipped', 'commerce de démonstration sans email : pas d\'avis')

        const expired = await sentQuote('2020-01-01')
        assert.equal((await answerQuote(admin, expired, 'accepted')).kind, 'expired')
        assert.equal((await admin.from('quotes').select('status').eq('id', expired).single()).data!.status, 'sent')

        const draft = await newQuote()
        assert.equal((await answerQuote(admin, draft, 'accepted')).kind, 'unavailable')
    })

    it('page publique et PDF : ouverts par le bon lien seulement (serveur local requis)', async (t) => {
        if (!(await serverUp())) return t.skip(`aucun serveur sur ${BASE}`)
        const id = await sentQuote()
        const good = await fetch(quoteLink(BASE, id), { redirect: 'manual' })
        const html = await good.text()
        assert.equal(good.status, 200)
        for (const text of ['Privatisation', 'Agence &amp; Cie', "J&#x27;accepte ce devis", 'Total TTC']) assert.ok(html.includes(text), `la page contient « ${text} »`)
        assert.ok((await admin.from('quotes').select('viewed_at').eq('id', id).single()).data!.viewed_at, 'ouverture notée')

        assert.equal((await fetch(`${BASE}/devis/${id}?t=faux`, { redirect: 'manual' })).status, 404, 'jeton faux')
        assert.equal((await fetch(`${BASE}/devis/${id}`, { redirect: 'manual' })).status, 404, 'sans jeton : ni page, ni redirection vers la connexion')
        const other = await sentQuote()
        assert.equal((await fetch(`${BASE}/devis/${other}?t=${quoteToken(id)}`, { redirect: 'manual' })).status, 404, 'jeton d\'un autre devis')
        const draft = await newQuote()
        assert.equal((await fetch(quoteLink(BASE, draft), { redirect: 'manual' })).status, 404, 'brouillon')

        const pdf = await fetch(`${BASE}/api/quotes/${id}/pdf?t=${quoteToken(id)}`)
        assert.equal(pdf.headers.get('content-type'), 'application/pdf')
        assert.equal((await fetch(`${BASE}/api/quotes/${id}/pdf?t=faux`)).status, 404)
        assert.equal((await fetch(`${BASE}/api/quotes/${id}/pdf`)).status, 401, 'sans jeton ni session')
        assert.equal((await fetch(`${BASE}/api/quotes/${id}/pdf`, { headers: { cookie: owner.cookie() } })).status, 200, 'sous la session du commerce')
    })
})
