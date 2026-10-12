import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { assertTouched } from './errors'

// Réglages d'un module pour un commerce : business_module_settings.settings (jsonb), une clé par sujet.
//   reservations.notifications : messages automatiques (CLAUDE.md 9.3)
//   quotes.issuer              : mentions légales de l'émetteur des devis (9.4)
//   analytics.clarity          : identifiant du projet Microsoft Clarity (9.8)
//
// ATTENTION : ces réglages sont lisibles par un visiteur anonyme pour les modules activés (politique
// `bms_public_widget_select`, dont les sites des commerces se servent). N'y mettre AUCUN secret :
// les jetons vont dans `business_integrations`, réservée au serveur.
// Écriture : rôle administrator et plus (RLS).

type Client = SupabaseClient<Database>
type JsonObject = { [key: string]: Json | undefined }

function asObject(value: Json | null | undefined): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

async function moduleId(supabase: Client, slug: string) {
    const { data, error } = await supabase.from('modules').select('id').eq('slug', slug).maybeSingle()
    if (error) throw error
    return data?.id ?? null
}

/** Tous les réglages du module pour ce commerce ({} si le module n'a pas de ligne). */
export async function readModuleSettings(supabase: Client, businessId: string, slug: string): Promise<JsonObject> {
    const id = await moduleId(supabase, slug)
    if (!id) return {}
    const { data, error } = await supabase.from('business_module_settings').select('settings').eq('business_id', businessId).eq('module_id', id).maybeSingle()
    if (error) throw error
    return asObject(data?.settings)
}

/** Remplace une clé des réglages du module, en conservant les autres. */
export async function writeModuleSetting(supabase: Client, businessId: string, slug: string, key: string, value: Json) {
    const id = await moduleId(supabase, slug)
    if (!id) throw new Error('Module introuvable.')
    const current = await readModuleSettings(supabase, businessId, slug)
    const { data, error } = await supabase
        .from('business_module_settings')
        .update({ settings: { ...current, [key]: value } })
        .eq('business_id', businessId)
        .eq('module_id', id)
        .select('id')
    if (error) throw error
    assertTouched(data)
}

const str = (v: Json | undefined) => (typeof v === 'string' ? v : '')

// ── Émetteur des devis ──

export type IssuerSettings = { legal_name: string; siret: string; vat_number: string; mentions: string }

export function readIssuer(settings: JsonObject): IssuerSettings {
    const o = asObject(settings.issuer)
    return { legal_name: str(o.legal_name), siret: str(o.siret), vat_number: str(o.vat_number), mentions: str(o.mentions) }
}

export function cleanIssuer(input: IssuerSettings): IssuerSettings {
    const siret = input.siret.replace(/\s/g, '')
    if (siret && !/^\d{9}(\d{5})?$/.test(siret)) throw new Error('SIREN (9 chiffres) ou SIRET (14 chiffres) invalide.')
    return { legal_name: input.legal_name.trim().slice(0, 200), siret, vat_number: input.vat_number.trim().slice(0, 30), mentions: input.mentions.trim().slice(0, 1000) }
}

// ── Microsoft Clarity ──

/** Identifiant du projet Clarity (ex. « abcd1234ef »), tel qu'il figure dans le script de suivi. */
export function readClarityProjectId(settings: JsonObject) {
    return str(asObject(settings.clarity).project_id)
}

export function cleanClarityProjectId(input: string) {
    const id = input.trim()
    if (id && !/^[a-z0-9]{6,20}$/i.test(id)) throw new Error("Identifiant Clarity invalide : c'est le code de 10 caractères environ visible dans l'adresse de votre projet.")
    return id.toLowerCase()
}
