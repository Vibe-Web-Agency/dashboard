import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export async function POST() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessId = (result.profile as any).business_id;
    if (!businessId) return NextResponse.json({ error: "Business introuvable" }, { status: 400 });

    const admin = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: business } = await (admin as any)
        .from("businesses")
        .select("stripe_customer_id")
        .eq("id", businessId)
        .single();

    if (!business?.stripe_customer_id) {
        return NextResponse.json({ error: "Aucune facturation active" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: business.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
    });

    return NextResponse.json({ url: session.url });
}
