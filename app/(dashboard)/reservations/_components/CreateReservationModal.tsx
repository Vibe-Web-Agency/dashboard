"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Business } from "@/lib/v2/tenant";
import type { BookingLabels } from "@/lib/v2/labels";
import type { ManualReservationInput, ReservationWithCustomer } from "@/lib/v2/data/reservations";
import type { Service } from "@/lib/v2/data/services";
import { daySlots, slotOf } from "@/lib/v2/slots";
import { formatTimeInZone, zonedDayKey, zonedToUtcIso } from "@/lib/v2/datetime";
import { emailReservationConfirmation } from "../actions";

// Création manuelle d'une réservation (cahier des charges, phase 2) : client, prestation, date,
// puis choix d'un créneau calculé depuis les horaires d'ouverture, avec l'affluence déjà réservée.

const SLOT_STEP = 30;

export type ReservationPrefill = {
    date?: string;
    time?: string;
    customer?: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null };
};

type OpeningHours = { day_of_week: number; open_time: string; close_time: string };

export function CreateReservationModal({ business, labels, reservations, services, hours, prefill, onCreate, onClose }: {
    business: Business;
    labels: BookingLabels;
    /** Réservations déjà chargées, pour afficher l'affluence par créneau. */
    reservations: ReservationWithCustomer[];
    /** Prestations réservables en ligne ; vide si le commerce n'a pas le module. */
    services: Service[];
    hours: OpeningHours[];
    prefill?: ReservationPrefill;
    onCreate: (input: ManualReservationInput) => Promise<unknown>;
    onClose: () => void;
}) {
    const tz = business.timezone;
    const [form, setForm] = useState({
        first_name: prefill?.customer?.first_name ?? "",
        last_name: prefill?.customer?.last_name ?? "",
        email: prefill?.customer?.email ?? "",
        phone: prefill?.customer?.phone ?? "",
        service_id: "",
        date: prefill?.date ?? "",
        time: prefill?.time ?? "",
        party_size: 2,
        note: "",
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const service = services.find((s) => s.id === form.service_id) ?? null;
    const duration = service?.duration_min ?? null;

    // Créneaux du jour choisi et nombre de réservations non annulées déjà posées sur chacun.
    const slots = useMemo(() => {
        if (!form.date) return [];
        const taken = new Map<string, number>();
        for (const r of reservations) {
            if (r.status === "cancelled" || zonedDayKey(r.starts_at, tz) !== form.date) continue;
            const slot = slotOf(formatTimeInZone(r.starts_at, tz), SLOT_STEP);
            taken.set(slot, (taken.get(slot) ?? 0) + 1);
        }
        const now = new Date().toISOString();
        return daySlots(hours, form.date, SLOT_STEP, duration ?? SLOT_STEP).map((time) => ({
            time,
            taken: taken.get(time) ?? 0,
            past: zonedToUtcIso(form.date, time, tz) < now,
        }));
    }, [form.date, reservations, hours, duration, tz]);

    const [sendConfirmation, setSendConfirmation] = useState(true);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            const startsAt = zonedToUtcIso(form.date, form.time, tz);
            const createdId = await onCreate({
                customer: { first_name: form.first_name, last_name: form.last_name, email: form.email.trim() || null, phone: form.phone.trim() || null },
                starts_at: startsAt,
                ends_at: duration ? new Date(Date.parse(startsAt) + duration * 60_000).toISOString() : null,
                party_size: labels.showParty ? form.party_size : 1,
                service_id: form.service_id || null,
                internal_note: form.note.trim() || null,
            });
            // L'envoi ne bloque pas la fermeture : un email raté n'annule pas la réservation.
            if (sendConfirmation && form.email.trim() && typeof createdId === "string") void emailReservationConfirmation(createdId);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Création impossible.");
            setCreating(false);
        }
    };

    const fieldStyle = { background: 'var(--bg-elev)', border: '1px solid var(--border-2)', color: 'var(--text)' };

    return (
        <div className="vos-modal-backdrop">
            <div className="vos-modal" style={{ maxHeight: "90vh", overflowY: "auto" }}>
                <div className="vos-modal-header">
                    <h2 className="vos-modal-title">{labels.booking.newTitle}</h2>
                    <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: 'var(--muted)' }} aria-label="Fermer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 rounded-lg" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: "12px" }}>{error}</div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="vos-label">Prénom</label>
                            <Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} required={!form.last_name.trim()} placeholder="Jean" />
                        </div>
                        <div>
                            <label className="vos-label">Nom</label>
                            <Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} required={!form.first_name.trim()} placeholder="Dupont" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="vos-label">Email</label>
                            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
                        </div>
                        <div>
                            <label className="vos-label">Téléphone</label>
                            <Input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="06 12 34 56 78" />
                        </div>
                    </div>

                    {services.length > 0 && (
                        <div>
                            <label className="vos-label">{labels.serviceSingularTitle}</label>
                            <select value={form.service_id} onChange={(e) => setForm(f => ({ ...f, service_id: e.target.value }))} className="w-full rounded-md px-3 py-2 text-sm" style={fieldStyle}>
                                <option value="">— Sans précision —</option>
                                {services.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}{s.duration_min ? ` · ${s.duration_min} min` : ""}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={`grid gap-3 ${labels.showParty ? "grid-cols-3" : "grid-cols-2"}`}>
                        <div>
                            <label className="vos-label">Date *</label>
                            <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                        <div>
                            <label className="vos-label">Heure *</label>
                            <Input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} required />
                        </div>
                        {labels.showParty && (
                            <div>
                                <label className="vos-label">{labels.partyTitle}</label>
                                <Input type="number" min={1} max={500} value={form.party_size} onChange={(e) => setForm(f => ({ ...f, party_size: Math.min(500, Math.max(1, parseInt(e.target.value) || 1)) }))} />
                            </div>
                        )}
                    </div>

                    {/* Sélecteur de créneaux */}
                    {form.date && (
                        <div>
                            <label className="vos-label">Créneaux du jour</label>
                            {hours.length === 0 ? (
                                <p style={{ fontSize: "11px", color: "var(--muted)" }}>Aucun horaire d&apos;ouverture configuré (Paramètres) : saisissez l&apos;heure à la main.</p>
                            ) : slots.length === 0 ? (
                                <p style={{ fontSize: "11px", color: "var(--muted)" }}>Fermé ce jour-là d&apos;après les horaires d&apos;ouverture. Vous pouvez tout de même saisir une heure.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                        {slots.map((slot) => {
                                            const selected = form.time === slot.time;
                                            return (
                                                <button
                                                    key={slot.time}
                                                    type="button"
                                                    disabled={slot.past}
                                                    onClick={() => setForm(f => ({ ...f, time: slot.time }))}
                                                    className="rounded-md py-1.5 text-xs transition-colors disabled:opacity-35"
                                                    style={selected
                                                        ? { background: 'var(--accent)', color: '#0E0D0B', border: '1px solid var(--accent)', fontWeight: 600 }
                                                        : { background: 'var(--surface-2)', color: 'var(--text)', border: `1px solid ${slot.taken ? 'var(--warning)' : 'var(--border)'}` }}
                                                    title={slot.taken ? `${slot.taken} déjà sur ce créneau` : "Créneau libre"}
                                                >
                                                    {slot.time}
                                                    {slot.taken > 0 && <span style={{ marginLeft: 4, opacity: 0.75 }}>·{slot.taken}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1.5" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                        Le chiffre indique ce qui est déjà réservé sur le créneau. Un créneau entouré n&apos;est pas bloqué.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="vos-label">Note interne</label>
                        <Input value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Visible uniquement par l'équipe" />
                    </div>
                    {form.email.trim() !== "" && (
                        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                            <input type="checkbox" className="h-4 w-4" style={{ accentColor: "var(--accent)" }} checked={sendConfirmation} onChange={(e) => setSendConfirmation(e.target.checked)} />
                            Envoyer un email de confirmation au client
                        </label>
                    )}
                    <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                        Sans email ni téléphone, aucune fiche client n&apos;est créée ni rattachée.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" onClick={onClose} className="flex-1" variant="outline">Annuler</Button>
                        <Button type="submit" disabled={creating} className="flex-1 font-semibold" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                            {creating ? "Création..." : `Créer ${labels.booking.the}`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
