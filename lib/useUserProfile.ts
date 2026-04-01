"use client";

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

type TeamMemberWithBusiness = {
    business_id: string | null;
    role: string | null;
    business: {
        name: string | null;
        business_type: string | null;
        address: string | null;
    } | null;
};

type UserWithTeam = {
    id: string;
    email: string;
    business_name: string | null;
    business_type: string | null;
    phone: string | null;
    address: string | null;
    dashboard_user_id: string;
    created_at: string;
    team_members: TeamMemberWithBusiness[] | TeamMemberWithBusiness | null;
};

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
                    const typed = userData as unknown as UserWithTeam;
                    const teamMember = Array.isArray(typed.team_members)
                        ? typed.team_members[0]
                        : typed.team_members;

                    const business = teamMember?.business ?? null;

                    setProfile({
                        id: typed.id,
                        email: typed.email,
                        business_name: business?.name ?? typed.business_name,
                        business_type: business?.business_type ?? typed.business_type,
                        phone: typed.phone,
                        address: business?.address ?? typed.address,
                        dashboard_user_id: typed.dashboard_user_id,
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
