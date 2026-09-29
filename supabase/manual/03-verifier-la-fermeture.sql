-- ─────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION — à lancer APRÈS 02-fermer-la-fuite-prod.sql
--
-- Les lignes 1 à 4 resteront en ❌ après le seul fichier 02 : c'est
-- ATTENDU. Elles ne passent au vert qu'après le fichier 04, qui dépend
-- d'une condition côté Vercel (voir la fin du fichier 02).
--
-- Prend le rôle `anon` le temps d'une transaction et essaie de lire ce qui
-- ne devrait plus l'être. C'est la seule preuve qui vaut : lire la liste
-- des politiques ne dit pas ce qu'elles produisent ensemble, puisque
-- Postgres les combine en OU.
--
-- Chaque ligne du résultat doit afficher « ✅ ». Un seul « ❌ » signifie que
-- le trou est encore ouvert.
--
-- Tout est en lecture ; le `rollback` final garantit qu'aucune trace ne
-- reste, même sur les essais d'écriture.
-- ─────────────────────────────────────────────────────────────────────────

begin;
set local role anon;

select * from (

  select 1 as ordre, 'reservations — lecture anonyme (04)' as controle,
         case when count(*) = 0 then '✅ aucune ligne' else '❌ ' || count(*) || ' lisibles' end as resultat
  from (select 1 from reservations limit 5000) r

  union all
  select 2, 'quotes — lecture anonyme (04)',
         case when count(*) = 0 then '✅ aucune ligne' else '❌ ' || count(*) || ' lisibles' end
  from (select 1 from quotes limit 5000) q

  union all
  select 3, 'sessions — lecture anonyme (04)',
         case when count(*) = 0 then '✅ aucune ligne' else '❌ ' || count(*) || ' lisibles' end
  from (select 1 from sessions limit 20000) s

  union all
  select 4, 'orders — lecture anonyme (02)',
         case when count(*) = 0 then '✅ aucune ligne' else '❌ ' || count(*) || ' lisibles' end
  from (select 1 from orders limit 5000) o

  -- Ce qui doit RESTER lisible : les sites vitrines en dépendent.
  union all
  select 10, 'blog — lecture publique (doit marcher)',
         case when count(*) > 0 then '✅ ' || count(*) || ' article(s)' else '⚠ aucun — les sites perdent leur blog' end
  from blog

  union all
  select 11, 'people — lecture publique (doit marcher)',
         case when count(*) > 0 then '✅ ' || count(*) || ' fiche(s)' else '⚠ aucune — Iconik perd ses mannequins' end
  from people

  union all
  select 12, 'services — lecture publique (doit marcher)',
         case when count(*) > 0 then '✅ ' || count(*) || ' service(s)' else '⚠ aucun — le barbier perd ses prestations' end
  from services

  union all
  select 13, 'projects — lecture publique (doit marcher)',
         case when count(*) >= 0 then '✅ ' || count(*) || ' projet(s)' else '⚠' end
  from projects

  union all
  select 14, 'reviews — lecture publique (doit marcher)',
         case when count(*) > 0 then '✅ ' || count(*) || ' avis' else '⚠ aucun' end
  from reviews

) x order by ordre;

rollback;

-- ─────────────────────────────────────────────────────────────────────────
-- Contrôle des privilèges : ce que RLS ne peut pas rattraper.
--
-- TRUNCATE ignore les politiques. S'il reste accordé, tout le reste ne sert
-- à rien.
-- ─────────────────────────────────────────────────────────────────────────
select
  grantee,
  string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges_restants,
  case
    when bool_or(privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER'))
      then '❌ privilège dangereux encore accordé'
    else '✅'
  end as verdict
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by grantee;
