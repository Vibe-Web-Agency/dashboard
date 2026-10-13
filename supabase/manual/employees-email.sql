-- Adresse email des membres de l'équipe, pour leur envoyer le planning (CLAUDE.md 9.12). À rejouer en production.
--
-- Un visiteur anonyme lit les personnes affichées sur le site (politique employees_public_widget_select).
-- Il avait le droit SELECT sur toute la table : une nouvelle colonne lui aurait été lisible d'office.
-- Il ne lit donc plus que les colonnes de vitrine ; `email` et `profile_id` lui sont fermées.
-- Conséquence : un `select *` anonyme sur employees échoue (42501), comme sur businesses. Un site doit nommer ses colonnes.

alter table public.employees add column if not exists email text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'employees_email_lower') then
    alter table public.employees add constraint employees_email_lower check (email is null or email = lower(email));
  end if;
end $$;

revoke select on public.employees from anon;
grant select (id, business_id, first_name, last_name, job_title, bio, avatar_url, show_on_site, is_active, position, planning_color, created_at, updated_at)
  on public.employees to anon;
