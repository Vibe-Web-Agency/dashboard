'use client'

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Business, EnabledModule } from '@/lib/v2/tenant'
import type { Role } from '@/lib/v2/roles'
import { setCurrentBusiness } from '@/lib/v2/tenant-actions'

// Contexte commerce du dashboard (CLAUDE.md 3.2 et 6). Les données sont chargées côté serveur
// par app/(dashboard)/layout.tsx ; changer de commerce pose le cookie puis recharge les Server Components.

type TenantContextValue = {
    currentBusiness: Business
    currentRole: Role | null
    userBusinesses: Business[]
    /** Modules accessibles au commerce courant (enabled_modules : activés et accordés). */
    modules: EnabledModule[]
    /** Le module (slug, ex. 'reservations') est-il accessible au commerce courant ? */
    hasModule: (moduleSlug: string) => boolean
    switchBusiness: (businessId: string) => Promise<void>
    isSwitching: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
    currentBusiness,
    currentRole,
    userBusinesses,
    modules,
    children,
}: {
    currentBusiness: Business
    currentRole: Role | null
    userBusinesses: Business[]
    modules: EnabledModule[]
    children: React.ReactNode
}) {
    const router = useRouter()
    const [isSwitching, startTransition] = useTransition()

    const moduleSlugs = useMemo(() => new Set(modules.map((m) => m.slug)), [modules])
    const hasModule = useCallback((moduleSlug: string) => moduleSlugs.has(moduleSlug), [moduleSlugs])

    const switchBusiness = useCallback(
        async (businessId: string) => {
            if (businessId === currentBusiness.id) return
            const { ok } = await setCurrentBusiness(businessId)
            if (!ok) throw new Error('Commerce inaccessible')
            startTransition(() => router.refresh())
        },
        [currentBusiness.id, router],
    )

    const value = useMemo(
        () => ({ currentBusiness, currentRole, userBusinesses, modules, hasModule, switchBusiness, isSwitching }),
        [currentBusiness, currentRole, userBusinesses, modules, hasModule, switchBusiness, isSwitching],
    )

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
    const ctx = useContext(TenantContext)
    if (!ctx) throw new Error('useTenant doit être utilisé sous <TenantProvider>')
    return ctx
}
