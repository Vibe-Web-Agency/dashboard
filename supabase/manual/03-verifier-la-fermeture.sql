-- ─────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION — à lancer après 02 et 04
--
-- Prend le rôle `anon` et essaie vraiment de lire ce qui ne devrait plus
-- l'être. C'est la seule preuve qui vaut : lire la liste des politiques ne
-- dit pas ce qu'elles produisent ensemble, puisque Postgres les combine
-- en OU.
--
-- ─── POURQUOI CETTE VERSION ──────────────────────────────────────────────
--
-- La première s'arrêtait net sur « permission denied for table
-- reservations » — c'est-à-dire exactement au moment où elle aurait dû
-- annoncer un succès. Un accès refusé lève une erreur ; en SQL simple, elle
-- interrompt tout le script. L'outil de contrôle échouait donc précisément
-- quand le contrôle passait.
--
-- Chaque essai passe maintenant par une fonction qui rattrape l'erreur et
-- la traduit. Un refus de privilège est le MEILLEUR résultat possible :
-- c'est le verrou qui tient même si une politique permissive est ajoutée
-- par mégarde plus tard.
-- ─────────────────────────────────────────────────────────────────────────

-- Fonction temporaire : elle disparaît à la fin de la session.
create or replace function pg_temp.essai_lecture(nom_table text)
returns text language plpgsql as $$
declare n int;
begin
  execute format('select count(*) from (select 1 from public.%I limit 20000) x', nom_table) into n;
  return case when n = 0 then '✅ aucune ligne lisible' else '❌ ' || n || ' ligne(s) lisibles' end;
exception
  when insufficient_privilege then return '✅ privilège refusé';
  when undefined_table       then return '⚠ table inconnue';
  when others                then return '⚠ ' || sqlerrm;
end $$;

create or replace function pg_temp.essai_public(nom_table text, manque text)
returns text language plpgsql as $$
declare n int;
begin
  execute format('select count(*) from public.%I', nom_table) into n;
  return case when n > 0 then '✅ ' || n || ' ligne(s)' else '⚠ aucune — ' || manque end;
exception
  when insufficient_privilege then return '❌ refusé — ' || manque;
  when others                 then return '⚠ ' || sqlerrm;
end $$;

begin;
set local role anon;

select ordre, controle, resultat from (
  -- Ce qui NE doit PLUS être lisible.
  select 1 as ordre, 'reservations (1 116 lignes nominatives)' as controle,
         pg_temp.essai_lecture('reservations') as resultat
  union all select 2, 'quotes (118 demandes nominatives)',  pg_temp.essai_lecture('quotes')
  union all select 3, 'sessions (8 371 visites)',           pg_temp.essai_lecture('sessions')
  union all select 4, 'orders',                             pg_temp.essai_lecture('orders')
  union all select 5, 'users',                              pg_temp.essai_lecture('users')
  union all select 6, 'prospects (286 fiches)',             pg_temp.essai_lecture('prospects')

  -- Ce qui DOIT rester lisible : les sites vitrines en vivent.
  union all select 10, 'blog',     pg_temp.essai_public('blog',     'les sites perdent leur journal')
  union all select 11, 'people',   pg_temp.essai_public('people',   'Iconik perd ses talents')
  union all select 12, 'services', pg_temp.essai_public('services', 'le salon perd ses prestations')
  union all select 13, 'projects', pg_temp.essai_public('projects', 'Iconik perd ses projets')
  union all select 14, 'reviews',  pg_temp.essai_public('reviews',  'les sites perdent leurs avis')
  union all select 15, 'products', pg_temp.essai_public('products', 'ADBoots perd sa boutique')
) x order by ordre;

rollback;

-- ─────────────────────────────────────────────────────────────────────────
-- Les privilèges : ce que RLS ne peut pas rattraper.
--
-- TRUNCATE ignore les politiques. S'il reste accordé, tout le reste ne sert
-- à rien.
-- ─────────────────────────────────────────────────────────────────────────
select
  grantee,
  string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges,
  case when bool_or(privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER'))
       then '❌ privilège dangereux encore accordé'
       else '✅' end as verdict
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by grantee;
