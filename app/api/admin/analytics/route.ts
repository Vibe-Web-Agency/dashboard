import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const businessId = req.nextUrl.searchParams.get("business_id");
    if (!businessId) return NextResponse.json({ error: "business_id requis" }, { status: 400 });

    const admin = getAdminClient();

    const [{ data: sessions }, { data: reservations }, { data: quotes }, { data: business }] = await Promise.all([
        (admin as any).from("sessions").select("id, session_id, visitor_id, referrer, screen_width, duration_seconds, pages, page_count, created_at, updated_at").eq("business_id", businessId),
        admin.from("reservations").select("id, date, created_at").eq("business_id", businessId),
        admin.from("quotes").select("id, status, created_at").eq("business_id", businessId),
        admin.from("businesses").select("business_type:business_types(features)").eq("id", businessId).single() as any,
    ]);

    const features: string[] = (business as any)?.business_type?.features ?? [];

    // En ligne (sessions actives dans les 5 dernières minutes)
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const activeUsers = (sessions || []).filter((s: any) => s.updated_at >= since).length;

    return NextResponse.json({ sessions: sessions || [], reservations: reservations || [], quotes: quotes || [], activeUsers, features });
}
