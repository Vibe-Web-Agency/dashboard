import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

async function checkAdmin() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return null;
    return getAdminClient();
}

export async function GET() {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { data, error } = await admin.from("depenses").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ depenses: data });
}

export async function POST(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { label, amount, type, date, objet } = await req.json();
    if (!label || !amount || !type) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    const { data, error } = await admin.from("depenses").insert({
        label,
        amount: parseFloat(amount),
        type,
        date: date || null,
        objet: objet || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ depense: data });
}

export async function DELETE(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await req.json();
    const { error } = await admin.from("depenses").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
