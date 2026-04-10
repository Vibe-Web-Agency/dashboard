import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserProfile } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { businessName, businessTypeId, email, phone } = await request.json();

    if (!businessName || !email) {
        return NextResponse.json({ error: "Nom du business et email requis" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Créer le business
    const { data: business, error: bizError } = await admin
        .from("businesses")
        .insert({ name: businessName, business_type_id: businessTypeId || null })
        .select("id")
        .single();

    if (bizError || !business) {
        return NextResponse.json({ error: "Erreur création business: " + bizError?.message }, { status: 500 });
    }

    // 2. Inviter le client via Supabase Auth (envoie un email avec lien de création de mot de passe)
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });

    if (inviteError || !inviteData?.user) {
        await admin.from("businesses").delete().eq("id", business.id);
        return NextResponse.json({ error: "Erreur invitation: " + inviteError?.message }, { status: 500 });
    }

    // 3. Créer la ligne users liée au business et à l'auth user
    const { error: userError } = await admin
        .from("users")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ email, phone: phone || null, business_id: business.id, dashboard_user_id: inviteData.user.id } as any);

    if (userError) {
        await admin.from("businesses").delete().eq("id", business.id);
        await admin.auth.admin.deleteUser(inviteData.user.id);
        return NextResponse.json({ error: "Erreur création utilisateur: " + userError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, businessId: business.id });
}
