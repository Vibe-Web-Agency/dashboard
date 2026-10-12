-- Retour arrière de rls-hardening.sql : rétablit l'état relevé le 2026-10-12 avant correction.
-- ATTENTION : rouvre les failles décrites dans RLS-A-CORRIGER.md. À n'utiliser que pour diagnostiquer une régression.
-- Généré depuis pg_policies ; les droits et fonctions sont rétablis à la fin.

begin;

-- Politiques créées par le durcissement
drop policy if exists lecture on agency_domains;
drop policy if exists ecriture on agency_domains;
drop policy if exists lecture on agency_email_senders;
drop policy if exists ecriture on agency_email_senders;
drop policy if exists lecture on business_knowledge_base;
drop policy if exists ecriture on business_knowledge_base;
drop policy if exists lecture on employee_absences;
drop policy if exists ecriture on employee_absences;
drop policy if exists lecture on employee_availabilities;
drop policy if exists ecriture on employee_availabilities;
drop policy if exists lecture on shifts;
drop policy if exists ecriture on shifts;
drop policy if exists lecture on employee_hr;
drop policy if exists ecriture on employee_hr;
drop policy if exists agency_domains_select_public on agency_domains;
drop policy if exists lecture on agency_subscriptions;
drop policy if exists lecture on cookie_consents;
drop policy if exists lecture on review_collector_logs;
drop policy if exists lecture_agence on outbound_messages;
drop policy if exists lecture_agence on usage_events;
drop policy if exists cookie_consents_public_insert on cookie_consents;
drop policy if exists sessions_public_insert on sessions;
drop policy if exists review_collector_public_insert on review_collector_logs;
drop policy if exists reviews_public_widget_insert on reviews;
drop policy if exists optouts_public_insert on communication_optouts;
drop policy if exists employee_availabilities_select_public on employee_availabilities;
drop policy if exists emp_services_public_widget_select on employee_services;
drop policy if exists talents_public_select on talents;
drop policy if exists lecture on daily_session_summaries;
drop policy if exists lecture on website_audits;

-- Politiques d'avant
create policy agency_domains_agency_manage on agency_domains as permissive for all to authenticated
  using (has_agency_access(agency_id))
  with check (has_agency_access(agency_id));
create policy agency_email_senders_agency_manage on agency_email_senders as permissive for all to authenticated
  using (has_agency_access(agency_id))
  with check (has_agency_access(agency_id));
create policy blog_posts_member_manage on blog_posts as permissive for all to authenticated
  using (has_business_access(business_id));
create policy baddons_member_manage on business_addons as permissive for all to authenticated
  using (has_business_access(business_id));
create policy closures_member_manage on business_closures as permissive for all to authenticated
  using (has_business_access(business_id));
create policy hours_member_manage on business_hours as permissive for all to authenticated
  using (has_business_access(business_id));
create policy bkb_member_manage on business_knowledge_base as permissive for all to authenticated
  using (has_business_access(business_id));
create policy bms_member_manage on business_module_settings as permissive for all to authenticated
  using (has_business_access(business_id));
create policy bplans_member_manage on business_plans as permissive for all to authenticated
  using (has_business_access(business_id));
create policy campaigns_member_manage on campaigns as permissive for all to authenticated
  using ((has_business_access(business_id) AND has_agency_access(agency_id)));
create policy conv_messages_member_manage on conversation_messages as permissive for all to authenticated
  using (has_business_access(business_id));
create policy conversations_member_manage on conversations as permissive for all to authenticated
  using (has_business_access(business_id));
create policy customer_notes_member_manage on customer_notes as permissive for all to authenticated
  using (has_business_access(business_id));
create policy customers_member_manage on customers as permissive for all to authenticated
  using (has_business_access(business_id));
create policy doc_sequences_member_manage on document_sequences as permissive for all to authenticated
  using (has_business_access(business_id));
create policy employee_absences_business_manage on employee_absences as permissive for all to authenticated
  using (has_business_access(business_id))
  with check (has_business_access(business_id));
create policy employee_availabilities_business_manage on employee_availabilities as permissive for all to authenticated
  using (has_business_access(business_id))
  with check (has_business_access(business_id));
create policy employee_hr_business_manage on employee_hr as permissive for all to authenticated
  using (has_business_access(business_id))
  with check (has_business_access(business_id));
create policy emp_services_member_manage on employee_services as permissive for all to authenticated
  using (has_business_access(business_id));
create policy employees_member_manage on employees as permissive for all to authenticated
  using (has_business_access(business_id));
create policy expenses_agency_manage on expenses as permissive for all to authenticated
  using (has_agency_access(agency_id));
create policy invitations_agency_manage on invitations as permissive for all to authenticated
  using (has_agency_access(agency_id));
create policy invoice_items_member_manage on invoice_items as permissive for all to authenticated
  using (has_business_access(business_id));
create policy invoices_member_manage on invoices as permissive for all to authenticated
  using (has_business_access(business_id));
create policy menu_items_member_manage on menu_items as permissive for all to authenticated
  using (has_business_access(business_id));
create policy menu_sections_member_manage on menu_sections as permissive for all to authenticated
  using (has_business_access(business_id));
create policy order_items_member_manage on order_items as permissive for all to authenticated
  using (has_business_access(business_id));
create policy orders_member_manage on orders as permissive for all to authenticated
  using (has_business_access(business_id));
create policy variants_member_manage on product_variants as permissive for all to authenticated
  using (has_business_access(business_id));
create policy products_member_manage on products as permissive for all to authenticated
  using (has_business_access(business_id));
create policy project_talents_member_manage on project_talents as permissive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_talents.project_id) AND has_business_access(p.business_id)))));
create policy projects_member_manage on projects as permissive for all to authenticated
  using (has_business_access(business_id));
create policy prospect_activities_agency_manage on prospect_activities as permissive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM prospects p
  WHERE ((p.id = prospect_activities.prospect_id) AND has_agency_access(p.agency_id)))));
create policy prospects_agency_manage on prospects as permissive for all to authenticated
  using (has_agency_access(agency_id));
create policy reservations_member_manage on reservations as permissive for all to authenticated
  using (has_business_access(business_id));
create policy reviews_member_manage on reviews as permissive for all to authenticated
  using (has_business_access(business_id));
create policy services_member_manage on services as permissive for all to authenticated
  using (has_business_access(business_id));
create policy shifts_business_manage on shifts as permissive for all to authenticated
  using (has_business_access(business_id))
  with check (has_business_access(business_id));
create policy talents_member_manage on talents as permissive for all to authenticated
  using (has_business_access(business_id));
create policy ticket_messages_member_manage on ticket_messages as permissive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM tickets t
  WHERE ((t.id = ticket_messages.ticket_id) AND (has_agency_access(t.agency_id) OR ((t.business_id IS NOT NULL) AND has_business_access(t.business_id)))))));
create policy tickets_member_manage on tickets as permissive for all to authenticated
  using ((has_agency_access(agency_id) OR ((business_id IS NOT NULL) AND has_business_access(business_id))));
create policy agencies_member_select on agencies as permissive for select to authenticated
  using (has_agency_access(id));
create policy businesses_member_select on businesses as permissive for select to authenticated
  using (has_business_access(id));
create policy optouts_member_select on communication_optouts as permissive for select to authenticated
  using (((business_id IS NULL) OR has_business_access(business_id)));
create policy memberships_agency_select on memberships as permissive for select to authenticated
  using (((profile_id = auth.uid()) OR has_agency_access(agency_id)));
create policy sessions_member_select on sessions as permissive for select to authenticated
  using (has_business_access(business_id));
create policy agency_domains_select_public on agency_domains as permissive for select to anon,authenticated
  using (((verified_at IS NOT NULL) OR has_agency_access(agency_id)));
create policy agency_subscriptions_agency_select on agency_subscriptions as permissive for select to authenticated
  using (has_agency_access(agency_id));
create policy cookie_consents_member_select on cookie_consents as permissive for select to authenticated
  using (has_business_access(business_id));
create policy review_collector_member_select on review_collector_logs as permissive for select to authenticated
  using (has_business_access(business_id));
create policy outbound_messages_member_select on outbound_messages as permissive for select to authenticated
  using ((((business_id IS NOT NULL) AND has_business_access(business_id)) OR ((agency_id IS NOT NULL) AND has_agency_access(agency_id))));
create policy usage_events_member_select on usage_events as permissive for select to authenticated
  using ((((business_id IS NOT NULL) AND has_business_access(business_id)) OR ((agency_id IS NOT NULL) AND has_agency_access(agency_id))));
create policy plans_select_public on plans as permissive for select to authenticated
  using ((is_active = true));
create policy plan_modules_select_public on plan_modules as permissive for select to authenticated
  using (true);
create policy plan_quotas_select_public on plan_quotas as permissive for select to authenticated
  using (true);
create policy customers_public_widget_insert on customers as permissive for insert to anon
  with check (true);
create policy reservations_public_widget_insert on reservations as permissive for insert to anon
  with check (true);
create policy orders_public_widget_insert on orders as permissive for insert to anon
  with check (true);
create policy order_items_public_widget_insert on order_items as permissive for insert to anon
  with check (true);
create policy conversations_public_widget_insert on conversations as permissive for insert to anon
  with check (true);
create policy conv_messages_public_widget_insert on conversation_messages as permissive for insert to anon
  with check (true);
create policy usage_events_insert_all on usage_events as permissive for insert to anon,authenticated
  with check (true);
create policy cookie_consents_public_insert on cookie_consents as permissive for insert to anon
  with check (true);
create policy sessions_public_insert on sessions as permissive for insert to anon,authenticated
  with check (true);
create policy review_collector_public_insert on review_collector_logs as permissive for insert to anon
  with check (true);
create policy reviews_public_widget_insert on reviews as permissive for insert to anon
  with check (true);
create policy optouts_public_insert on communication_optouts as permissive for insert to anon,authenticated
  with check (true);
create policy invitations_public_select_by_token on invitations as permissive for select to anon,authenticated
  using (((status = 'pending'::text) AND (expires_at > now())));
create policy employee_availabilities_select_public on employee_availabilities as permissive for select to anon,authenticated
  using (true);
create policy emp_services_public_widget_select on employee_services as permissive for select to anon
  using (true);
create policy talents_public_select on talents as permissive for select to anon
  using (true);
create policy agencies_owner_update on agencies as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.profile_id = auth.uid()) AND (memberships.agency_id = agencies.id) AND (memberships.role = ANY (ARRAY['owner'::text, 'administrator'::text])) AND (memberships.is_active = true)))));
create policy profiles_team_select on profiles as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM (memberships m1
     JOIN memberships m2 ON ((m1.agency_id = m2.agency_id)))
  WHERE ((m1.profile_id = auth.uid()) AND (m2.profile_id = profiles.id) AND (m1.is_active = true)))));
create policy profiles_self_manage on profiles as permissive for all to authenticated
  using ((id = auth.uid()))
  with check ((id = auth.uid()));
create policy "Lecture des statistiques par les membres du business" on daily_session_summaries as permissive for select to authenticated
  using ((business_id IN ( SELECT m.business_id
   FROM memberships m
  WHERE ((m.profile_id = auth.uid()) AND (m.is_active = true)))));
create policy "Voir les audits de son business" on website_audits as permissive for select to authenticated
  using ((business_id IN ( SELECT m.business_id
   FROM memberships m
  WHERE ((m.profile_id = auth.uid()) AND (m.is_active = true)))));
create policy bt_modules_platform_admin_all on business_type_modules as permissive for all to authenticated
  using (is_platform_admin());
create policy modules_platform_admin_all on modules as permissive for all to authenticated
  using (is_platform_admin());
create policy platform_admins_select on platform_admins as permissive for select to authenticated
  using (is_platform_admin());
create policy audit_log_platform_admin_select on audit_log as permissive for select to authenticated
  using (is_platform_admin());

-- Droits de table
grant all on document_sequences to anon, authenticated;
grant all on business_integrations to anon, authenticated;

-- Fonctions
grant execute on function public.purge_old_sessions() to public, anon, authenticated;
grant execute on function public.aggregate_daily_sessions() to public, anon, authenticated;
grant execute on function public.accept_invitation(text) to anon;
grant execute on function public.assert_not_last_agency_owner(memberships) to anon;
grant execute on function public.change_member_role(uuid, text) to anon;
grant execute on function public.invite_member(uuid, uuid, text, text, text) to anon;
grant execute on function public.remove_member(uuid) to anon;
grant execute on function public.next_document_number(uuid, text) to public;
grant execute on function public.accessible_agency_ids(text) to public, anon;
grant execute on function public.accessible_business_ids(text) to public, anon;
grant execute on function public.visible_agency_ids() to public, anon;
grant execute on function public.effective_rank(uuid, uuid) to public, anon;
grant execute on function public.enabled_modules(uuid) to public, anon;
grant execute on function public.granted_module_ids(uuid) to public, anon;
grant execute on function public.has_feature(uuid, text) to public, anon;
grant execute on function public.has_agency_access(uuid) to public, anon;
grant execute on function public.has_business_access(uuid) to public, anon;
drop function if exists public.business_accepts_public_writes(uuid);
-- Non rétablis (sans intérêt) : handle_new_user_signup (code mort) et l'absence de search_path sur 6 fonctions.

commit;
