import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

// GET — récupère les subscriptions actives d'un business
export async function GET(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const business_id = searchParams.get("business_id");
    if (!business_id) return NextResponse.json({ error: "business_id manquant" }, { status: 400 });

    const admin = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
        .from("stripe_subscriptions")
        .select("*, plan:plans(id, label, slug, features, monthly_price), addon:add_ons(id, label, feature_key, monthly_price)")
        .eq("business_id", business_id)
        .order("created_at");

    return NextResponse.json({ subscriptions: data || [] });
}
