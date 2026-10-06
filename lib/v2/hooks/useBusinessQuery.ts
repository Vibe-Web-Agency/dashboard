'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { useTenant } from '@/providers/TenantProvider'
import { getBrowserSupabase } from '../supabase-browser'

type Client = SupabaseClient<Database>
type RealtimeTable = keyof Database['public']['Tables']

/**
 * Charge une donnée du commerce courant (useTenant) et la recharge :
 * - quand le commerce change ou que `fetcher` change (ses dépendances) ;
 * - à chaque modification de `realtimeTable` sur ce commerce (Supabase Realtime) ;
 * - à la demande via `refresh()`.
 * `fetcher` doit être stabilisé avec useCallback.
 */
export function useBusinessQuery<T>(
    fetcher: (supabase: Client, businessId: string) => Promise<T>,
    realtimeTable?: RealtimeTable,
) {
    const { currentBusiness } = useTenant()
    const businessId = currentBusiness.id
    const supabase = getBrowserSupabase()

    const [version, setVersion] = useState(0)
    const refresh = useCallback(() => setVersion((v) => v + 1), [])

    // Chaque résultat garde la requête qui l'a produit : loading = le dernier résultat ne répond pas à la requête courante.
    const request = useMemo(() => ({ businessId, fetcher, version }), [businessId, fetcher, version])
    const [result, setResult] = useState<{ request: typeof request; data: T | null; error: Error | null } | null>(null)

    useEffect(() => {
        let stale = false
        request
            .fetcher(supabase, request.businessId)
            .then((data) => {
                if (!stale) setResult({ request, data, error: null })
            })
            .catch((e: unknown) => {
                if (stale) return
                const error = e instanceof Error ? e : new Error(String(e))
                // Garde les données déjà affichées si elles concernent le même commerce.
                setResult((prev) => ({
                    request,
                    data: prev?.request.businessId === request.businessId ? prev.data : null,
                    error,
                }))
            })
        // Ignore une réponse arrivée après un changement de commerce ou un nouveau chargement.
        return () => {
            stale = true
        }
    }, [supabase, request])

    // Jamais de données d'un autre commerce, même pendant le chargement qui suit un changement.
    const sameBusiness = result?.request.businessId === businessId
    const data = sameBusiness ? result.data : null
    const error = sameBusiness ? result.error : null
    const loading = result?.request !== request

    // Nom de canal propre à chaque instance : deux hooks montés sur la même table ne partagent pas leur canal.
    const instanceId = useId()

    useEffect(() => {
        if (!realtimeTable) return
        const channel = supabase
            .channel(`${realtimeTable}:${businessId}:${instanceId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: realtimeTable, filter: `business_id=eq.${businessId}` },
                refresh,
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, businessId, realtimeTable, refresh, instanceId])

    return { data, loading, error, refresh, supabase, businessId }
}
