import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { campaignEmailHtml } from "@/lib/emails/campaignEmail";

export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = result.profile as any;
    const businessId = profile.business_id;
    if (!businessId) return NextResponse.json({ error: "Business introuvable" }, { status: 400 });

    const { subject, body } = await req.json();
    if (!subject || !body) return NextResponse.json({ error: "Sujet et contenu requis" }, { status: 400 });

    const admin = getAdminClient() as any;

    const businessName = profile.business_name || "Votre prestataire";

    // Récupérer tous les emails clients (réservations + devis), dédupliqués
    const [{ data: resEmails }, { data: quoteEmails }, { data: unsubs }] = await Promise.all([
        admin.from("reservations").select("customer_mail").eq("business_id", businessId).not("customer_mail", "is", null),
        admin.from("quotes").select("customer_email").eq("business_id", businessId).not("customer_email", "is", null),
        admin.from("email_unsubscribes").select("email").eq("business_id", businessId),
    ]);

    const unsubSet = new Set((unsubs || []).map((u: { email: string }) => u.email.toLowerCase()));

    const allEmails = new Set<string>();
    (resEmails || []).forEach((r: { customer_mail: string }) => {
        if (r.customer_mail) allEmails.add(r.customer_mail.toLowerCase().trim());
    });
    (quoteEmails || []).forEach((q: { customer_email: string }) => {
        if (q.customer_email) allEmails.add(q.customer_email.toLowerCase().trim());
    });

    // Filtrer les désabonnés
    const recipients = [...allEmails].filter(email => !unsubSet.has(email));

    if (recipients.length === 0) {
        return NextResponse.json({ error: "Aucun destinataire disponible" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.vibewebagency.fr";
    let sent = 0;
    const failed: string[] = [];

    // Envoi en batch de 50 (limite Resend)
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        await Promise.all(
            batch.map(async (email) => {
                const unsubUrl = `${siteUrl}/unsubscribe?business_id=${businessId}&email=${encodeURIComponent(email)}`;
                try {
                    await resend.emails.send({
                        from: FROM_EMAIL,
                        to: email,
                        subject,
                        html: campaignEmailHtml({ businessName, subject, body, unsubscribeUrl: unsubUrl }),
                    });
                    sent++;
                } catch {
                    failed.push(email);
                }
            })
        );
    }

    // Sauvegarder la campagne
    await admin.from("email_campaigns").insert({
        business_id: businessId,
        subject,
        body,
        sent_count: sent,
    });

    return NextResponse.json({ sent, failed: failed.length, total: recipients.length });
}
