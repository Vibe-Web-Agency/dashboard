import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { assertTouched } from './errors'
import { slugify } from './services'

// Actualités du commerce (module `blog`, table `blog_posts`). Seuls les articles publiés sont visibles sur le site.
// Écriture : rôle member et plus (RLS).

type Client = SupabaseClient<Database>

export const POST_STATUSES = ['draft', 'published', 'archived'] as const
export type PostStatus = (typeof POST_STATUSES)[number]
export const POST_STATUS_UI: Record<PostStatus, { label: string; pill: string }> = {
    draft: { label: 'Brouillon', pill: 'pill pill-amber' },
    published: { label: 'Publié', pill: 'pill pill-green' },
    archived: { label: 'Archivé', pill: 'pill pill-muted' },
}

export async function listPosts(supabase: Client, businessId: string) {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, cover_url, tags, status, published_at, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false })
    if (error) throw error
    return data
}
export type Post = Awaited<ReturnType<typeof listPosts>>[number]

export type PostInput = { title: string; excerpt: string; content: string; cover_url: string; tags: string; status: PostStatus }

function clean(input: PostInput) {
    const title = input.title.trim()
    if (!title) throw new Error('Le titre est obligatoire.')
    if (!POST_STATUSES.includes(input.status)) throw new Error('Statut inconnu.')
    return {
        title,
        excerpt: input.excerpt.trim() || null,
        content: input.content.trim() || null,
        cover_url: input.cover_url.trim() || null,
        tags: input.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: input.status,
    }
}

/** Adresse de l'article tirée du titre, suffixée (-2, -3…) si elle est déjà prise dans ce commerce. */
async function freeSlug(supabase: Client, businessId: string, title: string) {
    const base = slugify(title) === 'prestation' ? 'article' : slugify(title)
    const { data, error } = await supabase.from('blog_posts').select('slug').eq('business_id', businessId).like('slug', `${base}%`)
    if (error) throw error
    const taken = new Set(data.map((p) => p.slug))
    if (!taken.has(base)) return base
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

export async function createPost(supabase: Client, businessId: string, input: PostInput, authorId: string | null) {
    const fields = clean(input)
    const { error } = await supabase
        .from('blog_posts')
        .insert({ ...fields, business_id: businessId, author_id: authorId, slug: await freeSlug(supabase, businessId, fields.title), published_at: fields.status === 'published' ? new Date().toISOString() : null })
        .select('id')
        .single()
    if (error) throw error
}

/** L'adresse (slug) n'est jamais recalculée : le site public peut déjà la référencer. */
export async function updatePost(supabase: Client, businessId: string, id: string, input: PostInput) {
    const fields = clean(input)
    const { data: current, error: readError } = await supabase.from('blog_posts').select('published_at').eq('business_id', businessId).eq('id', id).maybeSingle()
    if (readError) throw readError
    // La date de première publication est conservée.
    const published_at = fields.status === 'published' ? (current?.published_at ?? new Date().toISOString()) : (current?.published_at ?? null)
    const { data, error } = await supabase.from('blog_posts').update({ ...fields, published_at }).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

export async function deletePost(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase.from('blog_posts').delete().eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}
