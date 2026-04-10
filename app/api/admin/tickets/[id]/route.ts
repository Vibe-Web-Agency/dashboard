import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return null;
    return getAdminClient();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;

    const { data: ticket, error } = await admin
        .from("tickets")
        .select("id, subject, status, created_at, updated_at, business:businesses(id, name)")
        .eq("id", id)
        .single() as any;

    if (error) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const { data: messages } = await admin
        .from("ticket_messages")
        .select("id, sender, content, created_at")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true }) as any;

    return NextResponse.json({ ticket, messages: messages || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: "Message vide" }, { status: 400 });

    await admin.from("ticket_messages").insert({ ticket_id: id, sender: "admin", content });
    await admin.from("tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const { status } = await req.json();

    await admin.from("tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ success: true });
}
