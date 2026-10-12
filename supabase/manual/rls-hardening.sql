-- Durcissement RLS du 2026-10-12 : applique la liste de supabase/manual/RLS-A-CORRIGER.md.
-- À rejouer sur chaque base V2, dont la production. Retour arrière : rls-hardening-rollback.sql.
--
-- Rappel : les politiques permissives se cumulent. Les politiques `*_member_manage` / `*_agency_manage`,
-- fondées sur has_business_access / has_agency_access (toute membership active de l'agence, quel que soit
-- le rôle), annulaient les seuils des politiques d'origine (`lecture`, `ecriture`…).

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Écriture ouverte à tout membre : suppression des 41 politiques
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists agency_domains_agency_manage on agency_domains;
drop policy if exists agency_email_senders_agency_manage on agency_email_senders;
drop policy if exists blog_posts_member_manage on blog_posts;
drop policy if exists baddons_member_manage on business_addons;
drop policy if exists closures_member_manage on business_closures;
drop policy if exists hours_member_manage on business_hours;
drop policy if exists bkb_member_manage on business_knowledge_base;
drop policy if exists bms_member_manage on business_module_settings;
drop policy if exists bplans_member_manage on business_plans;
drop policy if exists campaigns_member_manage on campaigns;
drop policy if exists conv_messages_member_manage on conversation_messages;
drop policy if exists conversations_member_manage on conversations;
drop policy if exists customer_notes_member_manage on customer_notes;
drop policy if exists customers_member_manage on customers;
drop policy if exists doc_sequences_member_manage on document_sequences;
drop policy if exists employee_absences_business_manage on employee_absences;
drop policy if exists employee_availabilities_business_manage on employee_availabilities;
drop policy if exists employee_hr_business_manage on employee_hr;
drop policy if exists emp_services_member_manage on employee_services;
drop policy if exists employees_member_manage on employees;
drop policy if exists expenses_agency_manage on expenses;
drop policy if exists invitations_agency_manage on invitations;
drop policy if exists invoice_items_member_manage on invoice_items;
drop policy if exists invoices_member_manage on invoices;
drop policy if exists menu_items_member_manage on menu_items;
drop policy if exists menu_sections_member_manage on menu_sections;
drop policy if exists order_items_member_manage on order_items;
drop policy if exists orders_member_manage on orders;
drop policy if exists variants_member_manage on product_variants;
drop policy if exists products_member_manage on products;
drop policy if exists project_talents_member_manage on project_talents;
drop policy if exists projects_member_manage on projects;
drop policy if exists prospect_activities_agency_manage on prospect_activities;
drop policy if exists prospects_agency_manage on prospects;
drop policy if exists reservations_member_manage on reservations;
drop policy if exists reviews_member_manage on reviews;
drop policy if exists services_member_manage on services;
drop policy if exists shifts_business_manage on shifts;
drop policy if exists talents_member_manage on talents;
drop policy if exists ticket_messages_member_manage on ticket_messages;
drop policy if exists tickets_member_manage on tickets;

-- Tables qui n'avaient que la politique ouverte : politiques à seuil, sur le modèle des politiques d'origine.
-- Configuration d'agence : administrateur de niveau agence.
create policy lecture on agency_domains for select to authenticated
  using (agency_id in (select accessible_agency_ids('viewer')));
create policy ecriture on agency_domains for all to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));

create policy lecture on agency_email_senders for select to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')));
create policy ecriture on agency_email_senders for all to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')))
  with check (agency_id in (select accessible_agency_ids('administrator')));

-- Base de connaissances : alimente les réponses automatiques, donc administrateur.
create policy lecture on business_knowledge_base for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on business_knowledge_base for all to authenticated
  using (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- Planning courant : member.
create policy lecture on employee_absences for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on employee_absences for all to authenticated
  using (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on employee_availabilities for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on employee_availabilities for all to authenticated
  using (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

create policy lecture on shifts for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));
create policy ecriture on shifts for all to authenticated
  using (business_id in (select accessible_business_ids('member')))
  with check (business_id in (select accessible_business_ids('member')));

-- Données RH (contrat, coût horaire) : lecture et écriture réservées aux administrateurs.
create policy lecture on employee_hr for select to authenticated
  using (business_id in (select accessible_business_ids('administrator')));
create policy ecriture on employee_hr for all to authenticated
  using (business_id in (select accessible_business_ids('administrator')))
  with check (business_id in (select accessible_business_ids('administrator')));

-- document_sequences : aucune politique, uniquement via next_document_number (SECURITY DEFINER).
-- invitations : écriture uniquement via invite_member / accept_invitation ; la politique `lecture` reste.
revoke all on document_sequences from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Lecture ouverte entre commerces d'une même agence
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists agencies_member_select on agencies;
drop policy if exists businesses_member_select on businesses;
drop policy if exists optouts_member_select on communication_optouts;
drop policy if exists memberships_agency_select on memberships;
drop policy if exists sessions_member_select on sessions;

-- Domaines : la vitrine ne voit que les domaines vérifiés ; l'agence voit les siens (politique `lecture` ci-dessus).
drop policy if exists agency_domains_select_public on agency_domains;
create policy agency_domains_select_public on agency_domains for select to anon, authenticated
  using (verified_at is not null);

drop policy if exists agency_subscriptions_agency_select on agency_subscriptions;
create policy lecture on agency_subscriptions for select to authenticated
  using (agency_id in (select accessible_agency_ids('administrator')));

drop policy if exists cookie_consents_member_select on cookie_consents;
create policy lecture on cookie_consents for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

drop policy if exists review_collector_member_select on review_collector_logs;
create policy lecture on review_collector_logs for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

-- Messages sortants et événements d'usage : `lecture` couvre ceux d'un commerce ; ceux de niveau agence
-- (business_id NULL) restent lisibles par l'agence.
drop policy if exists outbound_messages_member_select on outbound_messages;
create policy lecture_agence on outbound_messages for select to authenticated
  using (business_id is null and agency_id in (select accessible_agency_ids('viewer')));

drop policy if exists usage_events_member_select on usage_events;
create policy lecture_agence on usage_events for select to authenticated
  using (business_id is null and agency_id in (select accessible_agency_ids('viewer')));

-- Plans : les politiques « public » montraient à tout utilisateur connecté les plans de toutes les agences.
-- `lecture` (plans communs ou de ses agences) suffit.
drop policy if exists plans_select_public on plans;
drop policy if exists plan_modules_select_public on plan_modules;
drop policy if exists plan_quotas_select_public on plan_quotas;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Insertions anonymes sans contrôle (WITH CHECK true)
-- ───────────────────────────────────────────────────────────────────────────
-- Le visiteur anonyme ne lit pas businesses.status : la vérification passe par une fonction.
create or replace function public.business_accepts_public_writes(p_business uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from businesses b where b.id = p_business and business_is_operational(b.status))
$$;
revoke all on function public.business_accepts_public_writes(uuid) from public;
grant execute on function public.business_accepts_public_writes(uuid) to anon, authenticated, service_role;

-- Supprimées : ces écritures doivent passer par une route serveur (validation, dédoublonnage, prix, anti-spam).
-- Réservations et clients : /api/v1/public/reservations et /api/v1/public/quotes existent déjà.
drop policy if exists customers_public_widget_insert on customers;
drop policy if exists reservations_public_widget_insert on reservations;
drop policy if exists orders_public_widget_insert on orders;
drop policy if exists order_items_public_widget_insert on order_items;
drop policy if exists conversations_public_widget_insert on conversations;
drop policy if exists conv_messages_public_widget_insert on conversation_messages;
drop policy if exists usage_events_insert_all on usage_events;

-- Conservées mais bornées : le commerce doit exister et être en service, et les colonnes sensibles sont imposées.
drop policy if exists cookie_consents_public_insert on cookie_consents;
create policy cookie_consents_public_insert on cookie_consents for insert to anon
  with check (business_accepts_public_writes(business_id));

drop policy if exists sessions_public_insert on sessions;
create policy sessions_public_insert on sessions for insert to anon, authenticated
  with check (business_accepts_public_writes(business_id));

drop policy if exists review_collector_public_insert on review_collector_logs;
create policy review_collector_public_insert on review_collector_logs for insert to anon
  with check (business_accepts_public_writes(business_id));

-- Avis : toujours en attente de modération, sans réponse ni rattachement choisis par le visiteur.
drop policy if exists reviews_public_widget_insert on reviews;
create policy reviews_public_widget_insert on reviews for insert to anon
  with check (
    business_accepts_public_writes(business_id)
    and status = 'pending' and source = 'internal'
    and customer_id is null and external_id is null and reply is null and replied_at is null
  );

-- Désinscription : uniquement le marketing d'un commerce précis, depuis un lien de désinscription.
drop policy if exists optouts_public_insert on communication_optouts;
create policy optouts_public_insert on communication_optouts for insert to anon
  with check (
    business_id is not null and business_accepts_public_writes(business_id)
    and scope = 'marketing' and source = 'unsubscribe_link'
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Lectures anonymes de tables entières
-- ───────────────────────────────────────────────────────────────────────────
-- Invitations en attente : la politique exposait à tout visiteur les emails invités et les empreintes de jeton.
-- accept_invitation(p_token) est SECURITY DEFINER et n'a pas besoin de cette lecture.
drop policy if exists invitations_public_select_by_token on invitations;

-- Disponibilités et prestations des employés : seulement ceux affichés sur le site.
drop policy if exists employee_availabilities_select_public on employee_availabilities;
create policy employee_availabilities_select_public on employee_availabilities for select to anon
  using (exists (select 1 from employees e where e.id = employee_availabilities.employee_id and e.is_active and e.show_on_site));

drop policy if exists emp_services_public_widget_select on employee_services;
create policy emp_services_public_widget_select on employee_services for select to anon
  using (exists (select 1 from employees e where e.id = employee_services.employee_id and e.is_active and e.show_on_site));

-- Talents : seulement les profils actifs.
drop policy if exists talents_public_select on talents;
create policy talents_public_select on talents for select to anon
  using (is_active = true);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Fonctions SECURITY DEFINER
-- ───────────────────────────────────────────────────────────────────────────
alter function public.activer_modules_de_coeur() set search_path = public;
alter function public.has_agency_access(uuid) set search_path = public;
alter function public.has_business_access(uuid) set search_path = public;
alter function public.is_platform_admin() set search_path = public;
alter function public.purge_old_sessions() set search_path = public;
alter function public.aggregate_daily_sessions() set search_path = public;

-- Code mort : branchée sur aucun trigger, et incompatible avec le schéma (voir RLS-A-CORRIGER.md).
do $$
begin
  if exists (select 1 from pg_trigger where tgfoid = 'public.handle_new_user_signup()'::regprocedure) then
    raise exception 'handle_new_user_signup est encore utilisée par un trigger';
  end if;
end $$;
drop function public.handle_new_user_signup();

-- Tâches planifiées (pg_cron, rôle postgres) : plus appelables par l'API.
revoke execute on function public.purge_old_sessions() from public, anon, authenticated;
revoke execute on function public.aggregate_daily_sessions() from public, anon, authenticated;

-- Fonctions d'accès et RPC de gestion : inutiles à un visiteur anonyme. Aucune politique ouverte au rôle anon
-- ne les appelle (is_platform_admin, role_rank et business_is_operational restent exécutables par anon).
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.assert_not_last_agency_owner(memberships) from public, anon;
revoke execute on function public.change_member_role(uuid, text) from public, anon;
revoke execute on function public.invite_member(uuid, uuid, text, text, text) from public, anon;
revoke execute on function public.remove_member(uuid) from public, anon;
revoke execute on function public.next_document_number(uuid, text) from public, anon;
revoke execute on function public.accessible_agency_ids(text) from public, anon;
revoke execute on function public.accessible_business_ids(text) from public, anon;
revoke execute on function public.visible_agency_ids() from public, anon;
revoke execute on function public.effective_rank(uuid, uuid) from public, anon;
revoke execute on function public.enabled_modules(uuid) from public, anon;
revoke execute on function public.granted_module_ids(uuid) from public, anon;
revoke execute on function public.has_feature(uuid, text) from public, anon;
revoke execute on function public.has_agency_access(uuid) from public, anon;
revoke execute on function public.has_business_access(uuid) from public, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Cohérence
-- ───────────────────────────────────────────────────────────────────────────
-- Politiques qui interrogeaient memberships directement (elles ignoraient aussi les membres de niveau agence).
drop policy if exists agencies_owner_update on agencies;            -- `modification` (administrator) couvre déjà
drop policy if exists profiles_team_select on profiles;             -- `lecture` couvre déjà
drop policy if exists profiles_self_manage on profiles;             -- ALL : permettait de supprimer son profil ; `modification` reste

drop policy if exists "Lecture des statistiques par les membres du business" on daily_session_summaries;
create policy lecture on daily_session_summaries for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

drop policy if exists "Voir les audits de son business" on website_audits;
create policy lecture on website_audits for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

-- Doublons exacts d'une politique d'origine.
drop policy if exists bt_modules_platform_admin_all on business_type_modules;  -- = plateforme
drop policy if exists modules_platform_admin_all on modules;                   -- = plateforme
drop policy if exists platform_admins_select on platform_admins;               -- inclus dans lecture
drop policy if exists audit_log_platform_admin_select on audit_log;            -- inclus dans lecture

-- Jetons d'intégration : serveur uniquement (aucune politique ; on retire aussi les droits de table).
revoke all on business_integrations from anon, authenticated;

commit;
