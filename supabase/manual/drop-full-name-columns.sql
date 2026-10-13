-- Suppression de customers.full_name et profiles.full_name. IRRÉVERSIBLE.
-- À rejouer en production seulement APRÈS customers-first-last-name.sql et profiles-names-status.sql,
-- qui reprennent les noms dans first_name / last_name.
--
-- Ces colonnes ne sont plus lues ni écrites par le code depuis le 2026-10-12 (customers) et le 2026-10-13 (profiles).
-- Vérifié sur la base de dev avant suppression : aucune vue, aucun index, aucune contrainte n'en dépend ;
-- aucun client n'avait un full_name sans prénom ni nom ; les trois profils concernés portaient un « nom »
-- fabriqué à partir de leur adresse email par l'ancien trigger.
--
-- Garde-fou : le script s'arrête si un client perdrait un nom qui n'a pas été repris.

do $$
declare
  orphans integer;
begin
  select count(*) into orphans
    from public.customers
   where nullif(btrim(full_name), '') is not null and first_name is null and last_name is null;
  if orphans > 0 then
    raise exception '% client(s) ont un full_name sans prénom ni nom : rejouer customers-first-last-name.sql d''abord', orphans;
  end if;
end $$;

-- Sans CASCADE : si quelque chose dépend encore d'une de ces colonnes, la suppression échoue au lieu de l'emporter.
alter table public.customers drop column if exists full_name;
alter table public.profiles  drop column if exists full_name;
