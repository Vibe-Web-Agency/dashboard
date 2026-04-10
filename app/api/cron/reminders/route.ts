import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { twilioClient, TWILIO_FROM } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { reminderEmailHtml, reminderEmailSubject } from "@/lib/emails/reminderEmail";

export async function GET(req: NextRequest) {
    // Sécuriser le cron avec un secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const admin = getAdminClient() as any;

    // Récupérer tous les RDV de demain (non rappelés, non annulés)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const { data: reservations, error } = await admin
        .from("reservations")
        .select("id, customer_name, customer_mail, customer_phone, date, message, business_id")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString())
        .eq("reminder_sent", false)
        .neq("status", "cancelled");

    if (error) {
        console.error("Erreur récupération RDV:", error);
        return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
    }

    if (!reservations?.length) {
        return NextResponse.json({ sent: 0, message: "Aucun RDV demain" });
    }

    // Récupérer les noms et types des businesses
    const businessIds = [...new Set(reservations.map((r: any) => r.business_id))];
    const { data: businesses } = await admin
        .from("businesses")
        .select("id, name, business_type:business_types(slug)")
        .in("id", businessIds);

    const RDVWORD: Record<string, string> = {
        restaurant: "réservation",
        coach: "séance",
    };

    const bizMap: Record<string, { name: string; rdvWord: string }> = {};
    (businesses || []).forEach((b: any) => {
        const slug = Array.isArray(b.business_type) ? b.business_type[0]?.slug : b.business_type?.slug;
        bizMap[b.id] = {
            name: b.name || "Votre prestataire",
            rdvWord: RDVWORD[slug] || "rendez-vous",
        };
    });

    const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

    let sent = 0;
    const failed: string[] = [];

    for (const reservation of reservations) {
        const rdvDate = new Date(reservation.date);
        const dateStr = `${DAYS_FR[rdvDate.getDay()]} ${rdvDate.getDate()} ${MONTHS_FR[rdvDate.getMonth()]}`;
        const timeStr = `${rdvDate.getHours()}h${String(rdvDate.getMinutes()).padStart(2, "0")}`;
        const { name: businessName, rdvWord } = bizMap[reservation.business_id] || { name: "Votre prestataire", rdvWord: "rendez-vous" };
        const customerName = reservation.customer_name || "Client";
        const rdvWordCap = rdvWord.charAt(0).toUpperCase() + rdvWord.slice(1);

        const smsText = `Rappel ${rdvWordCap} 📅 Bonjour ${customerName}, votre ${rdvWord} chez ${businessName} est demain ${dateStr} à ${timeStr}. À bientôt !`;

        try {
            // Envoi SMS si numéro présent
            if (reservation.customer_phone) {
                let phone = reservation.customer_phone.replace(/\s/g, "");
                if (phone.startsWith("0")) phone = "+33" + phone.slice(1);
                await twilioClient.messages.create({
                    body: smsText,
                    from: TWILIO_FROM,
                    to: phone,
                });
            }

            // Envoi email si email présent
            if (reservation.customer_mail) {
                await resend.emails.send({
                    from: FROM_EMAIL,
                    to: reservation.customer_mail,
                    subject: reminderEmailSubject(businessName, timeStr, rdvWord),
                    html: reminderEmailHtml({
                        customerName,
                        businessName,
                        date: dateStr,
                        time: timeStr,
                        rdvWord,
                        service: reservation.message || undefined,
                    }),
                });
            }

            // Marquer comme rappelé
            await admin
                .from("reservations")
                .update({ reminder_sent: true })
                .eq("id", reservation.id);

            sent++;
        } catch (err) {
            console.error(`Erreur rappel RDV ${reservation.id}:`, err);
            failed.push(reservation.id);
        }
    }

    return NextResponse.json({ sent, failed: failed.length, total: reservations.length });
}
