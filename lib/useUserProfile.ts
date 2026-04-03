"use client";

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { BusinessType } from './businessConfig';


export interface UserProfile {
    id: string;             // users.id
    email: string;
    phone: string | null;
    dashboard_user_id: string;
    business_id: string | null;
    business_name: string | null;
    business_type: BusinessType | null;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    maps_url: string | null;
    hours: Record<string, { open: boolean; from: string; to: string }> | null;
}

export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('dashboard_user_id', user.id)
                    .single();

                if (userError || !userData) {
                    console.error('❌ Erreur récupération user:', userError);
                    setError(userError?.message ?? 'User not found');
                    return;
                }

                const { data: bizData } = await supabase
                    .from('businesses')
                    .select(`
                        id, name, address, email, phone, contact_email, contact_phone, maps_url, hours,
                        business_type:business_types (id, slug, label, catalog, catalog_label, features)
                    `)
                    .eq('owner_id', userData.id)
                    .single();

                const businessType = bizData?.business_type
                    ? (Array.isArray(bizData.business_type) ? bizData.business_type[0] : bizData.business_type)
                    : null;

                setProfile({
                    id: userData.id,
                    email: userData.email,
                    phone: userData.phone,
                    dashboard_user_id: userData.dashboard_user_id,
                    business_id: bizData?.id ?? null,
                    business_name: bizData?.name ?? null,
                    business_type: businessType ?? null,
                    address: bizData?.address ?? null,
                    contact_email: bizData?.contact_email ?? null,
                    contact_phone: bizData?.contact_phone ?? null,
                    maps_url: bizData?.maps_url ?? null,
                    hours: bizData?.hours ?? null,
                });
            } catch (err) {
                console.error('❌ Erreur:', err);
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                fetchProfile();
            }
        });

        return () => { subscription.unsubscribe(); };
    }, []);

    return { profile, loading, error };
}
