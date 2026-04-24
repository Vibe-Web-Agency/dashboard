"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { ALL_FEATURES } from "@/lib/businessConfig";
import { formatDateNumeric, formatTime } from "@/lib/formatters";
import { StatusBadge, QUOTE_STATUS, RESERVATION_STATUS } from "@/lib/statusConfig";
import { useEffect, useState } from "react";
import {
    Calendar, FileText, TrendingUp, Users, Clapperboard,
    Newspaper, Star, UserSquare2, ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import Link from "next/link";

type TimeRange = "7days" | "1month" | "2months";

interface StatCard {
    label: string;
    value: number | string;
    icon: React.ElementType;
    href: string;
    color: string;
}

export default function HomePage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>("7days");

    // Reservations
    const [reservations, setReservations] = useState<any[]>([]);
    const [todayReservations, setTodayReservations] = useState<any[]>([]);
    // Quotes
    const [quotes, setQuotes] = useState<any[]>([]);
    // People/catalog
    const [recentPeople, setRecentPeople] = useState<any[]>([]);
    const [totalPeople, setTotalPeople] = useState(0);
    // Projects
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [totalProjects, setTotalProjects] = useState(0);
    // Blog
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [totalPosts, setTotalPosts] = useState(0);
    // Reviews
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [totalReviews, setTotalReviews] = useState(0);

    const features = profile?.business_type?.features ?? ALL_FEATURES;
    const hasReservations = features.includes("reservations");
    const hasQuotes = features.includes("quotes");
    const hasPeople = features.includes("catalog");
    const hasProjects = features.includes("projects");
    const hasBlog = features.includes("blog");
    const hasReviews = features.includes("reviews");
    const catalogLabel = profile?.business_type?.catalog_label ?? "Catalogue";

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchData();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchData = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        setFetchError(false);
        const bid = profile.business_id;
        const feats = profile?.business_type?.features ?? ALL_FEATURES;

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        try {
            await Promise.all([
                // Reservations
                feats.includes("reservations") && (async () => {
                    const [all, today] = await Promise.all([
                        supabase.from("reservations").select("id, customer_name, date, customer_mail, created_at").eq("business_id", bid).order("date", { ascending: false }),
                        supabase.from("reservations").select("id, customer_name, date, customer_mail, created_at").eq("business_id", bid).gte("date", todayStart.toISOString()).lte("date", todayEnd.toISOString()).order("date", { ascending: true }),
                    ]);
                    setReservations(all.data || []);
                    setTodayReservations(today.data || []);
                })(),

                // Quotes
                feats.includes("quotes") && (async () => {
                    const { data } = await supabase.from("quotes").select("id, customer_name, customer_email, status, created_at").eq("business_id", bid).order("created_at", { ascending: false });
                    setQuotes(data || []);
                })(),

                // People/catalog
                feats.includes("catalog") && (async () => {
                    const { data, count } = await supabase.from("people").select("id, first_name, last_name, name, specialty, photo_url, active, created_at", { count: "exact" }).eq("business_id", bid).eq("active", true).order("created_at", { ascending: false }).limit(4);
                    setRecentPeople(data || []);
                    setTotalPeople(count || 0);
                })(),

                // Projects
                feats.includes("projects") && (async () => {
                    const { data, count } = await supabase.from("projects").select("id, title, type, year, photo_url", { count: "exact" }).eq("business_id", bid).neq("active", false).order("created_at", { ascending: false }).limit(4);
                    setRecentProjects(data || []);
                    setTotalProjects(count || 0);
                })(),

                // Blog
                feats.includes("blog") && (async () => {
                    const { data, count } = await (supabase as any).from("blog").select("id, slug, title, category, date, excerpt", { count: "exact" }).eq("business_id", bid).eq("active", true).order("date", { ascending: false }).limit(4);
                    setRecentPosts(data || []);
                    setTotalPosts(count || 0);
                })(),

                // Reviews
                feats.includes("reviews") && (async () => {
                    const { data: pending } = await (supabase as any).from("reviews").select("id, author_name, rating, comment, created_at").eq("business_id", bid).is("reply", null).order("created_at", { ascending: false }).limit(3);
                    const { count } = await (supabase as any).from("reviews").select("*", { count: "exact", head: true }).eq("business_id", bid);
                    setPendingReviews(pending || []);
                    setTotalReviews(count || 0);
                })(),
            ]);
        } catch {
            setFetchError(true);
        }
        setLoading(false);
    };

    // Chart data for reservations
    const getLocalDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const getChartData = () => {
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const days = timeRange === "7days" ? 7 : timeRange === "1month" ? 30 : 60;
        return Array.from({ length: days }, (_, i) => {
            const date = new Date(now);
            date.setDate(date.getDate() - (days - 1 - i));
            const dateStr = getLocalDateString(date);
            const count = reservations.filter(r => r.date && getLocalDateString(new Date(r.date)) === dateStr).length;
            return { date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), reservations: count };
        });
    };

    // Build adaptive stat cards
    const statCards: StatCard[] = [];
    if (hasReservations) statCards.push({ label: "Réservations aujourd'hui", value: todayReservations.length, icon: Calendar, href: "/reservations", color: "#FFC745" });
    if (hasQuotes) statCards.push({ label: "Devis en attente", value: quotes.filter(q => q.status === "pending").length, icon: FileText, href: "/quotes", color: "#a855f7" });
    if (hasPeople) statCards.push({ label: `${catalogLabel} actifs`, value: totalPeople, icon: UserSquare2, href: "/people", color: "#00ff91" });
    if (hasProjects) statCards.push({ label: "Projets", value: totalProjects, icon: Clapperboard, href: "/projects", color: "#38bdf8" });
    if (hasBlog) statCards.push({ label: "Articles publiés", value: totalPosts, icon: Newspaper, href: "/blog", color: "#fb923c" });
    if (hasReviews) statCards.push({ label: "Avis sans réponse", value: pendingReviews.length, icon: Star, href: "/reviews", color: "#f43f5e" });

    const businessName = profile?.business_name || "Dashboard";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

    if (loading) {
        return (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                <Skeleton className="h-10 w-64" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />)}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "#FFC745" }}>
                    {greeting}, {businessName}
                </h1>
                <p className="text-sm" style={{ color: "#71717a" }}>
                    {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            {fetchError && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                    <span>Impossible de charger les données.</span>
                    <button onClick={fetchData} className="shrink-0 font-medium underline" style={{ color: "#fca5a5" }}>Réessayer</button>
                </div>
            )}

            {/* Stat Cards */}
            {statCards.length > 0 && (
                <div className={`grid gap-4 ${statCards.length <= 2 ? "grid-cols-2" : statCards.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link key={card.href} href={card.href} className="no-underline">
                                <div className="rounded-xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.02]"
                                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{ background: `${card.color}20` }}>
                                            <Icon className="w-4 h-4" style={{ color: card.color }} />
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5" style={{ color: "#52525b" }} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{card.value}</p>
                                        <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{card.label}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Graph réservations */}
            {hasReservations && (
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,199,69,0.15)" }}>
                                <TrendingUp style={{ color: "#FFC745" }} className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Activité récente</h2>
                                <p className="text-sm" style={{ color: "#a1a1aa" }}>Réservations des derniers jours</p>
                            </div>
                        </div>
                        <div className="flex gap-2 p-1 rounded-lg" style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.1)" }}>
                            {(["7days", "1month", "2months"] as TimeRange[]).map((range) => (
                                <button key={range} onClick={() => setTimeRange(range)}
                                    className="px-3 py-1.5 text-sm rounded-md transition-all"
                                    style={timeRange === range ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 } : { color: "#c3c3d4" }}>
                                    {range === "7days" ? "7j" : range === "1month" ? "1 mois" : "2 mois"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ width: "100%", height: 220 }}>
                        <ResponsiveContainer>
                            <AreaChart data={getChartData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" />
                                <XAxis dataKey="date" stroke="#a1a1aa" style={{ fontSize: "11px" }} />
                                <YAxis stroke="#a1a1aa" style={{ fontSize: "11px" }} />
                                <Tooltip contentStyle={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)", borderRadius: "8px", color: "#ffffff" }} />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFC745" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FFC745" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="reservations" stroke="#FFC745" strokeWidth={3}
                                    fill="url(#colorGradient)" dot={{ fill: "#FFC745", r: 4, strokeWidth: 0 }}
                                    activeDot={{ r: 6, fill: "#FFC745", stroke: "#001C1C", strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Adaptive content grid */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* Réservations aujourd'hui */}
                {hasReservations && (
                    <SectionCard title="Aujourd'hui" href="/reservations" icon={Calendar}>
                        {todayReservations.length === 0 ? (
                            <EmptyState text="Aucune réservation aujourd'hui" />
                        ) : (
                            <>
                                {(() => {
                                    const now = new Date();
                                    const next = todayReservations.find(r => r.date && new Date(r.date) > now);
                                    if (!next) return null;
                                    return (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1"
                                            style={{ background: "rgba(255,199,69,0.06)", border: "1px solid rgba(255,199,69,0.15)" }}>
                                            <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "#FFC745" }} />
                                            <p className="text-xs" style={{ color: "#FFC745" }}>
                                                Prochain RDV : <span className="font-semibold">{next.customer_name}</span> à {formatTime(next.date)}
                                            </p>
                                        </div>
                                    );
                                })()}
                                {todayReservations.map((res) => (
                                    <Link key={res.id} href={`/reservations/${res.id}`} className="no-underline">
                                        <ItemRow
                                            initial={res.customer_name?.[0]}
                                            title={res.customer_name}
                                            subtitle={res.customer_mail || "Pas d'email"}
                                            right={<span className="text-xs font-medium" style={{ color: "#FFC745" }}>{res.date ? formatTime(res.date) : "—"}</span>}
                                        />
                                    </Link>
                                ))}
                            </>
                        )}
                    </SectionCard>
                )}

                {/* Devis récents */}
                {hasQuotes && (
                    <SectionCard title="Devis récents" href="/quotes" icon={FileText}>
                        {quotes.length === 0 ? (
                            <EmptyState text="Aucun devis récent" />
                        ) : (
                            quotes.slice(0, 5).map((q) => (
                                <Link key={q.id} href={`/quotes/${q.id}`} className="no-underline">
                                    <ItemRow
                                        initial={q.customer_name?.[0]}
                                        title={q.customer_name}
                                        subtitle={q.customer_email || "Pas d'email"}
                                        right={<StatusBadge status={q.status} config={QUOTE_STATUS} size="sm" />}
                                    />
                                </Link>
                            ))
                        )}
                    </SectionCard>
                )}

                {/* Talents/People récents */}
                {hasPeople && (
                    <SectionCard title={`${catalogLabel} récents`} href="/people" icon={UserSquare2}>
                        {recentPeople.length === 0 ? (
                            <EmptyState text={`Aucun profil pour le moment`} />
                        ) : (
                            recentPeople.map((p) => {
                                const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.name;
                                return (
                                    <ItemRow key={p.id}
                                        initial={name?.[0]}
                                        photo={p.photo_url}
                                        title={name}
                                        subtitle={p.specialty || ""}
                                        right={<span className="text-xs" style={{ color: "#52525b" }}>{formatDateNumeric(p.created_at)}</span>}
                                    />
                                );
                            })
                        )}
                    </SectionCard>
                )}

                {/* Projets récents */}
                {hasProjects && (
                    <SectionCard title="Projets récents" href="/projects" icon={Clapperboard}>
                        {recentProjects.length === 0 ? (
                            <EmptyState text="Aucun projet pour le moment" />
                        ) : (
                            recentProjects.map((p) => (
                                <ItemRow key={p.id}
                                    initial={p.title?.[0]}
                                    title={p.title}
                                    subtitle={[p.type, p.year].filter(Boolean).join(" · ")}
                                    right={<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>{p.type || "Projet"}</span>}
                                />
                            ))
                        )}
                    </SectionCard>
                )}

                {/* Articles récents */}
                {hasBlog && (
                    <SectionCard title="Articles récents" href="/blog" icon={Newspaper}>
                        {recentPosts.length === 0 ? (
                            <EmptyState text="Aucun article publié" />
                        ) : (
                            recentPosts.map((p) => (
                                <ItemRow key={p.id}
                                    initial={p.title?.[0]}
                                    title={p.title}
                                    subtitle={p.category || ""}
                                    right={<span className="text-xs" style={{ color: "#52525b" }}>{p.date ? formatDateNumeric(p.date) : ""}</span>}
                                />
                            ))
                        )}
                    </SectionCard>
                )}

                {/* Avis sans réponse */}
                {hasReviews && (
                    <SectionCard title="Avis sans réponse" href="/reviews" icon={Star}>
                        {pendingReviews.length === 0 ? (
                            <EmptyState text="Tous les avis ont une réponse" />
                        ) : (
                            pendingReviews.map((r) => (
                                <ItemRow key={r.id}
                                    initial={r.author_name?.[0]}
                                    title={r.author_name}
                                    subtitle={r.comment?.slice(0, 50) + (r.comment?.length > 50 ? "…" : "") || ""}
                                    right={
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className="w-3 h-3" style={{ color: i < r.rating ? "#FFC745" : "#52525b", fill: i < r.rating ? "#FFC745" : "transparent" }} />
                                            ))}
                                        </div>
                                    }
                                />
                            ))
                        )}
                    </SectionCard>
                )}
            </div>
        </div>
    );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionCard({ title, href, icon: Icon, children }: { title: string; href: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,199,69,0.15)" }}>
                        <Icon className="w-4 h-4" style={{ color: "#FFC745" }} />
                    </div>
                    <h2 className="text-base font-semibold" style={{ color: "#ffffff" }}>{title}</h2>
                </div>
                <Link href={href} className="text-xs font-medium no-underline flex items-center gap-1" style={{ color: "#FFC745" }}>
                    Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="flex flex-col gap-1">{children}</div>
        </div>
    );
}

function ItemRow({ initial, photo, title, subtitle, right }: { initial?: string; photo?: string | null; title: string; subtitle?: string; right?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
            style={{ background: "rgba(0,255,145,0.02)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,199,69,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,255,145,0.02)")}>
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold overflow-hidden"
                style={{ background: "#FFC745", color: "#001C1C" }}>
                {photo ? <img src={photo} alt={title} className="w-full h-full object-cover" /> : (initial?.toUpperCase() || "?")}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#ffffff" }}>{title}</p>
                {subtitle && <p className="text-xs truncate" style={{ color: "#71717a" }}>{subtitle}</p>}
            </div>
            {right && <div className="shrink-0">{right}</div>}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-sm text-center py-6" style={{ color: "#52525b" }}>{text}</p>;
}
