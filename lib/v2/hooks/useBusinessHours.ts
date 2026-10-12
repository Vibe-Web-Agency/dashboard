'use client'

import { listBusinessHours } from '../data/businesses'
import { useBusinessQuery } from './useBusinessQuery'

// Horaires d'ouverture du commerce courant (business_hours), pour proposer des créneaux.
export function useBusinessHours() {
    const { data, loading, error } = useBusinessQuery(listBusinessHours)
    return { hours: data ?? [], loading, error }
}
