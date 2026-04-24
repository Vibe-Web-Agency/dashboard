"use client";

import { supabase } from "@/lib/supabase";
import { inputStyle } from "@/lib/sharedStyles";
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
    CheckCircle,
    AlertTriangle,
    Eye,
    EyeOff,
    Briefcase,
    Pencil,
    X,
    Clock,
    CreditCard,
    ExternalLink,
} from "lucide-react";

type DayKey = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
interface DaySchedule { open: boolean; from: string; to: string; }
type HoursContent = Record<DayKey, DaySchedule>;
const DAYS: DayKey[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DEFAULT_HOURS: HoursContent = {
    lundi:    { open: true,  from: "09:00", to: "19:00" },
    mardi:    { open: true,  from: "09:00", to: "19:00" },
    mercredi: { open: true,  from: "09:00", to: "19:00" },
    jeudi:    { open: true,  from: "09:00", to: "19:00" },
    vendredi: { open: true,  from: "09:00", to: "19:00" },
    samedi:   { open: true,  from: "10:00", to: "18:00" },
    dimanche: { open: false, from: "",      to: ""      },
};

export default function SettingsPage() {
    const router = useRouter();
    const { profile, loading: profileLoading } = useUserProfile();

    const [formData, setFormData] = useState({
        business_name: "",
        business_type: "",
        email: "",
        phone: "",
        address: "",
        contact_email: "",
        contact_phone: "",
        maps_url: "",
    });
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [accountData, setAccountData] = useState({ email: "", phone: "" });
    const [savingAccount, setSavingAccount] = useState(false);
    const [saveAccountSuccess, setSaveAccountSuccess] = useState(false);
    const [saveAccountError, setSaveAccountError] = useState<string | null>(null);
    const [onboardingReset, setOnboardingReset] = useState(false);

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [openingPortal, setOpeningPortal] = useState(false);
    const [portalError, setPortalError] = useState(false);

    const handlePortal = async () => {
        setOpeningPortal(true);
        setPortalError(false);
        const res = await fetch("/api/billing/portal", { method: "POST" });
        const { url } = await res.json();
        if (url) window.open(url, "_blank");
        else setPortalError(true);
        setOpeningPortal(false);
    };
    const [loggingOut, setLoggingOut] = useState(false);

    const [hours, setHours] = useState<HoursContent>(DEFAULT_HOURS);
    const [savingHours, setSavingHours] = useState(false);
    const [savedHours, setSavedHours] = useState(false);

    useEffect(() => {
        if (profile) {
            if ((profile as any).hours) setHours((profile as any).hours as HoursContent);
            setAccountData({ email: profile.email || "", phone: profile.phone || "" });
            setFormData({
                business_name: profile.business_name || "",
                business_type: profile.business_type?.label || "",
                email: profile.email || "",
                phone: profile.phone || "",
                address: profile.address || "",
                contact_email: (profile as any).contact_email || "",
                contact_phone: (profile as any).contact_phone || "",
                maps_url: (profile as any).maps_url || "",
            });
        }
    }, [profile]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !profile?.business_id) return;

        setSaving(true);
        setSaveSuccess(false);
        setSaveError(null);

        const [{ error: userError }, { error: bizError }] = await Promise.all([
            supabase
                .from("users")
                .update({ email: formData.email, phone: formData.phone || null })
                .eq("id", profile.id),
            supabase
                .from("businesses")
                .update({
                    name: formData.business_name || null,
                    address: formData.address || null,
                    contact_email: formData.contact_email || null,
                    phone: formData.contact_phone || null,
                    maps_url: formData.maps_url || null,
                })
                .eq("id", profile.business_id),
        ]);

        const error = userError || bizError;
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
        if (profile) {
            setFormData({
                business_name: profile.business_name || "",
                business_type: profile.business_type?.label || "",
                email: profile.email || "",
                phone: profile.phone || "",
                address: profile.address || "",
                contact_email: (profile as any).contact_email || "",
                contact_phone: (profile as any).contact_phone || "",
                maps_url: (profile as any).maps_url || "",
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

    const handleSaveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        setSavingAccount(true);
        setSaveAccountError(null);
        const { error } = await supabase
            .from("users")
            .update({ email: accountData.email, phone: accountData.phone || null })
            .eq("id", profile.id);
        if (error) {
            setSaveAccountError(error.message);
        } else {
            setSaveAccountSuccess(true);
            setIsEditingAccount(false);
            setTimeout(() => setSaveAccountSuccess(false), 3000);
        }
        setSavingAccount(false);
    };

    const handleResetOnboarding = () => {
        if (!profile?.business_id) return;
        localStorage.removeItem(`onboarding_done_${profile.business_id}`);
        setOnboardingReset(true);
        setTimeout(() => setOnboardingReset(false), 3000);
    };

    const handleSaveHours = async () => {
        if (!profile?.business_id) return;
        setSavingHours(true);
        await supabase.from("businesses").update({ hours: hours as any }).eq("id", profile.business_id);
        setSavingHours(false);
        setSavedHours(true);
        setTimeout(() => setSavedHours(false), 2000);
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
                        borderColor: '#FFC745',
                        borderTopColor: 'transparent'
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold"
                    style={{ color: '#FFC745' }}
                >
                    Paramètres
                </h1>
                <p className="mt-1" style={{ color: '#c3c3d4' }}>
                    Gérez les paramètres de votre compte
                </p>
            </div>

            {/* Section Compte */}
            <div className="rounded-xl p-6" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 199, 69, 0.15)' }}>
                            <User className="w-5 h-5" style={{ color: '#FFC745' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Mon compte</h2>
                            <p className="text-sm" style={{ color: '#c3c3d4' }}>Identifiants de connexion</p>
                        </div>
                    </div>
                    {!isEditingAccount && (
                        <Button onClick={() => setIsEditingAccount(true)} className="flex items-center gap-2"
                            style={{ background: 'rgba(255, 199, 69, 0.15)', color: '#FFC745', border: '1px solid rgba(255, 199, 69, 0.3)' }}>
                            <Pencil className="w-4 h-4" /> Modifier
                        </Button>
                    )}
                </div>

                {!isEditingAccount ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: Mail, label: "Email", value: accountData.email },
                                { icon: Phone, label: "Téléphone", value: accountData.phone },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="p-4 rounded-lg" style={{ background: 'rgba(0, 255, 145, 0.03)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className="w-4 h-4" style={{ color: '#FFC745' }} />
                                        <span className="text-sm" style={{ color: '#c3c3d4' }}>{label}</span>
                                    </div>
                                    <p className="font-medium" style={{ color: '#ffffff' }}>
                                        {value || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {saveAccountSuccess && (
                            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <Check className="w-4 h-4" /> Compte mis à jour avec succès !
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSaveAccount} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Mail className="w-4 h-4" style={{ color: '#FFC745' }} /> Email
                                </Label>
                                <Input type="email" value={accountData.email}
                                    onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="vous@exemple.com" className="mt-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Phone className="w-4 h-4" style={{ color: '#FFC745' }} /> Téléphone
                                </Label>
                                <Input type="tel" value={accountData.phone}
                                    onChange={(e) => setAccountData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="06 12 34 56 78" className="mt-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                        </div>
                        {saveAccountError && (
                            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <AlertTriangle className="w-4 h-4" /> {saveAccountError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button type="button" onClick={() => { setIsEditingAccount(false); setSaveAccountError(null); setAccountData({ email: profile?.email || "", phone: profile?.phone || "" }); }}
                                className="flex items-center gap-2"
                                style={{ background: 'rgba(0, 255, 145, 0.05)', color: '#c3c3d4', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                <X className="w-4 h-4" /> Annuler
                            </Button>
                            <Button type="submit" disabled={savingAccount} className="flex items-center gap-2 font-semibold"
                                style={{ background: '#FFC745', color: '#001C1C' }}>
                                {savingAccount ? (
                                    <><div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: '#001C1C', borderTopColor: 'transparent' }} /> Enregistrement...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Enregistrer</>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* Section Entreprise */}
            <div className="rounded-xl p-6" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 199, 69, 0.15)' }}>
                            <Building2 className="w-5 h-5" style={{ color: '#FFC745' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Mon entreprise</h2>
                            <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                {isEditing ? "Modifiez les informations de votre entreprise" : "Informations et coordonnées publiques"}
                            </p>
                        </div>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2"
                            style={{ background: 'rgba(255, 199, 69, 0.15)', color: '#FFC745', border: '1px solid rgba(255, 199, 69, 0.3)' }}>
                            <Pencil className="w-4 h-4" /> Modifier
                        </Button>
                    )}
                </div>

                {!isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: Building2, label: "Nom de l'entreprise", value: formData.business_name },
                                { icon: Briefcase, label: "Type d'activité", value: formData.business_type },
                                { icon: MapPin, label: "Adresse", value: formData.address },
                                { icon: Mail, label: "Email de contact", value: formData.contact_email },
                                { icon: Phone, label: "Téléphone de contact", value: formData.contact_phone },
                                { icon: MapPin, label: "Lien Google Maps", value: formData.maps_url },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="p-4 rounded-lg" style={{ background: 'rgba(0, 255, 145, 0.03)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className="w-4 h-4" style={{ color: '#FFC745' }} />
                                        <span className="text-sm" style={{ color: '#c3c3d4' }}>{label}</span>
                                    </div>
                                    <p className="font-medium" style={{ color: '#ffffff' }}>
                                        {value || <span style={{ color: '#52525b', fontStyle: 'italic' }}>Non renseigné</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {saveSuccess && (
                            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <Check className="w-4 h-4" /> Entreprise mise à jour avec succès !
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Building2 className="w-4 h-4" style={{ color: '#FFC745' }} /> Nom de l&apos;entreprise
                                </Label>
                                <Input value={formData.business_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                                    placeholder="Mon entreprise" className="mt-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Briefcase className="w-4 h-4" style={{ color: '#FFC745' }} /> Type d&apos;activité
                                </Label>
                                <div className="mt-1 px-3 py-2 rounded-md text-sm flex items-center gap-2"
                                    style={{ background: 'rgba(0, 255, 145, 0.02)', border: '1px solid rgba(0, 255, 145, 0.06)', color: '#71717a' }}>
                                    <Lock className="w-3 h-3 shrink-0" />
                                    <span>{formData.business_type || "Non renseigné"}</span>
                                    <span className="ml-auto text-xs" style={{ color: '#52525b' }}>Non modifiable</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                <MapPin className="w-4 h-4" style={{ color: '#FFC745' }} /> Adresse
                            </Label>
                            <Input value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="123 Rue Example, 75001 Paris" className="mt-1"
                                style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Mail className="w-4 h-4" style={{ color: '#FFC745' }} /> Email de contact
                                </Label>
                                <Input type="email" value={formData.contact_email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                                    placeholder="contact@monbusiness.com" className="mt-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                    <Phone className="w-4 h-4" style={{ color: '#FFC745' }} /> Téléphone de contact
                                </Label>
                                <Input type="tel" value={formData.contact_phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                    placeholder="06 12 34 56 78" className="mt-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                        </div>

                        <div>
                            <Label className="flex items-center gap-2" style={{ color: '#e4e4e7' }}>
                                <MapPin className="w-4 h-4" style={{ color: '#FFC745' }} /> Lien Google Maps
                            </Label>
                            <Input value={formData.maps_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, maps_url: e.target.value }))}
                                placeholder="https://maps.google.com/..." className="mt-1"
                                style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                        </div>

                        {saveError && (
                            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <AlertTriangle className="w-4 h-4" /> {saveError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button type="button" onClick={handleCancelEdit} className="flex items-center gap-2"
                                style={{ background: 'rgba(0, 255, 145, 0.05)', color: '#c3c3d4', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                <X className="w-4 h-4" /> Annuler
                            </Button>
                            <Button type="submit" disabled={saving} className="flex items-center gap-2 font-semibold"
                                style={{ background: '#FFC745', color: '#001C1C' }}>
                                {saving ? (
                                    <><div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: '#001C1C', borderTopColor: 'transparent' }} /> Enregistrement...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Enregistrer</>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* Section Horaires */}
            <div className="rounded-xl p-6" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 199, 69, 0.15)' }}>
                        <Clock className="w-5 h-5" style={{ color: '#FFC745' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Horaires d&apos;ouverture</h2>
                        <p className="text-sm" style={{ color: '#c3c3d4' }}>Affiché sur votre site</p>
                    </div>
                </div>
                <div className="space-y-2">
                    {DAYS.map(day => (
                        <div key={day} className="flex items-center gap-3">
                            <span className="w-24 text-sm capitalize shrink-0" style={{ color: hours[day].open ? "#ffffff" : "#52525b" }}>{day}</span>
                            <button onClick={() => setHours({ ...hours, [day]: { ...hours[day], open: !hours[day].open } })}
                                className="text-xs px-2.5 py-1 rounded-lg shrink-0 transition-all"
                                style={hours[day].open
                                    ? { background: "rgba(0,255,145,0.1)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }
                                    : { background: "rgba(113,113,122,0.1)", color: "#71717a", border: "1px solid rgba(113,113,122,0.2)" }}>
                                {hours[day].open ? "Ouvert" : "Fermé"}
                            </button>
                            {hours[day].open && (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input type="time" value={hours[day].from}
                                        onChange={e => setHours({ ...hours, [day]: { ...hours[day], from: e.target.value } })}
                                        className="flex-1 text-xs" style={{ ...inputStyle, padding: "4px 8px" }} />
                                    <span className="text-xs" style={{ color: "#52525b" }}>–</span>
                                    <Input type="time" value={hours[day].to}
                                        onChange={e => setHours({ ...hours, [day]: { ...hours[day], to: e.target.value } })}
                                        className="flex-1 text-xs" style={{ ...inputStyle, padding: "4px 8px" }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-5">
                    <Button onClick={handleSaveHours} disabled={savingHours}
                        className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-all"
                        style={savedHours
                            ? { background: "rgba(0,255,145,0.15)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.3)" }
                            : { background: "#FFC745", color: "#001C1C" }}>
                        {savedHours ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {savingHours ? "Enregistrement..." : savedHours ? "Enregistré" : "Enregistrer"}
                    </Button>
                </div>
            </div>

            {/* Password Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: '#002928',
                    border: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(255, 199, 69, 0.15)' }}
                    >
                        <Lock className="w-5 h-5" style={{ color: '#FFC745' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                            Sécurité
                        </h2>
                        <p className="text-sm" style={{ color: '#c3c3d4' }}>
                            Modifiez votre mot de passe
                        </p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <Label style={{ color: '#e4e4e7' }}>Mot de passe actuel</Label>
                        <div className="relative mt-1">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                placeholder="••••••••"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    border: '1px solid rgba(0, 255, 145, 0.1)',
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
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    border: '1px solid rgba(0, 255, 145, 0.1)',
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
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    border: '1px solid rgba(0, 255, 145, 0.1)',
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
                            background: 'rgba(255, 199, 69, 0.15)',
                            color: '#FFC745',
                            border: '1px solid rgba(255, 199, 69, 0.3)'
                        }}
                    >
                        {changingPassword ? (
                            <>
                                <div
                                    className="animate-spin w-4 h-4 border-2 rounded-full"
                                    style={{ borderColor: '#FFC745', borderTopColor: 'transparent' }}
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

            {/* Facturation */}
            <div className="rounded-xl p-6" style={{ background: '#002928', border: '1px solid rgba(0,255,145,0.1)' }}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,199,69,0.15)' }}>
                        <CreditCard className="w-5 h-5" style={{ color: '#FFC745' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Facturation</h2>
                        <p className="text-sm" style={{ color: '#c3c3d4' }}>Gérez votre abonnement, vos moyens de paiement et téléchargez vos factures</p>
                    </div>
                </div>
                {portalError && (
                    <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        Aucune facturation active sur ce compte.
                    </p>
                )}
                <Button onClick={handlePortal} disabled={openingPortal}
                    className="flex items-center gap-2"
                    style={{ background: 'rgba(255,199,69,0.1)', color: '#FFC745', border: '1px solid rgba(255,199,69,0.2)' }}>
                    <ExternalLink className="w-4 h-4" />
                    {openingPortal ? "Chargement..." : "Accéder au portail de facturation"}
                </Button>
            </div>

            {/* Danger Zone */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: '#002928',
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
                        <p className="text-sm" style={{ color: '#c3c3d4' }}>
                            Gérez votre session active
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div>
                        <Button onClick={handleResetOnboarding}
                            className="flex items-center gap-2"
                            style={{ background: 'rgba(0,255,145,0.06)', color: '#00ff91', border: '1px solid rgba(0,255,145,0.2)' }}>
                            <CheckCircle className="w-4 h-4" />
                            Rouvrir le guide d&apos;introduction
                        </Button>
                        {onboardingReset && (
                            <p className="text-xs mt-2" style={{ color: '#00ff91' }}>
                                Guide réinitialisé — il s&apos;affichera au prochain chargement.
                            </p>
                        )}
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
                            background: '#002928',
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
                                <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                    Vous serez redirigé vers la page de connexion
                                </p>
                            </div>
                        </div>

                        <p className="mb-6" style={{ color: '#c3c3d4' }}>
                            Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
                        </p>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    color: '#c3c3d4',
                                    border: '1px solid rgba(0, 255, 145, 0.1)'
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
