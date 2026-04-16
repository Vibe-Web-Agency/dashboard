import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

async function fetchDetails(placeId: string, apiKey: string): Promise<{ opening_hours: string[] | null; phone: string | null }> {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,formatted_phone_number&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    return {
        opening_hours: data.result?.opening_hours?.weekday_text ?? null,
        phone: data.result?.formatted_phone_number ?? null,
    };
}

export async function POST() {
    const result = await getCurrentUserProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result?.profile as any)?.is_admin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    const admin = getAdminClient() as any;

    // Récupère tous les prospects (re-sync téléphone + horaires)
    const { data: prospects, error } = await admin
        .from("prospects")
        .select("id, place_id, name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!prospects?.length) return NextResponse.json({ updated: 0, reason: "Aucun prospect" });

    let updated = 0;
    const errors: string[] = [];

    for (const p of prospects) {
        try {
            const details = await fetchDetails(p.place_id, apiKey);
            const patch: Record<string, unknown> = {};
            if (details.opening_hours) patch.opening_hours = details.opening_hours;
            if (details.phone) patch.phone = details.phone;
            if (Object.keys(patch).length > 0) {
                await admin.from("prospects").update(patch).eq("id", p.id);
                updated++;
            }
        } catch (err) {
            errors.push(`${p.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
        await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({ updated, total: prospects.length, errors: errors.length > 0 ? errors : undefined });
}
