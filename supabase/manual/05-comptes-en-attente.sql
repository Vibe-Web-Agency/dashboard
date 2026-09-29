-- ─────────────────────────────────────────────────────────────────────────
-- COMPTES EN ATTENTE D'ACTIVATION — lecture seule
--
-- À lancer sur la PRODUCTION avant de supprimer `/api/auth/signup`.
--
-- Cette route permet de poser un mot de passe sur un compte pré-créé, en
-- ne vérifiant QUE l'existence de l'adresse dans `users`. Autrement dit :
-- qui connaît l'adresse d'un client dont le compte n'est pas encore activé
-- peut se l'attribuer. Une adresse de commerce se devine
-- (contact@lerestaurant.fr).
--
-- Chaque ligne du résultat est un compte réclamable en ce moment.
--
-- La bonne voie d'activation existe déjà : `/api/invite` envoie une
-- invitation Supabase, et le lien reçu prouve qu'on possède l'adresse.
-- C'est ce que fait la v2.
--
-- Rien de nominatif n'en sort à part les adresses, qui sont les vôtres.
-- ─────────────────────────────────────────────────────────────────────────

select
  u.email,
  b.name                                            as commerce,
  u.is_owner,
  u.is_admin,
  u.created_at,
  case
    when u.dashboard_user_id is not null then '— déjà activé, sans risque'
    else '⚠ RÉCLAMABLE par quiconque connaît cette adresse'
  end                                               as etat
from users u
left join businesses b on b.id = u.business_id
order by (u.dashboard_user_id is null) desc, u.created_at;
