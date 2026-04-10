import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export async function GET() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const admin = getAdminClient();
    const { data, error } = await admin.from("business_types").select("id, slug, label").order("label");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ types: data || [] });
}
