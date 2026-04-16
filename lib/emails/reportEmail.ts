import { ReportStats, formatDuration, delta } from "@/lib/reportStats";

export function reportEmailHtml(stats: ReportStats, businessName: string): string {
    const { current, previous, periodLabel, type } = stats;
    const typeLabel = type === "weekly" ? "Rapport Hebdomadaire" : "Rapport Mensuel";

    const kpis = [
        { label: "Sessions", value: current.totalSessions, prev: previous.totalSessions, fmt: (v: number) => v.toString() },
        { label: "Visiteurs uniques", value: current.uniqueVisitors, prev: previous.uniqueVisitors, fmt: (v: number) => v.toString() },
        { label: "Pages vues", value: current.totalPageViews, prev: previous.totalPageViews, fmt: (v: number) => v.toString() },
        { label: "Durée moyenne", value: current.avgDuration, prev: previous.avgDuration, fmt: formatDuration },
        { label: "Pages / session", value: current.avgPagesPerSession, prev: previous.avgPagesPerSession, fmt: (v: number) => v.toString() },
        { label: "Taux de rebond", value: current.bounceRate, prev: previous.bounceRate, fmt: (v: number) => `${v}%`, invertDelta: true },
    ];

    const kpiRows = kpis.map(k => {
        const d = k.invertDelta
            ? delta(100 - k.value, 100 - k.prev)
            : delta(k.value, k.prev);
        const color = d.positive ? "#00c97a" : "#f87171";
        return `
        <td style="width:50%;padding:0 6px 12px;">
          <div style="background:#0d1a0d;border:1px solid #1a2e1a;border-radius:10px;padding:16px 14px;">
            <p style="margin:0 0 6px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:1px;">${k.label}</p>
            <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#ffffff;">${k.fmt(k.value)}</p>
            <p style="margin:0;font-size:10px;color:${color};">${d.value} vs période préc.</p>
          </div>
        </td>`;
    });

    const kpiTable = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>${kpiRows[0]}${kpiRows[1]}</tr>
      <tr>${kpiRows[2]}${kpiRows[3]}</tr>
      <tr>${kpiRows[4]}${kpiRows[5]}</tr>
    </table>`;

    const topPagesRows = current.topPages.slice(0, 5).map((p, i) => `
    <tr style="border-bottom:1px solid #1a2e1a;">
      <td style="padding:10px 0;font-size:11px;color:#a1a1aa;">${i + 1}</td>
      <td style="padding:10px 8px;font-size:11px;color:#e4e4e7;font-family:monospace;">${p.page}</td>
      <td style="padding:10px 0;font-size:11px;color:#FFC745;text-align:right;font-weight:700;">${p.count}</td>
    </tr>`).join("");

    const topRefRows = current.topReferrers.slice(0, 5).map(r => {
        const pct = current.totalSessions > 0 ? Math.round((r.count / current.totalSessions) * 100) : 0;
        return `
    <tr style="border-bottom:1px solid #1a2e1a;">
      <td style="padding:10px 0;font-size:11px;color:#e4e4e7;">${r.source}</td>
      <td style="padding:10px 0;font-size:11px;color:#FFC745;text-align:right;font-weight:700;">${r.count}</td>
      <td style="padding:10px 0;font-size:11px;color:#71717a;text-align:right;">${pct}%</td>
    </tr>`;
    }).join("");

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${typeLabel} — ${businessName}</title></head>
<body style="margin:0;padding:0;background:#001C1C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#001C1C;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

    <!-- Header -->
    <tr><td style="padding-bottom:24px;">
      <div style="background:#0d1a0d;border:1px solid #1a3a2a;border-radius:14px;padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:1.5px;">Vibe Web Agency</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#FFC745;">${businessName}</p>
            </td>
            <td style="text-align:right;">
              <div style="display:inline-block;background:rgba(255,199,69,0.1);border:1px solid rgba(255,199,69,0.25);border-radius:20px;padding:5px 14px;">
                <span style="font-size:10px;color:#FFC745;font-weight:700;letter-spacing:0.5px;">${typeLabel.toUpperCase()}</span>
              </div>
              <p style="margin:6px 0 0;font-size:11px;color:#71717a;">${periodLabel}</p>
            </td>
          </tr>
        </table>
      </div>
    </td></tr>

    <!-- KPIs -->
    <tr><td style="padding-bottom:20px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e4e4e7;">📊 Vue d'ensemble</p>
      ${kpiTable}
    </td></tr>

    <!-- Top pages -->
    ${current.topPages.length > 0 ? `
    <tr><td style="padding-bottom:20px;">
      <div style="background:#0d1a0d;border:1px solid #1a2e1a;border-radius:10px;padding:20px;">
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#e4e4e7;">📄 Pages les plus visitées</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr style="border-bottom:1px solid #1a2e1a;">
            <td style="padding-bottom:8px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;">#</td>
            <td style="padding-bottom:8px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;padding-left:8px;">Page</td>
            <td style="padding-bottom:8px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;text-align:right;">Vues</td>
          </tr>
          ${topPagesRows}
        </table>
      </div>
    </td></tr>` : ""}

    <!-- Sources trafic -->
    ${current.topReferrers.length > 0 ? `
    <tr><td style="padding-bottom:20px;">
      <div style="background:#0d1a0d;border:1px solid #1a2e1a;border-radius:10px;padding:20px;">
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#e4e4e7;">🔗 Sources de trafic</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr style="border-bottom:1px solid #1a2e1a;">
            <td style="padding-bottom:8px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;">Source</td>
            <td style="padding-bottom:8px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;text-align:right;">Sessions</td>
            <td style="padding-bottom:8px;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;text-align:right;">Part</td>
          </tr>
          ${topRefRows}
        </table>
      </div>
    </td></tr>` : ""}

    <!-- CTA -->
    <tr><td style="padding-bottom:16px;">
      <div style="background:#0d1a0d;border:1px solid #1a2e1a;border-radius:10px;padding:20px;text-align:center;">
        <p style="margin:0 0 6px;font-size:13px;color:#e4e4e7;">Le rapport complet est joint en PDF.</p>
        <p style="margin:0;font-size:11px;color:#71717a;">Consultez votre tableau de bord pour plus de détails.</p>
      </div>
    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding-top:12px;">
      <p style="margin:0;font-size:11px;color:#3f3f46;">Vibe Web Agency · <a href="https://dashboard.vibewebagency.fr" style="color:#FFC745;text-decoration:none;">Accéder au dashboard</a></p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`;
}

export function reportEmailSubject(type: "weekly" | "monthly", businessName: string, periodLabel: string): string {
    const label = type === "weekly" ? "Rapport hebdo" : "Rapport mensuel";
    return `${label} — ${businessName} · ${periodLabel}`;
}
