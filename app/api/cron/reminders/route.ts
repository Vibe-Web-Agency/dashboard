import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { twilioClient, TWILIO_FROM } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { reminderEmailHtml, reminderEmailSubject } from "@/lib/emails/reminderEmail";
import { parisDayBounds, parisDateLabel, parisTimeLabel } from "@/lib/paris-time";

export async function GET(req: NextRequest) {
    // Sécuriser le cron avec un secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const admin = getAdminClient() as any;

    // Bornes de la journée parisienne en cours. Le décalage n'est plus écrit
    // en dur : il était faux six mois par an, du dernier dimanche d'octobre
    // au dernier dimanche de mars.
    const { start, end } = parisDayBounds();

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
        return NextResponse.json({ sent: 0, message: "Aucun RDV aujourd'hui" });
    }

    // Récupérer les noms et types des businesses
    const businessIds = [...new Set(reservations.map((r: any) => r.business_id))];
    // `reminders_enabled` peut ne pas encore exister en base : dans ce cas on
    // relit sans la colonne et on considère tout le monde comme actif, ce qui
    // est le comportement d'avant. Le déploiement et la migration peuvent
    // ainsi se faire dans n'importe quel ordre.
    let businesses: any[] | null = null;
    const withFlag = await admin
        .from("businesses")
        .select("id, name, reminders_enabled, business_type:business_types(slug)")
        .in("id", businessIds);

    if (withFlag.error) {
        console.warn("Colonne reminders_enabled absente, repli :", withFlag.error.message);
        const fallback = await admin
            .from("businesses")
            .select("id, name, business_type:business_types(slug)")
            .in("id", businessIds);
        businesses = fallback.data;
    } else {
        businesses = withFlag.data;
    }

    const RDVWORD: Record<string, string> = {
        restaurant: "réservation",
        coach: "séance",
    };

    const bizMap: Record<string, { name: string; rdvWord: string; enabled: boolean }> = {};
    (businesses || []).forEach((b: any) => {
        const slug = Array.isArray(b.business_type) ? b.business_type[0]?.slug : b.business_type?.slug;
        bizMap[b.id] = {
            name: b.name || "Votre prestataire",
            rdvWord: RDVWORD[slug] || "rendez-vous",
            // `undefined` = colonne absente, `null` = jamais renseignée : dans
            // les deux cas on garde le comportement existant. Seul un `false`
            // explicite coupe les rappels.
            enabled: b.reminders_enabled !== false,
        };
    });

    // Un rappel non demandé, c'est un SMS facturé pour déranger le client d'un
    // commerce qui n'a rien souscrit. On écarte avant d'envoyer, pas après.
    const actives = reservations.filter((r: any) => bizMap[r.business_id]?.enabled !== false);
    const skipped = reservations.length - actives.length;

    let sent = 0;
    const failed: string[] = [];

    for (const reservation of actives) {
        const rdvDate = new Date(reservation.date);
        const dateStr = parisDateLabel(rdvDate);
        const timeStr = parisTimeLabel(rdvDate);
        const { name: businessName, rdvWord } = bizMap[reservation.business_id] || { name: "Votre prestataire", rdvWord: "rendez-vous" };
        const customerName = reservation.customer_name || "Client";
        const rdvWordCap = rdvWord.charAt(0).toUpperCase() + rdvWord.slice(1);

        const smsText = `Rappel ${rdvWordCap} 📅 Bonjour ${customerName}, votre ${rdvWord} chez ${businessName} est aujourd'hui à ${timeStr}. À bientôt !`;

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
                    subject: `Rappel — Votre ${rdvWord} aujourd'hui à ${timeStr} chez ${businessName}`,
                    html: reminderEmailHtml({
                        customerName,
                        businessName,
                        date: `aujourd'hui`,
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

    return NextResponse.json({
        sent,
        failed: failed.length,
        skipped,
        total: reservations.length,
    });
}
