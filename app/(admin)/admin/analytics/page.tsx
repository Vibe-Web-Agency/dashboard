"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Euro, ShoppingBag, Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientRow {
    business_id: string;
    business_name: string | null;
    monthly_price: number;
    upsells: number;
    activated: boolean;
    is_active: boolean;
    created_at: string;
}

interface Depense {
    id: string;
    label: string;
    amount: number;
    type: "fixed" | "ponctual";
    date: string | null;
    objet: string | null;
    created_at: string;
}

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const tooltipStyle = {
    contentStyle: { background: "#002928", border: "1px solid rgba(0, 255, 145, 0.15)", borderRadius: "8px", color: "#ffffff", fontSize: "13px" },
    cursor: { fill: "rgba(255, 199, 69, 0.05)" },
};

const emptyForm = { label: "", amount: "", type: "fixed" as "fixed" | "ponctual", date: "" };

export default function AdminAnalyticsPage() {
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [depenses, setDepenses] = useState<Depense[]>([]);
    const [revenueMode, setRevenueMode] = useState<"MRR" | "ARR">("MRR");
    const [kpiMode, setKpiMode] = useState<"MRR" | "ARR">("MRR");
    const [loading, setLoading] = useState(true);
    const [addForm, setAddForm] = useState(emptyForm);
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loadDepenses = () =>
        fetch("/api/admin/depenses").then((r) => r.json()).then((d) => setDepenses(d.depenses || []));

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/clients").then((r) => r.json()),
            fetch("/api/admin/depenses").then((r) => r.json()),
        ]).then(([c, d]) => {
            setClients(c.clients || []);
            setDepenses(d.depenses || []);
            setLoading(false);
        });
    }, []);

    const handleAddDepense = async () => {
        if (!addForm.label || !addForm.amount) return;
        setAdding(true);
        await fetch("/api/admin/depenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(addForm),
        });
        setAddForm(emptyForm);
        setShowForm(false);
        await loadDepenses();
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        await fetch("/api/admin/depenses", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        await loadDepenses();
    };

    const now = new Date();
    const activeClients = clients.filter((c) => c.is_active !== false);
    const mrr = activeClients.reduce((s, c) => s + (c.monthly_price || 0), 0);
    const arr = mrr * 12;
    const totalUpsells = activeClients.reduce((s, c) => s + (c.upsells || 0), 0);
    const totalCumulative = activeClients.reduce((s, c) => {
        const monthsActive = Math.max(1, Math.round((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return s + (c.monthly_price || 0) * monthsActive + (c.upsells || 0);
    }, 0);

    const fixedCharges = depenses.filter((d) => d.type === "fixed");
    const ponctualDepenses = depenses.filter((d) => d.type === "ponctual");
    const totalFixed = fixedCharges
        .filter((d) => !d.date || new Date(d.date) <= now)
        .reduce((s, d) => s + d.amount, 0);
    const totalPonctual = ponctualDepenses.reduce((s, d) => s + d.amount, 0);

    // Cumul des charges fixes payées : montant × nb de mois facturés depuis la date de début
    const totalFixedCumulative = fixedCharges.reduce((s, d) => {
        const startDate = d.date ? new Date(d.date) : now;
        if (startDate > now) return s;
        const billingDay = startDate.getDate();
        let months = 0;
        let check = new Date(startDate.getFullYear(), startDate.getMonth(), billingDay, 23, 59, 59);
        while (check <= now) {
            months++;
            check = new Date(check.getFullYear(), check.getMonth() + 1, billingDay, 23, 59, 59);
        }
        return s + d.amount * months;
    }, 0);

    const profitNet = totalCumulative - totalFixedCumulative - totalPonctual;

    // Nouveaux clients par mois (12 derniers mois)
    const clientGrowth = Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 0);
        return {
            month: MONTHS_FR[monthStart.getMonth()],
            clients: activeClients.filter((c) => { const d = new Date(c.created_at); return d >= monthStart && d <= monthEnd; }).length,
        };
    });

    // MRR/ARR cumulatif par mois
    const revenueGrowth = Array.from({ length: 12 }, (_, i) => {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 0);
        const mrrVal = activeClients
            .filter((c) => new Date(c.created_at) <= monthEnd)
            .reduce((s, c) => s + (c.monthly_price || 0), 0);
        return { month: MONTHS_FR[monthEnd.getMonth()], MRR: mrrVal, ARR: mrrVal * 12 };
    });

    // Revenus cumulés 2026
    const monthlyRevenue2026 = Array.from({ length: 12 }, (_, i) => {
        const monthEnd = new Date(2026, i + 1, 0, 23, 59, 59);
        const isFuture = new Date(2026, i, 1) > now;
        const total = isFuture ? null : activeClients
            .filter((c) => new Date(c.created_at) <= monthEnd)
            .reduce((s, c) => {
                const monthsActive = Math.max(1, Math.round((monthEnd.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
                return s + (c.monthly_price || 0) * monthsActive + (c.upsells || 0);
            }, 0);
        return { month: MONTHS_FR[i], Revenus: total, isFuture };
    });

    // Dépenses mensuelles 2026 : charges fixes + ponctuelles par mois
    const monthlyExpenses2026 = Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(2026, i, 1);
        const monthEnd = new Date(2026, i + 1, 0, 23, 59, 59);
        const isFuture = monthStart > now;
        const isCurrentMonth = now >= monthStart && now <= monthEnd;
        const fixesMonth = fixedCharges.filter((d) => {
            if (!d.date) return true;
            const startDate = new Date(d.date);
            const billingDay = startDate.getDate();
            const billingInMonth = new Date(2026, i, billingDay, 23, 59, 59);
            if (isCurrentMonth) return startDate <= billingInMonth && new Date(2026, i, billingDay) <= now;
            return startDate <= billingInMonth;
        }).reduce((s, d) => s + d.amount, 0);
        const ponctualMonth = ponctualDepenses
            .filter((d) => { if (!d.date) return false; const dd = new Date(d.date); return dd >= monthStart && dd <= monthEnd; })
            .reduce((s, d) => s + d.amount, 0);
        return {
            month: MONTHS_FR[i],
            Fixes: isFuture ? 0 : fixesMonth,
            Ponctuelles: isFuture ? 0 : ponctualMonth,
            isFuture,
        };
    });

    // LTV par client
    const ltvData = [...activeClients]
        .map((c) => {
            const monthsActive = Math.max(1, Math.round((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
            const ltv = (c.monthly_price || 0) * monthsActive + (c.upsells || 0);
            return { name: c.business_name || "Sans nom", LTV: ltv };
        })
        .filter((c) => c.LTV > 0)
        .sort((a, b) => b.LTV - a.LTV);

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Analytics VWA</h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>Vue d&apos;ensemble de l&apos;activité Vibe Web Agency</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <div className="flex items-center justify-between mb-3"><Skeleton className="w-9 h-9 rounded-lg" /></div>
                            <Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <Skeleton className="h-5 w-48 mb-2" /><Skeleton className="h-4 w-64 mb-6" /><Skeleton className="w-full h-[200px] rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Analytics VWA</h1>
                <p className="mt-1" style={{ color: "#c3c3d4" }}>Vue d&apos;ensemble de l&apos;activité Vibe Web Agency</p>
            </div>

            {/* KPI — Finance + Clients */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* MRR / ARR toggleable */}
                <div className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,145,0.15)" }}>
                            <Euro className="w-4 h-4" style={{ color: "#00ff91" }} />
                        </div>
                        <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.1)" }}>
                            {(["MRR", "ARR"] as const).map((m) => (
                                <button key={m} onClick={() => setKpiMode(m)}
                                    className="px-2 py-0.5 text-xs rounded font-medium transition-all duration-200"
                                    style={kpiMode === m ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 } : { color: "#c3c3d4" }}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{(kpiMode === "MRR" ? mrr : arr).toLocaleString("fr-FR")} €</p>
                    <p className="text-sm mt-1 font-medium" style={{ color: "#c3c3d4" }}>{kpiMode}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{kpiMode === "MRR" ? "Revenu mensuel récurrent" : "Revenu annuel estimé"}</p>
                </div>

                {/* Revenus cumulés */}
                <div className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,145,0.15)" }}>
                            <TrendingUp className="w-4 h-4" style={{ color: "#00ff91" }} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{totalCumulative.toLocaleString("fr-FR")} €</p>
                    <p className="text-sm mt-1 font-medium" style={{ color: "#c3c3d4" }}>Revenus cumulés</p>
                    <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Abonnements + upsells</p>
                </div>

                {/* Total dépenses */}
                <div className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(248,113,113,0.15)" }}>
                            <ShoppingBag className="w-4 h-4" style={{ color: "#f87171" }} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{(totalFixed + totalPonctual).toLocaleString("fr-FR")} €</p>
                    <p className="text-sm mt-1 font-medium" style={{ color: "#c3c3d4" }}>Dépenses</p>
                    <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{totalFixed.toLocaleString("fr-FR")} € fixes / mois</p>
                </div>

                {/* Bénéfice */}
                <div className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: profitNet >= 0 ? "rgba(0,255,145,0.15)" : "rgba(248,113,113,0.15)" }}>
                            <TrendingUp className="w-4 h-4" style={{ color: profitNet >= 0 ? "#00ff91" : "#f87171" }} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: profitNet >= 0 ? "#ffffff" : "#f87171" }}>{profitNet.toLocaleString("fr-FR")} €</p>
                    <p className="text-sm mt-1 font-medium" style={{ color: "#c3c3d4" }}>Bénéfice net</p>
                    <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Revenus cumulés − dépenses</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Nouveaux clients / mois */}
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Nouveaux clients</h2>
                    <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Par mois sur les 12 derniers mois</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={clientGrowth} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                            <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="clients" radius={[4, 4, 0, 0]}>
                                {clientGrowth.map((entry, i) => (
                                    <Cell key={i} fill={entry.clients > 0 ? "#FFC745" : "rgba(255,199,69,0.2)"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* MRR / ARR cumulatif */}
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Évolution {revenueMode}</h2>
                        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.1)" }}>
                            {(["MRR", "ARR"] as const).map((m) => (
                                <button key={m} onClick={() => setRevenueMode(m)}
                                    className="px-3 py-1 text-xs rounded-md font-medium transition-all duration-200"
                                    style={revenueMode === m ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 } : { color: "#c3c3d4" }}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>{revenueMode} cumulatif sur les 12 derniers mois</p>
                    {mrr === 0 ? (
                        <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#71717a" }}>
                            Renseignez les abonnements dans chaque fiche client
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={revenueGrowth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                                <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} unit="€" />
                                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toLocaleString("fr-FR")} €`, revenueMode]} />
                                <Line type="monotone" dataKey={revenueMode} stroke="#00ff91" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#00ff91" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Revenus mensuels 2026 */}
            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                <h2 className="text-lg font-semibold mb-1" style={{ color: "#ffffff" }}>Revenus mensuels 2026</h2>
                <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Revenus cumulés mois par mois — janvier à décembre 2026</p>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyRevenue2026}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                        <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} unit="€" />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toLocaleString("fr-FR")} €`, "Revenus cumulés"]} />
                        <Line type="monotone" dataKey="Revenus" stroke="#FFC745" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#FFC745" }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Dépenses mensuelles 2026 */}
            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                <h2 className="text-lg font-semibold mb-1" style={{ color: "#ffffff" }}>Dépenses mensuelles 2026</h2>
                <p className="text-sm mb-4" style={{ color: "#a1a1aa" }}>Charges fixes + dépenses ponctuelles par mois</p>
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f87171" }} /><span className="text-xs" style={{ color: "#a1a1aa" }}>Charges fixes</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fb923c" }} /><span className="text-xs" style={{ color: "#a1a1aa" }}>Ponctuelles</span></div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyExpenses2026} barSize={20} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                        <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} unit="€" />
                        <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v.toLocaleString("fr-FR")} €`, name]} />
                        <Bar dataKey="Fixes" radius={[4, 4, 0, 0]} stackId="a">
                            {monthlyExpenses2026.map((entry, i) => (
                                <Cell key={i} fill={entry.isFuture ? "rgba(248,113,113,0.15)" : "#f87171"} />
                            ))}
                        </Bar>
                        <Bar dataKey="Ponctuelles" radius={[4, 4, 0, 0]} stackId="a">
                            {monthlyExpenses2026.map((entry, i) => (
                                <Cell key={i} fill={entry.isFuture ? "rgba(251,146,60,0.15)" : entry.Ponctuelles > 0 ? "#fb923c" : "transparent"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* LTV par client */}
            {ltvData.length > 0 && (
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <h2 className="text-lg font-semibold mb-1" style={{ color: "#ffffff" }}>Lifetime Value par client</h2>
                    <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Revenu total généré depuis le début (abonnement × mois + upsells)</p>
                    <ResponsiveContainer width="100%" height={Math.max(160, ltvData.length * 44)}>
                        <BarChart data={ltvData} layout="vertical" barSize={24}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" horizontal={false} />
                            <XAxis type="number" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} unit="€" />
                            <YAxis type="category" dataKey="name" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} width={120} />
                            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toLocaleString("fr-FR")} €`, "LTV"]} />
                            <Bar dataKey="LTV" radius={[0, 4, 4, 0]}>
                                {ltvData.map((_, i) => (
                                    <Cell key={i} fill={i === 0 ? "#00ff91" : "rgba(0,255,145,0.4)"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Récapitulatif revenus */}
            {activeClients.length > 0 && (
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h2 className="text-lg font-semibold mb-1" style={{ color: "#ffffff" }}>Récapitulatif des revenus</h2>
                    <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Abonnements mensuels + upsells de tous les clients</p>
                    <div className="flex flex-col gap-3">
                        {activeClients.filter((c) => c.monthly_price > 0 || c.upsells > 0).sort((a, b) => (b.monthly_price + b.upsells) - (a.monthly_price + a.upsells)).map((c) => (
                            <div key={c.business_id} className="flex items-center justify-between py-2.5 px-4 rounded-lg" style={{ background: "rgba(0,255,145,0.04)", border: "1px solid rgba(0,255,145,0.07)" }}>
                                <span className="text-sm font-medium truncate max-w-[45%]" style={{ color: "#e4e4e7" }}>{c.business_name || "Sans nom"}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold" style={{ color: "#FFC745" }}>{(c.monthly_price || 0).toLocaleString("fr-FR")} € <span className="font-normal text-xs" style={{ color: "#71717a" }}>/ mois</span></span>
                                    {c.upsells > 0 && (
                                        <span className="text-sm font-semibold" style={{ color: "#00ff91" }}>+{(c.upsells || 0).toLocaleString("fr-FR")} € <span className="font-normal text-xs" style={{ color: "#71717a" }}>upsell</span></span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-4 mt-3 border-t" style={{ borderColor: "rgba(0,255,145,0.1)" }}>
                            <span className="text-sm font-semibold" style={{ color: "#c3c3d4" }}>Total</span>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold" style={{ color: "#FFC745" }}>{mrr.toLocaleString("fr-FR")} € <span className="font-normal text-xs" style={{ color: "#71717a" }}>/ mois</span></span>
                                {totalUpsells > 0 && (
                                    <span className="text-sm font-bold" style={{ color: "#00ff91" }}>+{totalUpsells.toLocaleString("fr-FR")} € <span className="font-normal text-xs" style={{ color: "#71717a" }}>upsell</span></span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dépenses */}
            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                {/* Header dépenses */}
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Dépenses</h2>
                    <button onClick={() => { setShowForm(!showForm); setAddForm(emptyForm); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                        style={{ background: showForm ? "rgba(255,255,255,0.05)" : "rgba(248,113,113,0.1)", color: showForm ? "#a1a1aa" : "#f87171", border: `1px solid ${showForm ? "rgba(255,255,255,0.08)" : "rgba(248,113,113,0.2)"}` }}>
                        <Plus className="w-3 h-3" />{showForm ? "Annuler" : "Ajouter"}
                    </button>
                </div>
                <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Charges fixes mensuelles et dépenses ponctuelles</p>

                {/* Formulaire unique */}
                {showForm && (
                    <div className="flex flex-col gap-3 mb-6 p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {/* Toggle type */}
                        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {([["fixed", "Récurrent"], ["ponctual", "Ponctuel"]] as const).map(([val, label]) => (
                                <button key={val} onClick={() => setAddForm(p => ({ ...p, type: val }))}
                                    className="px-3 py-1 text-xs rounded-md font-medium transition-all duration-200"
                                    style={addForm.type === val ? { background: addForm.type === "fixed" ? "#f87171" : "#fb923c", color: "#ffffff", fontWeight: 600 } : { color: "#a1a1aa" }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <input placeholder="Libellé" value={addForm.label}
                            onChange={(e) => setAddForm(p => ({ ...p, label: e.target.value }))}
                            className="w-full rounded-md px-3 py-2 text-sm outline-none"
                            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#ffffff" }} />
                        <input type="number" placeholder="Montant (€)" value={addForm.amount}
                            onChange={(e) => setAddForm(p => ({ ...p, amount: e.target.value }))}
                            className="w-full rounded-md px-3 py-2 text-sm outline-none"
                            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#ffffff" }} />
                        <div>
                            <p className="text-xs mb-1" style={{ color: "#71717a" }}>{addForm.type === "fixed" ? "Depuis le" : "Date"}</p>
                            <input type="date" value={addForm.date}
                                onChange={(e) => setAddForm(p => ({ ...p, date: e.target.value }))}
                                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#ffffff" }} />
                        </div>
                        <button onClick={handleAddDepense} disabled={adding}
                            className="text-xs font-semibold py-1.5 rounded-md transition-all"
                            style={{ background: addForm.type === "fixed" ? "#f87171" : "#fb923c", color: "#ffffff" }}>
                            {adding ? "Ajout..." : "Confirmer"}
                        </button>
                    </div>
                )}

                {/* KPI résumé */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: "Charges fixes / mois", value: totalFixed, color: "#f87171" },
                        { label: "Dépenses ponctuelles", value: totalPonctual, color: "#fb923c" },
                        { label: "Bénéfice net cumulé", value: profitNet, color: profitNet >= 0 ? "#00ff91" : "#f87171" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-lg font-bold" style={{ color }}>{value.toLocaleString("fr-FR")} €</p>
                            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Deux colonnes */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Charges fixes */}
                    <div>
                        <p className="text-sm font-semibold mb-3" style={{ color: "#c3c3d4" }}>Charges fixes mensuelles</p>
                        <div className="flex flex-col gap-2">
                            {fixedCharges.length === 0 ? (
                                <p className="text-xs py-3 text-center" style={{ color: "#52525b" }}>Aucune charge fixe</p>
                            ) : fixedCharges.map((d) => (
                                <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.1)" }}>
                                    <div>
                                        <span className="text-sm" style={{ color: "#e4e4e7" }}>{d.label}</span>
                                        {d.date && <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>depuis le {new Date(d.date).toLocaleDateString("fr-FR")}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold" style={{ color: "#f87171" }}>{d.amount.toLocaleString("fr-FR")} € <span className="font-normal text-xs" style={{ color: "#71717a" }}>/ mois</span></span>
                                        <button onClick={() => handleDelete(d.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {fixedCharges.length > 0 && (
                                <div className="flex justify-end pt-1">
                                    <span className="text-xs font-semibold" style={{ color: "#f87171" }}>Total : {totalFixed.toLocaleString("fr-FR")} € / mois</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dépenses ponctuelles */}
                    <div>
                        <p className="text-sm font-semibold mb-3" style={{ color: "#c3c3d4" }}>Dépenses ponctuelles</p>
                        <div className="flex flex-col gap-2">
                            {ponctualDepenses.length === 0 ? (
                                <p className="text-xs py-3 text-center" style={{ color: "#52525b" }}>Aucune dépense ponctuelle</p>
                            ) : ponctualDepenses.map((d) => (
                                <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.1)" }}>
                                    <div>
                                        <span className="text-sm" style={{ color: "#e4e4e7" }}>{d.label}</span>
                                        {d.date && <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{new Date(d.date).toLocaleDateString("fr-FR")}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold" style={{ color: "#fb923c" }}>{d.amount.toLocaleString("fr-FR")} €</span>
                                        <button onClick={() => handleDelete(d.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#fb923c" }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {ponctualDepenses.length > 0 && (
                                <div className="flex justify-end pt-1">
                                    <span className="text-xs font-semibold" style={{ color: "#fb923c" }}>Total : {totalPonctual.toLocaleString("fr-FR")} €</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
