'use client'

import { useCallback } from 'react'
import { type ServiceInput, createService, deleteService, listServices, setServiceActive, updateService } from '../data/services'
import { useBusinessQuery } from './useBusinessQuery'

// Prestations réservables du commerce courant (module `services`). Table non publiée en Realtime :
// la liste se recharge après chaque modification faite ici.
export function useServices() {
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(listServices)

    const run = useCallback(
        async <T,>(action: () => Promise<T>) => {
            try {
                return await action()
            } finally {
                refresh()
            }
        },
        [refresh],
    )

    return {
        services: data ?? [],
        loading,
        error,
        refresh,
        create: (input: ServiceInput) => run(() => createService(supabase, businessId, input)),
        update: (id: string, input: ServiceInput) => run(() => updateService(supabase, businessId, id, input)),
        setActive: (id: string, isActive: boolean) => run(() => setServiceActive(supabase, businessId, id, isActive)),
        remove: (id: string) => run(() => deleteService(supabase, businessId, id)),
    }
}
