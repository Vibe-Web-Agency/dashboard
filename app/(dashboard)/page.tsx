"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Contact, FileText, Plus } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useReservations } from "@/lib/v2/hooks/useReservations";
import { useQuotes } from "@/lib/v2/hooks/useQuotes";
import { bookingLabels, type BookingLabels } from "@/lib/v2/labels";
import { formatDayHeaderInZone, formatInZone, formatTimeInZone, zonedDayKey } from "@/lib/v2/datetime";
import { personName } from "@/lib/v2/names";
import { canWrite } from "@/lib/v2/roles";
import { reservationStatusUI, type ReservationStatus } from "@/lib/v2/statuses";

// Vue d'ensemble (CLAUDE.md 7) : ce qui arrive et ce qui attend une réponse, pour les modules du commerce.

const card = { background: "var(--bg-elev)", border: "1px solid var(--border)" } as const;
const MAX_ROWS = 8;

export default function HomePage() {
    const { currentBusiness, currentRole, hasModule } = useTenant();
    const labels = bookingLabels(currentBusiness);
    const tz = currentBusiness.timezone;
    const writable = canWrite(currentRole);
    const today = formatInZone(new Date().toISOString(), tz, { weekday: "long", day: "numeric", month: "long" });

    const shortcuts = [
        hasModule("reservations") && writable && { href: "/reservations?new=1", icon: CalendarDays, label: labels.booking.newTitle },
        hasModule("customers") && writable && { href: "/customers?new=1", icon: Contact, label: labels.customer.newTitle },
    ].filter((s) => !!s);

    return (
        <div className="flex flex-col gap-5 w-full">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-xs capitalize" style={{ color: "var(--text-faint)" }}>{today}</p>
                    <h1 className="text-2xl font-normal" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{currentBusiness.name}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {shortcuts.map((s) => (
                        <Link key={s.href} href={s.href} className="no-underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                            <Plus className="w-3.5 h-3.5" />
                            {s.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 items-start">
                {hasModule("reservations") && <UpcomingBookings labels={labels} tz={tz} />}
                {hasModule("quotes") && <NewRequests tz={tz} />}
            </div>

            {!hasModule("reservations") && !hasModule("quotes") && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Aucun module d&apos;activité n&apos;est actif pour cet établissement.
                </p>
            )}
        </div>
    );
}

function UpcomingBookings({ labels, tz }: { labels: BookingLabels; tz: string }) {
    const { reservations, loading, error } = useReservations({ scope: "upcoming" });
    const active = reservations.filter((r) => r.status !== "cancelled");
    const todayKey = zonedDayKey(new Date(), tz);
    const todayCount = active.filter((r) => zonedDayKey(r.starts_at, tz) === todayKey).length;
    const pendingCount = active.filter((r) => r.status === "pending").length;

    return (
        <section className="rounded-xl" style={card}>
            <PanelHeader icon={CalendarDays} title={`${labels.title} à venir`} href="/reservations"
                sub={`${todayCount} aujourd'hui · ${pendingCount} en attente · ${active.length} au total`} />
            <div className="p-2">
                {error ? <Empty>Chargement impossible.</Empty>
                    : loading && active.length === 0 ? <Empty>Chargement…</Empty>
                    : active.length === 0 ? <Empty>{labels.booking.none} à venir</Empty>
                    : active.slice(0, MAX_ROWS).map((r) => {
                        const ui = reservationStatusUI(labels.booking.feminine)[r.status as ReservationStatus];
                        return (
                            <Row key={r.id} href={`/reservations/${r.id}`}
                                left={<><p className="text-xs font-medium" style={{ color: "var(--text)" }}>{formatTimeInZone(r.starts_at, tz)}</p>
                                    <p className="text-[10px] capitalize" style={{ color: "var(--text-faint)" }}>{formatDayHeaderInZone(r.starts_at, tz).split(" ").slice(0, 3).join(" ")}</p></>}
                                title={personName(r.customer) || r.guest_name || "Sans nom"}
                                sub={[r.service?.name, labels.showParty && r.party_size ? labels.partyCount(r.party_size) : null].filter(Boolean).join(" · ")}
                                right={ui ? <span className={ui.pill}>{ui.label}</span> : null} />
                        );
                    })}
                {active.length > MAX_ROWS && <More href="/reservations" count={active.length - MAX_ROWS} />}
            </div>
        </section>
    );
}

function NewRequests({ tz }: { tz: string }) {
    const { quotes, loading, error } = useQuotes({ status: "request" });

    return (
        <section className="rounded-xl" style={card}>
            <PanelHeader icon={FileText} title="Demandes à traiter" href="/quotes"
                sub={`${quotes.length} nouvelle${quotes.length > 1 ? "s" : ""} demande${quotes.length > 1 ? "s" : ""}`} />
            <div className="p-2">
                {error ? <Empty>Chargement impossible.</Empty>
                    : loading && quotes.length === 0 ? <Empty>Chargement…</Empty>
                    : quotes.length === 0 ? <Empty>Aucune demande en attente</Empty>
                    : quotes.slice(0, MAX_ROWS).map((q) => (
                        <Row key={q.id} href={`/quotes/${q.id}`}
                            left={<p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{formatInZone(q.created_at, tz, { day: "numeric", month: "short" })}</p>}
                            title={personName(q.customer) || q.customer?.email || "Sans nom"}
                            sub={q.request_message ?? ""} />
                    ))}
                {quotes.length > MAX_ROWS && <More href="/quotes" count={quotes.length - MAX_ROWS} />}
            </div>
        </section>
    );
}

function PanelHeader({ icon: Icon, title, sub, href }: { icon: typeof CalendarDays; title: string; sub: string; href: string }) {
    return (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-start gap-3 min-w-0">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                <div className="min-w-0">
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{title}</h2>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{sub}</p>
                </div>
            </div>
            <Link href={href} className="no-underline flex items-center gap-0.5 text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                Tout voir <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
    );
}

function Row({ href, left, title, sub, right }: { href: string; left: React.ReactNode; title: string; sub?: string; right?: React.ReactNode }) {
    return (
        <Link href={href} className="no-underline flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface)]">
            <div className="shrink-0 w-20">{left}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>{title}</p>
                {sub && <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{sub}</p>}
            </div>
            {right}
        </Link>
    );
}

function More({ href, count }: { href: string; count: number }) {
    return (
        <Link href={href} className="no-underline block px-3 py-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            + {count} autre{count > 1 ? "s" : ""}
        </Link>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="py-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>{children}</p>;
}
