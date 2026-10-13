import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { assertTouched } from './errors'

// Équipe présentée sur le site et utilisée pour les réservations (module `team`, table `employees`).
// À ne pas confondre avec les accès au dashboard (`memberships`, dans les paramètres).
// Écriture : rôle administrator et plus (RLS).

type Client = SupabaseClient<Database>

export async function listEmployees(supabase: Client, businessId: string) {
    const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, job_title, bio, avatar_url, email, show_on_site, is_active, position')
        .eq('business_id', businessId)
        .order('position')
        .order('first_name')
    if (error) throw error
    return data
}
export type Employee = Awaited<ReturnType<typeof listEmployees>>[number]

/** `email` : pour envoyer le planning à la personne. Jamais montré sur le site (colonne fermée aux visiteurs). */
export type EmployeeInput = { first_name: string; last_name: string; job_title: string; bio: string; avatar_url: string; email: string }

function clean(input: EmployeeInput) {
    const first_name = input.first_name.trim()
    const last_name = input.last_name.trim()
    if (!first_name && !last_name) throw new Error('Le prénom ou le nom est obligatoire.')
    const email = input.email.trim().toLowerCase()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("L'adresse email n'est pas valide.")
    return { first_name: first_name || null, last_name: last_name || null, job_title: input.job_title.trim() || null, bio: input.bio.trim() || null, avatar_url: input.avatar_url.trim() || null, email: email || null }
}

export async function createEmployee(supabase: Client, businessId: string, input: EmployeeInput) {
    const { data: last } = await supabase.from('employees').select('position').eq('business_id', businessId).order('position', { ascending: false }).limit(1)
    const { error } = await supabase.from('employees').insert({ ...clean(input), business_id: businessId, position: (last?.[0]?.position ?? -1) + 1 }).select('id').single()
    if (error) throw error
}

export async function updateEmployee(supabase: Client, businessId: string, id: string, patch: Partial<EmployeeInput> & { show_on_site?: boolean; is_active?: boolean }) {
    const { show_on_site, is_active, ...text } = patch
    const fields = 'first_name' in text ? clean(text as EmployeeInput) : {}
    const { data, error } = await supabase
        .from('employees')
        .update({ ...fields, ...(show_on_site === undefined ? {} : { show_on_site }), ...(is_active === undefined ? {} : { is_active }) })
        .eq('business_id', businessId)
        .eq('id', id)
        .select('id')
    if (error) throw error
    assertTouched(data)
}

/** Refusé si la personne est liée à des réservations ou à un planning : on la désactive à la place. */
export async function deleteEmployee(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase.from('employees').delete().eq('business_id', businessId).eq('id', id).select('id')
    if (error?.code === '23503') throw new Error('Cette personne est liée à des réservations ou à un planning : désactivez-la plutôt que de la supprimer.')
    if (error) throw error
    assertTouched(data)
}
