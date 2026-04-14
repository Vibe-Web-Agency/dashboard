import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";

interface GooglePlace {
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<{ hasWebsite: boolean; website: string | null; phone: string | null }> {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    return {
        hasWebsite: !!data.result?.website,
        website: data.result?.website ?? null,
        phone: data.result?.formatted_phone_number ?? null,
    };
}

export async function GET(req: NextRequest) {
    const result = await getCurrentUserProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result?.profile as any)?.is_admin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const city = searchParams.get("city");
    const pageToken = searchParams.get("pageToken");
    const noWebsiteOnly = searchParams.get("noWebsite") === "1";

    if (!query || !city) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Clé API Google manquante" }, { status: 500 });
    }

    const searchQuery = encodeURIComponent(`${query} ${city}`);
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&language=fr&key=${apiKey}`;
    if (pageToken) {
        url += `&pagetoken=${encodeURIComponent(pageToken)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return NextResponse.json({ error: `Google Places: ${data.status}` }, { status: 500 });
    }

    const rawPlaces: GooglePlace[] = data.results || [];

    let places;

    if (noWebsiteOnly) {
        const details = await Promise.all(
            rawPlaces.map(place => getPlaceDetails(place.place_id, apiKey))
        );
        places = rawPlaces
            .filter((_, i) => !details[i].hasWebsite)
            .map((place, i) => ({
                place_id: place.place_id,
                name: place.name,
                address: place.formatted_address,
                rating: place.rating ?? null,
                user_ratings_total: place.user_ratings_total ?? null,
                phone: details[i].phone,
                website: null,
                has_website: false,
            }));
    } else {
        const details = await Promise.all(
            rawPlaces.map(place => getPlaceDetails(place.place_id, apiKey))
        );
        places = rawPlaces.map((place, i) => ({
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            rating: place.rating ?? null,
            user_ratings_total: place.user_ratings_total ?? null,
            phone: details[i].phone,
            website: details[i].website,
            has_website: details[i].hasWebsite,
        }));
    }

    return NextResponse.json({
        places,
        nextPageToken: data.next_page_token ?? null,
    });
}
