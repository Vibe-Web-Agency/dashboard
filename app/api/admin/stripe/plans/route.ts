import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

// GET — récupère plans + add-ons pour un business_type_id
export async function GET(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const business_type_id = searchParams.get("business_type_id");

    const admin = getAdminClient();

    const [{ data: plans }, { data: addons }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin as any).from("plans").select("*").eq("business_type_id", business_type_id).eq("is_active", true).order("monthly_price"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin as any).from("add_ons").select("*").eq("business_type_id", business_type_id).eq("is_active", true).order("monthly_price"),
    ]);

    return NextResponse.json({ plans: plans || [], addons: addons || [] });
}

// POST — crée un plan ou add-on + le price Stripe correspondant
export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = await req.json();
    const { type, business_type_id, slug, label, features, feature_key, monthly_price } = body;

    if (!business_type_id || !label || monthly_price == null) {
        return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Créer le price Stripe
    const stripePrice = await stripe.prices.create({
        currency: "eur",
        unit_amount: Math.round(monthly_price * 100),
        recurring: { interval: "month" },
        product_data: {
            name: type === "plan" ? `VWA — Plan ${label}` : `VWA — Add-on ${label}`,
        },
        metadata: { type, business_type_id, label },
    });

    const admin_ = admin as any;

    if (type === "plan") {
        const { data, error } = await admin_
            .from("plans")
            .insert({ business_type_id, slug, label, features: features || [], monthly_price, stripe_price_id: stripePrice.id })
            .select()
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ plan: data });
    } else {
        const { data, error } = await admin_
            .from("add_ons")
            .insert({ business_type_id, feature_key, label, monthly_price, stripe_price_id: stripePrice.id })
            .select()
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ addon: data });
    }
}

// DELETE — désactive un plan ou add-on
export async function DELETE(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id, type } = await req.json();
    const table = type === "plan" ? "plans" : "add_ons";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (getAdminClient() as any).from(table).update({ is_active: false }).eq("id", id);
    return NextResponse.json({ success: true });
}
