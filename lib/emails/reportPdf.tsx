import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { ReportStats, formatDuration, delta } from "@/lib/reportStats";

const C = {
    bg: "#0a0f0a",
    card: "#0d1a0d",
    border: "#1a2e1a",
    gold: "#FFC745",
    green: "#00c97a",
    red: "#f87171",
    text: "#e4e4e7",
    muted: "#71717a",
    white: "#ffffff",
};

const s = StyleSheet.create({
    page: { backgroundColor: C.bg, padding: 40, fontFamily: "Helvetica", color: C.text },
    // Header
    header: { marginBottom: 32 },
    headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    badge: { backgroundColor: "#001C1C", borderWidth: 1, borderColor: "#1a3a2a", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
    badgeText: { color: C.gold, fontSize: 11, fontFamily: "Helvetica-Bold" },
    title: { fontSize: 26, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
    subtitle: { fontSize: 11, color: C.muted },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
    // Stats grid
    statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    statCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 14 },
    statLabel: { fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
    statValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 4 },
    statDelta: { fontSize: 9 },
    // Chart
    chartContainer: { marginBottom: 24 },
    chartTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 10 },
    chartImg: { width: "100%", height: 160, borderRadius: 8 },
    // Table
    tableContainer: { marginBottom: 20 },
    tableTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 8 },
    tableRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    tableRowHeader: { backgroundColor: "#0d1a0d" },
    tableCell: { flex: 1, fontSize: 10, color: C.text },
    tableCellHeader: { flex: 1, fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
    tableCellRight: { flex: 1, fontSize: 10, color: C.gold, textAlign: "right" },
    // Analysis
    analysisBox: { backgroundColor: "#0d1a0d", borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 16, marginBottom: 20 },
    analysisTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.gold, marginBottom: 8 },
    analysisBullet: { flexDirection: "row", gap: 6, marginBottom: 5 },
    analysisDot: { fontSize: 10, color: C.gold, marginTop: 1 },
    analysisText: { flex: 1, fontSize: 10, color: C.text, lineHeight: 1.5 },
    // Footer
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 9, color: C.muted },
    footerBrand: { fontSize: 9, color: C.gold },
});

function buildChartUrl(dailyVisits: { date: string; count: number }[], type: "weekly" | "monthly"): string {
    const labels = dailyVisits.map(d => {
        const dt = new Date(d.date);
        if (type === "weekly") {
            const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
            return days[dt.getDay()];
        }
        return `${dt.getDate()}`;
    });
    const values = dailyVisits.map(d => d.count);

    const config = {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Visites",
                data: values,
                borderColor: "#FFC745",
                backgroundColor: "rgba(255,199,69,0.08)",
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: "#FFC745",
                fill: true,
                tension: 0.4,
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#71717a", fontSize: 10 } },
                y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#71717a", fontSize: 10 }, beginAtZero: true },
            },
        },
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&width=700&height=240&backgroundColor=%230a0f0a`;
}

function buildBarUrl(topPages: { page: string; count: number }[]): string {
    const top = topPages.slice(0, 5);
    const config = {
        type: "horizontalBar",
        data: {
            labels: top.map(p => p.page.length > 20 ? p.page.slice(0, 20) + "…" : p.page),
            datasets: [{
                data: top.map(p => p.count),
                backgroundColor: "rgba(255,199,69,0.7)",
                borderColor: "#FFC745",
                borderWidth: 1,
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#71717a" }, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: "#71717a", fontSize: 10 } },
            },
        },
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&width=700&height=220&backgroundColor=%230a0f0a`;
}

function generateAnalysis(stats: ReportStats, businessName: string): string[] {
    const { current, previous } = stats;
    const lines: string[] = [];

    // Sessions
    const sessD = current.totalSessions - previous.totalSessions;
    if (sessD > 0) lines.push(`Le trafic a augmenté de ${sessD} sessions par rapport à la période précédente (+${Math.round((sessD / Math.max(previous.totalSessions, 1)) * 100)}%). Bonne dynamique de visibilité.`);
    else if (sessD < 0) lines.push(`Le trafic a diminué de ${Math.abs(sessD)} sessions vs la période précédente. Il peut être utile de renforcer la présence sur les réseaux ou le référencement.`);
    else lines.push(`Le trafic est stable par rapport à la période précédente.`);

    // Durée moyenne
    if (current.avgDuration > 60) lines.push(`La durée moyenne de session est de ${formatDuration(current.avgDuration)}, ce qui indique un bon niveau d'engagement des visiteurs.`);
    else if (current.avgDuration > 0) lines.push(`La durée moyenne de session est de ${formatDuration(current.avgDuration)}. Enrichir le contenu pourrait améliorer l'engagement.`);

    // Bounce rate
    if (current.bounceRate > 70) lines.push(`Le taux de rebond est élevé (${current.bounceRate}%). La plupart des visiteurs quittent après une seule page — la page d'accueil mérite peut-être d'être optimisée.`);
    else if (current.bounceRate > 0) lines.push(`Taux de rebond de ${current.bounceRate}% — dans la normale pour un site vitrine.`);

    // Top référent
    if (current.topReferrers[0] && current.topReferrers[0].source !== "Direct") {
        lines.push(`Principal canal d'acquisition : ${current.topReferrers[0].source} (${current.topReferrers[0].count} sessions).`);
    } else if (current.topReferrers[0]?.source === "Direct") {
        lines.push(`La majorité du trafic est direct, signe d'une bonne notoriété de la marque.`);
    }

    return lines;
}

interface ReportPdfProps {
    stats: ReportStats;
    businessName: string;
}

export function ReportPdf({ stats, businessName }: ReportPdfProps) {
    const { current, previous, periodLabel, type } = stats;
    const isWeekly = type === "weekly";
    const typeLabel = isWeekly ? "Rapport Hebdomadaire" : "Rapport Mensuel";
    const chartUrl = buildChartUrl(current.dailyVisits, type);
    const barUrl = buildBarUrl(current.topPages);
    const analysis = generateAnalysis(stats, businessName);

    const kpis = [
        {
            label: "Sessions",
            value: current.totalSessions.toString(),
            d: delta(current.totalSessions, previous.totalSessions),
        },
        {
            label: "Visiteurs uniques",
            value: current.uniqueVisitors.toString(),
            d: delta(current.uniqueVisitors, previous.uniqueVisitors),
        },
        {
            label: "Pages vues",
            value: current.totalPageViews.toString(),
            d: delta(current.totalPageViews, previous.totalPageViews),
        },
        {
            label: "Durée moyenne",
            value: formatDuration(current.avgDuration),
            d: delta(current.avgDuration, previous.avgDuration),
        },
        {
            label: "Pages / session",
            value: current.avgPagesPerSession.toString(),
            d: delta(current.avgPagesPerSession * 10, previous.avgPagesPerSession * 10),
        },
        {
            label: "Taux de rebond",
            value: `${current.bounceRate}%`,
            d: delta(100 - current.bounceRate, 100 - previous.bounceRate), // inversé
        },
    ];

    return (
        <Document title={`${typeLabel} — ${businessName}`} author="Vibe Web Agency">
            <Page size="A4" style={s.page}>
                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerTop}>
                        <View>
                            <Text style={s.title}>{businessName}</Text>
                            <Text style={s.subtitle}>{typeLabel} · {periodLabel}</Text>
                        </View>
                        <View style={s.badge}>
                            <Text style={s.badgeText}>VWA Analytics</Text>
                        </View>
                    </View>
                    <View style={s.divider} />
                </View>

                {/* KPIs - 3 colonnes */}
                <View style={s.statsRow}>
                    {kpis.slice(0, 3).map(k => (
                        <View key={k.label} style={s.statCard}>
                            <Text style={s.statLabel}>{k.label}</Text>
                            <Text style={s.statValue}>{k.value}</Text>
                            <Text style={[s.statDelta, { color: k.d.positive ? C.green : C.red }]}>
                                {k.d.value} vs période préc.
                            </Text>
                        </View>
                    ))}
                </View>
                <View style={s.statsRow}>
                    {kpis.slice(3).map(k => (
                        <View key={k.label} style={s.statCard}>
                            <Text style={s.statLabel}>{k.label}</Text>
                            <Text style={s.statValue}>{k.value}</Text>
                            <Text style={[s.statDelta, { color: k.d.positive ? C.green : C.red }]}>
                                {k.d.value} vs période préc.
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={s.divider} />

                {/* Graphique visites */}
                <View style={s.chartContainer}>
                    <Text style={s.chartTitle}>
                        Évolution des visites — {periodLabel}
                    </Text>
                    <Image src={chartUrl} style={s.chartImg} />
                </View>

                {/* Top pages */}
                {current.topPages.length > 0 && (
                    <View style={s.chartContainer}>
                        <Text style={s.chartTitle}>Pages les plus visitées</Text>
                        <Image src={barUrl} style={[s.chartImg, { height: 140 }]} />
                    </View>
                )}

                {/* Analyse */}
                {analysis.length > 0 && (
                    <View style={s.analysisBox}>
                        <Text style={s.analysisTitle}>Analyse de la période</Text>
                        {analysis.map((line, i) => (
                            <View key={i} style={s.analysisBullet}>
                                <Text style={s.analysisDot}>→</Text>
                                <Text style={s.analysisText}>{line}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Top référents */}
                {current.topReferrers.length > 0 && (
                    <View style={s.tableContainer}>
                        <Text style={s.tableTitle}>Sources de trafic</Text>
                        <View style={[s.tableRow, s.tableRowHeader]}>
                            <Text style={s.tableCellHeader}>Source</Text>
                            <Text style={[s.tableCellHeader, { textAlign: "right" }]}>Sessions</Text>
                            <Text style={[s.tableCellHeader, { textAlign: "right" }]}>Part</Text>
                        </View>
                        {current.topReferrers.map(r => (
                            <View key={r.source} style={s.tableRow}>
                                <Text style={s.tableCell}>{r.source}</Text>
                                <Text style={s.tableCellRight}>{r.count}</Text>
                                <Text style={s.tableCellRight}>
                                    {current.totalSessions > 0 ? Math.round((r.count / current.totalSessions) * 100) : 0}%
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Footer */}
                <View style={s.footer} fixed>
                    <Text style={s.footerText}>© Vibe Web Agency · {new Date().getFullYear()}</Text>
                    <Text style={s.footerBrand}>vibewebagency.fr</Text>
                </View>
            </Page>
        </Document>
    );
}
