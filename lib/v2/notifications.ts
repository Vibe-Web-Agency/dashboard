import type { Json } from '@/types/supabase'
import type { AdminClient } from './supabase-admin'
import { formatDateTimeInZone } from './datetime'
import { type SendResult, emailLayout, escapeHtml, sendEmail, sendSms, toE164, type Attachment } from './mailer'
import { type Schedule, formatHours } from './schedule'
import { personName } from './names'
import { type Allowance, getAllowance, recordUsage } from './usage'
import { loadQuoteDocument, quotePdfFilename } from './quote-document'
import { quoteLink } from './quote-link'
import { renderQuotePdf } from './quote-pdf'

// Messages envoyés aux clients finaux et au commerce (CLAUDE.md 9) : confirmation et rappel de réservation,
// avis de nouvelle réservation ou demande. Exécuté côté serveur avec la clé de service.
//
// Chaque envoi est d'abord inscrit dans `outbound_messages` avec une clé d'idempotence : un même message ne part
// jamais deux fois, et le trigger `guard_optout` refuse les destinataires désinscrits.

// ── Réglages (business_module_settings.settings du module « reservations ») ──

export type NotificationSettings = {
    /** Email au client à la création d'une réservation. */
    confirmation_email: boolean
    /** Email au client la veille. */
    reminder_email: boolean
    /** SMS au client la veille (payant, désactivé par défaut). */
    reminder_sms: boolean
    /** Email au commerce pour chaque nouvelle réservation ou demande venue du site. */
    notify_business: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    confirmation_email: true,
    reminder_email: true,
    reminder_sms: false,
    notify_business: true,
}

export function readNotificationSettings(settings: Json | null | undefined): NotificationSettings {
    const stored = settings && typeof settings === 'object' && !Array.isArray(settings) ? (settings.notifications as Json | undefined) : undefined
    const obj = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
    const pick = (key: keyof NotificationSettings) => (typeof obj[key] === 'boolean' ? (obj[key] as boolean) : DEFAULT_NOTIFICATION_SETTINGS[key])
    return { confirmation_email: pick('confirmation_email'), reminder_email: pick('reminder_email'), reminder_sms: pick('reminder_sms'), notify_business: pick('notify_business') }
}

async function loadSettings(db: AdminClient, businessId: string) {
    const { data: mod } = await db.from('modules').select('id').eq('slug', 'reservations').maybeSingle()
    if (!mod) return DEFAULT_NOTIFICATION_SETTINGS
    const { data } = await db.from('business_module_settings').select('settings').eq('business_id', businessId).eq('module_id', mod.id).maybeSingle()
    return readNotificationSettings(data?.settings)
}

// ── Envoi journalisé ──

type Outcome = 'sent' | 'skipped' | 'failed'
type Message = {
    agencyId: string
    businessId: string
    channel: 'email' | 'sms'
    template: string
    to: string
    subject?: string
    /** Clé d'idempotence : un seul envoi par clé. */
    key: string
    reservationId?: string
    quoteId?: string
    customerId?: string | null
    send: () => Promise<SendResult>
}

async function deliver(db: AdminClient, m: Message): Promise<Outcome> {
    const to = m.channel === 'email' ? m.to.toLowerCase() : m.to
    const { data: row, error } = await db
        .from('outbound_messages')
        .insert({
            agency_id: m.agencyId,
            business_id: m.businessId,
            channel: m.channel,
            kind: 'transactional',
            template: m.template,
            to_address: to,
            subject: m.subject ?? null,
            customer_id: m.customerId ?? null,
            reservation_id: m.reservationId ?? null,
            quote_id: m.quoteId ?? null,
            idempotency_key: m.key,
            status: 'queued',
        })
        .select('id')
        .single()
    // 23505 : déjà envoyé. Autre erreur à l'insertion : destinataire désinscrit (guard_optout) ou donnée refusée.
    if (error || !row) {
        if (error?.code !== '23505') console.error('[notifications]', m.template, error?.message)
        return 'skipped'
    }
    const result = await m.send()
    const now = new Date().toISOString()
    await db
        .from('outbound_messages')
        .update(result.ok
            ? { status: 'sent', sent_at: now, provider: m.channel === 'email' ? 'resend' : 'twilio', provider_message_id: result.id }
            : { status: 'failed', failed_at: now, error: result.error })
        .eq('id', row.id)
    return result.ok ? 'sent' : 'failed'
}

// ── Réservations ──

const RESERVATION_SELECT = `
    id, business_id, starts_at, party_size, status, guest_name, reminder_sent_at,
    customer:customers ( id, first_name, last_name, email, phone ),
    service:services ( name ),
    business:businesses ( id, agency_id, name, email, phone, timezone, country, address_line, postal_code, city,
        business_type:business_types ( booking_noun, party_noun ) )
` as const

async function loadReservation(db: AdminClient, id: string) {
    const { data, error } = await db.from('reservations').select(RESERVATION_SELECT).eq('id', id).maybeSingle()
    if (error) throw error
    return data
}
type LoadedReservation = NonNullable<Awaited<ReturnType<typeof loadReservation>>>

function describe(r: LoadedReservation) {
    const b = r.business
    const noun = b.business_type.booking_noun
    const party = b.business_type.party_noun
    const when = formatDateTimeInZone(r.starts_at, b.timezone)
    const lines = [
        `<strong>${escapeHtml(when)}</strong>`,
        r.service?.name ? escapeHtml(r.service.name) : null,
        party && r.party_size ? `${r.party_size} ${escapeHtml(party)}${r.party_size > 1 ? 's' : ''}` : null,
    ].filter(Boolean)
    const address = [b.address_line, [b.postal_code, b.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    const contact = [b.phone, b.email].filter(Boolean).join(' · ')
    return { noun, when, lines, address, contact, name: personName(r.customer) || r.guest_name || '' }
}

function customerEmail(r: LoadedReservation, intro: string) {
    const d = describe(r)
    return emailLayout(`
<p>Bonjour${d.name ? ' ' + escapeHtml(d.name) : ''},</p>
<p>${intro}</p>
<p style="padding:12px 16px;background:#f5f2ec;border-radius:8px">${d.lines.join('<br>')}</p>
<p><strong>${escapeHtml(r.business.name)}</strong>${d.address ? '<br>' + escapeHtml(d.address) : ''}${d.contact ? '<br>' + escapeHtml(d.contact) : ''}</p>
<p style="color:#666;font-size:13px">Pour modifier ou annuler, contactez directement l'établissement${r.business.phone ? ' au ' + escapeHtml(r.business.phone) : ''}.</p>`)
}

/** Email de confirmation au client. `force` : envoi demandé à la main, sans tenir compte du réglage. */
export async function sendReservationConfirmation(db: AdminClient, reservationId: string, opts: { force?: boolean } = {}): Promise<Outcome> {
    const r = await loadReservation(db, reservationId)
    if (!r?.customer?.email || r.status === 'cancelled') return 'skipped'
    if (!opts.force && !(await loadSettings(db, r.business_id)).confirmation_email) return 'skipped'
    const d = describe(r)
    const subject = `Votre ${d.noun} chez ${r.business.name}`
    const to = r.customer.email
    return deliver(db, {
        agencyId: r.business.agency_id, businessId: r.business_id, channel: 'email', template: 'reservation_confirmation', to, subject,
        key: `reservation_confirmation:${r.id}`, reservationId: r.id, customerId: r.customer.id,
        send: () => sendEmail({ to, subject, fromName: r.business.name, replyTo: r.business.email, html: customerEmail(r, `Nous confirmons votre ${escapeHtml(d.noun)} :`) }),
    })
}

/** Avis au commerce : une réservation vient d'arriver depuis son site. */
export async function notifyBusinessOfReservation(db: AdminClient, reservationId: string, dashboardUrl: string): Promise<Outcome> {
    const r = await loadReservation(db, reservationId)
    if (!r?.business.email || !(await loadSettings(db, r.business_id)).notify_business) return 'skipped'
    const d = describe(r)
    const subject = `Nouvelle demande de ${d.noun} : ${d.name || 'sans nom'}, ${d.when}`
    const to = r.business.email
    const contact = [r.customer?.phone, r.customer?.email].filter(Boolean).map((v) => escapeHtml(v!)).join(' · ')
    return deliver(db, {
        agencyId: r.business.agency_id, businessId: r.business_id, channel: 'email', template: 'reservation_new', to, subject,
        key: `reservation_new:${r.id}`, reservationId: r.id,
        send: () => sendEmail({ to, subject, html: emailLayout(`
<p><strong>${escapeHtml(d.name || 'Sans nom')}</strong>${contact ? ' · ' + contact : ''}</p>
<p style="padding:12px 16px;background:#f5f2ec;border-radius:8px">${d.lines.join('<br>')}</p>
<p><a href="${escapeHtml(dashboardUrl)}/reservations/${r.id}">Ouvrir dans le dashboard</a></p>`) }),
    })
}

/** Avis au commerce : une demande vient d'arriver depuis son site. */
export async function notifyBusinessOfQuote(db: AdminClient, quoteId: string, dashboardUrl: string): Promise<Outcome> {
    const { data: q, error } = await db
        .from('quotes')
        .select('id, business_id, request_message, customer:customers ( first_name, last_name, email, phone ), business:businesses ( agency_id, name, email )')
        .eq('id', quoteId)
        .maybeSingle()
    if (error) throw error
    if (!q?.business.email || !(await loadSettings(db, q.business_id)).notify_business) return 'skipped'
    const name = personName(q.customer) || 'Sans nom'
    const subject = `Nouvelle demande : ${name}`
    const to = q.business.email
    const contact = [q.customer?.phone, q.customer?.email].filter(Boolean).map((v) => escapeHtml(v!)).join(' · ')
    return deliver(db, {
        agencyId: q.business.agency_id, businessId: q.business_id, channel: 'email', template: 'quote_new', to, subject,
        key: `quote_new:${q.id}`, quoteId: q.id,
        send: () => sendEmail({ to, subject, html: emailLayout(`
<p><strong>${escapeHtml(name)}</strong>${contact ? ' · ' + contact : ''}</p>
${q.request_message ? `<p style="padding:12px 16px;background:#f5f2ec;border-radius:8px;white-space:pre-wrap">${escapeHtml(q.request_message)}</p>` : ''}
<p><a href="${escapeHtml(dashboardUrl)}/quotes/${q.id}">Ouvrir dans le dashboard</a></p>`) }),
    })
}

// ── Support ──

/** Avis à l'agence (`agencies.contact_email`) : un commerce vient d'ouvrir une demande de support. */
export async function notifyAgencyOfTicket(db: AdminClient, ticketId: string, dashboardUrl: string): Promise<Outcome> {
    const { data: t, error } = await db.from('tickets').select('id, agency_id, business_id, subject, priority').eq('id', ticketId).maybeSingle()
    if (error) throw error
    if (!t?.business_id) return 'skipped'
    const [{ data: agency }, { data: business }, { data: first }] = await Promise.all([
        db.from('agencies').select('contact_email').eq('id', t.agency_id).maybeSingle(),
        db.from('businesses').select('name').eq('id', t.business_id).maybeSingle(),
        db.from('ticket_messages').select('body').eq('ticket_id', t.id).order('created_at').limit(1).maybeSingle(),
    ])
    const to = agency?.contact_email
    if (!to) return 'skipped'
    const subject = `Support · ${business?.name ?? 'Un commerce'} : ${t.subject}`
    return deliver(db, {
        agencyId: t.agency_id, businessId: t.business_id, channel: 'email', template: 'ticket_new', to, subject, key: `ticket_new:${t.id}`,
        send: () => sendEmail({ to, subject, html: emailLayout(`
<p><strong>${escapeHtml(business?.name ?? 'Un commerce')}</strong> a ouvert une demande : ${escapeHtml(t.subject)}</p>
${first?.body ? `<p style="padding:12px 16px;background:#f5f2ec;border-radius:8px;white-space:pre-wrap">${escapeHtml(first.body)}</p>` : ''}
<p><a href="${escapeHtml(dashboardUrl)}/admin/support?ticket=${t.id}">Répondre depuis le back-office</a></p>`) }),
    })
}

// ── Planning de l'équipe ──

/**
 * Envoie à chaque personne active qui a une adresse email ses créneaux de la semaine, avec le planning complet en PDF.
 * Peut être renvoyé (planning modifié) : la clé d'idempotence porte l'instant de l'envoi.
 */
export async function sendScheduleEmails(
    db: AdminClient,
    business: { id: string; agency_id: string; name: string; email: string | null },
    schedule: Schedule,
    pdf: Attachment | null,
) {
    const stamp = Date.now()
    const subject = `Planning de la semaine ${schedule.label}`
    const outcome = { sent: 0, failed: 0, withoutEmail: [] as string[] }
    for (const row of schedule.rows) {
        if (!row.employee.is_active) continue
        const to = row.employee.email
        if (!to) { outcome.withoutEmail.push(row.name); continue }
        const lines = schedule.days.flatMap((day, i) => row.cells[i].map((c) =>
            `<strong>${escapeHtml(day.label)} ${escapeHtml(day.short)}</strong> · ${escapeHtml(c.start)} – ${escapeHtml(c.end)}${c.role_label ? ' · ' + escapeHtml(c.role_label) : ''}${c.break_minutes ? ` · pause ${c.break_minutes} min` : ''}${c.note ? '<br><span style="color:#666">' + escapeHtml(c.note) + '</span>' : ''}`))
        const html = emailLayout(`
<p>Bonjour${row.employee.first_name ? ' ' + escapeHtml(row.employee.first_name) : ''},</p>
<p>Voici votre planning pour la semaine ${escapeHtml(schedule.label)}.</p>
<p style="padding:12px 16px;background:#f5f2ec;border-radius:8px">${lines.length ? lines.join('<br>') : 'Aucun créneau prévu pour vous cette semaine.'}</p>
${lines.length ? `<p>Total : <strong>${escapeHtml(formatHours(row.minutes))}</strong>, pauses déduites.</p>` : ''}
<p style="color:#666;font-size:13px">${pdf ? "Le planning complet de l'équipe est en pièce jointe. " : ''}Ce planning remplace les précédents pour cette semaine.</p>
<p><strong>${escapeHtml(business.name)}</strong></p>`)
        const result = await deliver(db, {
            agencyId: business.agency_id, businessId: business.id, channel: 'email', template: 'team_schedule', to, subject,
            key: `team_schedule:${schedule.start}:${row.employee.id}:${stamp}`,
            send: () => sendEmail({ to, subject, html, fromName: business.name, replyTo: business.email, attachments: pdf ? [pdf] : undefined }),
        })
        if (result === 'sent') outcome.sent++
        else outcome.failed++
    }
    return outcome
}

// ── Devis ──

const euros = (cents: number, currency: string) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency })

/** Email du devis chiffré au client : lignes, totaux, validité, et le PDF en pièce jointe. Peut être renvoyé. */
export async function sendQuoteEmail(db: AdminClient, quoteId: string, siteUrl: string): Promise<Outcome> {
    const { data: q, error } = await db
        .from('quotes')
        .select(`id, business_id, number, title, valid_until, notes, subtotal_cents, discount_cents, tax_cents, total_cents, currency,
            customer:customers ( id, first_name, last_name, email ),
            business:businesses ( agency_id, name, email, phone ),
            items:quote_items ( description, quantity, unit_price_cents, position )`)
        .eq('id', quoteId)
        .maybeSingle()
    if (error) throw error
    if (!q?.customer?.email) return 'skipped'

    const cell = 'padding:6px 8px;border-bottom:1px solid #e5e0d6'
    const rows = [...q.items].sort((a, b) => a.position - b.position).map((i) => `<tr>
<td style="${cell}">${escapeHtml(i.description)}</td>
<td style="${cell};text-align:right">${Number(i.quantity).toLocaleString('fr-FR')}</td>
<td style="${cell};text-align:right">${euros(i.unit_price_cents, q.currency)}</td>
<td style="${cell};text-align:right">${euros(Math.round(Number(i.quantity) * i.unit_price_cents), q.currency)}</td></tr>`).join('')
    const total = (label: string, value: string, strong = false) => `<tr><td colspan="3" style="padding:4px 8px;text-align:right">${label}</td><td style="padding:4px 8px;text-align:right">${strong ? '<strong>' + value + '</strong>' : value}</td></tr>`
    const name = personName(q.customer)
    const validUntil = q.valid_until ? new Date(q.valid_until + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null
    const subject = `Devis${q.number ? ' ' + q.number : ''} — ${q.business.name}`
    const to = q.customer.email
    const html = emailLayout(`
<p>Bonjour${name ? ' ' + escapeHtml(name) : ''},</p>
<p>Voici notre devis${q.title ? ' pour <strong>' + escapeHtml(q.title) + '</strong>' : ''}${q.number ? ' (n° ' + escapeHtml(q.number) + ')' : ''}.</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">
<tr><th style="${cell};text-align:left">Désignation</th><th style="${cell};text-align:right">Qté</th><th style="${cell};text-align:right">Prix HT</th><th style="${cell};text-align:right">Total HT</th></tr>
${rows}
${total('Total HT', euros(q.subtotal_cents, q.currency))}
${q.discount_cents > 0 ? total('Remise', '− ' + euros(q.discount_cents, q.currency)) : ''}
${total('TVA', euros(q.tax_cents, q.currency))}
${total('Total TTC', euros(q.total_cents, q.currency), true)}
</table>
${validUntil ? '<p>Ce devis est valable jusqu\'au ' + validUntil + '.</p>' : ''}
${q.notes ? '<p style="white-space:pre-wrap">' + escapeHtml(q.notes) + '</p>' : ''}
<p><a href="${escapeHtml(quoteLink(siteUrl, q.id))}" style="display:inline-block;padding:10px 18px;background:#C9A876;color:#0E0D0B;text-decoration:none;border-radius:6px">Voir et accepter le devis</a></p>
<p>Pour en discuter, répondez simplement à cet email${q.business.phone ? ' ou appelez-nous au ' + escapeHtml(q.business.phone) : ''}.</p>
<p><strong>${escapeHtml(q.business.name)}</strong></p>`)
    return deliver(db, {
        agencyId: q.business.agency_id, businessId: q.business_id, channel: 'email', template: 'quote_sent', to, subject,
        key: `quote_sent:${q.id}:${Date.now()}`, quoteId: q.id, customerId: q.customer.id,
        send: async () => {
            // Le PDF est joint ; s'il ne peut pas être produit, l'email part quand même avec le détail dans le texte.
            const doc = await loadQuoteDocument(db, q.id).catch(() => null)
            const pdf = doc ? await renderQuotePdf(doc).catch((e) => { console.error('[notifications] pdf', e); return null }) : null
            return sendEmail({ to, subject, html, fromName: q.business.name, replyTo: q.business.email, attachments: doc && pdf ? [{ filename: quotePdfFilename(doc), content: pdf }] : undefined })
        },
    })
}

/** Avis au commerce : le client vient d'accepter ou de refuser son devis depuis le lien. */
export async function notifyBusinessOfQuoteAnswer(db: AdminClient, quoteId: string, dashboardUrl: string): Promise<Outcome> {
    const { data: q, error } = await db
        .from('quotes')
        .select('id, business_id, number, status, title, total_cents, currency, customer:customers ( first_name, last_name, email ), business:businesses ( agency_id, name, email )')
        .eq('id', quoteId)
        .maybeSingle()
    if (error) throw error
    if (!q?.business.email || (q.status !== 'accepted' && q.status !== 'declined')) return 'skipped'
    const accepted = q.status === 'accepted'
    const who = personName(q.customer) || q.customer?.email || 'Le client'
    const subject = `Devis${q.number ? ' ' + q.number : ''} ${accepted ? 'accepté' : 'refusé'} par ${who}`
    const to = q.business.email
    return deliver(db, {
        agencyId: q.business.agency_id, businessId: q.business_id, channel: 'email', template: accepted ? 'quote_accepted' : 'quote_declined', to, subject,
        key: `quote_answer:${q.id}`, quoteId: q.id,
        send: () => sendEmail({ to, subject, html: emailLayout(`
<p><strong>${escapeHtml(who)}</strong> a ${accepted ? 'accepté' : 'refusé'} le devis${q.title ? ' « ' + escapeHtml(q.title) + ' »' : ''}${q.number ? ' (n° ' + escapeHtml(q.number) + ')' : ''}, d'un montant de ${euros(q.total_cents, q.currency)} TTC.</p>
<p><a href="${escapeHtml(dashboardUrl)}/quotes/${q.id}">Ouvrir dans le dashboard</a></p>`) }),
    })
}

// Une exécution quotidienne couvre les réservations qui commencent entre 12 h et 36 h plus tard :
// chaque réservation tombe dans une seule exécution. Une réservation prise moins de 12 h avant n'a pas de rappel.
const REMINDER_FROM_HOURS = 12
const REMINDER_TO_HOURS = 36

/** Rappels de la veille (email, et SMS si le commerce l'a activé). Appelé par le cron quotidien. */
export async function sendReservationReminders(db: AdminClient, now = new Date()) {
    const from = new Date(now.getTime() + REMINDER_FROM_HOURS * 3600_000).toISOString()
    const to = new Date(now.getTime() + REMINDER_TO_HOURS * 3600_000).toISOString()
    const { data: due, error } = await db
        .from('reservations')
        .select('id')
        .eq('status', 'confirmed')
        .is('reminder_sent_at', null)
        .gt('starts_at', from)
        .lte('starts_at', to)
    if (error) throw error

    /** smsSkipped : SMS non envoyés parce que l'offre du commerce n'en inclut pas, ou plus ce mois-ci. */
    const summary = { reservations: due.length, emails: 0, sms: 0, smsSkipped: 0, failed: 0 }
    const settingsCache = new Map<string, NotificationSettings>()
    // SMS restants ce mois-ci par commerce (quota du plan + options). Zéro : aucun SMS, quel que soit le réglage.
    const smsCache = new Map<string, Allowance>()
    for (const { id } of due) {
        const r = await loadReservation(db, id)
        if (!r) continue
        if (!settingsCache.has(r.business_id)) settingsCache.set(r.business_id, await loadSettings(db, r.business_id))
        const settings = settingsCache.get(r.business_id)!
        const d = describe(r)
        const base = { agencyId: r.business.agency_id, businessId: r.business_id, reservationId: r.id, customerId: r.customer?.id }

        if (settings.reminder_email && r.customer?.email) {
            const email = r.customer.email
            const subject = `Rappel : votre ${d.noun} chez ${r.business.name}`
            const outcome = await deliver(db, {
                ...base, channel: 'email', template: 'reservation_reminder', to: email, subject, key: `reservation_reminder:email:${r.id}`,
                send: () => sendEmail({ to: email, subject, fromName: r.business.name, replyTo: r.business.email, html: customerEmail(r, `Nous vous attendons bientôt. Pour rappel :`) }),
            })
            if (outcome === 'sent') summary.emails++
            if (outcome === 'failed') summary.failed++
        }
        const phone = settings.reminder_sms && r.customer?.phone ? toE164(r.customer.phone, r.business.country) : null
        if (phone) {
            if (!smsCache.has(r.business_id)) smsCache.set(r.business_id, await getAllowance(db, r.business_id, 'sms', now))
            const sms = smsCache.get(r.business_id)!
            if (sms.remaining <= 0) {
                summary.smsSkipped++
            } else {
                const key = `reservation_reminder:sms:${r.id}`
                const outcome = await deliver(db, {
                    ...base, channel: 'sms', template: 'reservation_reminder', to: phone, key,
                    send: () => sendSms(phone, `${r.business.name} : rappel de votre ${d.noun} le ${d.when}.${r.business.phone ? ` Pour modifier : ${r.business.phone}` : ''}`),
                })
                if (outcome === 'sent') {
                    summary.sms++
                    sms.remaining--
                    await recordUsage(db, { businessId: r.business_id, agencyId: r.business.agency_id, meter: 'sms', eventType: 'reservation_reminder_sms', idempotencyKey: key })
                }
                if (outcome === 'failed') summary.failed++
            }
        }
        // Marquée traitée même sans envoi (pas de coordonnées, réglages coupés) : on ne la reprend pas demain.
        await db.from('reservations').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id)
    }
    return summary
}
