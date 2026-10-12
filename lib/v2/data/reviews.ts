import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { assertTouched } from './errors'

// Avis des clients (module `reviews`). Un avis déposé sur le site arrive « en attente » : il n'est visible
// publiquement qu'une fois publié. Écriture : rôle member et plus (RLS). Pas de suppression : on masque.

type Client = SupabaseClient<Database>

export const REVIEW_STATUSES = ['pending', 'published', 'hidden'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]
export const REVIEW_STATUS_UI: Record<ReviewStatus, { label: string; pill: string }> = {
    pending: { label: 'À modérer', pill: 'pill pill-amber' },
    published: { label: 'Publié', pill: 'pill pill-green' },
    hidden: { label: 'Masqué', pill: 'pill pill-muted' },
}
export const REVIEW_SOURCE_LABEL: Record<string, string> = { internal: 'Site', google: 'Google', tripadvisor: 'Tripadvisor' }

export async function listReviews(supabase: Client, businessId: string) {
    const { data, error } = await supabase
        .from('reviews')
        .select('id, source, author_name, rating, content, status, reply, replied_at, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data
}
export type Review = Awaited<ReturnType<typeof listReviews>>[number]

export async function setReviewStatus(supabase: Client, businessId: string, id: string, status: ReviewStatus) {
    const { data, error } = await supabase.from('reviews').update({ status }).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

/** Réponse de l'établissement, affichée sous l'avis. Une réponse vide la retire. */
export async function setReviewReply(supabase: Client, businessId: string, id: string, reply: string) {
    const text = reply.trim() || null
    const { data, error } = await supabase
        .from('reviews')
        .update({ reply: text, replied_at: text ? new Date().toISOString() : null })
        .eq('business_id', businessId)
        .eq('id', id)
        .select('id')
    if (error) throw error
    assertTouched(data)
}
