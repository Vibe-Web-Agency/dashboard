import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function revalidatePortfolio() {
    const url = process.env.VWA_SITE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!url || !secret) return;
    await fetch(`${url}/api/revalidate`, {
        method: "POST",
        headers: { "x-revalidate-secret": secret },
    }).catch(() => { /* silently ignore if site is down */ });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await supabase
        .from("portfolio_projects")
        .update(body)
        .eq("id", id)
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await revalidatePortfolio();
    return NextResponse.json({ project: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { error } = await supabase
        .from("portfolio_projects")
        .delete()
        .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await revalidatePortfolio();
    return NextResponse.json({ success: true });
}
