-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 — CE QUI SE FERME SANS RISQUE, TOUT DE SUITE
-- Production (ibqjwlpqqgutdjhjlyrq). Tout est dans une transaction.
--
-- Écrit à partir de l'état des lieux du 29/09/2026, pas de suppositions.
--
-- Ce fichier ne touche à AUCUN accès dont un site client dépend. Les deux
-- sites qui écrivent des réservations retombent sur la clé anon faute de
-- clé de service ; toucher à la lecture ou à l'insertion anonyme les
-- casserait. C'est l'objet du fichier 04, à lancer après vérification.
--
-- ─── CE QUI A ÉTÉ TROUVÉ, PAR ORDRE DE GRAVITÉ ───────────────────────────
--
-- 1. anon possède TRUNCATE sur toutes les tables.
--    TRUNCATE n'est PAS soumis aux politiques RLS : c'est le privilège seul
--    qui décide. N'importe qui détenant la clé anon pouvait donc vider
--    `reservations` (1 116 lignes), `sessions` (8 371) ou `prospects` (286),
--    politiques ou pas. Cette clé était publique sur le site de Toscana
--    jusqu'à ce matin. C'est le point le plus grave du rapport, et le seul
--    qui permettait une destruction irréversible.
--
-- 2. `quotes` : « allow_select_quotes » pour authenticated, `using (true)`.
--    N'importe quel compte connecté du tableau de bord lit les 118 demandes
--    de TOUS les clients. Idem en modification et en suppression.
--
-- 3. `orders` : « Enable all for business users » pour public, ALL,
--    `using (true)`. La table est vide aujourd'hui : c'est de la chance,
--    pas une protection.
--
-- 4. Empilement de politiques : 13 sur `projects`, 12 sur `people_projects`
--    et `quotes`, 11 sur `reviews`, 10 sur `reservations`. Postgres les
--    combine en OU : la plus permissive gagne TOUJOURS. Ajouter une
--    politique stricte à côté d'une politique `using (true)` ne protège
--    donc rien — il faut supprimer la permissive.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. TRUNCATE, REFERENCES, TRIGGER : le verrou que RLS ne peut pas remplacer
--
-- Aucune application ne tronque de table, ne crée de clé étrangère ni de
-- déclencheur à l'exécution. Ces privilèges ne servaient à rien et
-- ouvraient la porte à une destruction totale.
-- ─────────────────────────────────────────────────────────────────────────

revoke truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. `quotes` : cloisonner entre clients
--
-- Les trois politiques « allow_* » ouvrent la table à tout compte connecté.
-- Elles datent d'avant le cloisonnement, et leur seule présence annule les
-- politiques correctes posées ensuite.
--
-- Ce qui reste et suffit : `quotes_read_owner`, `quotes_update_owner`,
-- `quotes: owner can read own`, `quotes_delete_admin`, `quotes: admin full
-- access`. Un gérant garde ses devis, un administrateur garde tout.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "allow_select_quotes" on quotes;
drop policy if exists "allow_update_quotes" on quotes;
drop policy if exists "allow_delete_quotes" on quotes;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. `orders` : supprimer l'accès total
--
-- `orders_read_owner`, `orders_update_owner`, `orders_delete_admin` et
-- « orders: owner can read own » restent en place.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "Enable all for business users" on orders;

-- « Users see own business orders » compare `users.id` à `auth.uid()`, alors
-- que le lien correct est `users.dashboard_user_id`. Elle ne peut donc
-- jamais rendre vrai — elle ne protège rien et n'autorise rien. On la
-- retire pour que l'ensemble reste lisible.
drop policy if exists "Users see own business orders" on orders;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- APRÈS CE FICHIER
--
-- Ce qui est fermé : la destruction par TRUNCATE, la lecture croisée des
-- devis entre clients, l'accès total aux commandes.
--
-- Ce qui reste OUVERT, volontairement, jusqu'au fichier 04 :
--   • `reservations` reste lisible et insérable par anon (1 116 lignes avec
--     noms, téléphones et e-mails) ;
--   • `sessions` reste lisible par anon (8 371 lignes).
--
-- Pour les fermer, il faut d'abord que les sites de FiFi et de Toscana
-- portent SUPABASE_SERVICE_ROLE_KEY dans Vercel. Sans ça, ils retombent sur
-- la clé anon et leurs formulaires de réservation cesseront de fonctionner.
-- ─────────────────────────────────────────────────────────────────────────
