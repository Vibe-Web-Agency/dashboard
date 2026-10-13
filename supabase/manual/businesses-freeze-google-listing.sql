-- Fiche Google figée en base (CLAUDE.md 9.9, décision du 2026-10-13).
-- Une fois `businesses.gbp_place_id` renseigné, une session d'utilisateur ne peut plus le changer ni le vider :
-- le commerce passe par le support, et l'agence délie depuis /admin (clé de service, donc sans auth.uid()).
-- Reprend guard_business_columns tel qu'il était, avec cette règle en plus. À rejouer en production.

create or replace function public.guard_business_columns()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is not null and not is_platform_admin() then
    if new.agency_id is distinct from old.agency_id then
      raise exception 'Un commerce ne change pas d''agence' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and old.agency_id not in (select accessible_agency_ids('administrator')) then
      raise exception 'Seule l''agence peut changer le statut d''un commerce' using errcode = '42501';
    end if;
    if old.gbp_place_id is not null and new.gbp_place_id is distinct from old.gbp_place_id then
      raise exception 'La fiche Google est déjà reliée : contactez le support pour la changer' using errcode = '42501';
    end if;
  end if;
  return new;
end $function$;
