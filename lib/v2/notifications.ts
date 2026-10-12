import type { Json } from '@/types/supabase'
import type { AdminClient } from './supabase-admin'
import { formatDateTimeInZone } from './datetime'
import { type SendResult, emailLayout, escapeHtml, sendEmail, sendSms, toE164 } from './mailer'
import { personName } from './names'

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

    const summary = { reservations: due.length, emails: 0, sms: 0, failed: 0 }
    const settingsCache = new Map<string, NotificationSettings>()
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
            const outcome = await deliver(db, {
                ...base, channel: 'sms', template: 'reservation_reminder', to: phone, key: `reservation_reminder:sms:${r.id}`,
                send: () => sendSms(phone, `${r.business.name} : rappel de votre ${d.noun} le ${d.when}.${r.business.phone ? ` Pour modifier : ${r.business.phone}` : ''}`),
            })
            if (outcome === 'sent') summary.sms++
            if (outcome === 'failed') summary.failed++
        }
        // Marquée traitée même sans envoi (pas de coordonnées, réglages coupés) : on ne la reprend pas demain.
        await db.from('reservations').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id)
    }
    return summary
}
