"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { BookingLabels } from "@/lib/v2/labels";
import type { ReservationWithCustomer } from "@/lib/v2/data/reservations";
import { RESERVATION_STATUS_UI, type ReservationStatus } from "@/lib/v2/statuses";
import { personName } from "@/lib/v2/names";
import { daySlots } from "@/lib/v2/slots";
import { formatTimeInZone, zonedToUtcIso } from "@/lib/v2/datetime";

// Frise d'une journée (cahier des charges, phase 2) : une ligne par heure d'ouverture, les réservations
// placées à leur heure, et un bouton pour en créer une sur l'heure choisie.

type OpeningHours = { day_of_week: number; open_time: string; close_time: string };

export function DayTimeline({ dateKey, reservations, hours, timeZone, labels, writable, onCreateAt }: {
    /** Jour affiché, « YYYY-MM-DD » dans le fuseau du commerce. */
    dateKey: string;
    /** Réservations de ce jour. */
    reservations: ReservationWithCustomer[];
    hours: OpeningHours[];
    timeZone: string;
    labels: BookingLabels;
    writable: boolean;
    onCreateAt: (time: string) => void;
}) {
    const byHour = new Map<string, ReservationWithCustomer[]>();
    for (const r of reservations) {
        const hour = formatTimeInZone(r.starts_at, timeZone).slice(0, 2) + ":00";
        byHour.set(hour, [...(byHour.get(hour) ?? []), r]);
    }
    // Heures d'ouverture du jour, plus toute heure qui porte déjà une réservation (même hors horaires).
    const openHours = daySlots(hours, dateKey, 60, 1);
    const rows = [...new Set([...openHours, ...byHour.keys()])].sort();
    const now = new Date().toISOString();

    if (rows.length === 0) {
        return (
            <div className="text-center py-10 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                    {hours.length === 0 ? `${labels.booking.none} ce jour. Aucun horaire d'ouverture n'est configuré.` : `Fermé ce jour-là, ${labels.booking.none.toLowerCase()}.`}
                </p>
                {writable && (
                    <button onClick={() => onCreateAt("")} className="mt-3 text-sm" style={{ color: 'var(--accent)' }}>
                        + {labels.booking.newTitle}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {rows.map((hour, i) => {
                const items = byHour.get(hour) ?? [];
                const closed = !openHours.includes(hour);
                const past = zonedToUtcIso(dateKey, hour.slice(0, 2) + ":59", timeZone) < now;
                return (
                    <div key={hour} className="flex items-stretch" style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', background: closed ? 'var(--surface-2)' : 'transparent' }}>
                        <div className="w-14 shrink-0 px-2 py-2.5 text-xs font-medium" style={{ color: items.length ? 'var(--accent)' : 'var(--muted)', borderRight: '1px solid var(--border)' }}>
                            {hour}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 px-2 py-1.5">
                            {items.map((r) => {
                                const ui = RESERVATION_STATUS_UI[r.status as ReservationStatus];
                                return (
                                    <Link key={r.id} href={`/reservations/${r.id}`} className="no-underline flex items-center gap-2 rounded-md px-2 py-1"
                                        style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', opacity: r.status === "cancelled" ? 0.5 : 1 }}>
                                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{formatTimeInZone(r.starts_at, timeZone)}</span>
                                        <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text)' }}>{personName(r.customer) || r.guest_name || "Client inconnu"}</span>
                                        {labels.showParty && <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{labels.partyCount(r.party_size)}</span>}
                                        <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? r.status}</span>
                                    </Link>
                                );
                            })}
                            {items.length === 0 && closed && <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Hors horaires</span>}
                        </div>
                        {writable && !past && (
                            <button onClick={() => onCreateAt(hour)} className="shrink-0 px-2.5 flex items-center" style={{ color: 'var(--accent)' }}
                                aria-label={`${labels.booking.newTitle} à ${hour}`} title={`${labels.booking.newTitle} à ${hour}`}>
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
