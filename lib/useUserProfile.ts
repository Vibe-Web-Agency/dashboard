"use client";

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface UserProfile {
    id: string;
    email: string;
    business_name: string | null;
    business_type: string | null;
    phone: string | null;
    address: string | null;
    dashboard_user_id: string;
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

                console.log('🔐 Auth user:', user?.id, user?.email);

                if (!user) {
                    console.log('❌ Pas d\'utilisateur connecté');
                    setLoading(false);
                    return;
                }

                // 2. Récupérer le profil métier lié
                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('dashboard_user_id', user.id)
                    .single();

                console.log('👤 Profil trouvé:', profileData);
                console.log('👤 Profile ID (users.id):', profileData?.id);

                if (profileError) {
                    console.error('❌ Erreur récupération profil:', profileError);
                    setError(profileError.message);
                } else {
                    setProfile(profileData);
                }
            } catch (err) {
                console.error('❌ Erreur:', err);
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        // Écouter les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchProfile();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { profile, loading, error };
}
