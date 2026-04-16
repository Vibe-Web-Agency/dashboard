"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2, BookmarkPlus, BookmarkCheck, Star, MapPin, Phone, Globe, Trash2, StickyNote, ChevronRight, Download, Mail, Copy, Check, X, Eye, Link } from "lucide-react";

interface PlaceResult {
    place_id: string;
    name: string;
    address: string;
    rating: number | null;
    user_ratings_total: number | null;
    phone: string | null;
    website: string | null;
    has_website: boolean | null;
    opening_hours: string[] | null;
}

interface Prospect {
    id: string;
    place_id: string;
    name: string;
    address: string;
    rating: number | null;
    phone: string | null;
    business_type: string;
    city: string;
    status: ProspectStatus;
    notes: string | null;
    created_at: string;
    preview_open_count: number | null;
    preview_opened_at: string | null;
    opening_hours: string[] | null;
}

type ProspectStatus = "nouveau" | "contacté" | "en_discussion" | "signé" | "perdu";

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string }> = {
    nouveau: { label: "Nouveau", color: "#FFC745", bg: "rgba(255,199,69,0.1)" },
    contacté: { label: "Contacté", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
    en_discussion: { label: "En discussion", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    signé: { label: "Signé", color: "#00ff91", bg: "rgba(0,255,145,0.1)" },
    perdu: { label: "Perdu", color: "#f87171", bg: "rgba(239,68,68,0.1)" },
};

const BUSINESS_TYPES = [
    { value: "restaurant", label: "Restaurant" },
    { value: "salon de coiffure", label: "Salon de coiffure" },
    { value: "coach sportif", label: "Coach sportif" },
    { value: "boulangerie", label: "Boulangerie" },
    { value: "café", label: "Café / Bar" },
    { value: "esthéticienne", label: "Esthéticienne" },
    { value: "ostéopathe", label: "Ostéopathe" },
    { value: "dentiste", label: "Dentiste" },
    { value: "agence immobilière", label: "Agence immobilière" },
    { value: "boutique", label: "Boutique" },
];

// weekday_text format: "lundi: 09:00 – 18:00" or "lundi: Fermé"
function isOpenNow(weekdayText: string[] | null): boolean | null {
    if (!weekdayText || weekdayText.length === 0) return null;

    // Extraire les composantes Paris directement via sv-SE (format "YYYY-MM-DD HH:MM:SS")
    const parisStr = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" });
    const [datePart, timePart] = parisStr.split(" ");
    const [h, m] = timePart.split(":").map(Number);
    const currentMinutes = h * 60 + m;
    // getDay() sur la date Paris (sv-SE donne YYYY-MM-DD, parseable)
    const parisDay = new Date(datePart).getDay(); // 0=dim, 1=lun...
    const dayIndex = parisDay === 0 ? 6 : parisDay - 1; // Google: 0=lun...6=dim

    const line = weekdayText[dayIndex];
    if (!line) return null;
    const hoursStr = line.split(": ").slice(1).join(": ").trim();
    if (hoursStr === "Fermé" || hoursStr === "Closed") return false;
    if (hoursStr === "Ouvert en permanence" || hoursStr === "Open 24 hours") return true;

    const ranges = hoursStr.split(", ");
    for (const range of ranges) {
        const parts = range.split(/\s*[\u2013\u2014-]\s*/); // en-dash, em-dash, hyphen
        if (parts.length !== 2) continue;
        const toMin = (s: string) => {
            const clean = s.trim().replace(/\u00a0/g, ""); // remove non-breaking spaces
            const [hh, mm] = clean.split(":").map(Number);
            return hh * 60 + (mm || 0);
        };
        const start = toMin(parts[0]);
        const end = toMin(parts[1]);
        if (isNaN(start) || isNaN(end)) continue;
        if (end < start) { // overnight
            if (currentMinutes >= start || currentMinutes < end) return true;
        } else {
            if (currentMinutes >= start && currentMinutes < end) return true;
        }
    }
    return false;
}

export default function ProspectsPage() {
    const [query, setQuery] = useState("");
    const [city, setCity] = useState("");
    const [noWebsiteOnly, setNoWebsiteOnly] = useState(true);
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
    const [filterStatus, setFilterStatus] = useState<ProspectStatus | "all">("all");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNotes, setEditNotes] = useState("");
    const [editStatus, setEditStatus] = useState<ProspectStatus>("nouveau");
    const [saving, setSaving] = useState(false);

    const [emailModalProspect, setEmailModalProspect] = useState<Prospect | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const [backfilling, setBackfilling] = useState(false);
    const [backfillResult, setBackfillResult] = useState<string | null>(null);

    useEffect(() => {
        fetchProspects();
    }, []);

    const fetchProspects = async () => {
        const res = await fetch("/api/admin/prospects");
        if (res.ok) {
            const data = await res.json();
            setProspects(data);
        }
    };

    const search = async (pageToken?: string) => {
        if (!query || !city) return;
        if (pageToken) setLoadingMore(true);
        else { setSearching(true); setResults([]); setNextPageToken(null); }
        setSearchError(null);

        try {
            const params = new URLSearchParams({ query, city });
            if (pageToken) params.set("pageToken", pageToken);
            if (noWebsiteOnly) params.set("noWebsite", "1");
            const res = await fetch(`/api/admin/prospects/search?${params}`);
            const data = await res.json();
            if (!res.ok) { setSearchError(data.error); return; }
            setResults(prev => pageToken ? [...prev, ...data.places] : data.places);
            setNextPageToken(data.nextPageToken);
        } finally {
            setSearching(false);
            setLoadingMore(false);
        }
    };

    const saveProspect = async (place: PlaceResult) => {
        setSavingIds(prev => new Set(prev).add(place.place_id));
        const res = await fetch("/api/admin/prospects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                place_id: place.place_id,
                name: place.name,
                address: place.address,
                rating: place.rating,
                phone: place.phone,
                website: place.website,
                business_type: query,
                city,
            }),
        });
        if (res.ok) {
            const newProspect = await res.json();
            if (newProspect) setProspects(prev => [newProspect, ...prev]);
        }
        setSavingIds(prev => { const s = new Set(prev); s.delete(place.place_id); return s; });
    };

    const deleteProspect = async (id: string) => {
        await fetch(`/api/admin/prospects?id=${id}`, { method: "DELETE" });
        setProspects(prev => prev.filter(p => p.id !== id));
    };

    const saveEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        const res = await fetch("/api/admin/prospects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, status: editStatus, notes: editNotes }),
        });
        if (res.ok) {
            const updated = await res.json();
            setProspects(prev => prev.map(p => p.id === editingId ? updated : p));
            setEditingId(null);
        }
        setSaving(false);
    };

    const savedPlaceIds = new Set(prospects.map(p => p.place_id));

    const filteredProspects = filterStatus === "all"
        ? prospects
        : prospects.filter(p => p.status === filterStatus);

    const generateEmail = (p: Prospect) => {
        const metier = p.business_type || "professionnel";
        const ville = p.city || "votre ville";
        const previewUrl = `https://vibewebagency.fr/preview/${p.id}`;
        return `Bonjour,

J'ai vu que ${p.name} n'a pas encore de site web.

Chaque semaine, des gens dans ${ville} cherchent un ${metier} sur Google — et ils appellent celui qui apparaît en premier.

Je crée des sites pour les ${metier} avec prise de rendez-vous en ligne, pour 99 €/mois tout compris.

Vous pouvez avoir un aperçu du site ici : ${previewUrl}

Si ça vous intéresse, vous pouvez me contacter au 0651483757 ou sur https://vibewebagency.fr

Enzo`;
    };

    const backfillHours = async () => {
        setBackfilling(true);
        setBackfillResult(null);
        const res = await fetch("/api/admin/prospects/backfill-hours", { method: "POST" });
        const data = await res.json();
        if (data.updated !== undefined) {
            setBackfillResult(`${data.updated} prospect${data.updated > 1 ? "s" : ""} mis à jour`);
            if (data.updated > 0) fetchProspects();
        } else {
            setBackfillResult(data.reason ?? data.error ?? "Erreur");
        }
        setBackfilling(false);
    };

    const copyPreviewLink = async (id: string) => {
        await navigator.clipboard.writeText(`https://vibewebagency.fr/preview/${id}`);
        setCopiedLinkId(id);
        setTimeout(() => setCopiedLinkId(null), 2000);
    };

    const copyEmail = async () => {
        if (!emailModalProspect) return;
        await navigator.clipboard.writeText(generateEmail(emailModalProspect));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const exportCSV = () => {
        const headers = ["Nom", "Téléphone", "Adresse", "Note", "Type", "Ville", "Statut", "Notes", "Date ajout"];
        const rows = prospects.map(p => [
            p.name,
            p.phone || "",
            p.address || "",
            p.rating ?? "",
            p.business_type || "",
            p.city || "",
            STATUS_CONFIG[p.status]?.label || p.status,
            p.notes || "",
            new Date(p.created_at).toLocaleDateString("fr-FR"),
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prospects_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statusCounts = prospects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <>
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "#FFC745" }}>
                    Prospection
                </h1>
                <p style={{ color: "#c3c3d4" }}>Trouvez des prospects via Google Places et gérez votre pipeline</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {[
                    { key: "search", label: "Recherche" },
                    { key: "saved", label: `Sauvegardés (${prospects.length})` },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as "search" | "saved")}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={activeTab === tab.key
                            ? { background: "#FFC745", color: "#001C1C", fontWeight: 700 }
                            : { background: "rgba(255,199,69,0.08)", color: "#c3c3d4" }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "search" && (
                <>
                    {/* Search Form */}
                    <div
                        className="rounded-xl p-5 flex flex-col gap-3"
                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}
                    >
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }}
                            >
                                <option value="">Type de business</option>
                                {BUSINESS_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Ville (ex: Paris, Lyon...)"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && search()}
                                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }}
                            />
                            <Button
                                onClick={() => search()}
                                disabled={!query || !city || searching}
                                className="flex items-center gap-2 px-5"
                                style={{ background: "#FFC745", color: "#001C1C", fontWeight: 600 }}
                            >
                                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Rechercher
                            </Button>
                        </div>
                        {/* Filter toggle */}
                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <div
                                className="relative w-10 h-5 rounded-full transition-all shrink-0"
                                style={{ background: noWebsiteOnly ? "#FFC745" : "rgba(255,255,255,0.1)" }}
                                onClick={() => setNoWebsiteOnly(v => !v)}
                            >
                                <div
                                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                                    style={{ background: "#ffffff", left: noWebsiteOnly ? "calc(100% - 18px)" : "2px" }}
                                />
                            </div>
                            <span className="text-sm" style={{ color: "#c3c3d4" }}>
                                Sans site web uniquement
                            </span>
                        </label>
                    </div>

                    {/* Search Error */}
                    {searchError && (
                        <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                            {searchError}
                        </div>
                    )}

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm" style={{ color: "#c3c3d4" }}>{results.length} résultat{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}</p>
                            {results.map(place => {
                                const isSaved = savedPlaceIds.has(place.place_id);
                                const isSaving = savingIds.has(place.place_id);
                                const openStatus = isOpenNow(place.opening_hours ?? null);
                                return (
                                    <div
                                        key={place.place_id}
                                        className="rounded-xl p-4 flex items-center justify-between gap-4"
                                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold truncate" style={{ color: "#ffffff" }}>{place.name}</p>
                                                {place.rating && (
                                                    <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "#FFC745" }}>
                                                        <Star className="w-3 h-3 fill-current" />
                                                        {place.rating}
                                                        {place.user_ratings_total && <span style={{ color: "#a1a1aa" }}>({place.user_ratings_total})</span>}
                                                    </span>
                                                )}
                                                {openStatus !== null && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" style={openStatus
                                                        ? { background: "rgba(0,255,145,0.1)", color: "#00ff91" }
                                                        : { background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                                                        {openStatus ? "Ouvert" : "Fermé"}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm flex items-start gap-1" style={{ color: "#a1a1aa" }}>
                                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                {place.address}
                                            </p>
                                            {place.phone && (
                                                <a
                                                    href={`tel:${place.phone}`}
                                                    className="text-sm flex items-center gap-1 mt-0.5 w-fit"
                                                    style={{ color: "#00ff91" }}
                                                >
                                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                                    {place.phone}
                                                </a>
                                            )}
                                            {place.website && (
                                                <a
                                                    href={place.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm flex items-center gap-1 mt-0.5 w-fit truncate max-w-xs"
                                                    style={{ color: "#60a5fa" }}
                                                >
                                                    <Globe className="w-3.5 h-3.5 shrink-0" />
                                                    {place.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                                </a>
                                            )}
                                        </div>
                                        <Button
                                            onClick={() => !isSaved && saveProspect(place)}
                                            disabled={isSaved || isSaving}
                                            className="shrink-0 flex items-center gap-2 text-sm"
                                            style={isSaved
                                                ? { background: "rgba(0,255,145,0.1)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }
                                                : { background: "rgba(255,199,69,0.1)", color: "#FFC745", border: "1px solid rgba(255,199,69,0.2)" }}
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                                            {isSaved ? "Sauvegardé" : "Sauvegarder"}
                                        </Button>
                                    </div>
                                );
                            })}

                            {nextPageToken && (
                                <Button
                                    onClick={() => search(nextPageToken)}
                                    disabled={loadingMore}
                                    className="w-full flex items-center justify-center gap-2"
                                    style={{ background: "rgba(0,255,145,0.05)", color: "#c3c3d4", border: "1px solid rgba(0,255,145,0.1)" }}
                                >
                                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                    Charger plus
                                </Button>
                            )}
                        </div>
                    )}

                    {!searching && results.length === 0 && !searchError && (
                        <div className="text-center py-12" style={{ color: "#a1a1aa" }}>
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>Recherchez des prospects par type de business et ville</p>
                        </div>
                    )}
                </>
            )}

            {activeTab === "saved" && (
                <>
                    {/* Export button */}
                    {prospects.length > 0 && (
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                            {backfillResult && (
                                <span className="text-xs" style={{ color: "#a1a1aa" }}>{backfillResult}</span>
                            )}
                            <Button
                                onClick={backfillHours}
                                disabled={backfilling}
                                className="flex items-center gap-2 text-sm"
                                style={{ background: "rgba(255,199,69,0.08)", color: "#FFC745", border: "1px solid rgba(255,199,69,0.2)" }}
                            >
                                {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                Récupérer les horaires
                            </Button>
                            <Button
                                onClick={exportCSV}
                                className="flex items-center gap-2 text-sm"
                                style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }}
                            >
                                <Download className="w-4 h-4" />
                                Exporter CSV
                            </Button>
                        </div>
                    )}

                    {/* Status filter + counts */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterStatus("all")}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={filterStatus === "all"
                                ? { background: "#FFC745", color: "#001C1C" }
                                : { background: "rgba(255,255,255,0.05)", color: "#c3c3d4" }}
                        >
                            Tous ({prospects.length})
                        </button>
                        {(Object.entries(STATUS_CONFIG) as [ProspectStatus, typeof STATUS_CONFIG[ProspectStatus]][]).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setFilterStatus(key)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={filterStatus === key
                                    ? { background: cfg.color, color: "#001C1C" }
                                    : { background: cfg.bg, color: cfg.color }}
                            >
                                {cfg.label} ({statusCounts[key] || 0})
                            </button>
                        ))}
                    </div>

                    {/* Prospects list */}
                    {filteredProspects.length === 0 ? (
                        <div className="text-center py-12" style={{ color: "#a1a1aa" }}>
                            <BookmarkPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>Aucun prospect sauvegardé</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredProspects.map(prospect => {
                                const cfg = STATUS_CONFIG[prospect.status];
                                const isEditing = editingId === prospect.id;
                                const openStatus = isOpenNow(prospect.opening_hours ?? null);
                                return (
                                    <div
                                        key={prospect.id}
                                        className="rounded-xl p-4"
                                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <p className="font-semibold" style={{ color: "#ffffff" }}>{prospect.name}</p>
                                                    <span
                                                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                        style={{ background: cfg.bg, color: cfg.color }}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                    {prospect.rating && (
                                                        <span className="flex items-center gap-1 text-xs" style={{ color: "#FFC745" }}>
                                                            <Star className="w-3 h-3 fill-current" />
                                                            {prospect.rating}
                                                        </span>
                                                    )}
                                                    {openStatus !== null && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={openStatus
                                                            ? { background: "rgba(0,255,145,0.1)", color: "#00ff91" }
                                                            : { background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                                                            {openStatus ? "Ouvert" : "Fermé"}
                                                        </span>
                                                    )}
                                                    {(prospect.preview_open_count ?? 0) > 0 && (
                                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91" }}>
                                                            <Eye className="w-3 h-3" />
                                                            {prospect.preview_open_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm flex items-start gap-1 mb-0.5" style={{ color: "#a1a1aa" }}>
                                                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                    {prospect.address}
                                                </p>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    {prospect.phone && (
                                                        <a
                                                            href={`tel:${prospect.phone}`}
                                                            className="text-sm flex items-center gap-1 w-fit"
                                                            style={{ color: "#00ff91" }}
                                                        >
                                                            <Phone className="w-3.5 h-3.5 shrink-0" />
                                                            {prospect.phone}
                                                        </a>
                                                    )}
                                                    <a
                                                        href={`https://www.google.com/maps/place/?q=place_id:${prospect.place_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Voir la fiche Google"
                                                        className="text-xs flex items-center gap-0.5"
                                                        style={{ color: "#71717a" }}
                                                    >
                                                        <MapPin className="w-3 h-3" />
                                                        Maps
                                                    </a>
                                                </div>
                                                {prospect.notes && !isEditing && (
                                                    <p className="text-sm mt-2 italic" style={{ color: "#c3c3d4" }}>
                                                        &quot;{prospect.notes}&quot;
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => copyPreviewLink(prospect.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                                    style={{ color: copiedLinkId === prospect.id ? "#00ff91" : "#a1a1aa" }}
                                                    title="Copier le lien preview"
                                                >
                                                    {copiedLinkId === prospect.id ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => { setEmailModalProspect(prospect); setCopied(false); }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                                    style={{ color: "#FFC745" }}
                                                    title="Générer l'email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(prospect.id);
                                                        setEditStatus(prospect.status);
                                                        setEditNotes(prospect.notes || "");
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                                    style={{ color: "#c3c3d4" }}
                                                    title="Modifier"
                                                >
                                                    <StickyNote className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteProspect(prospect.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                                    style={{ color: "#f87171" }}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Edit panel */}
                                        {isEditing && (
                                            <div className="mt-4 pt-4 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(0,255,145,0.1)" }}>
                                                <div className="flex flex-wrap gap-2">
                                                    {(Object.entries(STATUS_CONFIG) as [ProspectStatus, typeof STATUS_CONFIG[ProspectStatus]][]).map(([key, c]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setEditStatus(key)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                                            style={editStatus === key
                                                                ? { background: c.color, color: "#001C1C" }
                                                                : { background: c.bg, color: c.color }}
                                                        >
                                                            {c.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={editNotes}
                                                    onChange={e => setEditNotes(e.target.value)}
                                                    placeholder="Notes (contact pris, intérêt manifesté...)"
                                                    rows={3}
                                                    className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                                                    style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => setEditingId(null)}
                                                        className="flex-1 text-sm"
                                                        style={{ background: "rgba(0,255,145,0.05)", color: "#c3c3d4", border: "1px solid rgba(0,255,145,0.1)" }}
                                                    >
                                                        Annuler
                                                    </Button>
                                                    <Button
                                                        onClick={saveEdit}
                                                        disabled={saving}
                                                        className="flex-1 text-sm"
                                                        style={{ background: "#FFC745", color: "#001C1C", fontWeight: 600 }}
                                                    >
                                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>

            {/* Email Modal */}
            {emailModalProspect && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                    onClick={() => setEmailModalProspect(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)" }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-white">Email pour {emailModalProspect.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>
                                    Copiez et envoyez via votre client email
                                </p>
                            </div>
                            <button
                                onClick={() => setEmailModalProspect(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                style={{ color: "#a1a1aa" }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Email text */}
                        <textarea
                            readOnly
                            value={generateEmail(emailModalProspect)}
                            rows={12}
                            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                            style={{
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(0,255,145,0.12)",
                                color: "#e5e5e5",
                                lineHeight: 1.6,
                                fontFamily: "monospace",
                            }}
                        />

                        {/* Preview link */}
                        <div
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                            style={{ background: "rgba(255,199,69,0.08)", border: "1px solid rgba(255,199,69,0.15)", color: "#FFC745" }}
                        >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                                https://vibewebagency.fr/preview/{emailModalProspect.id}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setEmailModalProspect(null)}
                                className="flex-1 text-sm"
                                style={{ background: "rgba(0,255,145,0.05)", color: "#c3c3d4", border: "1px solid rgba(0,255,145,0.1)" }}
                            >
                                Fermer
                            </Button>
                            <Button
                                onClick={copyEmail}
                                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold"
                                style={{ background: copied ? "rgba(0,255,145,0.15)" : "#FFC745", color: copied ? "#00ff91" : "#001C1C" }}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copié !" : "Copier l'email"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
