"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, Clock, Lock, LogOut, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Business } from "@/lib/v2/tenant";
import type { FieldErrors, HourSlot, listBusinessHours, getProfile } from "@/lib/v2/data/businesses";
import { getBrowserSupabase } from "@/lib/v2/supabase-browser";
import { type ActionResult, saveBusinessHours, saveBusinessInfo, saveProfile } from "../actions";

// ─── Briques communes ────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[12px] p-6" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</h2>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function Field({ label, error, children, wide }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
    return (
        <div className={wide ? "sm:col-span-2" : undefined}>
            <label className="vos-label">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
    );
}

function Feedback({ result }: { result: ActionResult | null }) {
    if (!result) return null;
    return result.ok
        ? <p className="text-sm" style={{ color: 'var(--success)' }}>Enregistré.</p>
        : <p className="text-sm" style={{ color: 'var(--danger)' }}>{result.error}</p>;
}

// ─── Mon compte ──────────────────────────────────────────────────────────────

export function AccountSection({ profile, email }: { profile: Awaited<ReturnType<typeof getProfile>>; email: string }) {
    const [fullName, setFullName] = useState(profile?.full_name ?? "");
    const [phone, setPhone] = useState(profile?.phone ?? "");
    const [result, setResult] = useState<ActionResult | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => setResult(await saveProfile({ full_name: fullName, phone })));
    };

    return (
        <Section icon={User} title="Mon compte" subtitle="Vos informations personnelles">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom complet"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
                    <Field label="Téléphone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
                    <Field label="Email de connexion" wide>
                        <Input value={email} disabled />
                    </Field>
                </div>
                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button>
                    <Feedback result={result} />
                </div>
            </form>
        </Section>
    );
}

// ─── Mon établissement ───────────────────────────────────────────────────────

const BUSINESS_FIELDS = ["name", "description", "email", "phone", "website_url", "address_line", "postal_code", "city", "country", "maps_url", "timezone"] as const;
type BusinessFieldKey = (typeof BUSINESS_FIELDS)[number];

export function BusinessSection({ business, canManage }: { business: Business; canManage: boolean }) {
    const router = useRouter();
    const [values, setValues] = useState<Record<BusinessFieldKey, string>>(
        () => Object.fromEntries(BUSINESS_FIELDS.map((k) => [k, business[k] ?? ""])) as Record<BusinessFieldKey, string>,
    );
    const [result, setResult] = useState<ActionResult | null>(null);
    const [pending, startTransition] = useTransition();
    const fieldErrors: FieldErrors = result && !result.ok ? result.fieldErrors ?? {} : {};

    const timeZones = useMemo(() => {
        const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
        return all.includes(values.timezone) ? all : [values.timezone, ...all];
    }, [values.timezone]);

    const set = (k: BusinessFieldKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValues((v) => ({ ...v, [k]: e.target.value }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const res = await saveBusinessInfo(values);
            setResult(res);
            // Nom et fuseau sont lus par tout le dashboard via le layout.
            if (res.ok) router.refresh();
        });
    };

    const selectStyle = { background: 'var(--bg-elev)', border: '1px solid var(--border-2)', color: 'var(--text)' };

    return (
        <Section icon={Building2} title="Mon établissement" subtitle={`${business.business_type.label} · informations affichées aux clients`}>
            <form onSubmit={submit}>
                <fieldset disabled={!canManage || pending} className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom de l'établissement *" error={fieldErrors.name} wide><Input value={values.name} onChange={set("name")} required /></Field>
                    <Field label="Description" wide>
                        <textarea value={values.description} onChange={set("description")} rows={3} className="w-full rounded-md px-3 py-2 text-sm" style={selectStyle} />
                    </Field>
                    <Field label="Email de contact" error={fieldErrors.email}><Input type="email" value={values.email} onChange={set("email")} /></Field>
                    <Field label="Téléphone de contact"><Input type="tel" value={values.phone} onChange={set("phone")} /></Field>
                    <Field label="Site web" error={fieldErrors.website_url} wide><Input value={values.website_url} onChange={set("website_url")} placeholder="https://" /></Field>
                    <Field label="Adresse" wide><Input value={values.address_line} onChange={set("address_line")} /></Field>
                    <Field label="Code postal"><Input value={values.postal_code} onChange={set("postal_code")} /></Field>
                    <Field label="Ville"><Input value={values.city} onChange={set("city")} /></Field>
                    <Field label="Pays (code ISO)" error={fieldErrors.country}><Input value={values.country} onChange={set("country")} maxLength={2} /></Field>
                    <Field label="Fuseau horaire" error={fieldErrors.timezone}>
                        <select value={values.timezone} onChange={set("timezone")} className="w-full rounded-md px-3 py-2 text-sm" style={selectStyle}>
                            {timeZones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                    </Field>
                    <Field label="Lien Google Maps" error={fieldErrors.maps_url} wide><Input value={values.maps_url} onChange={set("maps_url")} placeholder="https://" /></Field>
                </fieldset>
                {canManage && (
                    <div className="flex items-center gap-3 mt-5">
                        <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button>
                        <Feedback result={result} />
                    </div>
                )}
            </form>
        </Section>
    );
}

// ─── Horaires ────────────────────────────────────────────────────────────────

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]; // day_of_week 1 → 7

type EditableSlot = { key: number; day_of_week: number; open_time: string; close_time: string; label: string };

export function HoursSection({ initialHours, canManage }: { initialHours: Awaited<ReturnType<typeof listBusinessHours>>; canManage: boolean }) {
    const [slots, setSlots] = useState<EditableSlot[]>(() =>
        initialHours.map((h, i) => ({ key: i, day_of_week: h.day_of_week, open_time: h.open_time.slice(0, 5), close_time: h.close_time.slice(0, 5), label: h.label ?? "" })),
    );
    const [nextKey, setNextKey] = useState(initialHours.length);
    const [result, setResult] = useState<ActionResult | null>(null);
    const [pending, startTransition] = useTransition();

    const addSlot = (day: number) => {
        setSlots((s) => [...s, { key: nextKey, day_of_week: day, open_time: "09:00", close_time: "18:00", label: "" }]);
        setNextKey((k) => k + 1);
    };
    const updateSlot = (key: number, patch: Partial<EditableSlot>) => setSlots((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    const removeSlot = (key: number) => setSlots((s) => s.filter((x) => x.key !== key));

    const submit = () => {
        const payload: HourSlot[] = slots.map(({ day_of_week, open_time, close_time, label }) => ({ day_of_week, open_time, close_time, label: label || null }));
        startTransition(async () => setResult(await saveBusinessHours(payload)));
    };

    return (
        <Section icon={Clock} title="Horaires d'ouverture" subtitle="Une fermeture après minuit est possible (ex. 11:00 → 02:00)">
            <div className="flex flex-col gap-3">
                {DAYS.map((dayName, i) => {
                    const day = i + 1;
                    const daySlots = slots.filter((s) => s.day_of_week === day);
                    return (
                        <div key={day} className="flex flex-col sm:flex-row sm:items-start gap-2 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <p className="sm:w-28 shrink-0 text-sm font-medium pt-2" style={{ color: 'var(--text)' }}>{dayName}</p>
                            <div className="flex-1 flex flex-col gap-2">
                                {daySlots.length === 0 && <p className="text-sm pt-2" style={{ color: 'var(--muted)' }}>Fermé</p>}
                                {daySlots.map((s) => (
                                    <div key={s.key} className="flex items-center gap-2 flex-wrap">
                                        <Input type="time" value={s.open_time} disabled={!canManage} onChange={(e) => updateSlot(s.key, { open_time: e.target.value })} className="w-28" aria-label={`${dayName} ouverture`} />
                                        <span style={{ color: 'var(--muted)' }}>→</span>
                                        <Input type="time" value={s.close_time} disabled={!canManage} onChange={(e) => updateSlot(s.key, { close_time: e.target.value })} className="w-28" aria-label={`${dayName} fermeture`} />
                                        <Input value={s.label} disabled={!canManage} onChange={(e) => updateSlot(s.key, { label: e.target.value })} placeholder="Libellé (ex. Service du midi)" className="flex-1 min-w-[140px]" />
                                        {canManage && (
                                            <button type="button" onClick={() => removeSlot(s.key)} aria-label="Supprimer le créneau" style={{ color: 'var(--danger)' }}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {canManage && (
                                <button type="button" onClick={() => addSlot(day)} className="flex items-center gap-1 text-xs pt-2 shrink-0" style={{ color: 'var(--accent)' }}>
                                    <Plus className="w-3.5 h-3.5" /> Créneau
                                </button>
                            )}
                        </div>
                    );
                })}
                {canManage && (
                    <div className="flex items-center gap-3 mt-2">
                        <Button onClick={submit} disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer les horaires"}</Button>
                        <Feedback result={result} />
                    </div>
                )}
            </div>
        </Section>
    );
}

// ─── Sécurité & session ──────────────────────────────────────────────────────

export function SessionSection() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) return setMessage({ ok: false, text: "8 caractères minimum." });
        if (password !== confirm) return setMessage({ ok: false, text: "Les deux mots de passe ne correspondent pas." });
        setSaving(true);
        const { error } = await getBrowserSupabase().auth.updateUser({ password });
        setSaving(false);
        if (error) return setMessage({ ok: false, text: error.message });
        setPassword("");
        setConfirm("");
        setMessage({ ok: true, text: "Mot de passe modifié." });
    };

    const signOut = async () => {
        setSigningOut(true);
        await getBrowserSupabase().auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <Section icon={Lock} title="Sécurité & session" subtitle="Mot de passe et déconnexion">
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
                <Field label="Nouveau mot de passe"><Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                <Field label="Confirmation"><Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
                <div className="sm:col-span-2 flex items-center gap-3">
                    <Button type="submit" disabled={saving || !password}>{saving ? "Modification..." : "Changer le mot de passe"}</Button>
                    {message && <p className="text-sm" style={{ color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>}
                </div>
            </form>
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <Button variant="outline" onClick={signOut} disabled={signingOut} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    <LogOut className="w-4 h-4" /> {signingOut ? "Déconnexion..." : "Se déconnecter"}
                </Button>
            </div>
        </Section>
    );
}
