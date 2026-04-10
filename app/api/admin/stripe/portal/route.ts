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
    const admin = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: business } = await (admin as any)
        .from("businesses")
        .select("stripe_customer_id")
        .eq("id", business_id)
        .single();

    if (!business?.stripe_customer_id) {
        return NextResponse.json({ error: "Pas de customer Stripe pour ce client" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: business.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/${business_id}`,
    });

    return NextResponse.json({ url: session.url });
}
