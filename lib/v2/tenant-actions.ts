'use server'

import { cookies } from 'next/headers'
import { createServerSupabase } from './supabase-server'
import { CURRENT_BUSINESS_COOKIE } from './tenant'

export async function setCurrentBusiness(businessId: string): Promise<{ ok: boolean }> {
    const supabase = await createServerSupabase()

    const { data: ids, error } = await supabase.rpc('accessible_business_ids')
    if (error || !ids?.includes(businessId)) return { ok: false }

    const cookieStore = await cookies()
    cookieStore.set(CURRENT_BUSINESS_COOKIE, businessId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
    })
    return { ok: true }
}
