import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

async function fetchOpeningHours(placeId: string, apiKey: string): Promise<string[] | null> {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.result?.opening_hours?.weekday_text ?? null;
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

    // Récupère les prospects sans horaires
    const { data: prospects, error } = await admin
        .from("prospects")
        .select("id, place_id")
        .is("opening_hours", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!prospects?.length) return NextResponse.json({ updated: 0, reason: "Tous les prospects ont déjà des horaires" });

    let updated = 0;
    const errors: string[] = [];

    for (const p of prospects) {
        try {
            const hours = await fetchOpeningHours(p.place_id, apiKey);
            if (hours) {
                await admin.from("prospects").update({ opening_hours: hours }).eq("id", p.id);
                updated++;
            }
        } catch (err) {
            errors.push(`${p.place_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
        // Petite pause pour éviter de spammer l'API
        await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({ updated, total: prospects.length, errors: errors.length > 0 ? errors : undefined });
}
