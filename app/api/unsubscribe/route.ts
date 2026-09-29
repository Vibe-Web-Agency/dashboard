import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifierDesinscription } from "@/lib/unsubscribe-token";

/**
 * Désinscription depuis un e-mail de campagne.
 *
 * Cette route utilise la clé de service, donc contourne RLS. Elle n'avait
 * aucune vérification : n'importe qui pouvait désinscrire l'adresse de son
 * choix chez le commerce de son choix, en boucle.
 *
 * Le lien porte désormais une signature qui lie l'adresse au commerce.
 *
 * Le lien envoyé pointait par ailleurs sur `/unsubscribe`, une page qui
 * n'existe pas : il rendait une 404. Un e-mail commercial doit offrir un
 * moyen de se désinscrire QUI FONCTIONNE — c'est une obligation, pas un
 * confort. Aucune campagne n'ayant encore été envoyée, aucun lien ancien
 * n'est cassé par le changement de format.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("business_id");
  const email = searchParams.get("email");
  const jeton = searchParams.get("t");

  if (!businessId || !email || !jeton) {
    return NextResponse.redirect(new URL("/unsubscribe/error", req.url));
  }

  if (!verifierDesinscription(businessId, email, jeton)) {
    return NextResponse.redirect(new URL("/unsubscribe/error", req.url));
  }

  const admin = getAdminClient();

  const { error } = await admin.from("email_unsubscribes").upsert(
    { business_id: businessId, email: email.toLowerCase().trim() },
    { onConflict: "business_id,email" },
  );

  if (error) {
    console.error("[unsubscribe]", error.message);
    return NextResponse.redirect(new URL("/unsubscribe/error", req.url));
  }

  return NextResponse.redirect(new URL("/unsubscribe/success", req.url));
}
