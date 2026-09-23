-- ═════════════════════════════════════════════════════════════════════════
--  VWA Platform — Schéma v2 (conception)
--
--  Document de référence de la refonte de la base. Il grossit domaine par
--  domaine, au fil des validations.
--
--  ⚠️ Ce fichier n'est PAS une migration : il est volontairement rangé hors
--  de supabase/migrations/, que `db push` applique. Une fois un domaine
--  validé, son SQL est recopié dans une migration numérotée.
--
--  Statut des domaines
--    1. Plateforme & locataires ........ ✅ validé
--    2. Identité & rôles ............... ✅ tables validées · 🟡 fonctions & politiques à relire
--    3. Offre & droits ................. ✅ tables validées (RLS : passe dédiée)
--    4. Contenu public des sites ....... ✅ tables validées (RLS : passe dédiée)
--    5. Activité des commerces ......... ✅ tables validées (RLS : passe dédiée)
--    6. Communication .................. ✅ tables validées (RLS : passe dédiée)
--    7. Espace agence .................. ✅ tables validées (RLS : passe dédiée)
--    8. Équipe & planning .............. ✅ tables validées (RLS : passe dédiée)
--    9. Mesure & traçabilité ........... ✅ tables validées (RLS : passe dédiée)
--
--  Conventions (valables partout)
--    · Noms anglais, snake_case, tables au pluriel.
--    · PK uuid (gen_random_uuid). Les ids actuels sont CONSERVÉS à la
--      migration : le BUSINESS_ID de chaque site ne change pas.
--    · created_at / updated_at en timestamptz ; updated_at par déclencheur.
--    · Argent en centimes (integer) + currency. Jamais de float ni de texte.
--    · timestamptz pour un instant ; date/time pour un horaire local,
--      interprété avec businesses.timezone.
--    · Statuts : text + CHECK (pas d'enum Postgres, trop rigide).
--    · Archivage par statut ; suppression définitive réservée à la plateforme.
--    · FK partout. RESTRICT par défaut ; CASCADE pour les lignes enfants sans
--      vie propre (horaires, réglages…).
--    · Toute donnée d'un commerce porte business_id NOT NULL ; l'agence se
--      déduit du commerce.
--    · RLS activé sur TOUTES les tables, tout refusé par défaut. Les sites
--      publics passent uniquement par des fonctions, jamais par les tables.
-- ═════════════════════════════════════════════════════════════════════════


-- ─── Utilitaire ──────────────────────────────────────────────────────────
-- Met à jour updated_at à chaque modification (sinon la valeur reste figée).
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 1 — Plateforme & locataires                              ✅ validé
-- ═════════════════════════════════════════════════════════════════════════

-- ─── business_types ──────────────────────────────────────────────────────
create table business_types (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  label         text not null,
  icon          text,
  booking_noun  text not null default 'rendez-vous',  -- « réservation », « séance »…
  created_at    timestamptz not null default now()
);
-- default_modules → table de liaison business_type_modules (domaine 3).

-- ─── agencies ────────────────────────────────────────────────────────────
create table agencies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  is_internal      boolean not null default false,   -- VWA : jamais facturée
  status           text not null default 'active'
                   check (status in ('trial', 'active', 'suspended', 'churned')),
  logo_url         text,
  primary_color    text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  contact_email    text,
  contact_phone    text,
  billing_email    text,
  billing_address  text,
  siren            text check (siren ~ '^[0-9]{9}$'),
  -- Stripe : deux rôles distincts
  stripe_customer_id  text unique,  -- la plateforme facture l'agence (abonnement plateforme)
  stripe_account_id   text unique,  -- compte Connect : l'agence facture SES clients via la plateforme
                                    -- (null = pas encore branché ; au départ, VWA seulement)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- L'abonnement de l'agence à la plateforme : agency_subscriptions (domaine 3).

-- ─── businesses ──────────────────────────────────────────────────────────
create table businesses (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references agencies on delete restrict,
  business_type_id    uuid not null references business_types on delete restrict,
  name                text not null,
  slug                text not null check (slug ~ '^[a-z0-9-]+$'),
  status              text not null default 'active'
                      check (status in ('active', 'suspended', 'churned')),

  -- Présentation — affichée sur le site public
  logo_url            text,
  cover_url           text,
  description         text,
  primary_color       text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  email               text,          -- public
  phone               text,          -- public
  website_url         text,
  -- Les coordonnées personnelles du gérant vivent dans son profil (domaine 2),
  -- rattaché au commerce par son adhésion « owner ».

  -- Adresse et localisation
  address_line        text,
  postal_code         text,
  city                text,
  country             text not null default 'FR' check (country ~ '^[A-Z]{2}$'),
  latitude            numeric(9,6),
  longitude           numeric(9,6),
  maps_url            text,
  google_location_id  text,          -- utilisé par google_reviewer

  -- Réglages
  timezone            text not null default 'Europe/Paris',
  locale              text not null default 'fr',

  -- Facturation — dépend de la décision sur la facturation des clients
  billing_email       text,
  billing_address     text,
  siren               text check (siren ~ '^[0-9]{9}$'),
  stripe_customer_id  text unique,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (agency_id, slug),   -- slug unique PAR agence
  unique (id, agency_id)      -- cible des clés étrangères composées
);
create index on businesses (agency_id);

-- ─── business_hours ──────────────────────────────────────────────────────
-- Un jour fermé = aucune ligne. Plusieurs lignes par jour = plusieurs services.
create table business_hours (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses on delete cascade,
  day_of_week  smallint not null check (day_of_week between 1 and 7),  -- 1 = lundi (isodow)
  open_time    time not null,
  close_time   time not null,     -- close_time <= open_time : fermeture après minuit
  label        text,              -- « Déjeuner », « Dîner »
  created_at   timestamptz not null default now()
);
create index on business_hours (business_id, day_of_week);

-- ─── business_closures ───────────────────────────────────────────────────
create table business_closures (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses on delete cascade,
  starts_on    date not null,
  ends_on      date not null,
  kind         text not null default 'closed'
               check (kind in ('closed', 'special_hours')),
  open_time    time,              -- requis si special_hours (ex. 24 décembre)
  close_time   time,
  reason       text,
  created_at   timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (kind = 'closed' or (open_time is not null and close_time is not null))
);
create index on business_closures (business_id, starts_on);

-- ─── agency_domains ──────────────────────────────────────────────────────
create table agency_domains (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies on delete cascade,
  business_id  uuid,              -- null = domaine de l'agence ; sinon d'un commerce
  domain       text not null unique check (domain = lower(domain)),
  type         text not null check (type in ('subdomain', 'custom')),
  is_primary   boolean not null default false,
  verified_at  timestamptz,       -- null = non vérifié
  created_at   timestamptz not null default now(),
  -- le commerce appartient forcément à la même agence
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete cascade
);
create unique index on agency_domains (agency_id)   where is_primary and business_id is null;
create unique index on agency_domains (business_id) where is_primary and business_id is not null;

-- ─── agency_email_senders ────────────────────────────────────────────────
create table agency_email_senders (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies on delete cascade,
  business_id  uuid,              -- null = expéditeur de l'agence ; sinon d'un commerce
  from_name    text not null,
  from_email   text not null unique check (from_email = lower(from_email)),
  reply_to     text,
  provider     text not null default 'resend',
  is_verified  boolean not null default false,  -- on n'envoie JAMAIS depuis un expéditeur non vérifié
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete cascade
);
alter table agency_email_senders add unique (id, agency_id);  -- cible des clés composées (campagnes)
create unique index on agency_email_senders (agency_id)   where is_default and business_id is null;
create unique index on agency_email_senders (business_id) where is_default and business_id is not null;

create trigger agencies_updated_at   before update on agencies
  for each row execute function set_updated_at();
create trigger businesses_updated_at before update on businesses
  for each row execute function set_updated_at();

alter table business_types       enable row level security;
alter table agencies             enable row level security;
alter table businesses           enable row level security;
alter table business_hours       enable row level security;
alter table business_closures    enable row level security;
alter table agency_domains       enable row level security;
alter table agency_email_senders enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 2 — Identité & rôles
--
--  Rôles : owner > administrator > member > viewer (« employee » viendra avec
--  le module planning). L'accès plateforme (toi) vit à part, dans
--  platform_admins : aucune agence, VWA comprise, ne peut s'y écrire.
--
--  Une adhésion porte TOUJOURS son agence :
--    · business_id null  → adhésion à l'agence = accès à tous ses commerces
--    · business_id rempli → adhésion à ce commerce seulement
-- ═════════════════════════════════════════════════════════════════════════

-- ─── profiles ────────────────────────────────────────────────────────────
-- Une fiche par compte. email : copie de auth.users.email, tenue à jour par
-- déclencheur (le dashboard ne peut pas lire le schéma auth).
-- Hypothèse : connexion par e-mail uniquement (pas de compte par téléphone seul).
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text not null,
  phone       text,              -- reçoit l'ancien businesses.contact_phone du gérant
  locale      text not null default 'fr',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Profil créé automatiquement à l'inscription (sinon l'adhésion échoue sur la FK)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set email = lower(new.email) where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function handle_user_email_change();

-- ─── platform_admins ─────────────────────────────────────────────────────
-- Accès opérateur. Géré à la main (SQL / service role), jamais via l'appli.
create table platform_admins (
  profile_id  uuid primary key references profiles on delete cascade,
  created_at  timestamptz not null default now()
);

-- ─── memberships ─────────────────────────────────────────────────────────
-- Remplace users.business_id et team_members.
-- Aucune politique d'écriture : on passe par les fonctions plus bas.
create table memberships (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles on delete cascade,
  agency_id    uuid not null references agencies on delete cascade,
  business_id  uuid,              -- null = adhésion à l'agence
  role         text not null
               check (role in ('owner', 'administrator', 'member', 'viewer')),
  is_active    boolean not null default true,   -- suspendre sans supprimer
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- le commerce appartient forcément à l'agence de l'adhésion
  foreign key (business_id, agency_id) references businesses (id, agency_id)
    on delete cascade,
  -- une adhésion par profil et par agence, une par profil et par commerce
  unique nulls not distinct (profile_id, agency_id, business_id)
);
create index on memberships (agency_id);
create index on memberships (business_id);

-- ─── invitations ─────────────────────────────────────────────────────────
create table invitations (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies on delete cascade,
  business_id  uuid,
  invited_by   uuid references profiles on delete set null,  -- survit au départ de l'invitant
  email        text not null check (email = lower(email)),
  role         text not null
               check (role in ('owner', 'administrator', 'member', 'viewer')),
  message      text check (char_length(message) <= 500),     -- échappé à l'envoi
  token_hash   text not null unique,   -- empreinte SHA-256 : le jeton n'est JAMAIS stocké
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'cancelled')),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id)
    on delete cascade
);
-- « expirée » = pending + expires_at dépassé ; pas de statut qui se périme.
-- Une seule invitation en attente par personne et par cible.
create unique index on invitations (agency_id, business_id, email)
  nulls not distinct where status = 'pending';

create trigger profiles_updated_at    before update on profiles
  for each row execute function set_updated_at();
create trigger memberships_updated_at before update on memberships
  for each row execute function set_updated_at();

alter table profiles        enable row level security;
alter table platform_admins enable row level security;
alter table memberships     enable row level security;
alter table invitations     enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  FONCTIONS D'AIDE DES RLS
--
--  Tout l'isolement entre agences repose ici. Chaque politique de chaque
--  table appelle ces fonctions au lieu de réécrire la logique.
--  SECURITY DEFINER : elles lisent memberships sans repasser par ses propres
--  politiques (sinon récursion infinie).
--  Dans les politiques, toujours la forme `col in (select fn(...))` :
--  Postgres évalue la liste UNE fois par requête, pas une fois par ligne.
-- ═════════════════════════════════════════════════════════════════════════

-- Hiérarchie des rôles
create or replace function role_rank(r text) returns int
language sql immutable as $$
  select case r
    when 'owner'         then 4
    when 'administrator' then 3
    when 'member'        then 2
    when 'viewer'        then 1
    else 0
  end
$$;

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where profile_id = auth.uid())
$$;

-- Agences où j'ai une adhésion D'AGENCE avec au moins ce rôle
create or replace function accessible_agency_ids(min_role text default 'viewer')
returns setof uuid
language sql stable security definer set search_path = public as $$
  select agency_id from memberships
   where profile_id = auth.uid() and business_id is null and is_active
     and role_rank(role) >= role_rank(min_role)
  union
  select id from agencies where is_platform_admin()
$$;

-- Commerces accessibles avec au moins ce rôle :
-- adhésion directe au commerce, OU adhésion à son agence
create or replace function accessible_business_ids(min_role text default 'viewer')
returns setof uuid
language sql stable security definer set search_path = public as $$
  select business_id from memberships
   where profile_id = auth.uid() and business_id is not null and is_active
     and role_rank(role) >= role_rank(min_role)
  union
  select b.id from businesses b
   where b.agency_id in (select accessible_agency_ids(min_role))
$$;

-- Agences dont je peux voir la fiche : les miennes, et celles de mes
-- commerces (un gérant doit voir la marque de son agence)
create or replace function visible_agency_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select accessible_agency_ids('viewer')
  union
  select b.agency_id from businesses b
   where b.id in (select accessible_business_ids('viewer'))
$$;

-- Mon rang effectif sur une cible (agence seule, ou commerce de cette agence).
-- Sur un commerce : le meilleur de mon adhésion au commerce et de celle à l'agence.
create or replace function effective_rank(p_agency uuid, p_business uuid)
returns int
language sql stable security definer set search_path = public as $$
  select case when is_platform_admin() then 99 else coalesce((
    select max(role_rank(role)) from memberships
     where profile_id = auth.uid() and is_active and agency_id = p_agency
       and (business_id is null or business_id = p_business)
  ), 0) end
$$;


-- ═════════════════════════════════════════════════════════════════════════
--  VERROUS DE COLONNES
--  Le RLS protège des LIGNES, pas des colonnes : un admin d'agence peut
--  modifier la fiche de son agence, donc en théorie son propre statut.
--  auth.uid() nul = service role ou migration : autorisé.
-- ═════════════════════════════════════════════════════════════════════════

create or replace function guard_agency_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_platform_admin()
     and (new.status is distinct from old.status
          or new.is_internal is distinct from old.is_internal) then
    raise exception 'Seule la plateforme peut modifier le statut ou is_internal d''une agence'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger agencies_guard before update on agencies
  for each row execute function guard_agency_columns();

create or replace function guard_business_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_platform_admin() then
    if new.agency_id is distinct from old.agency_id then
      raise exception 'Un commerce ne change pas d''agence' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and old.agency_id not in (select accessible_agency_ids('administrator')) then
      raise exception 'Seule l''agence peut changer le statut d''un commerce' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger businesses_guard before update on businesses
  for each row execute function guard_business_columns();


-- ═════════════════════════════════════════════════════════════════════════
--  POLITIQUES RLS — domaines 1 et 2
--  Pas de politique = refusé. Aucune suppression via l'appli : on archive.
-- ═════════════════════════════════════════════════════════════════════════

-- business_types : lecture pour tout connecté, écriture plateforme
create policy lecture on business_types for select to authenticated using (true);
create policy plateforme on business_types for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- agencies
create policy lecture on agencies for select to authenticated
  using (id in (select visible_agency_ids()));
create policy modification on agencies for update to authenticated
  using      (id in (select accessible_agency_ids('administrator')))
  with check (id in (select accessible_agency_ids('administrator')));
create policy creation on agencies for insert to authenticated
  with check (is_platform_admin());

-- businesses
create policy lecture on businesses for select to authenticated
  using (id in (select accessible_business_ids('viewer')));
create policy modification on businesses for update to authenticated
  using      (id in (select accessible_business_ids('administrator')))
  with check (id in (select accessible_business_ids('administrator')));
create policy creation on businesses for insert to authenticated
  with check (agency_id in (select accessible_agency_ids('administrator')));

-- business_hours : lecture viewer+, écriture administrator+
create policy lecture on business_hours for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on business_hours for all to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- business_closures : écriture dès member (une fermeture imprévue, c'est le quotidien)
create policy lecture on business_closures for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on business_closures for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- agency_domains / agency_email_senders : configuration réservée à l'agence
create policy agence on agency_domains for all to authenticated
  using      (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));
create policy agence on agency_email_senders for all to authenticated
  using      (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));

-- memberships : on voit l'équipe de ses agences, et celle de ses commerces.
-- Un gérant voit l'équipe de l'agence et celle de SON commerce, pas celle
-- des autres clients de l'agence.
create policy lecture on memberships for select to authenticated
  using (
    agency_id in (select visible_agency_ids())
    and (business_id is null or business_id in (select accessible_business_ids('viewer')))
  );

-- profiles : le sien, et ceux des membres visibles
create policy lecture on profiles for select to authenticated
  using (id = auth.uid() or id in (select profile_id from memberships));  -- filtré par la politique de memberships
create policy modification on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- invitations : administrator+ de la cible
create policy lecture on invitations for select to authenticated
  using (
    (business_id is null and agency_id in (select accessible_agency_ids('administrator')))
    or business_id in (select accessible_business_ids('administrator'))
  );

-- platform_admins : chacun sait s'il en fait partie
create policy lecture on platform_admins for select to authenticated
  using (profile_id = auth.uid() or is_platform_admin());


-- ═════════════════════════════════════════════════════════════════════════
--  GESTION DES ADHÉSIONS — seule porte d'écriture sur memberships
--  Règles : on ne donne pas un rôle au-dessus du sien ; seul un owner nomme
--  un owner ; on ne touche pas à quelqu'un de plus haut placé ; on ne retire
--  pas le dernier owner d'une agence.
-- ═════════════════════════════════════════════════════════════════════════

-- Invite quelqu'un. Renvoie le jeton EN CLAIR, une seule fois : il part dans
-- l'e-mail et n'est stocké que sous forme d'empreinte.
create or replace function invite_member(
  p_agency uuid, p_business uuid, p_email text, p_role text, p_message text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_rank  int  := effective_rank(p_agency, p_business);
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if v_rank < role_rank('administrator') then
    raise exception 'Droits insuffisants pour inviter' using errcode = '42501';
  end if;
  if role_rank(p_role) > v_rank or (p_role = 'owner' and v_rank < role_rank('owner')) then
    raise exception 'Impossible d''attribuer un rôle supérieur au sien' using errcode = '42501';
  end if;

  -- une nouvelle invitation remplace la précédente en attente
  update invitations set status = 'cancelled'
   where status = 'pending' and agency_id = p_agency
     and business_id is not distinct from p_business and email = lower(p_email);

  insert into invitations (agency_id, business_id, invited_by, email, role, message, token_hash)
  values (p_agency, p_business, auth.uid(), lower(p_email), p_role, p_message,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  return v_token;
end $$;

-- Accepte une invitation. Elle ne vaut que pour l'e-mail invité : un lien
-- transféré ne fonctionne pas.
create or replace function accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv        invitations;
  v_email      text;
  v_membership uuid;
begin
  select * into v_inv from invitations
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and status = 'pending' and expires_at > now()
   for update;
  if not found then
    raise exception 'Invitation invalide ou expirée' using errcode = '22023';
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from v_inv.email then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail' using errcode = '42501';
  end if;

  select id into v_membership from memberships
   where profile_id = auth.uid() and agency_id = v_inv.agency_id
     and business_id is not distinct from v_inv.business_id;

  if v_membership is null then
    insert into memberships (profile_id, agency_id, business_id, role)
    values (auth.uid(), v_inv.agency_id, v_inv.business_id, v_inv.role)
    returning id into v_membership;
  else
    update memberships set role = v_inv.role, is_active = true where id = v_membership;
  end if;

  update invitations set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return v_membership;
end $$;

-- Refuse de retirer ou rétrograder le dernier owner actif d'une agence
create or replace function assert_not_last_agency_owner(m memberships) returns void
language plpgsql security definer set search_path = public as $$
begin
  if m.business_id is null and m.role = 'owner' and m.is_active and not exists (
       select 1 from memberships
        where agency_id = m.agency_id and business_id is null
          and role = 'owner' and is_active and id <> m.id) then
    raise exception 'Impossible : c''est le dernier owner de l''agence' using errcode = '42501';
  end if;
end $$;

create or replace function change_member_role(p_membership uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare
  m      memberships;
  v_rank int;
begin
  select * into m from memberships where id = p_membership for update;
  if not found then raise exception 'Adhésion introuvable' using errcode = '22023'; end if;
  v_rank := effective_rank(m.agency_id, m.business_id);

  if v_rank < role_rank('administrator')
     or role_rank(m.role) > v_rank                     -- on ne touche pas plus haut que soi
     or role_rank(p_role) > v_rank
     or (p_role = 'owner' and v_rank < role_rank('owner')) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if p_role <> 'owner' then perform assert_not_last_agency_owner(m); end if;

  update memberships set role = p_role where id = p_membership;
end $$;

-- Retire une adhésion. On peut toujours se retirer soi-même (sauf dernier owner).
create or replace function remove_member(p_membership uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m      memberships;
  v_rank int;
begin
  select * into m from memberships where id = p_membership for update;
  if not found then raise exception 'Adhésion introuvable' using errcode = '22023'; end if;
  v_rank := effective_rank(m.agency_id, m.business_id);

  if m.profile_id <> auth.uid()
     and (v_rank < role_rank('administrator') or role_rank(m.role) > v_rank) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  perform assert_not_last_agency_owner(m);

  delete from memberships where id = p_membership;
end $$;

-- Fonctions d'écriture : jamais exécutables sans être connecté
revoke execute on function invite_member(uuid, uuid, text, text, text) from public;
revoke execute on function accept_invitation(text)                      from public;
revoke execute on function change_member_role(uuid, text)               from public;
revoke execute on function remove_member(uuid)                          from public;
revoke execute on function assert_not_last_agency_owner(memberships)    from public;
grant  execute on function invite_member(uuid, uuid, text, text, text) to authenticated;
grant  execute on function accept_invitation(text)                      to authenticated;
grant  execute on function change_member_role(uuid, text)               to authenticated;
grant  execute on function remove_member(uuid)                          to authenticated;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 3 — Offre & droits
--
--  Trois niveaux, à ne jamais confondre :
--    DROIT         le commerce A-T-IL le module ?    modules.is_core, plan_modules, business_addons
--    ACTIVATION    s'en sert-il, et comment ?         business_module_settings.is_enabled
--    CONSOMMATION  combien a-t-il consommé ?          usage_events, comparé aux quotas
--  has_feature(commerce, module) = droit ET activation ET commerce actif.
--
--  Plans HYBRIDES : agency_id null = plan type de la plateforme, utilisable par
--  toutes les agences ; agency_id rempli = plan propre à une agence.
--  Les plans vendus AUX AGENCES sont dans une table à part (agency_plans).
--
--  Stripe : à terme chaque agence facture ses clients via la plateforme avec son
--  propre compte (Stripe Connect, agencies.stripe_account_id). Au départ, VWA
--  seulement. Les colonnes stripe_* sont donc facultatives : un plan peut être
--  géré à la main, sans Stripe.
--  Montants en CENTIMES (format natif de Stripe).
--  Politiques RLS : passe dédiée plus tard. RLS activé = tout refusé d'ici là.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── modules ─────────────────────────────────────────────────────────────
create table modules (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9_]+$'),  -- has_feature(b, 'reminders')
  label        text not null,
  description  text,
  icon         text,
  category     text not null check (category in (
                 'activity',        -- réservations, commandes, clients…
                 'content',         -- services, produits, blog…
                 'communication',   -- SMS, e-mail, chatbot…
                 'visibility',      -- stats, SEO, ads…
                 'module'           -- fidélité, CRM, facturation…
               )),
  is_core      boolean not null default false,  -- inclus d'office, sans figurer dans les plans
  is_active    boolean not null default true,   -- false = retiré du catalogue, gardé pour l'historique
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- Modules proposés selon le métier (remplace business_types.default_modules)
create table business_type_modules (
  business_type_id  uuid not null references business_types on delete cascade,
  module_id         uuid not null references modules on delete restrict,
  primary key (business_type_id, module_id)
);

-- ─── plans (proposés aux commerces) ──────────────────────────────────────
create table plans (
  id                   uuid primary key default gen_random_uuid(),
  agency_id            uuid references agencies on delete cascade,  -- null = plan type de la plateforme
  name                 text not null,
  slug                 text not null check (slug ~ '^[a-z0-9-]+$'),
  description          text,
  price_monthly_cents  int not null default 0 check (price_monthly_cents >= 0),
  price_yearly_cents   int check (price_yearly_cents >= 0),
  currency             text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  is_active            boolean not null default true,
  is_public            boolean not null default true,   -- visible sur le site vitrine
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique nulls not distinct (agency_id, slug)   -- slug unique par agence (et parmi les plans plateforme)
);
create index on plans (agency_id);

create table plan_modules (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references plans on delete cascade,
  module_id   uuid not null references modules on delete restrict,  -- on retire un module par is_active, pas par suppression
  created_at  timestamptz not null default now(),
  unique (plan_id, module_id)
);
create index on plan_modules (module_id);

-- Quotas mensuels par compteur. Un compteur est partagé entre modules :
-- les SMS des rappels et ceux des campagnes puisent dans le même quota.
create table plan_quotas (
  plan_id        uuid not null references plans on delete cascade,
  meter          text not null check (meter in ('sms', 'email', 'ai_credits')),
  monthly_limit  int  not null check (monthly_limit >= 0),
  primary key (plan_id, meter)
);

-- ─── business_plans (abonnement d'un commerce) ───────────────────────────
-- Historique complet : changer de plan = annuler la ligne en cours et en créer
-- une nouvelle. Remplace businesses.plan, monthly_price et upsells.
create table business_plans (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null,
  agency_id               uuid not null,
  plan_id                 uuid not null references plans on delete restrict,
  status                  text not null default 'active'
                          check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  -- Prix réellement facturé : peut différer du catalogue (remise, tarif négocié)
  price_monthly_cents     int check (price_monthly_cents >= 0),
  setup_fee_cents         int check (setup_fee_cents >= 0),   -- à confirmer : ex-« upsells » ?
  currency                text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  stripe_subscription_id  text unique,          -- null = plan géré sans Stripe
  trial_ends_at           timestamptz,
  current_period_start    timestamptz,          -- facultatif hors Stripe
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete restrict,
  check (current_period_end is null or current_period_start is null
         or current_period_end > current_period_start)
);
-- Un seul abonnement EN COURS par commerce ; les anciens restent pour l'historique
create unique index on business_plans (business_id)
  where status in ('trialing', 'active', 'past_due');
create index on business_plans (agency_id);
create index on business_plans (plan_id);

-- Un commerce ne peut souscrire qu'un plan de la plateforme ou de SA propre agence
create or replace function check_business_plan_agency() returns trigger
language plpgsql as $$
declare v_plan_agency uuid;
begin
  select agency_id into v_plan_agency from plans where id = new.plan_id;
  if v_plan_agency is not null and v_plan_agency <> new.agency_id then
    raise exception 'Ce plan appartient à une autre agence' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger business_plans_agency_check before insert or update of plan_id, agency_id
  on business_plans for each row execute function check_business_plan_agency();

-- ─── business_addons ─────────────────────────────────────────────────────
-- Option hors plan : SOIT un module en plus, SOIT du quota en plus.
create table business_addons (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null,
  agency_id            uuid not null,
  module_id            uuid references modules on delete restrict,
  meter                text check (meter in ('sms', 'email', 'ai_credits')),
  extra_monthly_limit  int  check (extra_monthly_limit > 0),
  price_monthly_cents  int not null default 0 check (price_monthly_cents >= 0),
  currency             text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status               text not null default 'active' check (status in ('active', 'cancelled')),
  stripe_item_id       text unique,   -- ligne de l'abonnement Stripe du commerce ; null = hors Stripe
  started_at           timestamptz not null default now(),
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete restrict,
  check (num_nonnulls(module_id, meter) = 1),
  check ((meter is null) = (extra_monthly_limit is null))
);
-- Une option module active à la fois ; une option annulée peut être reprise
create unique index on business_addons (business_id, module_id)
  where status = 'active' and module_id is not null;
create index on business_addons (business_id);
create index on business_addons (module_id);

-- ─── business_module_settings ────────────────────────────────────────────
-- ACTIVATION et réglages. Désactivé par défaut : avoir le droit ne suffit pas,
-- il faut l'avoir choisi — c'est ce qui manque au cron des rappels actuel.
-- Exemple pour « reminders » : {"channels": ["sms", "email"], "hours_before": 24}
create table business_module_settings (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses on delete cascade,
  module_id    uuid not null references modules on delete restrict,
  is_enabled   boolean not null default false,
  settings     jsonb   not null default '{}' check (jsonb_typeof(settings) = 'object'),
  updated_by   uuid references profiles on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, module_id)
);

-- ─── usage_events ────────────────────────────────────────────────────────
-- Journal de consommation. Ajout seul : jamais modifié, jamais supprimé
-- (ce sont des données de facturation).
create table usage_events (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null,
  agency_id        uuid not null,     -- c'est l'agence qu'on facture pour sa consommation
  module_id        uuid references modules on delete restrict,
  profile_id       uuid references profiles on delete set null,   -- qui l'a déclenché
  event_type       text not null check (event_type ~ '^[a-z0-9_]+$'),  -- ex. 'reminder_sms_sent'
  meter            text check (meter in ('sms', 'email', 'ai_credits')),  -- null = non facturable
  quantity         int  not null default 1 check (quantity > 0),
  idempotency_key  text unique,       -- un envoi rejoué n'est compté qu'une fois
  meta             jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete restrict
);
create index on usage_events (business_id, meter, created_at);
create index on usage_events (agency_id, created_at);
create index on usage_events (event_type);

-- ─── Plateforme → agences ────────────────────────────────────────────────
-- Plans que la plateforme vend aux agences (distincts des plans des commerces)
create table agency_plans (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text not null unique check (slug ~ '^[a-z0-9-]+$'),
  price_monthly_cents  int not null default 0 check (price_monthly_cents >= 0),
  currency             text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  max_businesses       int check (max_businesses > 0),   -- null = illimité
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Modules qu'une agence a le droit de proposer : une agence ne peut pas
-- offrir à ses clients ce que son propre abonnement n'inclut pas.
create table agency_plan_modules (
  agency_plan_id  uuid not null references agency_plans on delete cascade,
  module_id       uuid not null references modules on delete restrict,
  primary key (agency_plan_id, module_id)
);

create table agency_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  agency_id               uuid not null references agencies on delete restrict,
  agency_plan_id          uuid not null references agency_plans on delete restrict,
  status                  text not null default 'active'
                          check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  stripe_subscription_id  text unique,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index on agency_subscriptions (agency_id)
  where status in ('trialing', 'active', 'past_due');

-- ─── has_feature ─────────────────────────────────────────────────────────
-- LA question que posent le dashboard, les sites et les crons.
create or replace function has_feature(p_business uuid, p_module text) returns boolean
language sql stable security definer set search_path = public as $$
  with m as (select id, is_core from modules where slug = p_module and is_active)
  select
    -- commerce actif (un commerce suspendu n'envoie plus rien)
    exists (select 1 from businesses where id = p_business and status = 'active')
    and exists (select 1 from m)
    -- DROIT : module de base, OU plan en cours, OU option active
    and (
      (select is_core from m)
      or exists (select 1 from business_plans bp
                   join plan_modules pm on pm.plan_id = bp.plan_id
                  where bp.business_id = p_business
                    and bp.status in ('trialing', 'active', 'past_due')
                    and pm.module_id = (select id from m))
      or exists (select 1 from business_addons a
                  where a.business_id = p_business and a.status = 'active'
                    and a.module_id = (select id from m))
    )
    -- ACTIVATION : choisi par le commerce
    and exists (select 1 from business_module_settings s
                 where s.business_id = p_business and s.is_enabled
                   and s.module_id = (select id from m))
$$;
-- À venir avec la logique d'envoi : quota_remaining(commerce, compteur), calculé
-- sur le mois civil dans le fuseau du commerce, vérifié de façon atomique.

create trigger plans_updated_at before update on plans
  for each row execute function set_updated_at();
create trigger business_plans_updated_at before update on business_plans
  for each row execute function set_updated_at();
create trigger business_module_settings_updated_at before update on business_module_settings
  for each row execute function set_updated_at();
create trigger agency_plans_updated_at before update on agency_plans
  for each row execute function set_updated_at();
create trigger agency_subscriptions_updated_at before update on agency_subscriptions
  for each row execute function set_updated_at();

alter table modules                  enable row level security;
alter table business_type_modules    enable row level security;
alter table plans                    enable row level security;
alter table plan_modules             enable row level security;
alter table plan_quotas              enable row level security;
alter table business_plans           enable row level security;
alter table business_addons          enable row level security;
alter table business_module_settings enable row level security;
alter table usage_events             enable row level security;
alter table agency_plans             enable row level security;
alter table agency_plan_modules      enable row level security;
alter table agency_subscriptions     enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 4 — Contenu public des sites
--
--  Ce que les sites affichent : prestations, produits, équipe, talents,
--  réalisations, articles, avis, cartes de restaurant.
--  Règle d'intégrité : une ligne enfant appartient TOUJOURS au même commerce
--  que son parent (clés étrangères composées (x_id, business_id)). Sans ça,
--  un plat de FiFi pourrait être rangé dans la carte de Toscana.
--  Montants en centimes, saisis TTC (le prix affiché, fixé par le commerçant)
--  avec leur taux de TVA. Contenus en brouillon par défaut.
--  Politiques RLS : passe dédiée plus tard. Les sites liront ces données via
--  des fonctions publiques qui ne renvoient que le contenu publié.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── services ────────────────────────────────────────────────────────────
create table services (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses on delete cascade,
  name          text not null,
  slug          text not null check (slug ~ '^[a-z0-9-]+$'),
  description   text,
  price_cents   int check (price_cents >= 0),       -- null = « sur devis »
  currency      text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  tax_rate      numeric(5,2) not null default 20 check (tax_rate between 0 and 100),  -- TVA incluse dans le prix affiché
  duration_min  int check (duration_min > 0),       -- durée, pour les réservations
  image_url     text,
  is_active     boolean not null default true,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, slug),
  unique (id, business_id)
);

-- ─── products ────────────────────────────────────────────────────────────
-- Migration depuis l'actuel `products` — ATTENTION, sens inversé :
--   aujourd'hui discount_price = prix payé en promotion ;
--   ici price_cents = prix payé, compare_price_cents = prix barré.
--   → price_cents ← coalesce(discount_price, price) × 100
--   → compare_price_cents ← price × 100 si discount_price existait, sinon null
create table products (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references businesses on delete cascade,
  name                 text not null,
  slug                 text not null check (slug ~ '^[a-z0-9-]+$'),
  description          text,
  price_cents          int not null check (price_cents >= 0),        -- prix payé
  compare_price_cents  int check (compare_price_cents > price_cents), -- prix barré
  currency             text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  tax_rate             numeric(5,2) not null default 20 check (tax_rate between 0 and 100),  -- les variantes héritent du taux du produit
  sku                  text,
  stock                int check (stock >= 0),     -- null = illimité (ignoré si le produit a des variantes)
  image_url            text,
  images               jsonb not null default '[]' check (jsonb_typeof(images) = 'array'),
  is_active            boolean not null default true,
  position             int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, slug),
  unique (id, business_id)
);
create unique index on products (business_id, sku) where sku is not null;

-- ─── product_variants ────────────────────────────────────────────────────
-- Tailles, coloris… (ADBoots : tailles M et L, aujourd'hui codées en dur
-- dans le checkout, sans stock par taille).
create table product_variants (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null,
  product_id   uuid not null,
  name         text not null,                       -- « M », « L », « Noir / 42 »
  sku          text,
  price_cents  int check (price_cents >= 0),        -- null = prix du produit
  stock        int check (stock >= 0),              -- null = illimité
  is_active    boolean not null default true,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (product_id, business_id) references products (id, business_id) on delete cascade,
  unique (product_id, name),
  unique (id, business_id)
);
create unique index on product_variants (business_id, sku) where sku is not null;

-- ─── employees ───────────────────────────────────────────────────────────
-- UNE seule table pour le personnel : affiché sur le site (show_on_site)
-- ET, plus tard, géré dans le planning (colonnes RH ajoutées au domaine 8).
-- Remplace employees actuelle ; pas de table « staff » séparée.
create table employees (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses on delete cascade,
  profile_id    uuid references profiles on delete set null,  -- null = pas de compte
  full_name     text not null,
  job_title     text,                          -- « Coiffeur », « Barista »
  bio           text,
  avatar_url    text,
  show_on_site  boolean not null default false, -- publier un salarié est un choix explicite
  is_active     boolean not null default true,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, business_id)
);
create index on employees (business_id);
create unique index on employees (business_id, profile_id) where profile_id is not null;

-- ─── talents ─────────────────────────────────────────────────────────────
-- Profils représentés par une agence (mannequins, comédiens…). Remplace
-- `people`. Données personnelles : ce qui est publié est choisi champ par
-- champ par la fonction publique, pas par la table.
--   date_of_birth : JAMAIS publiée — le site affiche l'âge calculé.
-- Correspondance avec `people` : name → display_name, description → bio,
-- specialty → specialties, height → height_cm, photo_url → avatar_url,
-- active → is_active, display_order → position.
-- Migration : si seul `age` est renseigné (sans date de naissance), le
-- reporter dans attributes.declared_age pour ne pas le perdre.
create table talents (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses on delete cascade,
  display_name   text not null,
  first_name     text,
  last_name      text,
  slug           text not null check (slug ~ '^[a-z0-9-]+$'),
  bio            text,
  date_of_birth  date,                          -- privée
  gender         text,
  height_cm      smallint check (height_cm between 50 and 250),
  eye_color      text,
  hair_color     text,
  languages      text[] not null default '{}',
  skills         text[] not null default '{}',
  specialties    text[] not null default '{}',  -- « comédie », « doublage », « défilé »
  avatar_url     text,
  cover_url      text,
  photos         jsonb not null default '[]' check (jsonb_typeof(photos) = 'array'),
  portfolio_url  text,
  links          jsonb not null default '{}' check (jsonb_typeof(links) = 'object'),  -- réseaux, showreel
  attributes     jsonb not null default '{}' check (jsonb_typeof(attributes) = 'object'),  -- mensurations et spécifique métier
  is_active      boolean not null default true,
  position       int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, slug),
  unique (id, business_id)
);

-- ─── projects ────────────────────────────────────────────────────────────
create table projects (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses on delete cascade,
  title         text not null,
  slug          text not null check (slug ~ '^[a-z0-9-]+$'),
  description   text,
  cover_url     text,
  images        jsonb not null default '[]' check (jsonb_typeof(images) = 'array'),
  category      text,
  status        text not null default 'draft'
                check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, slug),
  unique (id, business_id)
);

-- ─── project_talents ─────────────────────────────────────────────────────
-- Le projet et le talent appartiennent forcément au même commerce.
create table project_talents (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null,
  project_id   uuid not null,
  talent_id    uuid not null,
  role         text,                            -- « Rôle principal », « Doublage »
  created_at   timestamptz not null default now(),
  foreign key (project_id, business_id) references projects (id, business_id) on delete cascade,
  foreign key (talent_id,  business_id) references talents  (id, business_id) on delete cascade,
  unique (project_id, talent_id)
);
create index on project_talents (talent_id);

-- ─── blog_posts ──────────────────────────────────────────────────────────
-- Fusion de `blog` et `blog_posts`.
create table blog_posts (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses on delete cascade,
  author_id     uuid references profiles on delete set null,
  title         text not null,
  slug          text not null check (slug ~ '^[a-z0-9-]+$'),
  excerpt       text,
  content       text,                           -- markdown ou html
  cover_url     text,
  tags          text[] not null default '{}',
  status        text not null default 'draft'
                check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, slug)
);
create index on blog_posts (business_id, status);
create index on blog_posts (published_at);

-- ─── reviews ─────────────────────────────────────────────────────────────
-- Avis déposés sur le site (source internal) : EN ATTENTE de modération par
-- défaut. Aujourd'hui, n'importe quel visiteur peut en publier un aussitôt.
-- Avis importés (Google…) : dédoublonnés par (commerce, source, external_id),
-- sinon chaque passage de google_reviewer les réimporte.
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses on delete cascade,
  customer_id   uuid,                           -- clé étrangère composée ajoutée au domaine 5
  source        text not null default 'internal'
                check (source in ('internal', 'google', 'tripadvisor')),
  external_id   text,                           -- identifiant de l'avis sur la plateforme source
  author_name   text,
  rating        smallint not null check (rating between 1 and 5),
  content       text,
  status        text not null default 'pending'
                check (status in ('pending', 'published', 'hidden')),
  reply         text,                           -- réponse du gérant
  replied_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, source, external_id),
  check (source = 'internal' or external_id is not null)
);
create index on reviews (business_id, status);

-- ─── menu_sections / menu_items ──────────────────────────────────────────
create table menu_sections (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses on delete cascade,
  name          text not null,                  -- « Entrées », « Plats », « Desserts »
  description   text,
  position      int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, business_id)
);
create index on menu_sections (business_id);

-- allergens : les 14 allergènes réglementaires européens (règlement INCO),
-- en codes stables ; l'affichage les traduit. Pas de texte libre.
create table menu_items (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null,
  menu_section_id  uuid not null,
  name             text not null,
  description      text,
  price_cents      int check (price_cents >= 0),
  currency         text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  tax_rate         numeric(5,2) not null default 10 check (tax_rate between 0 and 100),  -- restauration sur place : 10 % ; alcool : 20 %
  image_url        text,
  allergens        text[] not null default '{}'
                   check (allergens <@ array['gluten', 'crustaceans', 'eggs', 'fish', 'peanuts',
                          'soy', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites',
                          'lupin', 'molluscs']::text[]),
  tags             text[] not null default '{}',  -- « végétarien », « fait maison »
  is_available     boolean not null default true,
  position         int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (menu_section_id, business_id) references menu_sections (id, business_id) on delete cascade
);
create index on menu_items (business_id);
create index on menu_items (menu_section_id);

-- ─── Déclencheurs et RLS ─────────────────────────────────────────────────
create trigger services_updated_at         before update on services         for each row execute function set_updated_at();
create trigger products_updated_at         before update on products         for each row execute function set_updated_at();
create trigger product_variants_updated_at before update on product_variants for each row execute function set_updated_at();
create trigger employees_updated_at        before update on employees        for each row execute function set_updated_at();
create trigger talents_updated_at          before update on talents          for each row execute function set_updated_at();
create trigger projects_updated_at         before update on projects         for each row execute function set_updated_at();
create trigger blog_posts_updated_at       before update on blog_posts       for each row execute function set_updated_at();
create trigger reviews_updated_at          before update on reviews          for each row execute function set_updated_at();
create trigger menu_sections_updated_at    before update on menu_sections    for each row execute function set_updated_at();
create trigger menu_items_updated_at       before update on menu_items       for each row execute function set_updated_at();

alter table services         enable row level security;
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table employees        enable row level security;
alter table talents          enable row level security;
alter table projects         enable row level security;
alter table project_talents  enable row level security;
alter table blog_posts       enable row level security;
alter table reviews          enable row level security;
alter table menu_sections    enable row level security;
alter table menu_items       enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 5 — Activité des commerces
--
--  1. Fichier clients UNIQUE par commerce : réservations, commandes, devis et
--     factures pointent vers customers au lieu de recopier nom et téléphone.
--     Une adresse e-mail = une fiche (sinon les doublons faussent tout).
--  2. Documents commerciaux FIGÉS : une commande garde le nom, le prix et la
--     TVA au moment de l'achat ; une facture garde l'identité du vendeur et de
--     l'acheteur au moment de l'émission.
--  3. Factures conformes : numérotation continue sans trou ; une facture émise
--     ne se modifie ni ne se supprime — on la corrige par un avoir.
--  4. Pas de compteurs stockés (total dépensé, visites) : ils dérivent. La vue
--     customer_stats les calcule, toujours justes.
--
--  Montants en centimes.
--    · commandes (boutique, B2C) : TTC, comme le catalogue ; tax_cents = « dont TVA »
--    · devis et factures : lignes HT + taux de TVA ; totaux HT / TVA / TTC
--  Factures de VWA à ses propres clients : même table. VWA existe comme
--  commerce (son entité), ses clients sont des customers de ce commerce.
--  Les abonnements prélevés par Stripe ont leurs factures Stripe : pas de doublon.
--  Données d'activité : on ne supprime pas un commerce qui en a (restrict).
--  Politiques RLS : passe dédiée plus tard.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── customers ───────────────────────────────────────────────────────────
-- Remplace crm_clients, et les clients recopiés dans reservations, orders,
-- quotes. Migration : rapprochement par e-mail puis téléphone (doublons à
-- trancher à la main).
create table customers (
  id                         uuid primary key default gen_random_uuid(),
  business_id                uuid not null references businesses on delete restrict,
  profile_id                 uuid references profiles on delete set null,  -- compte client (futur espace client)
  first_name                 text,
  last_name                  text,
  full_name                  text,        -- quand on n'a qu'un nom (formulaire de réservation)
  email                      text check (email = lower(email)),
  phone                      text,
  source                     text not null default 'manual'
                             check (source in ('reservation', 'order', 'quote', 'review', 'form',
                                               'manual', 'import', 'instagram', 'whatsapp')),
  tags                       text[] not null default '{}',
  is_blocked                 boolean not null default false,   -- ex. no-shows à répétition
  -- Consentement marketing (RGPD, obligatoire pour les SMS promotionnels) :
  -- null = pas de consentement. Les messages de service (confirmation,
  -- rappel) n'en demandent pas.
  marketing_email_opt_in_at  timestamptz,
  marketing_sms_opt_in_at    timestamptz,
  -- Effacement RGPD : l'identité est effacée, l'historique est conservé.
  anonymized_at              timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (id, business_id),
  check (anonymized_at is null
         or (email is null and phone is null and first_name is null and last_name is null))
);
create unique index on customers (business_id, email) where email is not null;
create unique index on customers (business_id, profile_id) where profile_id is not null;
create index on customers (business_id, phone) where phone is not null;
create index on customers (business_id, last_name);

-- ─── customer_notes ──────────────────────────────────────────────────────
-- Remplace crm_notes. Les notes vivent ICI seulement (auteur et date gardés).
create table customer_notes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null,
  customer_id  uuid not null,
  author_id    uuid references profiles on delete set null,
  content      text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (customer_id, business_id) references customers (id, business_id) on delete cascade
);
create index on customer_notes (customer_id);

-- Clé étrangère annoncée au domaine 4 : un avis ne pointe que vers un client
-- du même commerce. Client supprimé → le lien disparaît, l'avis reste.
alter table reviews
  add foreign key (customer_id, business_id) references customers (id, business_id)
  on delete set null (customer_id);

-- ─── reservations ────────────────────────────────────────────────────────
-- Identifiants actuels CONSERVÉS. Correspondance avec la table actuelle :
--   date → starts_at · guests → party_size · message → customer_message
--   reminder_sent (booléen) → reminder_sent_at
--   status 'scheduled' → 'confirmed' ; attended true → 'completed',
--   attended false → 'no_show'
--   customer_name → guest_name + customers ; customer_phone / customer_mail → customers
create table reservations (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references businesses on delete restrict,
  customer_id          uuid,          -- null = client de passage sans coordonnées
  guest_name           text,          -- nom donné POUR CETTE réservation (« au nom de Marie »)
  service_id           uuid,          -- prestation réservée (coiffeur, coach) ; null pour un restaurant
  employee_id          uuid,          -- avec qui (lien planning) ; null = indifférent
  starts_at            timestamptz not null,
  ends_at              timestamptz,   -- null = durée non définie (restaurant)
  party_size           smallint not null default 1 check (party_size between 1 and 500),
  status               text not null default 'confirmed'
                       check (status in ('pending', 'confirmed', 'completed', 'no_show', 'cancelled')),
  source               text not null default 'website'
                       check (source in ('website', 'dashboard', 'phone', 'walk_in',
                                         'instagram', 'whatsapp', 'google', 'import')),
  customer_message     text,          -- allergies, occasion… (écrit par le client)
  internal_note        text,          -- visible de l'équipe seulement
  reminder_sent_at     timestamptz,
  cancelled_at         timestamptz,
  cancellation_reason  text,
  created_by           uuid references profiles on delete set null,  -- null = réservé par le client
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (customer_id, business_id) references customers (id, business_id) on delete restrict,
  foreign key (service_id,  business_id) references services  (id, business_id) on delete restrict,
  foreign key (employee_id, business_id) references employees (id, business_id) on delete set null (employee_id),
  check (ends_at is null or ends_at > starts_at),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (customer_id is not null or guest_name is not null),  -- on sait toujours qui attendre
  unique (id, business_id)
);
create index on reservations (business_id, starts_at);
create index on reservations (customer_id);
create index on reservations (employee_id);
-- Pour le cron des rappels : réservations à venir, pas encore rappelées
create index on reservations (starts_at)
  where status in ('pending', 'confirmed') and reminder_sent_at is null;

-- ─── orders / order_items ────────────────────────────────────────────────
-- Deux statuts indépendants : où en est la commande (status) et où en est
-- le paiement (payment_status). Une commande peut être expédiée ET
-- partiellement remboursée.
create table orders (
  id                          uuid primary key default gen_random_uuid(),
  business_id                 uuid not null references businesses on delete restrict,
  customer_id                 uuid not null,
  number                      text not null,          -- « CMD-2026-0042 » (next_document_number)
  status                      text not null default 'pending'
                              check (status in ('pending', 'confirmed', 'processing',
                                                'shipped', 'delivered', 'cancelled')),
  payment_status              text not null default 'unpaid'
                              check (payment_status in ('unpaid', 'paid', 'partially_refunded', 'refunded')),
  payment_method              text,                   -- « card », « cash », « transfer »…
  source                      text not null default 'online' check (source in ('online', 'manual', 'pos')),
  -- Montants TTC
  subtotal_cents              int not null check (subtotal_cents >= 0),
  discount_cents              int not null default 0 check (discount_cents >= 0),
  shipping_cents              int not null default 0 check (shipping_cents >= 0),
  tax_cents                   int not null default 0 check (tax_cents >= 0),   -- dont TVA
  total_cents                 int not null check (total_cents >= 0),
  refunded_cents              int not null default 0 check (refunded_cents >= 0),
  currency                    text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  -- Adresses FIGÉES au moment de la commande
  shipping_address            jsonb check (shipping_address is null or jsonb_typeof(shipping_address) = 'object'),
  billing_address             jsonb check (billing_address  is null or jsonb_typeof(billing_address)  = 'object'),
  customer_note               text,
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text unique,
  tracking_number             text,
  paid_at                     timestamptz,
  shipped_at                  timestamptz,
  cancelled_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  foreign key (customer_id, business_id) references customers (id, business_id) on delete restrict,
  unique (business_id, number),
  unique (id, business_id),
  check (total_cents = subtotal_cents - discount_cents + shipping_cents),
  check (tax_cents <= total_cents),
  check (refunded_cents <= total_cents),
  check (payment_status <> 'refunded'           or refunded_cents = total_cents),
  check (payment_status <> 'partially_refunded' or refunded_cents between 1 and total_cents - 1)
);
create index on orders (business_id, created_at);
create index on orders (customer_id);

-- Lignes FIGÉES : nom, variante, prix ET taux de TVA au moment de l'achat.
-- Si le produit est supprimé plus tard, la ligne reste lisible.
create table order_items (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null,
  order_id          uuid not null,
  product_id        uuid,
  variant_id        uuid,
  product_name      text not null,
  variant_name      text,             -- « Taille L »
  sku               text,
  unit_price_cents  int not null check (unit_price_cents >= 0),   -- TTC
  tax_rate          numeric(5,2) not null check (tax_rate between 0 and 100),
  quantity          int not null check (quantity > 0),
  total_cents       int generated always as (unit_price_cents * quantity) stored,
  created_at        timestamptz not null default now(),
  foreign key (order_id,   business_id) references orders           (id, business_id) on delete cascade,
  foreign key (product_id, business_id) references products         (id, business_id) on delete set null (product_id),
  foreign key (variant_id, business_id) references product_variants (id, business_id) on delete set null (variant_id)
);
create index on order_items (order_id);

-- ─── quotes / quote_items ────────────────────────────────────────────────
-- Un devis commence souvent par une DEMANDE envoyée depuis le site
-- (status 'request', sans numéro), puis devient un devis chiffré.
-- Le lien vers la facture est porté par invoices.quote_id : un devis peut
-- donner plusieurs factures (acompte puis solde).
create table quotes (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses on delete restrict,
  customer_id      uuid not null,
  number           text,              -- attribué au passage en devis ; null pour une demande
  status           text not null default 'request'
                   check (status in ('request', 'draft', 'sent', 'accepted',
                                     'declined', 'expired', 'cancelled')),
  title            text,
  request_message  text,              -- message du formulaire du site
  request_details  jsonb not null default '{}' check (jsonb_typeof(request_details) = 'object'),
  valid_until      date,
  subtotal_cents   int not null default 0 check (subtotal_cents >= 0),   -- HT
  discount_cents   int not null default 0 check (discount_cents >= 0),   -- HT
  tax_cents        int not null default 0 check (tax_cents >= 0),
  total_cents      int not null default 0 check (total_cents >= 0),      -- TTC
  currency         text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  notes            text,
  sent_at          timestamptz,
  viewed_at        timestamptz,       -- le client a ouvert le devis
  accepted_at      timestamptz,
  declined_at      timestamptz,
  created_by       uuid references profiles on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (customer_id, business_id) references customers (id, business_id) on delete restrict,
  unique (business_id, number),
  unique (id, business_id),
  check (status in ('request', 'draft', 'cancelled') or number is not null),
  check (total_cents = subtotal_cents - discount_cents + tax_cents)
);
create index on quotes (business_id, status);
create index on quotes (customer_id);

create table quote_items (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null,
  quote_id          uuid not null,
  description       text not null,
  quantity          numeric(10,2) not null check (quantity > 0),   -- heures, m², unités…
  unit_price_cents  int not null check (unit_price_cents >= 0),     -- HT
  tax_rate          numeric(5,2) not null default 20 check (tax_rate between 0 and 100),
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  foreign key (quote_id, business_id) references quotes (id, business_id) on delete cascade
);
create index on quote_items (quote_id);

-- ─── invoices / invoice_items ────────────────────────────────────────────
create table invoices (
  id                        uuid primary key default gen_random_uuid(),
  business_id               uuid not null references businesses on delete restrict,
  customer_id               uuid not null,
  order_id                  uuid,
  quote_id                  uuid,
  kind                      text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  credits_invoice_id        uuid,     -- pour un avoir : la facture qu'il corrige
  number                    text,     -- attribué à l'émission, séquentiel sans trou
  status                    text not null default 'draft'
                            check (status in ('draft', 'issued', 'partially_paid', 'paid')),
  issued_at                 timestamptz,
  due_date                  date,     -- « en retard » = due_date dépassée et non payée (calculé, pas stocké)
  sent_at                   timestamptz,
  viewed_at                 timestamptz,
  paid_at                   timestamptz,
  payment_method            text,
  stripe_payment_intent_id  text unique,
  seller                    jsonb,    -- identité légale du vendeur FIGÉE à l'émission (raison sociale, SIREN, adresse, n° TVA)
  buyer                     jsonb,    -- identité de l'acheteur FIGÉE à l'émission
  subtotal_cents            int not null default 0 check (subtotal_cents >= 0),   -- HT
  discount_cents            int not null default 0 check (discount_cents >= 0),   -- HT
  tax_cents                 int not null default 0 check (tax_cents >= 0),
  total_cents               int not null default 0 check (total_cents >= 0),      -- TTC
  amount_paid_cents         int not null default 0 check (amount_paid_cents >= 0),  -- acomptes
  currency                  text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  notes                     text,
  pdf_url                   text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  foreign key (customer_id, business_id) references customers (id, business_id) on delete restrict,
  foreign key (order_id,    business_id) references orders    (id, business_id) on delete restrict,
  foreign key (quote_id,    business_id) references quotes    (id, business_id) on delete restrict,
  unique (business_id, number),
  unique (id, business_id),
  check (total_cents = subtotal_cents - discount_cents + tax_cents),
  check ((kind = 'credit_note') = (credits_invoice_id is not null)),
  check (status = 'draft'
         or (number is not null and issued_at is not null and seller is not null and buyer is not null)),
  check (amount_paid_cents <= total_cents),
  check (status <> 'paid'           or amount_paid_cents = total_cents),
  check (status <> 'partially_paid' or amount_paid_cents between 1 and total_cents - 1)
);
alter table invoices add foreign key (credits_invoice_id, business_id)
  references invoices (id, business_id) on delete restrict;
create index on invoices (business_id, issued_at);
create index on invoices (customer_id);
create index on invoices (quote_id);

create table invoice_items (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null,
  invoice_id        uuid not null,
  description       text not null,
  quantity          numeric(10,2) not null check (quantity > 0),
  unit_price_cents  int not null check (unit_price_cents >= 0),     -- HT
  tax_rate          numeric(5,2) not null default 20 check (tax_rate between 0 and 100),
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  foreign key (invoice_id, business_id) references invoices (id, business_id) on delete cascade
);
create index on invoice_items (invoice_id);

-- Une facture émise est FIGÉE. Seules évolutions permises : le suivi
-- (envoi, consultation, PDF) et l'encaissement, dans un seul sens :
-- issued → partially_paid → paid. Toute correction passe par un avoir.
create or replace function guard_issued_invoice() returns trigger
language plpgsql as $$
declare
  free_cols text[] := array['status', 'amount_paid_cents', 'paid_at', 'payment_method',
                            'stripe_payment_intent_id', 'sent_at', 'viewed_at', 'pdf_url', 'updated_at'];
  rank constant jsonb := '{"issued": 1, "partially_paid": 2, "paid": 3}';
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Une facture émise ne se supprime pas : émettre un avoir'
        using errcode = '55000';
    end if;
    return old;
  end if;
  if old.status <> 'draft' and (
       (to_jsonb(new) - free_cols) <> (to_jsonb(old) - free_cols)
       or new.status = 'draft'
       or (rank ->> new.status)::int < (rank ->> old.status)::int
     ) then
    raise exception 'Une facture émise est figée : émettre un avoir pour la corriger'
      using errcode = '55000';
  end if;
  return new;
end $$;
create trigger invoices_guard before update or delete on invoices
  for each row execute function guard_issued_invoice();

create or replace function guard_issued_invoice_items() returns trigger
language plpgsql as $$
declare v_status text;
begin
  select status into v_status from invoices
   where id = coalesce(new.invoice_id, old.invoice_id);
  -- v_status null : la facture elle-même est en cours de suppression (brouillon)
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Les lignes d''une facture émise sont figées' using errcode = '55000';
  end if;
  return coalesce(new, old);
end $$;
create trigger invoice_items_guard before insert or update or delete on invoice_items
  for each row execute function guard_issued_invoice_items();

-- ─── document_sequences ──────────────────────────────────────────────────
-- Numérotation continue SANS TROU, par commerce, par type et par année.
-- Appelée dans la même transaction que la création du document : si elle
-- échoue, le compteur revient en arrière, donc aucun numéro n'est perdu.
create table document_sequences (
  business_id  uuid not null references businesses on delete cascade,
  kind         text not null check (kind in ('order', 'quote', 'invoice', 'credit_note')),
  year         smallint not null,
  last_number  int not null default 0 check (last_number >= 0),
  primary key (business_id, kind, year)
);

create or replace function next_document_number(p_business uuid, p_kind text) returns text
language plpgsql as $$
declare
  v_year   smallint := extract(year from now() at time zone
                         (select timezone from businesses where id = p_business));
  v_number int;
begin
  insert into document_sequences (business_id, kind, year, last_number)
  values (p_business, p_kind, v_year, 1)
  on conflict (business_id, kind, year)
    do update set last_number = document_sequences.last_number + 1
  returning last_number into v_number;

  return format('%s-%s-%s',
    case p_kind when 'order' then 'CMD' when 'quote' then 'DEV'
                when 'invoice' then 'FAC' when 'credit_note' then 'AV' end,
    v_year, lpad(v_number::text, 4, '0'));
end $$;

-- ─── customer_stats ──────────────────────────────────────────────────────
-- Remplace les compteurs stockés (total dépensé, visites, dernière visite) :
-- calculés à la demande, donc jamais faux. À matérialiser seulement si ça
-- devient lent. security_invoker : la vue respecte les droits du lecteur.
-- La fidélité (points) aura son propre journal de mouvements, avec son module.
create view customer_stats with (security_invoker = true) as
select
  c.id           as customer_id,
  c.business_id,
  (select count(*)::int from reservations r
    where r.customer_id = c.id and r.status = 'completed')          as visit_count,
  (select max(r.starts_at) from reservations r
    where r.customer_id = c.id and r.status = 'completed')          as last_visit_at,
  (select coalesce(sum(o.total_cents - o.refunded_cents), 0)::int from orders o
    where o.customer_id = c.id
      and o.payment_status in ('paid', 'partially_refunded'))       as total_spent_cents
from customers c;

-- ─── Déclencheurs et RLS ─────────────────────────────────────────────────
create trigger customers_updated_at      before update on customers      for each row execute function set_updated_at();
create trigger customer_notes_updated_at before update on customer_notes for each row execute function set_updated_at();
create trigger reservations_updated_at   before update on reservations   for each row execute function set_updated_at();
create trigger orders_updated_at         before update on orders         for each row execute function set_updated_at();
create trigger quotes_updated_at         before update on quotes         for each row execute function set_updated_at();
create trigger invoices_updated_at       before update on invoices       for each row execute function set_updated_at();

alter table customers          enable row level security;
alter table customer_notes     enable row level security;
alter table reservations       enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table quotes             enable row level security;
alter table quote_items        enable row level security;
alter table invoices           enable row level security;
alter table invoice_items      enable row level security;
alter table document_sequences enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 6 — Communication
--
--  Trois besoins distincts, trois ensembles de tables :
--    JOURNAL       outbound_messages — tout envoi AUTOMATIQUE (rappel,
--                  confirmation, facture, campagne). Répond à « le rappel
--                  est-il parti ? » et alimente les statistiques.
--    MESSAGERIE    conversations + conversation_messages — échanges avec un
--                  client, dans les DEUX sens (DM Instagram, WhatsApp, e-mail…).
--                  C'est aussi le service client.
--    SUPPORT       tickets + ticket_messages — un commerce écrit à SON agence,
--                  une agence écrit à la plateforme.
--
--  Aucun compteur stocké : les statistiques de campagne se calculent depuis
--  le journal (campaign_stats).
--  La BASE refuse d'enregistrer un envoi marketing vers une adresse
--  désabonnée : obligation légale, pas une règle que le code doit retenir.
--  Données personnelles (adresses, contenus) : purge après la durée de
--  conservation (13 mois, référence CNIL) — tâche planifiée, volet RGPD.
--  Politiques RLS : passe dédiée plus tard.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── campaigns ───────────────────────────────────────────────────────────
-- Campagnes marketing d'un commerce, par e-mail ou SMS.
-- Remplace email_campaigns (renommée : elle gère aussi les SMS).
create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null,
  agency_id     uuid not null,                 -- recopiée : l'expéditeur doit être de la même agence
  author_id     uuid references profiles on delete set null,
  channel       text not null default 'email' check (channel in ('email', 'sms')),
  name          text not null,                 -- nom interne
  subject       text,                          -- e-mail seulement
  preview_text  text,
  content       text not null,                 -- html / markdown (e-mail) ou texte (SMS)
  sender_id     uuid,                          -- null = expéditeur par défaut de l'agence
  audience      jsonb not null default '{}' check (jsonb_typeof(audience) = 'object'),  -- filtres : tags, dernière visite…
  status        text not null default 'draft'
                check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete restrict,
  foreign key (sender_id, agency_id) references agency_email_senders (id, agency_id) on delete set null (sender_id),
  unique (id, business_id),
  check (channel = 'sms' or subject is not null),
  check (status <> 'scheduled' or scheduled_at is not null)
);
create index on campaigns (business_id, status);

-- ─── communication_optouts ───────────────────────────────────────────────
-- Remplace email_unsubscribes (utilisée aujourd'hui par api/unsubscribe),
-- étendue aux autres canaux.
--   business_id rempli → désabonnement de CE commerce (la newsletter de FiFi
--                         n'empêche pas celle de Toscana)
--   business_id null   → blocage plateforme (adresse invalide, plainte pour spam)
--   scope 'marketing'  → plus de promotions, mais les rappels continuent
--   scope 'all'        → plus rien
create table communication_optouts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses on delete cascade,
  channel      text not null check (channel in ('email', 'sms', 'whatsapp')),
  address      text not null,                 -- e-mail en minuscules, ou téléphone
  scope        text not null default 'marketing' check (scope in ('marketing', 'all')),
  source       text not null
               check (source in ('unsubscribe_link', 'stop_sms', 'manual', 'bounce', 'complaint')),
  created_at   timestamptz not null default now(),
  check (channel <> 'email' or address = lower(address)),
  unique nulls not distinct (business_id, channel, address)
);
create index on communication_optouts (channel, address);

-- ─── outbound_messages — JOURNAL des envois automatiques ─────────────────
create table outbound_messages (
  id                   uuid primary key default gen_random_uuid(),
  agency_id            uuid not null references agencies on delete restrict,
  business_id          uuid,          -- null = message de l'agence (ex. invitation)
  channel              text not null check (channel in ('email', 'sms', 'whatsapp', 'push')),
  kind                 text not null check (kind in ('transactional', 'marketing')),
  template             text not null check (template ~ '^[a-z0-9_]+$'),  -- 'reservation_reminder', 'campaign'…
  to_address           text not null,  -- e-mail, téléphone ou jeton d'appareil
  subject              text,
  content              text,          -- message individuel seulement ; une campagne n'est pas recopiée
  -- Ce qui a déclenché l'envoi (un seul, au plus)
  customer_id          uuid,
  reservation_id       uuid,
  order_id             uuid,
  quote_id             uuid,
  invoice_id           uuid,
  campaign_id          uuid,
  provider             text not null default 'resend',   -- 'resend', 'twilio', 'meta'…
  provider_message_id  text unique,
  status               text not null default 'queued'
                       check (status in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'read',
                                         'bounced', 'failed', 'complained')),
  error                text,
  idempotency_key      text unique,   -- un même rappel n'est jamais envoyé deux fois
  sent_at              timestamptz,
  delivered_at         timestamptz,
  opened_at            timestamptz,
  clicked_at           timestamptz,
  failed_at            timestamptz,
  created_at           timestamptz not null default now(),
  foreign key (business_id, agency_id)      references businesses   (id, agency_id),
  foreign key (customer_id, business_id)    references customers    (id, business_id) on delete set null (customer_id),
  foreign key (reservation_id, business_id) references reservations (id, business_id) on delete set null (reservation_id),
  foreign key (order_id, business_id)       references orders       (id, business_id) on delete set null (order_id),
  foreign key (quote_id, business_id)       references quotes       (id, business_id) on delete set null (quote_id),
  foreign key (invoice_id, business_id)     references invoices     (id, business_id) on delete set null (invoice_id),
  foreign key (campaign_id, business_id)    references campaigns    (id, business_id) on delete set null (campaign_id),
  check (num_nonnulls(reservation_id, order_id, quote_id, invoice_id, campaign_id) <= 1),
  check (channel <> 'email' or to_address = lower(to_address)),
  check (kind = 'transactional' or business_id is not null),   -- le marketing est toujours celui d'un commerce
  check (campaign_id is null or content is null)               -- pas de copie d'une campagne par destinataire
);
create index on outbound_messages (business_id, created_at);
create index on outbound_messages (campaign_id) where campaign_id is not null;
create index on outbound_messages (reservation_id) where reservation_id is not null;
create index on outbound_messages (to_address);

-- La base refuse tout envoi MARKETING vers une adresse désabonnée (de ce
-- commerce, ou bloquée par la plateforme), et tout envoi vers une adresse
-- bloquée « all » (invalide, plainte pour spam).
create or replace function guard_optout() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from communication_optouts o
     where o.channel = new.channel and o.address = new.to_address
       and (o.business_id is null or o.business_id = new.business_id)
       and (o.scope = 'all' or new.kind = 'marketing')
  ) then
    raise exception 'Destinataire désabonné : envoi refusé (%, %)', new.channel, new.to_address
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger outbound_messages_optout before insert on outbound_messages
  for each row execute function guard_optout();

-- Statistiques d'une campagne, calculées depuis le journal (jamais fausses)
create view campaign_stats with (security_invoker = true) as
select
  c.id as campaign_id,
  c.business_id,
  count(m.id)::int                                                             as recipients,
  count(*) filter (where m.status in ('delivered', 'opened', 'clicked', 'read'))::int as delivered,
  count(*) filter (where m.status in ('opened', 'clicked', 'read'))::int       as opened,
  count(*) filter (where m.status = 'clicked')::int                            as clicked,
  count(*) filter (where m.status in ('bounced', 'failed', 'complained'))::int as failed
from campaigns c
left join outbound_messages m on m.campaign_id = c.id
group by c.id, c.business_id;

-- ─── conversations / conversation_messages — MESSAGERIE client ───────────
-- Une conversation = un fil avec un client sur un canal. Elle a son propre
-- état (assignation, statut, dernier message) : c'est aussi le service client.
create table conversations (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses on delete restrict,
  customer_id         uuid,          -- null tant que le contact n'est pas rattaché à une fiche
  channel             text not null
                      check (channel in ('email', 'sms', 'whatsapp', 'instagram', 'webchat')),
  contact_handle      text not null, -- @compte Instagram, téléphone, e-mail…
  external_thread_id  text,          -- identifiant du fil chez Meta / le fournisseur
  subject             text,
  status              text not null default 'open'
                      check (status in ('open', 'pending', 'resolved', 'closed')),
  assigned_to         uuid references profiles on delete set null,
  last_message_at     timestamptz,   -- tenu à jour par déclencheur
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (customer_id, business_id) references customers (id, business_id) on delete set null (customer_id),
  unique (id, business_id)
);
create unique index on conversations (business_id, channel, external_thread_id)
  where external_thread_id is not null;
create index on conversations (business_id, status, last_message_at desc);
create index on conversations (assigned_to) where assigned_to is not null;

-- Messages reçus ET envoyés, dans la même table : une conversation s'affiche
-- dans l'ordre, sans fusion.
create table conversation_messages (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null,
  conversation_id      uuid not null,
  direction            text not null check (direction in ('inbound', 'outbound')),
  author_id            uuid references profiles on delete set null,  -- qui a répondu (sortant)
  content              text not null,
  attachments          jsonb not null default '[]' check (jsonb_typeof(attachments) = 'array'),
  is_ai_generated      boolean not null default false,
  status               text not null
                       check (status in ('received', 'pending', 'sent', 'delivered', 'read', 'failed')),
  provider             text,
  provider_message_id  text,
  external_id          text,          -- identifiant chez Meta / le fournisseur (dédoublonnage des webhooks)
  error                text,
  sent_at              timestamptz,
  delivered_at         timestamptz,
  read_at              timestamptz,
  failed_at            timestamptz,
  created_at           timestamptz not null default now(),
  foreign key (conversation_id, business_id) references conversations (id, business_id) on delete cascade,
  unique (conversation_id, external_id),
  -- un message reçu vient du client : ni auteur interne, ni statut d'envoi
  check ((direction = 'inbound') = (status = 'received')),
  check (direction = 'outbound' or author_id is null)
);
create index on conversation_messages (conversation_id, created_at);

create or replace function touch_conversation() returns trigger
language plpgsql as $$
begin
  update conversations
     set last_message_at = greatest(coalesce(last_message_at, new.created_at), new.created_at),
         -- un nouveau message du client rouvre une conversation résolue
         status = case when new.direction = 'inbound' and status in ('resolved', 'closed')
                       then 'open' else status end
   where id = new.conversation_id;
  return new;
end $$;
create trigger conversation_messages_touch after insert on conversation_messages
  for each row execute function touch_conversation();

-- ─── tickets / ticket_messages — SUPPORT ─────────────────────────────────
-- Un commerce écrit à SON agence ; l'agence transmet à la plateforme
-- (level = 'platform') ou lui écrit directement.
-- Reprend les tickets actuels (admin/messages, api/admin/tickets).
create table tickets (
  id               uuid primary key default gen_random_uuid(),
  agency_id        uuid not null references agencies on delete restrict,
  business_id      uuid,              -- null = ticket de l'agence elle-même
  level            text not null default 'agency' check (level in ('agency', 'platform')),
  subject          text not null,
  category         text,
  status           text not null default 'open'
                   check (status in ('open', 'pending', 'resolved', 'closed')),
  priority         text not null default 'normal'
                   check (priority in ('low', 'normal', 'high', 'urgent')),
  opened_by        uuid references profiles on delete set null,
  assigned_to      uuid references profiles on delete set null,
  last_message_at  timestamptz,
  resolved_at      timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id),
  check (business_id is not null or level = 'platform')   -- une agence écrit à la plateforme
);
create index on tickets (agency_id, status);
create index on tickets (business_id);
create index on tickets (level, status) where level = 'platform';

create table ticket_messages (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        uuid not null references tickets on delete cascade,
  author_id        uuid references profiles on delete set null,
  body             text not null,
  is_internal      boolean not null default false,  -- note interne : invisible pour le demandeur
  is_ai_generated  boolean not null default false,
  attachments      jsonb not null default '[]' check (jsonb_typeof(attachments) = 'array'),
  created_at       timestamptz not null default now()
);
create index on ticket_messages (ticket_id, created_at);

-- ─── Déclencheurs et RLS ─────────────────────────────────────────────────
create trigger campaigns_updated_at     before update on campaigns     for each row execute function set_updated_at();
create trigger conversations_updated_at before update on conversations for each row execute function set_updated_at();
create trigger tickets_updated_at       before update on tickets       for each row execute function set_updated_at();

alter table campaigns             enable row level security;
alter table communication_optouts enable row level security;
alter table outbound_messages     enable row level security;
alter table conversations         enable row level security;
alter table conversation_messages enable row level security;
alter table tickets               enable row level security;
alter table ticket_messages       enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 7 — Espace agence
--
--  Les outils de l'agence elle-même, et non de ses commerces : pipeline
--  commerciale, portfolio, tâches, dépenses. Tout est rattaché à agency_id.
--  C'est ce qui transforme tes outils internes en fonctionnalités du produit :
--  chaque agence dispose du même espace.
--  Politiques RLS : passe dédiée plus tard.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── prospects ───────────────────────────────────────────────────────────
-- Pipeline commerciale (existante, rattachée à l'agence).
-- Le site VWA s'en sert déjà pour les aperçus envoyés aux prospects
-- (app/preview/getProspect, api/preview-opened) : d'où preview_slug.
create table prospects (
  id                     uuid primary key default gen_random_uuid(),
  agency_id              uuid not null references agencies on delete cascade,
  business_name          text not null,
  contact_name           text,
  email                  text check (email = lower(email)),
  phone                  text,
  website                text,
  city                   text,
  business_type_id       uuid references business_types on delete set null,
  source                 text not null default 'manual'
                         check (source in ('manual', 'inbound', 'referral', 'google_maps',
                                           'instagram', 'event', 'import')),
  status                 text not null default 'nouveau'
                         check (status in ('nouveau', 'contacte', 'en_discussion', 'signe', 'perdu')),
  lost_reason            text,
  estimated_value_cents  int check (estimated_value_cents >= 0),
  currency               text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  assigned_to            uuid references profiles on delete set null,
  next_action_at         timestamptz,          -- prochaine relance prévue
  -- Aperçu de site envoyé au prospect
  preview_slug           text check (preview_slug ~ '^[a-z0-9-]+$'),
  preview_sent_at        timestamptz,
  -- Client signé : le prospect devient un commerce de l'agence
  converted_business_id  uuid,
  converted_at           timestamptz,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (converted_business_id, agency_id) references businesses (id, agency_id) on delete set null (converted_business_id),
  unique (id, agency_id),
  unique (preview_slug),
  check (status <> 'perdu' or lost_reason is not null),
  check ((status = 'signe') = (converted_at is not null))
);
create index on prospects (agency_id, status);
create index on prospects (agency_id, next_action_at) where next_action_at is not null;
create index on prospects (assigned_to) where assigned_to is not null;

-- Historique d'un prospect : appels, e-mails, rendez-vous, ouvertures de
-- l'aperçu. Remplace les compteurs (« aperçu ouvert 3 fois » = 3 lignes).
create table prospect_activities (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null,
  prospect_id  uuid not null,
  kind         text not null
               check (kind in ('note', 'call', 'email', 'meeting', 'quote_sent',
                               'preview_sent', 'preview_opened', 'status_change')),
  content      text,
  author_id    uuid references profiles on delete set null,   -- null = automatique
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  foreign key (prospect_id, agency_id) references prospects (id, agency_id) on delete cascade
);
create index on prospect_activities (prospect_id, occurred_at desc);

-- ─── tasks ───────────────────────────────────────────────────────────────
-- Le manque relevé dans ton back-office : aucune gestion de tâches n'existe
-- aujourd'hui. Une tâche se rattache au plus à UN sujet : un prospect
-- (relancer) ou un commerce (livrer le site).
create table tasks (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies on delete cascade,
  business_id   uuid,
  prospect_id   uuid,
  title         text not null,
  description   text,
  status        text not null default 'todo'
                check (status in ('todo', 'doing', 'blocked', 'done', 'cancelled')),
  priority      text not null default 'normal'
                check (priority in ('low', 'normal', 'high', 'urgent')),
  labels        text[] not null default '{}',
  due_at        timestamptz,
  done_at       timestamptz,
  assigned_to   uuid references profiles on delete set null,
  created_by    uuid references profiles on delete set null,
  position      int not null default 0,        -- ordre dans une colonne
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete cascade,
  foreign key (prospect_id, agency_id) references prospects  (id, agency_id) on delete cascade,
  check (num_nonnulls(business_id, prospect_id) <= 1),
  check ((status = 'done') = (done_at is not null))
);
create index on tasks (agency_id, status, due_at);
create index on tasks (assigned_to, status) where assigned_to is not null;
create index on tasks (business_id) where business_id is not null;
create index on tasks (prospect_id) where prospect_id is not null;

-- ─── agency_portfolio_items ──────────────────────────────────────────────
-- Réalisations de l'agence, affichées sur SON site (ex-portfolio_projects,
-- lue par le site VWA). À ne pas confondre avec `projects`, qui sont les
-- réalisations d'un commerce sur son propre site.
create table agency_portfolio_items (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies on delete cascade,
  business_id   uuid,                          -- si le client est un commerce de la plateforme
  title         text not null,
  slug          text not null check (slug ~ '^[a-z0-9-]+$'),
  client_name   text,                          -- si le client n'est pas sur la plateforme
  description   text,
  cover_url     text,
  images        jsonb not null default '[]' check (jsonb_typeof(images) = 'array'),
  site_url      text,
  tags          text[] not null default '{}',
  status        text not null default 'draft'
                check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete set null (business_id),
  unique (agency_id, slug)
);
create index on agency_portfolio_items (agency_id, status);

-- ─── expenses ────────────────────────────────────────────────────────────
-- Dépenses de l'agence (ex-depenses). business_id permet d'imputer une
-- dépense à un client (nom de domaine, licence…).
create table expenses (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references agencies on delete cascade,
  business_id     uuid,
  label           text not null,
  category        text,                        -- 'hébergement', 'logiciel', 'sous-traitance'…
  supplier        text,
  amount_cents    int not null check (amount_cents > 0),   -- TTC
  tax_cents       int not null default 0 check (tax_cents >= 0),   -- dont TVA
  currency        text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  spent_on        date not null default current_date,
  recurrence      text not null default 'none'
                  check (recurrence in ('none', 'monthly', 'yearly')),
  payment_method  text,
  receipt_url     text,
  notes           text,
  created_by      uuid references profiles on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (business_id, agency_id) references businesses (id, agency_id) on delete set null (business_id),
  check (tax_cents <= amount_cents)
);
create index on expenses (agency_id, spent_on);
create index on expenses (business_id) where business_id is not null;

-- ─── Déclencheurs et RLS ─────────────────────────────────────────────────
create trigger prospects_updated_at              before update on prospects              for each row execute function set_updated_at();
create trigger tasks_updated_at                  before update on tasks                  for each row execute function set_updated_at();
create trigger agency_portfolio_items_updated_at before update on agency_portfolio_items for each row execute function set_updated_at();
create trigger expenses_updated_at               before update on expenses               for each row execute function set_updated_at();

alter table prospects              enable row level security;
alter table prospect_activities    enable row level security;
alter table tasks                  enable row level security;
alter table agency_portfolio_items enable row level security;
alter table expenses               enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 8 — Équipe & planning
--
--  employees existe déjà (domaine 4, pour l'affichage sur le site) : on y
--  ajoute ici les colonnes RH et le planning.
--  ⚠️ Données RH sensibles (contrat, coût horaire) : table employee_hr à
--  part, réservée aux owner / administrator du commerce — première fois
--  où « membre du commerce » ne suffit pas.
--  La base garantit qu'un salarié n'a jamais deux créneaux qui se
--  chevauchent (contrainte d'exclusion, pas une vérification dans le code).
-- ═════════════════════════════════════════════════════════════════════════

-- Nécessaire à la contrainte d'exclusion (comparer un uuid ET une plage).
-- Sur Supabase, l'extension est installée dans le schéma `extensions`.
create extension if not exists btree_gist;

-- ─── employees : couleur de planning ─────────────────────────────────────
alter table employees
  add column planning_color text check (planning_color ~ '^#[0-9a-fA-F]{6}$');

-- ─── employee_hr ─────────────────────────────────────────────────────────
-- Contrat et rémunération dans une table SÉPARÉE, et non en colonnes de
-- employees : le RLS protège des lignes, pas des colonnes. Une table à part
-- se réserve aux owner / administrator sans piéger le moindre `select *`,
-- et sans exiger que chaque requête liste ses colonnes.
create table employee_hr (
  employee_id             uuid primary key,
  business_id             uuid not null,
  employment_type         text check (employment_type in
                            ('cdi', 'cdd', 'apprentissage', 'freelance', 'extra', 'autre')),
  contract_hours_per_week numeric(5,2) check (contract_hours_per_week between 0 and 60),
  hourly_cost_cents       int check (hourly_cost_cents >= 0),
  hired_on                date,
  ended_on                date,
  note                    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  foreign key (employee_id, business_id) references employees (id, business_id) on delete cascade,
  check (ended_on is null or hired_on is null or ended_on >= hired_on)
);
create index on employee_hr (business_id);
create trigger employee_hr_updated_at before update on employee_hr
  for each row execute function set_updated_at();
alter table employee_hr enable row level security;

-- ─── employee_services ───────────────────────────────────────────────────
-- Qui sait faire quoi : sert à proposer les bons salariés à la réservation
-- d'une prestation (coiffeur, coach…).
create table employee_services (
  business_id  uuid not null,
  employee_id  uuid not null,
  service_id   uuid not null,
  created_at   timestamptz not null default now(),
  primary key (employee_id, service_id),
  foreign key (employee_id, business_id) references employees (id, business_id) on delete cascade,
  foreign key (service_id,  business_id) references services  (id, business_id) on delete cascade
);
create index on employee_services (service_id);

-- ─── shifts ──────────────────────────────────────────────────────────────
-- Créneaux de travail. L'assistance par IA proposera des créneaux à partir
-- des réservations à venir et des horaires d'ouverture : d'où is_ai_generated,
-- et le statut 'draft' tant que le gérant n'a pas publié le planning.
create table shifts (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null,
  employee_id      uuid not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  break_minutes    int not null default 0 check (break_minutes >= 0),
  role_label       text,                          -- « service du soir », « caisse »
  status           text not null default 'draft'
                   check (status in ('draft', 'published', 'cancelled')),
  is_ai_generated  boolean not null default false,
  note             text,
  published_at     timestamptz,
  created_by       uuid references profiles on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (employee_id, business_id) references employees (id, business_id) on delete cascade,
  check (ends_at > starts_at),
  check (break_minutes < extract(epoch from (ends_at - starts_at)) / 60),
  -- un salarié ne peut pas être à deux endroits à la fois
  exclude using gist (
    employee_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);
create index on shifts (business_id, starts_at);
create index on shifts (employee_id, starts_at);

-- ─── employee_availabilities ─────────────────────────────────────────────
-- Disponibilités récurrentes déclarées par le salarié (ou saisies pour lui).
create table employee_availabilities (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null,
  employee_id     uuid not null,
  weekday         smallint not null check (weekday between 1 and 7),   -- 1 = lundi
  starts_time     time not null,
  ends_time       time not null,
  kind            text not null default 'available'
                  check (kind in ('available', 'preferred', 'unavailable')),
  effective_from  date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (employee_id, business_id) references employees (id, business_id) on delete cascade,
  check (ends_time > starts_time),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);
create index on employee_availabilities (employee_id, weekday);

-- ─── employee_absences ───────────────────────────────────────────────────
-- Congés, maladie, formation. Demandé par le salarié, validé par le gérant.
create table employee_absences (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null,
  employee_id  uuid not null,
  starts_on    date not null,
  ends_on      date not null,
  kind         text not null check (kind in ('conges', 'maladie', 'formation', 'sans_solde', 'autre')),
  status       text not null default 'requested'
               check (status in ('requested', 'approved', 'refused', 'cancelled')),
  note         text,
  requested_by uuid references profiles on delete set null,
  decided_by   uuid references profiles on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (employee_id, business_id) references employees (id, business_id) on delete cascade,
  check (ends_on >= starts_on),
  check (status in ('requested', 'cancelled') = (decided_at is null))
);
create index on employee_absences (business_id, starts_on);
create index on employee_absences (employee_id, starts_on);

-- ─── Déclencheurs et RLS ─────────────────────────────────────────────────
create trigger shifts_updated_at                  before update on shifts                  for each row execute function set_updated_at();
create trigger employee_availabilities_updated_at before update on employee_availabilities for each row execute function set_updated_at();
create trigger employee_absences_updated_at       before update on employee_absences       for each row execute function set_updated_at();

alter table employee_services       enable row level security;
alter table shifts                  enable row level security;
alter table employee_availabilities enable row level security;
alter table employee_absences       enable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  DOMAINE 9 — Mesure & traçabilité
--
--  sessions garde EXACTEMENT les colonnes qu'écrit le tracker aujourd'hui
--  (VWA-Utils/tracker) : il continuera de fonctionner sans modification.
--  Ce qui change : la clé étrangère vers businesses, absente aujourd'hui,
--  qui laisse s'accumuler des visites orphelines.
--
--  RGPD : aucune adresse IP n'est stockée, visitor_id est un identifiant
--  pseudonyme. Conservation 13 mois (référence CNIL), puis purge — c'est
--  l'une des conditions qui dispensent de bandeau de consentement.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── sessions ────────────────────────────────────────────────────────────
create table sessions (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses on delete cascade,
  session_id        text not null unique,        -- identifiant de visite, généré côté navigateur
  visitor_id        text,                        -- identifiant pseudonyme, pour distinguer nouveaux et revenants
  referrer          text,
  pages             text[] not null default '{}',
  page_count        int not null default 1 check (page_count > 0),
  duration_seconds  int check (duration_seconds >= 0),
  screen_width      int check (screen_width > 0),
  user_agent        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on sessions (business_id, created_at);
create index on sessions (business_id, visitor_id);

-- ─── audit_log ───────────────────────────────────────────────────────────
-- Qui a fait quoi : changement de plan, archivage d'un commerce, rôle
-- modifié, facture émise… Indispensable dès qu'une plateforme héberge
-- plusieurs agences : « qui a supprimé ça ? » doit avoir une réponse.
-- Ajout seul : jamais modifié, jamais supprimé.
create table audit_log (
  id            bigint generated always as identity primary key,
  agency_id     uuid references agencies on delete set null,
  business_id   uuid references businesses on delete set null,
  actor_id      uuid references profiles on delete set null,   -- null = automatique (cron, webhook)
  action        text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),  -- 'business.archived', 'membership.role_changed'
  entity_table  text not null,
  entity_id     text,
  changes       jsonb not null default '{}' check (jsonb_typeof(changes) = 'object'),  -- {"avant": …, "apres": …}
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index on audit_log (agency_id, created_at desc);
create index on audit_log (business_id, created_at desc);
create index on audit_log (entity_table, entity_id);

create trigger sessions_updated_at before update on sessions for each row execute function set_updated_at();

alter table sessions  enable row level security;
alter table audit_log enable row level security;


-- ═══════════════════════════════════════════════════════════════════════
-- Disparaissent : users, team_members, add_ons, portfolio (inutilisée), blog,
-- crm_clients, stripe_subscriptions, depenses, portfolio_projects, people_projects.


-- ═════════════════════════════════════════════════════════════════════════
--  POLITIQUES RLS — domaines 3 à 9
--
--  Trois modèles seulement, réutilisés partout :
--    A. donnée d'un COMMERCE   business_id in (select accessible_business_ids(rôle))
--    B. donnée d'une AGENCE    agency_id   in (select accessible_agency_ids(rôle))
--    C. catalogue PLATEFORME   lecture pour tout connecté, écriture plateforme
--
--  Niveaux : viewer lit · member fait le travail courant · administrator
--  configure · owner engage (facturation, archivage).
--  `in (select …)` et non un appel par ligne : Postgres évalue la liste une
--  seule fois par requête.
--  Aucune politique d'écriture = réservé au serveur (clé service role) :
--  usage_events, outbound_messages, sessions, audit_log, document_sequences.
--  Les sites publics n'ont AUCUNE politique : ils passeront par des fonctions.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── Domaine 3 — Offre & droits ──────────────────────────────────────────
-- Catalogue : visible de tous les connectés (une agence doit voir ce qu'elle
-- peut proposer), modifiable par la plateforme seule.
create policy lecture on modules for select to authenticated using (true);
create policy plateforme on modules for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

create policy lecture on business_type_modules for select to authenticated using (true);
create policy plateforme on business_type_modules for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

create policy lecture on agency_plans for select to authenticated using (true);
create policy plateforme on agency_plans for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

create policy lecture on agency_plan_modules for select to authenticated using (true);
create policy plateforme on agency_plan_modules for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- Plans : ceux de la plateforme (agency_id null) sont visibles de tous ;
-- ceux d'une agence, d'elle seule. Une agence gère SES plans.
create policy lecture on plans for select to authenticated
  using (agency_id is null or agency_id in (select visible_agency_ids()));
create policy agence on plans for all to authenticated
  using      (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));
create policy plateforme on plans for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- Contenu d'un plan : visible si le plan l'est (la sous-requête applique
-- déjà la politique de `plans`).
create policy lecture on plan_modules for select to authenticated
  using (plan_id in (select id from plans));
create policy agence on plan_modules for all to authenticated
  using      (plan_id in (select id from plans where agency_id in (select accessible_agency_ids('administrator'))))
  with check (plan_id in (select id from plans where agency_id in (select accessible_agency_ids('administrator'))));
create policy plateforme on plan_modules for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

create policy lecture on plan_quotas for select to authenticated
  using (plan_id in (select id from plans));
create policy plateforme on plan_quotas for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- Abonnement de l'agence à la plateforme : elle le lit, la plateforme le gère.
create policy lecture on agency_subscriptions for select to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')));
create policy plateforme on agency_subscriptions for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- Plan et options d'un commerce : le commerce les voit, l'AGENCE les décide
-- (c'est elle qui vend, pas son client).
create policy lecture on business_plans for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy agence on business_plans for all to authenticated
  using      (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));

create policy lecture on business_addons for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy agence on business_addons for all to authenticated
  using      (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));

-- Activation et réglages : c'est le commerce qui décide de s'en servir.
create policy lecture on business_module_settings for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy configuration on business_module_settings for all to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- Consommation : lecture seule. Seul le serveur écrit (clé service role).
create policy lecture on usage_events for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

-- ─── Domaine 4 — Contenu public des sites ────────────────────────────────
-- Lecture dès viewer, écriture dès member : publier un article ou changer un
-- prix fait partie du travail courant.
create policy lecture on services for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on services for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on products for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on products for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on product_variants for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on product_variants for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on talents for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on talents for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on projects for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on projects for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on project_talents for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on project_talents for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on blog_posts for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on blog_posts for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on menu_sections for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on menu_sections for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on menu_items for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on menu_items for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Avis : modérer et répondre relève du quotidien, mais on ne SUPPRIME pas
-- un avis (on le masque) — d'où insert/update seulement, pas de delete.
create policy lecture on reviews for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy moderation on reviews for update to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));
create policy ajout on reviews for insert to authenticated
  with check (business_id in (select accessible_business_ids('member')));

-- ─── Domaine 5 — Activité des commerces ──────────────────────────────────
create policy lecture on customers for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on customers for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on customer_notes for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on customer_notes for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on reservations for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on reservations for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Commandes : on annule, on ne supprime pas. Pas de politique de delete.
create policy lecture on orders for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ajout on orders for insert to authenticated
  with check (business_id in (select accessible_business_ids('member')));
create policy modification on orders for update to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on order_items for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ajout on order_items for insert to authenticated
  with check (business_id in (select accessible_business_ids('member')));
create policy modification on order_items for update to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on quotes for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on quotes for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on quote_items for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on quote_items for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Factures : écriture réservée à administrator (c'est un engagement légal).
-- Pas de delete : le déclencheur guard_issued_invoice bloque déjà les
-- factures émises, et on ne supprime pas une facture depuis l'application.
create policy lecture on invoices for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ajout on invoices for insert to authenticated
  with check (business_id in (select accessible_business_ids('administrator')));
create policy modification on invoices for update to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

create policy lecture on invoice_items for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on invoice_items for all to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- ─── Domaine 6 — Communication ───────────────────────────────────────────
create policy lecture on campaigns for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on campaigns for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Désabonnements : un commerce voit et gère les siens ; ceux de la
-- plateforme (business_id null : adresses invalides, plaintes) lui échappent.
create policy lecture on communication_optouts for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on communication_optouts for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Journal des envois : lecture seule, le serveur écrit.
create policy lecture on outbound_messages for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

create policy lecture on conversations for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on conversations for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on conversation_messages for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on conversation_messages for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Support : un commerce voit ses tickets ; l'agence voit les siens et ceux
-- de ses commerces ; la plateforme voit ceux qui lui sont adressés.
create policy lecture on tickets for select to authenticated
  using (
    business_id in (select accessible_business_ids('viewer'))
    or agency_id in (select accessible_agency_ids('viewer'))
    or (level = 'platform' and is_platform_admin())
  );
create policy ecriture on tickets for all to authenticated
  using (
    business_id in (select accessible_business_ids('member'))
    or agency_id in (select accessible_agency_ids('member'))
    or (level = 'platform' and is_platform_admin())
  )
  with check (
    business_id in (select accessible_business_ids('member'))
    or agency_id in (select accessible_agency_ids('member'))
    or (level = 'platform' and is_platform_admin())
  );

-- Messages d'un ticket : visibles si le ticket l'est. Les notes internes
-- restent réservées à l'agence et à la plateforme.
create policy lecture on ticket_messages for select to authenticated
  using (
    ticket_id in (select id from tickets)
    and (not is_internal
         or (select agency_id from tickets t where t.id = ticket_id) in (select accessible_agency_ids('viewer'))
         or is_platform_admin())
  );
create policy ecriture on ticket_messages for insert to authenticated
  with check (ticket_id in (select id from tickets));

-- ─── Domaine 7 — Espace agence ───────────────────────────────────────────
create policy lecture on prospects for select to authenticated
  using (agency_id in (select accessible_agency_ids('viewer')));
create policy ecriture on prospects for all to authenticated
  using      (agency_id in (select accessible_agency_ids('member')))
  with check (agency_id in (select accessible_agency_ids('member')));

create policy lecture on prospect_activities for select to authenticated
  using (agency_id in (select accessible_agency_ids('viewer')));
create policy ecriture on prospect_activities for all to authenticated
  using      (agency_id in (select accessible_agency_ids('member')))
  with check (agency_id in (select accessible_agency_ids('member')));

create policy lecture on tasks for select to authenticated
  using (agency_id in (select accessible_agency_ids('viewer')));
create policy ecriture on tasks for all to authenticated
  using      (agency_id in (select accessible_agency_ids('member')))
  with check (agency_id in (select accessible_agency_ids('member')));

create policy lecture on agency_portfolio_items for select to authenticated
  using (agency_id in (select accessible_agency_ids('viewer')));
create policy ecriture on agency_portfolio_items for all to authenticated
  using      (agency_id in (select accessible_agency_ids('member')))
  with check (agency_id in (select accessible_agency_ids('member')));

-- Dépenses : donnée financière, réservée à administrator.
create policy lecture on expenses for select to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')));
create policy ecriture on expenses for all to authenticated
  using      (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));

-- ─── Domaine 8 — Équipe & planning ───────────────────────────────────────
-- La fiche d'un salarié se lit dès viewer (elle alimente aussi le site) ;
-- la gérer relève de l'administrateur, comme l'embauche.
create policy lecture on employees for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on employees for all to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

create policy lecture on employee_services for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on employee_services for all to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- Le planning se lit dès viewer et s'organise dès member.
create policy lecture on shifts for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on shifts for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on employee_availabilities for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on employee_availabilities for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on employee_absences for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on employee_absences for all to authenticated
  using      (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Contrats et rémunérations : owner / administrator du commerce UNIQUEMENT.
-- Un serveur connecté au dashboard ne voit pas le coût horaire de l'équipe.
create policy direction on employee_hr for all to authenticated
  using      (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- ─── Domaine 9 — Mesure & traçabilité ────────────────────────────────────
-- Visites : lecture seule (le tracker écrit avec la clé service role).
create policy lecture on sessions for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

-- Journal d'audit : consultable par l'agence concernée, jamais modifiable.
create policy lecture on audit_log for select to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')) or is_platform_admin());
