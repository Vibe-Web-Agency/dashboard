import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const admin = getAdminClient();

    const [{ data: business, error }, { data: user }, { data: types }] = await Promise.all([
        admin.from("businesses").select("id, name, business_type_id, address, contact_email, contact_phone, maps_url, is_active, monthly_price, upsells, business_type:business_types(id, label, features)").eq("id", id).single() as any,
        (admin.from("users").select("id, email, phone, dashboard_user_id").eq("business_id", id).single() as any),
        admin.from("business_types").select("id, label, features").order("label") as any,
    ]);

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });

const [{ count: reservations }, { count: quotes }, { count: reviews }] = await Promise.all([
        admin.from("reservations").select("*", { count: "exact", head: true }).eq("business_id", id) as any,
        admin.from("quotes").select("*", { count: "exact", head: true }).eq("business_id", id) as any,
        (admin as any).from("reviews").select("*", { count: "exact", head: true }).eq("business_id", id),
    ]);

    return NextResponse.json({ business, user, types, stats: { reservations, quotes, reviews } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const { name, business_type_id, contact_email, contact_phone, address, monthly_price, upsells, is_active } = await req.json();
    const admin = getAdminClient();

    const { error } = await admin.from("businesses").update({
        name, business_type_id: business_type_id || null, contact_email, contact_phone, address,
        monthly_price: monthly_price !== "" && monthly_price != null ? parseFloat(monthly_price) : 0,
        upsells: upsells !== "" && upsells != null ? parseFloat(upsells) : 0,
        is_active: is_active ?? true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
