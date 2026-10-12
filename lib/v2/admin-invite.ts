import type { AdminClient } from './supabase-admin'
import { AdminInputError, checkRole, unwrap, unwrapMaybe } from './admin'
import { ROLE_LABEL } from './admin-constants'

// Invitations du back-office (CLAUDE.md 8).
// La base ne sait pas envoyer d'email : le compte et son lien à usage unique sont créés par Supabase Auth
// (generateLink), l'accès par une ligne `memberships`, et l'email part de notre serveur via Resend.
// Le lien est toujours renvoyé à l'écran, pour pouvoir le transmettre à la main si l'email n'arrive pas.

const FROM_EMAIL = 'Vibe Web Agency <noreply@vibewebagency.fr>'

export type InviteInput = { email: string; agency_id: string; business_id: string | null; role: string }
export type InviteResult =
    | { kind: 'existing' } // compte déjà existant : accès ajouté, pas d'email
    | { kind: 'invited'; link: string; emailSent: boolean; emailError: string | null }

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

async function sendEmail(to: string, subject: string, html: string): Promise<string | null> {
    const key = process.env.RESEND_API_KEY
    if (!key) return "RESEND_API_KEY n'est pas configurée"
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
        })
        if (res.ok) return null
        console.error('[admin] Resend', res.status, await res.text())
        return `Resend a répondu ${res.status}`
    } catch (e) {
        console.error('[admin] Resend', e)
        return "le service d'envoi est injoignable"
    }
}

function accessEmail(link: string, scopeName: string, intro: string) {
    return `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.5">
<p>Bonjour,</p>
<p>${intro} <strong>${escapeHtml(scopeName)}</strong> sur le dashboard Vibe Web Agency.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#C9A876;color:#0E0D0B;text-decoration:none;border-radius:6px">Choisir mon mot de passe</a></p>
<p style="color:#666;font-size:13px">Ce lien est personnel, utilisable une seule fois et valable 24 heures.</p>
</div>`
}

function confirmLink(siteUrl: string, tokenHash: string, type: 'invite' | 'recovery') {
    return `${siteUrl.replace(/\/$/, '')}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`
}

async function scopeName(db: AdminClient, agencyId: string, businessId: string | null) {
    if (businessId) return unwrap(await db.from('businesses').select('name').eq('id', businessId).single()).name
    return unwrap(await db.from('agencies').select('name').eq('id', agencyId).single()).name
}

/**
 * Donne un accès à une adresse email. Compte existant : la membership est ajoutée. Sinon le compte est créé,
 * rattaché, et reçoit un email avec un lien pour choisir son mot de passe.
 */
export async function inviteUser(db: AdminClient, input: InviteInput, siteUrl: string): Promise<InviteResult> {
    const role = checkRole(input.role)
    const email = input.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminInputError('Adresse email invalide.')
    if (!input.agency_id) throw new AdminInputError("L'agence est obligatoire.")
    if (input.business_id) {
        const business = unwrapMaybe(await db.from('businesses').select('agency_id').eq('id', input.business_id).maybeSingle())
        if (business?.agency_id !== input.agency_id) throw new AdminInputError("Ce commerce n'appartient pas à cette agence.")
    }
    const membership = { agency_id: input.agency_id, business_id: input.business_id, role, is_active: true }

    const existing = unwrapMaybe(await db.from('profiles').select('id').ilike('email', email.replace(/[\\%_]/g, '\\$&')).maybeSingle())
    if (existing) {
        const res = await db.from('memberships').insert({ ...membership, profile_id: existing.id }).select('id').single()
        if (res.error?.code === '23505') throw new AdminInputError('Ce compte a déjà un accès à ce périmètre : modifiez son rôle.')
        unwrap(res)
        return { kind: 'existing' }
    }

    // `vwa_invited` : le trigger handle_new_user ne crée pas d'établissement de démonstration pour ce compte.
    const { data, error } = await db.auth.admin.generateLink({ type: 'invite', email, options: { data: { vwa_invited: true } } })
    if (error || !data.user) throw new Error(error?.message ?? 'Création du compte impossible')
    const inserted = await db.from('memberships').insert({ ...membership, profile_id: data.user.id }).select('id').single()
    if (inserted.error) {
        // Pas de compte sans accès : on annule la création.
        await db.auth.admin.deleteUser(data.user.id)
        throw new Error(inserted.error.message)
    }

    const link = confirmLink(siteUrl, data.properties.hashed_token, 'invite')
    const name = await scopeName(db, input.agency_id, input.business_id)
    const emailError = await sendEmail(email, `Votre accès à ${name}`, accessEmail(link, name, `Vous êtes invité(e) en tant que ${ROLE_LABEL[role].toLowerCase()} de`))
    return { kind: 'invited', link, emailSent: emailError === null, emailError }
}

/** Nouveau lien de connexion pour un compte qui n'a pas (ou plus) son mot de passe. */
export async function resendAccess(db: AdminClient, profileId: string, siteUrl: string): Promise<{ link: string; emailSent: boolean; emailError: string | null }> {
    const profile = unwrap(await db.from('profiles').select('email').eq('id', profileId).single())
    const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email: profile.email })
    if (error) throw new Error(error.message)
    const link = confirmLink(siteUrl, data.properties.hashed_token, 'recovery')
    const emailError = await sendEmail(profile.email, 'Votre lien de connexion', accessEmail(link, 'votre espace', 'Voici un nouveau lien pour accéder à'))
    return { link, emailSent: emailError === null, emailError }
}

/** État des comptes côté authentification : jamais connecté = invitation en attente. */
export async function loadAccountStates(db: AdminClient) {
    const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw new Error(error.message)
    return new Map(data.users.map((u) => [u.id, { lastSignInAt: u.last_sign_in_at ?? null, invitedAt: u.invited_at ?? null }]))
}
