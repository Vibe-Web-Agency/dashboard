-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 — FERMER LA LECTURE ANONYME DES DONNÉES PERSONNELLES
-- Production (ibqjwlpqqgutdjhjlyrq).
--
-- ⚠️ CE FICHIER PEUT CASSER TROIS SITES. À ne lancer qu'après la
-- vérification ci-dessous, qui prend deux minutes.
--
-- ─── CE QU'IL FERME ──────────────────────────────────────────────────────
--
--   `reservations`  1 116 lignes — noms, téléphones, e-mails
--   `quotes`          118 lignes — demandes de devis nominatives
--   `sessions`      8 371 lignes — identifiants de visiteurs, référents
--
-- Ces trois tables sont aujourd'hui lisibles par quiconque détient la clé
-- anon, qui est publique par construction.
--
-- ─── VÉRIFICATION PRÉALABLE, OBLIGATOIRE ─────────────────────────────────
--
-- Les sites de FiFi, Toscana et BSK lisent et écrivent ces tables depuis
-- leur serveur. Si leur projet Vercel ne porte PAS
-- `SUPABASE_SERVICE_ROLE_KEY`, ils retombent sur la clé anon — et après ce
-- fichier, leurs formulaires de réservation cesseront de fonctionner.
--
-- Pour chacun des trois projets Vercel :
--   Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY présente,
--   sur Production, puis redéployer.
--
-- Contrôle depuis l'extérieur, après redéploiement — la route doit répondre
-- des comptages, pas une erreur :
--
--   curl "https://www.latoscanaparis.fr/api/reservations/disponibilites?date=2026-10-05"
--   curl "https://www.bskbarbershop.fr/api/reservations/disponibilites?date=2026-10-05"
--
-- Si l'une répond « Lecture impossible » ou 503, NE PAS lancer ce fichier.
--
-- ─── EN CAS DE PROBLÈME ──────────────────────────────────────────────────
--
-- Le retour en arrière est à la fin du fichier, en commentaire. Il rouvre
-- la lecture anonyme — donc la fuite — mais remet les sites en marche le
-- temps de corriger.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. `reservations`
--
-- Dix politiques s'empilent sur cette table. Postgres les combine en OU :
-- tant qu'une seule dit `using (true)` pour anon, les autres ne servent à
-- rien. On retire donc TOUTES celles qui visent anon ou public.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "Public can read reservations"   on reservations;
drop policy if exists "Public can insert reservations" on reservations;
drop policy if exists "reservations: anon can insert"  on reservations;
drop policy if exists "reservations_insert_anon"       on reservations;

-- Le privilège en plus de la politique : sans GRANT, RLS n'est même pas
-- consulté. Deux verrous valent mieux qu'un, et celui-ci résiste à une
-- politique permissive ajoutée par mégarde plus tard.
revoke select, insert on reservations from anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. `quotes`
--
-- Les sites écrivent désormais leurs demandes depuis leur serveur.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "quotes: anon can insert" on quotes;
drop policy if exists "quotes_insert_anon"      on quotes;

revoke select, insert on quotes from anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. `sessions`
--
-- Le script de mesure d'audience ÉCRIT des sessions ; rien ne justifie
-- qu'un visiteur puisse relire celles des autres. On lui laisse l'écriture.
--
-- À surveiller après coup : si le script met à jour une session en cours
-- (durée, nombre de pages), il lui faut aussi `update`. Dans ce cas,
-- rouvrir UPDATE seul — jamais SELECT.
-- ─────────────────────────────────────────────────────────────────────────

revoke select on sessions from anon;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- APRÈS : lancer 03-verifier-la-fermeture.sql.
-- Les lignes 1 à 4 doivent enfin afficher ✅, et les lignes 10 à 14 rester
-- vertes — ce sont les lectures publiques dont les sites vitrines vivent.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── RETOUR EN ARRIÈRE, si un site casse ─────────────────────────────────
-- À décommenter et lancer. Rouvre la fuite ; à n'utiliser que le temps de
-- corriger le site fautif.
--
-- begin;
--   grant select, insert on reservations to anon;
--   grant select, insert on quotes to anon;
--   grant select on sessions to anon;
--   create policy "Public can read reservations" on reservations
--     for select to anon using (true);
--   create policy "reservations: anon can insert" on reservations
--     for insert to anon with check (true);
--   create policy "quotes: anon can insert" on quotes
--     for insert to anon with check (true);
-- commit;
