import { NextResponse } from 'next/server'
import type { AdminClient } from './supabase-admin'
import { type CustomerInput, normalizeEmail } from './data/customers'

export { resolveCustomer } from './data/customers'

// Logique partagée des endpoints d'ingestion publique /api/v1/public/* (CLAUDE.md, section 2).

// ─── Réponses & CORS ─────────────────────────────────────────────────────────

// Appelés depuis les sites des commerces (autres origines), sans authentification.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}

export function json(body: unknown, status: number) {
    return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export function preflight() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export function invalid(details: FieldErrors) {
    return json({ success: false, error: 'Payload invalide', details }, 400)
}

export function serverError(context: string, error: unknown) {
    console.error(`[ingestion] ${context}`, error)
    return json({ success: false, error: 'Erreur serveur' }, 500)
}

export async function readJson(req: Request): Promise<unknown> {
    try {
        return await req.json()
    } catch {
        return null
    }
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type FieldErrors = Record<string, string>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Fuseau obligatoire (Z ou ±hh:mm) : sans lui, l'heure serait interprétée en UTC par Postgres.
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

type Opts = { optional?: boolean }

export function readUuid(v: unknown, path: string, errors: FieldErrors, opts: Opts = {}) {
    if (v === undefined || v === null || v === '') {
        if (!opts.optional) errors[path] = 'requis'
        return null
    }
    if (typeof v !== 'string' || !UUID_RE.test(v)) {
        errors[path] = 'UUID invalide'
        return null
    }
    return v.toLowerCase()
}

export function readText(v: unknown, path: string, errors: FieldErrors, opts: Opts & { max?: number } = {}) {
    const max = opts.max ?? 500
    if (typeof v === 'string' && v.trim() !== '') {
        const s = v.trim()
        if (s.length > max) {
            errors[path] = `${max} caractères maximum`
            return null
        }
        return s
    }
    if (v !== undefined && v !== null && typeof v !== 'string') errors[path] = 'texte attendu'
    else if (!opts.optional) errors[path] = 'requis'
    return null
}

export function readInt(v: unknown, path: string, errors: FieldErrors, min: number, max: number) {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
        errors[path] = `entier entre ${min} et ${max} attendu`
        return null
    }
    return v
}

export function readDateTime(v: unknown, path: string, errors: FieldErrors) {
    if (typeof v !== 'string' || !ISO_DATETIME_RE.test(v) || Number.isNaN(Date.parse(v))) {
        errors[path] = 'date ISO 8601 avec fuseau attendue (ex. 2026-10-10T19:30:00+02:00)'
        return null
    }
    return new Date(v).toISOString()
}

export function readDate(v: unknown, path: string, errors: FieldErrors) {
    if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) {
        errors[path] = 'date YYYY-MM-DD attendue'
        return null
    }
    // Rejette les dates impossibles (ex. 2026-02-30), que Date.parse corrigerait silencieusement.
    const d = new Date(`${v}T00:00:00Z`)
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
        errors[path] = 'date inexistante'
        return null
    }
    return v
}

// ─── Client (customers) ──────────────────────────────────────────────────────

// L'ingestion publique exige un email : c'est la clé de dédoublonnage des clients.
export function readCustomer(v: unknown, errors: FieldErrors): (CustomerInput & { email: string }) | null {
    if (!isRecord(v)) {
        errors.customer = 'objet requis'
        return null
    }
    const full_name = readText(v.full_name, 'customer.full_name', errors, { max: 200 })
    const rawEmail = readText(v.email, 'customer.email', errors, { max: 254 })
    const phone = readText(v.phone, 'customer.phone', errors, { optional: true, max: 40 })

    const email = rawEmail ? normalizeEmail(rawEmail) : null
    if (email && !EMAIL_RE.test(email)) errors['customer.email'] = 'email invalide'

    if (!full_name || !email || errors['customer.email'] || errors['customer.phone']) return null
    return { full_name, email, phone }
}

export async function isActiveBusiness(admin: AdminClient, businessId: string) {
    const { data, error } = await admin
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('status', 'active')
        .maybeSingle()
    if (error) throw error
    return data !== null
}

export async function isBookableService(admin: AdminClient, businessId: string, serviceId: string) {
    const { data, error } = await admin
        .from('services')
        .select('id')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle()
    if (error) throw error
    return data !== null
}
