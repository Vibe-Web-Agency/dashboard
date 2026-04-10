import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const admin = getAdminClient();

    const { data, error } = await admin
        .from("tickets")
        .select(`
            id, subject, status, created_at, updated_at,
            business:businesses(id, name),
            ticket_messages(id, sender, created_at)
        `)
        .order("updated_at", { ascending: false }) as any;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tickets: data || [] });
}
