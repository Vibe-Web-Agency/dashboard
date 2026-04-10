import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export async function GET() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const admin = getAdminClient();

    // Récupère tous les businesses
    const { data: businesses, error } = await admin
        .from("businesses")
        .select("id, name, created_at, monthly_price, upsells, is_active, business_type:business_types(label)")
        .order("created_at", { ascending: false }) as any;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Récupère tous les users liés
    const { data: users } = await admin
        .from("users")
        .select("id, email, phone, dashboard_user_id, business_id") as any;

    const data = businesses;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clients = (data || []).map((b: any) => {
        const user = (users || []).find((u: any) => u.business_id === b.id) ?? null;
        return {
            business_id: b.id,
            business_name: b.name,
            business_type: b.business_type?.label ?? null,
            email: user?.email ?? null,
            phone: user?.phone ?? null,
            activated: !!user?.dashboard_user_id,
            monthly_price: b.monthly_price ?? 0,
            upsells: b.upsells ?? 0,
            is_active: b.is_active ?? true,
            created_at: b.created_at,
        };
    });

    return NextResponse.json({ clients });
}
