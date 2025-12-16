"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    Save,
    LogOut,
    Lock,
    Check,
    AlertTriangle,
    Eye,
    EyeOff,
    Briefcase,
    Pencil,
    X
} from "lucide-react";

export default function SettingsPage() {
    const router = useRouter();
    const { profile, loading: profileLoading } = useUserProfile();

    // Profile form state
    const [formData, setFormData] = useState({
        business_name: "",
        business_type: "",
        email: "",
        phone: "",
        address: ""
    });
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    // Logout state
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // Load profile data into form
    useEffect(() => {
        if (profile) {
            setFormData({
                business_name: profile.business_name || "",
                business_type: profile.business_type || "",
                email: profile.email || "",
                phone: profile.phone || "",
                address: profile.address || ""
            });
        }
    }, [profile]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        setSaving(true);
        setSaveSuccess(false);
        setSaveError(null);

        const { error } = await supabase
            .from("users")
            .update({
                business_name: formData.business_name || null,
                business_type: formData.business_type || null,
                email: formData.email,
                phone: formData.phone || null,
                address: formData.address || null
            })
            .eq("id", profile.id);

        if (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            setSaveError(error.message);
        } else {
            setSaveSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
        setSaving(false);
    };

    const handleCancelEdit = () => {
        // Reset form data to original profile values
        if (profile) {
            setFormData({
                business_name: profile.business_name || "",
                business_type: profile.business_type || "",
                email: profile.email || "",
                phone: profile.phone || "",
                address: profile.address || ""
            });
        }
        setIsEditing(false);
        setSaveError(null);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordData.currentPassword) {
            setPasswordError("Veuillez entrer votre mot de passe actuel");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("Les nouveaux mots de passe ne correspondent pas");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères");
            return;
        }

        if (passwordData.currentPassword === passwordData.newPassword) {
            setPasswordError("Le nouveau mot de passe doit être différent de l'ancien");
            return;
        }

        setChangingPassword(true);
        setPasswordSuccess(false);
        setPasswordError(null);

        // 1. Vérifier l'ancien mot de passe en tentant une connexion
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            setPasswordError("Impossible de récupérer l'utilisateur actuel");
            setChangingPassword(false);
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordData.currentPassword
        });

        if (signInError) {
            console.error("Erreur de vérification du mot de passe:", signInError);
            setPasswordError("Mot de passe actuel incorrect");
            setChangingPassword(false);
            return;
        }

        // 2. Si l'ancien mot de passe est correct, changer le mot de passe
        const { error } = await supabase.auth.updateUser({
            password: passwordData.newPassword
        });

        if (error) {
            console.error("Erreur lors du changement de mot de passe:", error);
            setPasswordError(error.message);
        } else {
            setPasswordSuccess(true);
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => setPasswordSuccess(false), 3000);
        }
        setChangingPassword(false);
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div
                    className="animate-spin w-8 h-8 border-2 rounded-full"
                    style={{
                        borderColor: '#8b5cf6',
                        borderTopColor: 'transparent'
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1
                    className="text-3xl font-bold"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    Paramètres
                </h1>
                <p className="mt-1" style={{ color: '#a1a1aa' }}>
                    Gérez les paramètres de votre compte
                </p>
            </div>

            {/* Profile Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                        >
                            <User className="w-5 h-5" style={{ color: '#818cf8' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                Informations du profil
                            </h2>
                            <p className="text-sm" style={{ color: '#71717a' }}>
                                {isEditing ? "Modifiez les informations de votre entreprise" : "Informations de votre entreprise"}
                            </p>
                        </div>
                    </div>
                    {!isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2"
                            style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            <Pencil className="w-4 h-4" />
                            Modifier mes informations
                        </Button>
                    )}
                </div>

                {/* Read-only mode */}
                {!isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                className="p-4 rounded-lg"
                                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Building2 className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    <span className="text-sm" style={{ color: '#71717a' }}>Nom de l'entreprise</span>
                                </div>
                                <p className="font-medium" style={{ color: '#ffffff' }}>
                                    {formData.business_name || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                                </p>
                            </div>
                            <div
                                className="p-4 rounded-lg"
                                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Briefcase className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    <span className="text-sm" style={{ color: '#71717a' }}>Type d'activité</span>
                                </div>
                                <p className="font-medium" style={{ color: '#ffffff' }}>
                                    {formData.business_type || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                                </p>
                            </div>
                        </div>

                        <div
                            className="p-4 rounded-lg"
                            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Mail className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                <span className="text-sm" style={{ color: '#71717a' }}>Email</span>
                            </div>
                            <p className="font-medium" style={{ color: '#ffffff' }}>
                                {formData.email || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                className="p-4 rounded-lg"
                                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Phone className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    <span className="text-sm" style={{ color: '#71717a' }}>Téléphone</span>
                                </div>
                                <p className="font-medium" style={{ color: '#ffffff' }}>
                                    {formData.phone || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                                </p>
                            </div>
                            <div
                                className="p-4 rounded-lg"
                                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    <span className="text-sm" style={{ color: '#71717a' }}>Adresse</span>
                                </div>
                                <p className="font-medium" style={{ color: '#ffffff' }}>
                                    {formData.address || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                                </p>
                            </div>
                        </div>

                        {saveSuccess && (
                            <div
                                className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}
                            >
                                <Check className="w-4 h-4" />
                                Profil mis à jour avec succès !
                            </div>
                        )}
                    </div>
                ) : (
                    /* Edit mode */
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Building2 className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    Nom de l'entreprise
                                </Label>
                                <Input
                                    value={formData.business_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                                    placeholder="Mon entreprise"
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Briefcase className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    Type d'activité
                                </Label>
                                <Input
                                    value={formData.business_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))}
                                    placeholder="Coiffure, Restaurant, etc."
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                <Mail className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                Email
                            </Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="contact@entreprise.com"
                                className="mt-1"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Phone className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    Téléphone
                                </Label>
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="06 12 34 56 78"
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <MapPin className="w-4 h-4" style={{ color: '#a78bfa' }} />
                                    Adresse
                                </Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="123 Rue Example, 75001 Paris"
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                        </div>

                        {saveError && (
                            <div
                                className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                {saveError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex items-center gap-2"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#a1a1aa',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <X className="w-4 h-4" />
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 font-semibold"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#ffffff'
                                }}
                            >
                                {saving ? (
                                    <>
                                        <div
                                            className="animate-spin w-4 h-4 border-2 rounded-full"
                                            style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                                        />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Enregistrer les modifications
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* Password Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                    >
                        <Lock className="w-5 h-5" style={{ color: '#a78bfa' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                            Sécurité
                        </h2>
                        <p className="text-sm" style={{ color: '#71717a' }}>
                            Modifiez votre mot de passe
                        </p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <Label style={{ color: '#e4e4e7' }}>Mot de passe actuel</Label>
                        <div className="relative mt-1">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                placeholder="••••••••"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff',
                                    paddingRight: '40px'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: '#71717a' }}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label style={{ color: '#e4e4e7' }}>Nouveau mot de passe</Label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                placeholder="••••••••"
                                className="mt-1"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                        <div>
                            <Label style={{ color: '#e4e4e7' }}>Confirmer le nouveau mot de passe</Label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                placeholder="••••••••"
                                className="mt-1"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                    </div>

                    {passwordError && (
                        <div
                            className="flex items-center gap-2 p-3 rounded-lg text-sm"
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {passwordError}
                        </div>
                    )}

                    {passwordSuccess && (
                        <div
                            className="flex items-center gap-2 p-3 rounded-lg text-sm"
                            style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#22c55e',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}
                        >
                            <Check className="w-4 h-4" />
                            Mot de passe modifié avec succès !
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                        className="flex items-center gap-2"
                        style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        {changingPassword ? (
                            <>
                                <div
                                    className="animate-spin w-4 h-4 border-2 rounded-full"
                                    style={{ borderColor: '#a78bfa', borderTopColor: 'transparent' }}
                                />
                                Vérification et modification...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4" />
                                Changer le mot de passe
                            </>
                        )}
                    </Button>
                </form>
            </div>

            {/* Danger Zone */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                    >
                        <LogOut className="w-5 h-5" style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                            Session
                        </h2>
                        <p className="text-sm" style={{ color: '#71717a' }}>
                            Gérez votre session active
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-2"
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                </Button>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowLogoutModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl p-6"
                        style={{
                            background: 'linear-gradient(145deg, rgba(24, 24, 36, 0.98), rgba(18, 18, 26, 0.98))',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                            >
                                <LogOut className="w-6 h-6" style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                    Se déconnecter ?
                                </h3>
                                <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                    Vous serez redirigé vers la page de connexion
                                </p>
                            </div>
                        </div>

                        <p className="mb-6" style={{ color: '#a1a1aa' }}>
                            Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
                        </p>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#a1a1aa',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="flex-1 flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#ffffff',
                                    fontWeight: 600
                                }}
                            >
                                {loggingOut ? (
                                    <>
                                        <div
                                            className="animate-spin w-4 h-4 border-2 rounded-full"
                                            style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                                        />
                                        Déconnexion...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="w-4 h-4" />
                                        Se déconnecter
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
