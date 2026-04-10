import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessId = (result.profile as any).business_id;

    const { id } = await params;
    const admin = getAdminClient();

    const { data: ticket, error } = await admin
        .from("tickets")
        .select("id, subject, status, created_at, updated_at")
        .eq("id", id)
        .eq("business_id", businessId)
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
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessId = (result.profile as any).business_id;

    const { id } = await params;
    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: "Message vide" }, { status: 400 });

    const admin = getAdminClient();

    // Vérifier que le ticket appartient bien à ce client
    const { data: ticket } = await admin.from("tickets").select("id").eq("id", id).eq("business_id", businessId).single() as any;
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    await admin.from("ticket_messages").insert({ ticket_id: id, sender: "client", content });
    await admin.from("tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ success: true });
}
