import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = result.profile as any;
    const businessId = profile.business_id;
    if (!businessId) return NextResponse.json({ error: "Business introuvable" }, { status: 400 });

    const { plan_id, addon_ids } = await req.json();
    if (!plan_id) return NextResponse.json({ error: "Plan manquant" }, { status: 400 });

    const admin = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: business } = await (admin as any)
        .from("businesses")
        .select("id, name, stripe_customer_id")
        .eq("id", businessId)
        .single();

    if (!business) return NextResponse.json({ error: "Business introuvable" }, { status: 404 });

    // Créer le customer Stripe si besoin
    let customerId = business.stripe_customer_id;
    if (!customerId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user } = await (admin as any)
            .from("users")
            .select("email")
            .eq("business_id", businessId)
            .single();

        const customer = await stripe.customers.create({
            name: business.name || undefined,
            email: user?.email || undefined,
            metadata: { business_id: businessId },
        });
        customerId = customer.id;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("businesses").update({ stripe_customer_id: customerId }).eq("id", businessId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plan } = await (admin as any)
        .from("plans")
        .select("id, stripe_price_id, label")
        .eq("id", plan_id)
        .single();

    if (!plan?.stripe_price_id) return NextResponse.json({ error: "Plan sans price Stripe" }, { status: 400 });

    const selectedAddonIds: string[] = addon_ids || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: addons } = await (admin as any)
        .from("add_ons")
        .select("id, stripe_price_id, feature_key, label")
        .in("id", selectedAddonIds.length > 0 ? selectedAddonIds : ["00000000-0000-0000-0000-000000000000"]);

    const validAddons = (addons || []).filter((a: { stripe_price_id: string }) => a.stripe_price_id);

    const lineItems = [
        { price: plan.stripe_price_id, quantity: 1 },
        ...validAddons.map((a: { stripe_price_id: string }) => ({ price: a.stripe_price_id, quantity: 1 })),
    ];

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: lineItems,
        success_url: `${siteUrl}/billing?success=1`,
        cancel_url: `${siteUrl}/billing?canceled=1`,
        metadata: {
            business_id: businessId,
            plan_id: plan.id,
            addon_ids: selectedAddonIds.join(","),
        },
    });

    return NextResponse.json({ url: session.url });
}
