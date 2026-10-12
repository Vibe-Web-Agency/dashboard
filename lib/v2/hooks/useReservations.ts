'use client'

import { useCallback } from 'react'
import type { ReservationStatus } from '../statuses'
import {
    type ManualReservationInput,
    type ReservationScope,
    createManualReservation,
    deleteReservation,
    getReservation,
    listReservations,
    updateReservationStatus,
} from '../data/reservations'
import { useBusinessQuery } from './useBusinessQuery'

// Réservations du commerce courant (CLAUDE.md 4.1).
export function useReservations(opts: { scope?: ReservationScope; status?: ReservationStatus } = {}) {
    const { scope, status } = opts
    const fetcher = useCallback(
        (supabase: Parameters<typeof listReservations>[0], businessId: string) =>
            listReservations(supabase, businessId, { scope, status }),
        [scope, status],
    )
    const { data, loading, error, refresh, optimistic, supabase, businessId } = useBusinessQuery(fetcher, 'reservations')

    // Optimiste : le statut change à l'écran tout de suite, puis la liste se resynchronise.
    const setStatus = useCallback(
        (id: string, next: ReservationStatus) =>
            optimistic(
                (list) => list.map((r) => (r.id === id ? { ...r, status: next } : r)),
                () => updateReservationStatus(supabase, businessId, id, next),
            ),
        [optimistic, supabase, businessId],
    )

    const create = useCallback(
        async (input: ManualReservationInput) => {
            const { data: { user } } = await supabase.auth.getUser()
            const id = await createManualReservation(supabase, businessId, input, user?.id ?? null)
            refresh()
            return id
        },
        [supabase, businessId, refresh],
    )

    const remove = useCallback(
        async (id: string) => {
            await deleteReservation(supabase, businessId, id)
            refresh()
        },
        [supabase, businessId, refresh],
    )

    return { reservations: data ?? [], loading, error, refresh, setStatus, create, remove }
}

// Détail d'une réservation du commerce courant (null si introuvable ou d'un autre commerce).
export function useReservation(id: string) {
    const fetcher = useCallback(
        (supabase: Parameters<typeof getReservation>[0], businessId: string) => getReservation(supabase, businessId, id),
        [id],
    )
    const { data, loading, error, refresh, optimistic, supabase, businessId } = useBusinessQuery(fetcher, 'reservations')

    const setStatus = useCallback(
        (next: ReservationStatus) =>
            optimistic(
                (r) => (r ? { ...r, status: next } : r),
                () => updateReservationStatus(supabase, businessId, id, next),
            ),
        [optimistic, supabase, businessId, id],
    )

    const remove = useCallback(() => deleteReservation(supabase, businessId, id), [supabase, businessId, id])

    return { reservation: data, loading, error, refresh, setStatus, remove }
}
