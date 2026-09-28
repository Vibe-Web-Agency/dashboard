import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { deplacementEmailHtml, deplacementEmailTexte } from "@/lib/emails/deplacementEmail";
import { PARIS } from "@/lib/paris-time";

/**
 * Une relation « vers un » de PostgREST.
 *
 * Elle rend un objet à l'exécution, mais le client non typé la décrit comme
 * un tableau. Plutôt qu'une conversion forcée qui mentirait dans les deux
 * sens, on accepte les deux formes — c'est aussi ce qui arrivera le jour où
 * ce client sera typé sur le schéma v2.
 */
function premier<T>(valeur: unknown): T | null {
  if (!valeur) return null;
  return (Array.isArray(valeur) ? (valeur[0] ?? null) : valeur) as T | null;
}

/**
 * Prévient un client que sa réservation a été déplacée.
 *
 * Le contrôle d'accès NE SE FAIT PAS ici : la route relit la réservation
 * avec la session de la personne connectée, donc sous les politiques RLS.
 * Si elle n'a pas accès à ce commerce, la lecture rend zéro ligne et on
 * s'arrête. C'est volontaire — une vérification écrite dans cette route
 * finirait par diverger de la règle réelle, et la clé de service n'a rien à
 * faire sur un chemin déclenché par un clic.
 *
 * L'ancienne heure est transmise par l'appelant : la base ne garde pas
 * l'historique des déplacements, et la relire après coup ne rendrait que la
 * nouvelle.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  }

  let corps: { id?: string; ancienneHeure?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps illisible" }, { status: 400 });
  }

  const { id, ancienneHeure } = corps;
  if (!id || !ancienneHeure) {
    return NextResponse.json({ erreur: "id et ancienneHeure sont requis" }, { status: 400 });
  }

  const { data: resa, error } = await supabase
    .from("reservations")
    .select(
      `starts_at, party_size, guest_name,
       business:businesses (name, phone),
       customer:customers (full_name, first_name, email)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[notifier] lecture :", error.message);
    return NextResponse.json({ erreur: "Lecture impossible" }, { status: 500 });
  }
  // Introuvable OU inaccessible : RLS ne distingue pas les deux, et c'est
  // très bien — la réponse ne doit pas révéler qu'une réservation existe.
  if (!resa) {
    return NextResponse.json({ erreur: "Réservation introuvable" }, { status: 404 });
  }

  const client = premier<{ full_name: string | null; first_name: string | null; email: string | null }>(
    resa.customer,
  );
  const commerce = premier<{ name: string; phone: string | null }>(resa.business);

  if (!client?.email) {
    return NextResponse.json(
      { erreur: "Ce client n'a pas d'adresse e-mail enregistrée." },
      { status: 422 },
    );
  }

  const date = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso));
  const heure = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, hour: "2-digit", minute: "2-digit" })
      .format(new Date(iso))
      .replace(":", "h");

  const donnees = {
    nomClient: client.first_name || client.full_name || resa.guest_name || "",
    nomCommerce: commerce?.name ?? "",
    ancienneDate: date(ancienneHeure),
    ancienneHeure: heure(ancienneHeure),
    nouvelleDate: date(resa.starts_at),
    nouvelleHeure: heure(resa.starts_at),
    couverts: resa.party_size,
    telephone: commerce?.phone ?? null,
  };

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: client.email,
      subject: `Votre réservation a été déplacée au ${donnees.nouvelleDate}`,
      html: deplacementEmailHtml(donnees),
      text: deplacementEmailTexte(donnees),
    });
  } catch (e) {
    // En local, `RESEND_API_KEY` est volontairement vide : l'échec est
    // attendu et doit être lisible, pas silencieux.
    const message = e instanceof Error ? e.message : "Envoi impossible";
    console.error("[notifier] envoi :", message);
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, destinataire: client.email });
}
