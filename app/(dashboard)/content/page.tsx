"use client";

import { useState, useEffect } from "react";
import { Save, Check, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";

type Tab = "hours" | "contact";

type DayKey = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";

interface DaySchedule {
    open: boolean;
    from: string;
    to: string;
}

type HoursContent = Record<DayKey, DaySchedule>;

interface ContactContent {
    address: string;
    email: string;
    phone: string;
    maps_url: string;
}

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

export default function ContentPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [tab, setTab] = useState<Tab>("hours");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<Tab | null>(null);
    const [saved, setSaved] = useState<Tab | null>(null);

    const [hours, setHours] = useState<HoursContent>(DEFAULT_HOURS);
    const [contact, setContact] = useState<ContactContent>({ address: "", email: "", phone: "", maps_url: "" });

    useEffect(() => {
        if (!profileLoading && profile?.business_id) {
            if (profile.hours) setHours(profile.hours as HoursContent);
            setContact({
                address: profile.address || "",
                email: profile.contact_email || "",
                phone: profile.contact_phone || "",
                maps_url: profile.maps_url || "",
            });
            setLoading(false);
        } else if (!profileLoading) {
            setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const handleSave = async (section: Tab) => {
        if (!profile?.business_id) return;
        setSaving(section);

        const payload = section === "hours"
            ? { hours: hours as unknown as Record<string, unknown> }
            : { address: contact.address || null, contact_email: contact.email || null, contact_phone: contact.phone || null, maps_url: contact.maps_url || null };

        await supabase.from("businesses").update(payload).eq("id", profile.business_id);

        setSaving(null);
        setSaved(section);
        setTimeout(() => setSaved(null), 2000);
    };

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: "hours",   label: "Horaires", icon: Clock },
        { key: "contact", label: "Contact",  icon: MapPin },
    ];

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#ffffff" }}>Contenu du site</h1>
                <p className="text-sm mt-1" style={{ color: "#71717a" }}>Modifiez le contenu affiché sur votre site</p>
            </div>

            <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.1)" }}>
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                        style={tab === key ? { background: "#FFC745", color: "#001C1C", fontWeight: 700 } : { color: "#71717a" }}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="h-64 rounded-xl animate-pulse" style={{ background: "#001C1C" }} />
            ) : (
                <>
                    {tab === "hours" && (
                        <div className="rounded-xl p-5" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.1)" }}>
                            <SectionTitle icon={Clock} title="Horaires d'ouverture" />
                            <div className="mt-4 space-y-2">
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
                                <SaveButton onSave={() => handleSave("hours")} saving={saving === "hours"} saved={saved === "hours"} />
                            </div>
                        </div>
                    )}

                    {tab === "contact" && (
                        <div className="rounded-xl p-5 space-y-4" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.1)" }}>
                            <SectionTitle icon={MapPin} title="Informations de contact" />
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Adresse</Label>
                                <Input value={contact.address} onChange={e => setContact({ ...contact, address: e.target.value })} placeholder="12 rue de la Paix, 75001 Paris" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Email de contact</Label>
                                <Input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} placeholder="contact@monsite.fr" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Téléphone</Label>
                                <Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} placeholder="01 23 45 67 89" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Lien Google Maps</Label>
                                <Input value={contact.maps_url} onChange={e => setContact({ ...contact, maps_url: e.target.value })} placeholder="https://maps.google.com/..." style={inputStyle} />
                            </div>
                            <SaveButton onSave={() => handleSave("contact")} saving={saving === "contact"} saved={saved === "contact"} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4" style={{ color: "#FFC745" }} />
            <span className="font-semibold text-sm" style={{ color: "#ffffff" }}>{title}</span>
        </div>
    );
}

function SaveButton({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
    return (
        <Button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-all"
            style={saved
                ? { background: "rgba(0,255,145,0.15)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.3)" }
                : { background: "#FFC745", color: "#001C1C" }}>
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Enregistrement..." : saved ? "Enregistré" : "Enregistrer"}
        </Button>
    );
}

const inputStyle: React.CSSProperties = {
    background: "#002928",
    border: "1px solid rgba(0,255,145,0.15)",
    color: "#ffffff",
};
