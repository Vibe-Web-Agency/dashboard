import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";

export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { orderId, trackingNumber } = await req.json();

    if (!orderId) return NextResponse.json({ error: "orderId manquant" }, { status: 400 });

    const admin = getAdminClient();

    // Fetch order to get customer info
    const { data: order, error: fetchError } = await admin
        .from("orders")
        .select("id, order_number, customer_name, customer_email, items, status")
        .eq("id", orderId)
        .single() as any;

    if (fetchError || !order) {
        return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (order.status === "shipped" || order.status === "delivered") {
        return NextResponse.json({ error: "Commande déjà expédiée" }, { status: 400 });
    }

    // Update order
    const { error: updateError } = await admin
        .from("orders")
        .update({
            status: "shipped",
            tracking_number: trackingNumber || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId) as any;

    if (updateError) {
        return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
    }

    // Send email to customer
    if (order.customer_email) {
        const orderNumber = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
        const customerName = order.customer_name ?? "Client";

        await resend.emails.send({
            from: "AD Boots <contact@ad-boots.com>",
            to: order.customer_email,
            subject: `Votre commande ${orderNumber} a été expédiée — AD Boots`,
            text: [
                `Bonjour ${customerName},`,
                "",
                `Bonne nouvelle ! Votre commande ${orderNumber} vient d'être expédiée.`,
                "",
                trackingNumber
                    ? `Numéro de suivi : ${trackingNumber}`
                    : "Votre colis est en route.",
                "",
                "Délai de livraison estimé : 2 à 5 jours ouvrés.",
                "",
                "Pour toute question : contact@ad-boots.com",
                "",
                "L'équipe AD Boots",
            ].join("\n"),
        });
    }

    return NextResponse.json({ success: true });
}
