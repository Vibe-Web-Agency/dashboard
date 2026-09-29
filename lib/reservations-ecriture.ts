"use client";

import { supabase } from "./supabase-browser";

export type SaisieReservation = {
  nom: string;
  telephone: string;
  email: string;
  /** Instant UTC, déjà converti depuis l'heure du commerce. */
  debutIso: string;
  couverts: number;
  message: string;
};

/**
 * Crée une réservation depuis le tableau de bord.
 *
 * Partagée par le calendrier et par l'écran Réservations : ce sont deux
 * endroits d'où l'on ajoute la même chose, et deux copies divergeraient sur
 * la règle qui compte — le rapprochement des fiches clients.
 *
 * La fiche est retrouvée par TÉLÉPHONE. C'est l'identifiant stable d'un
 * habitué qui réserve au téléphone, là où le nom change d'orthographe
 * (« Dupont », « Dupond ») et où l'e-mail manque souvent. Sans ça, chaque
 * appel créerait un doublon et l'historique du client ne voudrait plus rien
 * dire.
 *
 * Rend `null` si tout s'est bien passé, sinon le message d'erreur.
 */
export async function creerReservation(
  businessId: string,
  valeurs: SaisieReservation,
): Promise<string | null> {
  const telephone = valeurs.telephone.replace(/\s+/g, " ").trim();
  const email = valeurs.email.trim().toLowerCase() || null;

  const { data: existant, error: erreurLecture } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone", telephone)
    .maybeSingle();

  if (erreurLecture) return erreurLecture.message;

  let customerId = existant?.id ?? null;

  if (!customerId) {
    const { data: cree, error: erreurClient } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        full_name: valeurs.nom.trim(),
        phone: telephone,
        email,
        source: "reservation",
      })
      .select("id")
      .single();
    if (erreurClient) return erreurClient.message;
    customerId = cree.id;
  } else if (email) {
    // Un habitué qui laisse enfin son adresse : on la garde, sans écraser
    // celle qu'il aurait déjà donnée.
    await supabase.from("customers").update({ email }).eq("id", customerId).is("email", null);
  }

  const { error } = await supabase.from("reservations").insert({
    business_id: businessId,
    customer_id: customerId,
    // Le nom est gardé SUR la réservation en plus de la fiche : « au nom de
    // Marie » peut différer du titulaire de la fiche, et c'est ce nom-là
    // qu'on cherche des yeux en salle.
    guest_name: valeurs.nom.trim(),
    starts_at: valeurs.debutIso,
    party_size: valeurs.couverts,
    status: "confirmed",
    // Prise par l'équipe, pas par le client : la distinction sert aux
    // statistiques de conversion du site.
    source: "dashboard",
    customer_message: valeurs.message.trim() || null,
  });

  return error ? error.message : null;
}
