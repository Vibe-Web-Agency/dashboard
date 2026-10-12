'use client'

import { useCallback } from 'react'
import type { QuoteStatus } from '../statuses'
import { deleteQuote, getQuote, listQuotes, updateQuoteStatus } from '../data/quotes'
import { useBusinessQuery } from './useBusinessQuery'

// Devis et demandes de devis du commerce courant (CLAUDE.md 4.2).
export function useQuotes(opts: { status?: QuoteStatus } = {}) {
    const { status } = opts
    const fetcher = useCallback(
        (supabase: Parameters<typeof listQuotes>[0], businessId: string) => listQuotes(supabase, businessId, { status }),
        [status],
    )
    const { data, loading, error, refresh, optimistic, supabase, businessId } = useBusinessQuery(fetcher, 'quotes')

    // Optimiste : le statut change à l'écran tout de suite ; le numéro éventuel arrive au rechargement.
    const setStatus = useCallback(
        (id: string, next: QuoteStatus) =>
            optimistic(
                (list) => list.map((q) => (q.id === id ? { ...q, status: next } : q)),
                () => updateQuoteStatus(supabase, businessId, id, next),
            ),
        [optimistic, supabase, businessId],
    )

    const remove = useCallback(
        async (id: string) => {
            await deleteQuote(supabase, businessId, id)
            refresh()
        },
        [supabase, businessId, refresh],
    )

    return { quotes: data ?? [], loading, error, refresh, setStatus, remove }
}

// Détail d'un devis du commerce courant (null si introuvable ou d'un autre commerce).
export function useQuote(id: string) {
    const fetcher = useCallback(
        (supabase: Parameters<typeof getQuote>[0], businessId: string) => getQuote(supabase, businessId, id),
        [id],
    )
    const { data, loading, error, refresh, optimistic, supabase, businessId } = useBusinessQuery(fetcher, 'quotes')

    const setStatus = useCallback(
        (next: QuoteStatus) =>
            optimistic(
                (q) => (q ? { ...q, status: next } : q),
                () => updateQuoteStatus(supabase, businessId, id, next),
            ),
        [optimistic, supabase, businessId, id],
    )

    const remove = useCallback(() => deleteQuote(supabase, businessId, id), [supabase, businessId, id])

    return { quote: data, loading, error, refresh, setStatus, remove }
}
