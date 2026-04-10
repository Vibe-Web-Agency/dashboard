import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessId = (result.profile as any).business_id;
    if (!businessId) return NextResponse.json({ subscriptions: [] });

    const admin = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subscriptions } = await (admin as any)
        .from("stripe_subscriptions")
        .select(`
            type, status, plan_id, addon_id, stripe_subscription_id,
            plan:plans (label, monthly_price),
            addon:add_ons (label, monthly_price)
        `)
        .eq("business_id", businessId)
        .in("status", ["active", "trialing", "past_due", "incomplete"]);

    return NextResponse.json({ subscriptions: subscriptions || [] });
}
