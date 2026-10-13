'use client'

import { useCallback } from 'react'
import type { TablesInsert } from '@/types/supabase'
import {
    type CustomerInput,
    addCustomerNote,
    createCustomer,
    deleteCustomerNote,
    getCustomerDetail,
    listCustomers,
    setCustomerTags,
    updateCustomer,
} from '../data/customers'
import { useBusinessQuery } from './useBusinessQuery'

type CustomerSource = TablesInsert<'customers'>['source']

// Base clients du commerce courant (CLAUDE.md 5.1) : recherche, filtre et pagination côté serveur.
export function useCustomers(opts: { search?: string; source?: CustomerSource; page?: number } = {}) {
    const { search, source, page } = opts
    const fetcher = useCallback(
        (supabase: Parameters<typeof listCustomers>[0], businessId: string) =>
            listCustomers(supabase, businessId, { search, source, page }),
        [search, source, page],
    )
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(fetcher, 'customers')

    const create = useCallback(
        async (input: CustomerInput) => {
            const result = await createCustomer(supabase, businessId, input)
            if (result.created) refresh()
            return result
        },
        [supabase, businessId, refresh],
    )

    return { customers: data?.rows ?? [], total: data?.total ?? 0, loading, error, refresh, create }
}

// Fiche client avec statistiques et historique (null si introuvable ou d'un autre commerce).
export function useCustomer(id: string) {
    const fetcher = useCallback(
        (supabase: Parameters<typeof getCustomerDetail>[0], businessId: string) => getCustomerDetail(supabase, businessId, id),
        [id],
    )
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(fetcher, 'customers')

    const update = useCallback(
        async (input: CustomerInput) => {
            await updateCustomer(supabase, businessId, id, input)
            refresh()
        },
        [supabase, businessId, id, refresh],
    )

    const addNote = useCallback(
        async (content: string) => {
            const { data: session } = await supabase.auth.getSession()
            await addCustomerNote(supabase, businessId, id, content, session.session?.user.id ?? null)
            refresh()
        },
        [supabase, businessId, id, refresh],
    )
    const removeNote = useCallback(
        async (noteId: string) => {
            await deleteCustomerNote(supabase, businessId, noteId)
            refresh()
        },
        [supabase, businessId, refresh],
    )
    const setTags = useCallback(
        async (tags: string[]) => {
            await setCustomerTags(supabase, businessId, id, tags)
            refresh()
        },
        [supabase, businessId, id, refresh],
    )

    return { detail: data, loading, error, refresh, update, addNote, removeNote, setTags }
}
