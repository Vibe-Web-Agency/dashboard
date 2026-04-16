import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { createElement, ReactElement, JSXElementConstructor } from "react";
import { getAdminClient } from "@/lib/supabase-admin";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { reportEmailHtml, reportEmailSubject } from "@/lib/emails/reportEmail";
import { ReportPdf } from "@/lib/emails/reportPdf";
import { computeReportStats, Session } from "@/lib/reportStats";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Détermine le type : lundi = hebdo, 1er du mois = mensuel
    // On peut aussi forcer via ?type=weekly ou ?type=monthly
    const forceType = req.nextUrl.searchParams.get("type") as "weekly" | "monthly" | null;
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=dim, 1=lun
    const dayOfMonth = now.getDate();

    let type: "weekly" | "monthly" | null = forceType;
    if (!type) {
        if (dayOfMonth === 1) type = "monthly";
        else if (dayOfWeek === 1) type = "weekly";
    }

    if (!type) {
        return NextResponse.json({ skipped: true, reason: "Pas lundi ni 1er du mois" });
    }

    const admin = getAdminClient() as any;

    // Récupère tous les businesses actifs avec leur email client
    const { data: businesses, error: bizErr } = await admin
        .from("businesses")
        .select("id, name")
        .eq("is_active", true);

    if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });
    if (!businesses?.length) return NextResponse.json({ sent: 0, reason: "Aucun business actif" });

    const businessIds = businesses.map((b: any) => b.id);

    // Récupère les emails clients
    const { data: users } = await admin
        .from("users")
        .select("business_id, email")
        .in("business_id", businessIds)
        .not("email", "is", null);

    const emailMap: Record<string, string> = {};
    for (const u of users ?? []) {
        if (u.email) emailMap[u.business_id] = u.email;
    }

    // Fenêtre de données : 60 derniers jours pour avoir les deux périodes
    const since = new Date(now);
    since.setDate(since.getDate() - 60);

    const { data: allSessions } = await admin
        .from("sessions")
        .select("id, visitor_id, referrer, duration_seconds, pages, page_count, created_at, business_id")
        .in("business_id", businessIds)
        .gte("created_at", since.toISOString());

    const sessionsByBusiness: Record<string, Session[]> = {};
    for (const s of allSessions ?? []) {
        if (!sessionsByBusiness[s.business_id]) sessionsByBusiness[s.business_id] = [];
        sessionsByBusiness[s.business_id].push(s);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const biz of businesses) {
        const email = emailMap[biz.id];
        if (!email) continue;

        const sessions = sessionsByBusiness[biz.id] ?? [];
        const stats = computeReportStats(sessions, type);

        // Skip si aucune donnée sur les deux périodes
        if (stats.current.totalSessions === 0 && stats.previous.totalSessions === 0) continue;

        try {
            // Générer le PDF
            const pdfBuffer = await renderToBuffer(
                createElement(ReportPdf, { stats, businessName: biz.name }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>
            );

            const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
            const filename = `rapport-${type === "weekly" ? "hebdo" : "mensuel"}-${biz.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;

            // Envoyer l'email avec PDF en pièce jointe
            await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: reportEmailSubject(type, biz.name, stats.periodLabel),
                html: reportEmailHtml(stats, biz.name),
                attachments: [
                    {
                        filename,
                        content: pdfBase64,
                        contentType: "application/pdf",
                    },
                ],
            });

            sent++;
        } catch (err) {
            console.error(`Erreur rapport ${biz.name}:`, err);
            errors.push(`${biz.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return NextResponse.json({
        type,
        sent,
        total: businesses.length,
        errors: errors.length > 0 ? errors : undefined,
    });
}
