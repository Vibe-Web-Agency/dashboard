-- Création de compte : pas d'établissement de démonstration pour un compte invité depuis /admin.
-- À rejouer sur chaque base V2, dont la production.
--
-- handle_new_user() crée pour tout nouveau compte un profil, un établissement « lead_demo » et une membership owner
-- (parcours d'inscription libre). Un compte invité depuis le back-office reçoit son accès à un commerce existant :
-- l'invitation pose `vwa_invited = true` dans les métadonnées du compte, et le trigger s'arrête après le profil.
--
-- Corrigé au passage : l'agence par défaut était choisie par `LIMIT 1` sans ordre, donc au hasard entre les agences.
-- C'est maintenant l'agence interne (is_internal), à défaut la plus ancienne.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  default_agency_id uuid;
  default_business_type_id uuid;
  new_business_id uuid;
  user_full_name text;
  user_avatar_url text;
  generated_business_name text;
  generated_slug text;
begin
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  user_avatar_url := new.raw_user_meta_data->>'avatar_url';

  -- A. Profil
  insert into public.profiles (id, email, full_name, avatar_url, locale, created_at, updated_at)
  values (new.id, new.email, user_full_name, user_avatar_url, 'fr', now(), now())
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(profiles.full_name, excluded.full_name),
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  -- Compte invité depuis le back-office : son accès est créé par l'invitation, pas d'établissement de démonstration.
  if coalesce(new.raw_user_meta_data->>'vwa_invited', 'false') = 'true' then
    return new;
  end if;

  -- B. Établissement de démonstration (inscription libre)
  select id into default_agency_id from public.agencies order by is_internal desc, created_at limit 1;
  select id into default_business_type_id from public.business_types limit 1;

  generated_business_name := 'Établissement de ' || user_full_name;
  generated_slug := 'demo-' || lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
                    || '-' || substring(new.id::text from 1 for 8);

  insert into public.businesses (agency_id, business_type_id, name, slug, status, is_active, country, locale, timezone, created_at, updated_at)
  values (default_agency_id, default_business_type_id, generated_business_name, generated_slug, 'lead_demo', true, 'FR', 'fr', 'Europe/Paris', now(), now())
  returning id into new_business_id;

  -- C. Membership owner (les modules de base sont activés par le trigger businesses_activer_coeur)
  insert into public.memberships (profile_id, agency_id, business_id, role, is_active, created_at, updated_at)
  values (new.id, default_agency_id, new_business_id, 'owner', true, now(), now());

  return new;
end;
$function$;
