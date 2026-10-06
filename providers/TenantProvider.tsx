'use client'

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Business } from '@/lib/v2/tenant'
import type { Role } from '@/lib/v2/roles'
import { setCurrentBusiness } from '@/lib/v2/tenant-actions'

// Contexte commerce du dashboard (CLAUDE.md, 3.2). Les données sont chargées côté serveur
// par app/(dashboard)/layout.tsx ; changer de commerce pose le cookie puis recharge les Server Components.

type TenantContextValue = {
    currentBusiness: Business
    currentRole: Role | null
    userBusinesses: Business[]
    switchBusiness: (businessId: string) => Promise<void>
    isSwitching: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
    currentBusiness,
    currentRole,
    userBusinesses,
    children,
}: {
    currentBusiness: Business
    currentRole: Role | null
    userBusinesses: Business[]
    children: React.ReactNode
}) {
    const router = useRouter()
    const [isSwitching, startTransition] = useTransition()

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
        () => ({ currentBusiness, currentRole, userBusinesses, switchBusiness, isSwitching }),
        [currentBusiness, currentRole, userBusinesses, switchBusiness, isSwitching],
    )

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
    const ctx = useContext(TenantContext)
    if (!ctx) throw new Error('useTenant doit être utilisé sous <TenantProvider>')
    return ctx
}
