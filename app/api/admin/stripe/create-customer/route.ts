import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { business_id } = await req.json();
    if (!business_id) return NextResponse.json({ error: "business_id manquant" }, { status: 400 });

    const admin = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: business } = await (admin as any)
        .from("businesses")
        .select("id, name, contact_email, stripe_customer_id")
        .eq("id", business_id)
        .single();

    if (!business) return NextResponse.json({ error: "Business introuvable" }, { status: 404 });
    if (business.stripe_customer_id) return NextResponse.json({ customer_id: business.stripe_customer_id });

    // Récupérer l'email du user lié
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user } = await (admin as any)
        .from("users")
        .select("email")
        .eq("business_id", business_id)
        .single();

    const customer = await stripe.customers.create({
        name: business.name || undefined,
        email: user?.email || business.contact_email || undefined,
        metadata: { business_id },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
        .from("businesses")
        .update({ stripe_customer_id: customer.id })
        .eq("id", business_id);

    return NextResponse.json({ customer_id: customer.id });
}
