import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

// Vérifie que l'appelant est bien un utilisateur connecté du dashboard
async function isAuthenticated(req: NextRequest): Promise<boolean> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return false;
    const token = authHeader.replace("Bearer ", "");
    const { error } = await supabase.auth.getUser(token);
    return !error;
}

export async function GET(req: NextRequest) {
    if (!await isAuthenticated(req)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const path = req.nextUrl.searchParams.get("path");
    if (!path) {
        return NextResponse.json({ error: "path manquant" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin.storage
        .from("invoices")
        .createSignedUrl(path, 60); // expire après 60 secondes

    if (error || !data?.signedUrl) {
        return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
}
