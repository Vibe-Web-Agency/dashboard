-- ═════════════════════════════════════════════════════════════════════════
--  RLS : trois expositions introduites par les politiques ajoutées entre le
--  2026-10-06 et le 2026-10-12
--
--  1. conversation_messages lisible en entier par un visiteur anonyme
--     (conv_messages_public_widget_select, USING true) : tous les messages de
--     toutes les conversations de tous les commerces. La politique est
--     supprimée. Un widget de discussion public doit passer par une route
--     serveur qui ne renvoie que la conversation du visiteur (jeton), pas par
--     une lecture directe de la table.
--
--  2. businesses lisible en entier par un visiteur anonyme
--     (businesses_public_widget_select) : la RLS filtre des LIGNES, pas des
--     colonnes, donc billing_email, billing_address, siren, stripe_customer_id,
--     allowed_origins et byok_override étaient exposés. Le rôle anon ne garde
--     le droit de lecture que sur les colonnes de vitrine. Un `select *` en
--     anonyme échoue désormais : nommer les colonnes.
--
--  3. businesses_member_write (ALL) permettait aux administrateurs de
--     SUPPRIMER un commerce, ce que les politiques d'origine interdisent
--     (aucune politique DELETE). Elle faisait doublon pour le reste :
--     « modification » (UPDATE, rang administrator) et « creation » (INSERT)
--     couvrent déjà l'écriture. Elle est supprimée.
--
--  Rejouable. Appliqué sur la base de DEV le 2026-10-12. À rejouer sur toute
--  base qui a reçu le script de politiques « *_public_widget_* ».
-- ═════════════════════════════════════════════════════════════════════════

-- 1.
drop policy if exists conv_messages_public_widget_select on public.conversation_messages;

-- 2.
revoke select on public.businesses from anon;
grant select (
  id, business_type_id, name, slug, status, is_active,
  logo_url, cover_url, description, primary_color,
  email, phone, website_url, social_links,
  address_line, postal_code, city, country, latitude, longitude, maps_url,
  timezone, locale
) on public.businesses to anon;

-- 3.
drop policy if exists businesses_member_write on public.businesses;

-- Contrôle : colonnes de businesses lisibles en anonyme, et politiques restantes.
select 'colonne lisible par anon' as quoi, column_name as nom
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'businesses' and grantee = 'anon' and privilege_type = 'SELECT'
union all
select 'politique businesses (' || cmd || ')', policyname from pg_policies where schemaname = 'public' and tablename = 'businesses'
union all
select 'politique conversation_messages (' || cmd || ', ' || roles::text || ')', policyname from pg_policies where schemaname = 'public' and tablename = 'conversation_messages'
 order by 1, 2;
