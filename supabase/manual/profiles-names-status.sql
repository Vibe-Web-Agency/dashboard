-- Profils : prénom et nom séparés, état du compte. À rejouer sur chaque base V2, dont la production.
--
-- 1. `first_name` / `last_name`, comme sur `customers` et `employees`. `full_name` n'est plus lu ni écrit par le code.
-- 2. `status` : où en est le compte, maintenant qu'on peut en inviter.
--      invited : créé par une invitation, jamais connecté ;
--      pending : créé par inscription libre, jamais connecté ;
--      active  : s'est connecté au moins une fois.
--    `last_sign_in_at` : copie de la dernière connexion, pour l'afficher sans passer par l'API d'administration.
--    Les deux sont tenus à jour par des triggers sur auth.users : personne ne les écrit à la main.
-- 3. Droits de colonne : un utilisateur ne modifie plus que son nom, son téléphone, son avatar et sa langue.
--    Avant, la politique « modification » lui laissait toute sa ligne, donc aussi `email` : il pouvait y mettre
--    l'adresse de quelqu'un d'autre et recevoir à sa place un accès donné à cette adresse.

alter table public.profiles
  add column if not exists first_name      text,
  add column if not exists last_name       text,
  add column if not exists status          text not null default 'active',
  add column if not exists last_sign_in_at timestamptz;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('invited', 'pending', 'active'));

-- Reprise des noms : le premier mot devient le prénom, le reste le nom. Les « noms » fabriqués par l'ancien
-- trigger à partir de l'adresse email (partie avant le @) ne sont pas de vrais noms : ils ne sont pas repris.
update public.profiles
   set first_name = nullif(split_part(btrim(full_name), ' ', 1), ''),
       last_name  = nullif(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
 where full_name is not null
   and first_name is null and last_name is null
   and btrim(full_name) <> split_part(email, '@', 1);

-- Reprise de l'état depuis auth.users.
update public.profiles p
   set last_sign_in_at = u.last_sign_in_at,
       status = case
                  when u.last_sign_in_at is not null then 'active'
                  when u.invited_at is not null or coalesce(u.raw_user_meta_data->>'vwa_invited', 'false') = 'true' then 'invited'
                  else 'pending'
                end
  from auth.users u
 where u.id = p.id;

-- Création de compte : prénom et nom depuis les métadonnées (connexion Google : given_name / family_name),
-- sinon découpés du nom complet. Plus de nom fabriqué à partir de l'adresse email.
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
  meta_full_name text := btrim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  user_first_name text;
  user_last_name text;
  user_avatar_url text := new.raw_user_meta_data->>'avatar_url';
  is_invited boolean := new.invited_at is not null or coalesce(new.raw_user_meta_data->>'vwa_invited', 'false') = 'true';
  display_name text;
  generated_slug text;
begin
  user_first_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', split_part(meta_full_name, ' ', 1))), '');
  user_last_name  := nullif(btrim(coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name',
                                           substr(meta_full_name, length(split_part(meta_full_name, ' ', 1)) + 1))), '');

  -- A. Profil
  insert into public.profiles (id, email, first_name, last_name, avatar_url, locale, status, created_at, updated_at)
  values (new.id, new.email, user_first_name, user_last_name, user_avatar_url, 'fr',
          case when new.last_sign_in_at is not null then 'active' when is_invited then 'invited' else 'pending' end, now(), now())
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(profiles.first_name, excluded.first_name),
    last_name = coalesce(profiles.last_name, excluded.last_name),
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  -- Compte invité depuis le back-office : son accès est créé par l'invitation, pas d'établissement de démonstration.
  if is_invited then
    return new;
  end if;

  -- B. Établissement de démonstration (inscription libre)
  select id into default_agency_id from public.agencies order by is_internal desc, created_at limit 1;
  select id into default_business_type_id from public.business_types limit 1;

  display_name := coalesce(nullif(btrim(concat_ws(' ', user_first_name, user_last_name)), ''), split_part(new.email, '@', 1));
  generated_slug := 'demo-' || lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
                    || '-' || substring(new.id::text from 1 for 8);

  insert into public.businesses (agency_id, business_type_id, name, slug, status, is_active, country, locale, timezone, created_at, updated_at)
  values (default_agency_id, default_business_type_id, 'Établissement de ' || display_name, generated_slug, 'lead_demo', true, 'FR', 'fr', 'Europe/Paris', now(), now())
  returning id into new_business_id;

  -- C. Membership owner (les modules de base sont activés par le trigger businesses_activer_coeur)
  insert into public.memberships (profile_id, agency_id, business_id, role, is_active, created_at, updated_at)
  values (new.id, default_agency_id, new_business_id, 'owner', true, now(), now());

  return new;
end;
$function$;

-- Connexion : le compte devient « active » et sa dernière connexion est recopiée.
-- Une erreur ici ne doit jamais empêcher quelqu'un de se connecter : elle est avalée.
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  begin
    update public.profiles set last_sign_in_at = new.last_sign_in_at, status = 'active' where id = new.id;
  exception when others then
    raise warning 'handle_user_sign_in: %', sqlerrm;
  end;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_signed_in on auth.users;
create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is not null and new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.handle_user_sign_in();

revoke execute on function public.handle_user_sign_in() from public, anon, authenticated;

-- Droits de colonne : seules ces colonnes sont modifiables par l'utilisateur lui-même (politique « modification »).
revoke insert, update, delete on public.profiles from authenticated, anon;
grant update (first_name, last_name, full_name, phone, avatar_url, locale) on public.profiles to authenticated;
