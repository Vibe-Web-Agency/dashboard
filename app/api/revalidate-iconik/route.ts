import { NextResponse } from "next/server";

export async function POST() {
    const url = process.env.ICONIK_SITE_URL;
    const secret = process.env.ICONIK_REVALIDATE_SECRET;
    if (!url || !secret) return NextResponse.json({ skipped: true });

    try {
        await fetch(`${url}/api/revalidate`, {
            method: "POST",
            headers: { "x-revalidate-secret": secret },
        });
    } catch { /* silently ignore if site is down */ }

    return NextResponse.json({ ok: true });
}
