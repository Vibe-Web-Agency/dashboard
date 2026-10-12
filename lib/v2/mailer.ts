// Envoi d'emails (Resend) et de SMS (Twilio) depuis le serveur. Aucun envoi sans la clé correspondante :
// la fonction renvoie alors la raison, et l'appelant décide quoi en faire.

const FROM_ADDRESS = 'noreply@vibewebagency.fr'

export function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Habillage commun des emails. `body` est du HTML déjà échappé. */
export function emailLayout(body: string) {
    return `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.5;max-width:560px">${body}</div>`
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string }

/** `fromName` : nom affiché de l'expéditeur (le commerce). `replyTo` : où arrivent les réponses. */
export async function sendEmail(opts: { to: string; subject: string; html: string; fromName?: string; replyTo?: string | null }): Promise<SendResult> {
    const key = process.env.RESEND_API_KEY
    if (!key) return { ok: false, error: "RESEND_API_KEY n'est pas configurée" }
    const fromName = (opts.fromName ?? 'Vibe Web Agency').replace(/[<>"\r\n]/g, ' ').trim()
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: `${fromName} <${FROM_ADDRESS}>`,
                to: [opts.to],
                subject: opts.subject,
                html: opts.html,
                ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
            }),
        })
        if (!res.ok) {
            console.error('[mailer] Resend', res.status, await res.text())
            return { ok: false, error: `Resend a répondu ${res.status}` }
        }
        const data = (await res.json().catch(() => null)) as { id?: string } | null
        return { ok: true, id: data?.id ?? null }
    } catch (e) {
        console.error('[mailer] Resend', e)
        return { ok: false, error: "le service d'envoi est injoignable" }
    }
}

// Indicatifs pour convertir un numéro national (0X XX…) en numéro international.
const COUNTRY_CALLING_CODES: Record<string, string> = { FR: '33', BE: '32', CH: '41', LU: '352', MC: '377' }

/** Numéro au format E.164 (+33612345678), ou null s'il ne peut pas être converti. */
export function toE164(phone: string, country: string): string | null {
    const trimmed = phone.trim()
    const digits = trimmed.replace(/\D/g, '')
    let international: string | null = null
    if (trimmed.startsWith('+')) international = digits
    else if (digits.startsWith('00')) international = digits.slice(2)
    else if (digits.startsWith('0') && COUNTRY_CALLING_CODES[country]) international = COUNTRY_CALLING_CODES[country] + digits.slice(1)
    return international && international.length >= 8 ? `+${international}` : null
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_PHONE_NUMBER
    if (!sid || !token || !from) return { ok: false, error: "Twilio n'est pas configuré" }
    try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: to, From: from, Body: body }),
        })
        if (!res.ok) {
            console.error('[mailer] Twilio', res.status, await res.text())
            return { ok: false, error: `Twilio a répondu ${res.status}` }
        }
        const data = (await res.json().catch(() => null)) as { sid?: string } | null
        return { ok: true, id: data?.sid ?? null }
    } catch (e) {
        console.error('[mailer] Twilio', e)
        return { ok: false, error: 'Twilio est injoignable' }
    }
}
