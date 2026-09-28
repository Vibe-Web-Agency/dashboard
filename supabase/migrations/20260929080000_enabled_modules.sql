-- Navigation : la liste des modules d'un commerce, en une requête.
--
-- Le schéma n'exposait que `has_feature(business, module)`. Pour construire
-- un menu, le dashboard aurait dû l'appeler une fois par module — 22 allers-
-- retours — ou réécrire la règle en TypeScript, où elle aurait divergé du
-- jour où un plan change.
--
-- Les trois conditions cumulatives passent donc dans `granted_module_ids`,
-- dont `has_feature` et `enabled_modules` dérivent. `has_feature` garde
-- exactement le comportement d'avant : les tests du domaine 3 le vérifient.
--
-- Migration sans risque : que des `create or replace function`, aucune
-- donnée touchée.

-- ─── Droits sur les modules ───────────────────────────────────────────────
-- LA question que posent le dashboard, les sites et les crons.
--
-- Trois conditions cumulatives, écrites UNE fois dans granted_module_ids :
--   1. le commerce est actif (un commerce suspendu n'envoie plus rien) ;
--   2. il a le DROIT au module — module de base, plan en cours, ou option ;
--   3. il l'a ACTIVÉ (le droit ne suffit pas, il faut le choix).
--
-- `has_feature` et `enabled_modules` en dérivent tous les deux. C'est le
-- point important : la version précédente n'avait que `has_feature`, et le
-- dashboard aurait dû soit l'appeler une fois par module, soit réécrire la
-- règle en TypeScript — où elle aurait fini par diverger.
create or replace function granted_module_ids(p_business uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.id
    from modules m
    join business_module_settings s
      on s.module_id = m.id
     and s.business_id = p_business
     and s.is_enabled
   where m.is_active
     and exists (select 1 from businesses where id = p_business and status = 'active')
     and (
       m.is_core
       or exists (select 1 from business_plans bp
                    join plan_modules pm on pm.plan_id = bp.plan_id
                   where bp.business_id = p_business
                     and bp.status in ('trialing', 'active', 'past_due')
                     and pm.module_id = m.id)
       or exists (select 1 from business_addons a
                   where a.business_id = p_business and a.status = 'active'
                     and a.module_id = m.id)
     )
$$;

create or replace function has_feature(p_business uuid, p_module text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from modules m
     where m.slug = p_module
       and m.id in (select granted_module_ids(p_business))
  )
$$;

-- La liste, pour construire la navigation en une requête.
--
-- Contrairement à `has_feature`, elle CONTRÔLE L'ACCÈS : elle est appelée
-- directement par le navigateur, avec la clé anon. Sans ce filtre, n'importe
-- qui pourrait énumérer les modules souscrits par n'importe quel commerce —
-- donc deviner son offre et son chiffre. `has_feature`, elle, est appelée
-- depuis des politiques et des crons où le contrôle est déjà fait ailleurs.
create or replace function enabled_modules(p_business uuid)
returns table (slug text, label text, icon text, category text, sort_order int)
language sql stable security definer set search_path = public as $$
  select m.slug, m.label, m.icon, m.category, m.sort_order
    from modules m
   where m.id in (select granted_module_ids(p_business))
     and p_business in (select accessible_business_ids('viewer'))
   order by m.sort_order, m.label
$$;
