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

export async function GET() {
    const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .order("display_order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ projects: data });
}

export async function POST(req: Request) {
    const body = await req.json();
    const { data, error } = await supabase
        .from("portfolio_projects")
        .insert([{
            title: body.title,
            category: body.category,
            description: body.description,
            tags: body.tags ?? [],
            image_url: body.image_url ?? "",
            url: body.url ?? "",
            featured: body.featured ?? false,
            display_order: body.display_order ?? 0,
            active: body.active ?? true,
        }])
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await revalidatePortfolio();
    return NextResponse.json({ project: data });
}
