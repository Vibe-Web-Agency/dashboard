import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export async function GET() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const admin = getAdminClient();

    const [{ count: totalReservations }, { count: totalQuotes }, { count: totalReviews }] = await Promise.all([
        admin.from("reservations").select("*", { count: "exact", head: true }) as any,
        admin.from("quotes").select("*", { count: "exact", head: true }) as any,
        (admin as any).from("reviews").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({ totalReservations, totalQuotes, totalReviews });
}
