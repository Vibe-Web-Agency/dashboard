import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessId = (result.profile as any).business_id;
    if (!businessId) return NextResponse.json({ error: "Business introuvable" }, { status: 400 });

    const admin = getAdminClient();
    const { data, error } = await admin
        .from("tickets")
        .select("id, subject, status, created_at, updated_at, ticket_messages(id, sender, created_at)")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false }) as any;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tickets: data || [] });
}

export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessId = (result.profile as any).business_id;
    if (!businessId) return NextResponse.json({ error: "Business introuvable" }, { status: 400 });

    const { subject, content } = await req.json();
    if (!subject || !content) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    const admin = getAdminClient();

    const { data: ticket, error: ticketError } = await admin
        .from("tickets")
        .insert({ business_id: businessId, subject })
        .select()
        .single() as any;

    if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 });

    const { error: msgError } = await admin
        .from("ticket_messages")
        .insert({ ticket_id: ticket.id, sender: "client", content });

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

    return NextResponse.json({ ticket });
}
