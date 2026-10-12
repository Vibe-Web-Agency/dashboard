import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { assertTouched } from './errors'

// Support (tables `tickets` et `ticket_messages`) : le commerce écrit à son agence, l'agence répond depuis /admin.
// Côté commerce, tout passe sous la session (RLS : member et plus pour écrire, messages internes invisibles).
// Côté agence, les mêmes fonctions de lecture servent avec la clé de service.

type Client = SupabaseClient<Database>

export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]
/** Libellés vus par le commerce. `open` : la balle est chez l'agence ; `pending` : elle est chez le commerce. */
export const TICKET_STATUS_UI: Record<TicketStatus, { label: string; adminLabel: string; pill: string }> = {
    open: { label: 'En attente du support', adminLabel: 'À traiter', pill: 'pill pill-amber' },
    pending: { label: 'Réponse reçue', adminLabel: 'Répondu', pill: 'pill pill-blue' },
    resolved: { label: 'Résolu', adminLabel: 'Résolu', pill: 'pill pill-green' },
    closed: { label: 'Fermé', adminLabel: 'Fermé', pill: 'pill pill-muted' },
}

const TICKET_SELECT = 'id, agency_id, business_id, subject, status, priority, opened_by, last_message_at, created_at' as const

export async function listTickets(supabase: Client, businessId: string) {
    const { data, error } = await supabase.from('tickets').select(TICKET_SELECT).eq('business_id', businessId).order('last_message_at', { ascending: false, nullsFirst: false })
    if (error) throw error
    return data
}
export type Ticket = Awaited<ReturnType<typeof listTickets>>[number]

export async function listTicketMessages(supabase: Client, ticketId: string) {
    const { data, error } = await supabase.from('ticket_messages').select('id, author_id, body, is_internal, created_at').eq('ticket_id', ticketId).order('created_at')
    if (error) throw error
    return data
}
export type TicketMessage = Awaited<ReturnType<typeof listTicketMessages>>[number]

function cleanBody(body: string) {
    const text = body.trim()
    if (!text) throw new Error('Le message est vide.')
    if (text.length > 5000) throw new Error('Le message est trop long (5 000 caractères maximum).')
    return text
}

/** Ouvre une demande au nom du commerce, avec son premier message. */
export async function createTicket(supabase: Client, business: { id: string; agency_id: string }, userId: string, subject: string, body: string) {
    const title = subject.trim()
    if (!title) throw new Error("L'objet est obligatoire.")
    const text = cleanBody(body)
    const now = new Date().toISOString()
    const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({ agency_id: business.agency_id, business_id: business.id, level: 'agency', subject: title, status: 'open', opened_by: userId, last_message_at: now })
        .select('id')
        .single()
    if (error) throw error
    const { error: messageError } = await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, author_id: userId, body: text })
    if (messageError) throw messageError
    return ticket.id
}

/**
 * Ajoute un message. `nextStatus` : `open` quand le commerce écrit (à traiter par l'agence),
 * `pending` quand l'agence répond.
 */
export async function replyToTicket(supabase: Client, ticketId: string, userId: string, body: string, nextStatus: TicketStatus) {
    const text = cleanBody(body)
    const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticketId, author_id: userId, body: text })
    if (error) throw error
    const { data, error: updateError } = await supabase.from('tickets').update({ status: nextStatus, last_message_at: new Date().toISOString() }).eq('id', ticketId).select('id')
    if (updateError) throw updateError
    assertTouched(data)
}

export async function setTicketStatus(supabase: Client, ticketId: string, status: TicketStatus) {
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('tickets')
        .update({ status, ...(status === 'resolved' ? { resolved_at: now } : {}), ...(status === 'closed' ? { closed_at: now } : {}) })
        .eq('id', ticketId)
        .select('id')
    if (error) throw error
    assertTouched(data)
}

/** Toutes les demandes, pour l'agence (clé de service), avec le nom du commerce. */
export async function listAllTickets(db: Client) {
    const [tickets, businesses] = await Promise.all([
        db.from('tickets').select(TICKET_SELECT).order('last_message_at', { ascending: false, nullsFirst: false }),
        db.from('businesses').select('id, name'),
    ])
    if (tickets.error) throw tickets.error
    if (businesses.error) throw businesses.error
    const name = new Map(businesses.data.map((b) => [b.id, b.name]))
    return tickets.data.map((t) => ({ ...t, businessName: t.business_id ? (name.get(t.business_id) ?? '—') : 'Agence' }))
}
