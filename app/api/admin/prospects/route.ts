import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const result = await getCurrentUserProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result?.profile as any)?.is_admin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const admin = getAdminClient() as any;
    const { data, error } = await admin
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result?.profile as any)?.is_admin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const admin = getAdminClient() as any;

    const { data, error } = await admin
        .from("prospects")
        .upsert({
            place_id: body.place_id,
            name: body.name,
            address: body.address,
            rating: body.rating,
            phone: body.phone ?? null,
            website: body.website ?? null,
            business_type: body.business_type,
            city: body.city,
            status: "nouveau",
        }, { onConflict: "place_id", ignoreDuplicates: true })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
    const result = await getCurrentUserProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result?.profile as any)?.is_admin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const admin = getAdminClient() as any;

    const { data, error } = await admin
        .from("prospects")
        .update({ status: body.status, notes: body.notes })
        .eq("id", body.id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
    const result = await getCurrentUserProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result?.profile as any)?.is_admin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const admin = getAdminClient() as any;
    const { error } = await admin.from("prospects").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
