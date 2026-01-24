"use client";

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Database } from './database.types';

export interface UserProfile {
    id: string; // users.id (public profile id)
    email: string;
    business_name: string | null;
    business_type: string | null;
    phone: string | null;
    address: string | null;
    dashboard_user_id: string; // auth.users.id
    business_id: string | null; // from team_members
}

export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // 1. Récupérer l'utilisateur auth connecté
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                // 2. Récupérer le profil depuis la table USERS + team_members
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select(`
                        *,
                        team_members (
                            business_id,
                            role,
                            business:businesses (
                                name,
                                business_type,
                                address
                            )
                        )
                    `)
                    .eq('dashboard_user_id', user.id)
                    .single();

                if (userError) {
                    console.error('❌ Erreur récupération profil user:', userError);
                    setError(userError.message);
                } else if (userData) {
                    // Extraction des infos business via team_members (si existant)
                    const teamMember = Array.isArray(userData.team_members)
                        ? userData.team_members[0]
                        : userData.team_members;

                    // @ts-ignore
                    const business = teamMember?.business;

                    setProfile({
                        // @ts-ignore
                        id: userData.id,
                        // @ts-ignore
                        email: userData.email,
                        // @ts-ignore
                        business_name: business?.name ?? userData.business_name,
                        // @ts-ignore
                        business_type: business?.business_type ?? userData.business_type,
                        // @ts-ignore
                        phone: userData.phone,
                        // @ts-ignore
                        address: business?.address ?? userData.address,
                        // @ts-ignore
                        dashboard_user_id: userData.dashboard_user_id,
                        // @ts-ignore
                        business_id: teamMember?.business_id ?? null
                    });
                }
            } catch (err) {
                console.error('❌ Erreur:', err);
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchProfile();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { profile, loading, error };
}
