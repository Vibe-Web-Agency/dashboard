-- ═════════════════════════════════════════════════════════════════════════
--  Clients : le nom s'écrit dans first_name et last_name
--
--  Décision du 2026-10-12 : on n'écrit plus customers.full_name. Le dashboard
--  et l'API publique remplissent first_name et last_name, que les vues et
--  l'index (business_id, last_name) utilisent déjà.
--
--  1. Reprise des clients existants : full_name est découpé au premier espace
--     (prénom = premier mot, nom = le reste). Seules les lignes sans prénom ni
--     nom sont touchées. full_name est laissé tel quel : la colonne n'est plus
--     lue ni écrite par le code et pourra être supprimée.
--  2. v_reservations_detail et v_invoices_summary composaient le nom avec
--     « first_name || ' ' || last_name », NULL dès qu'une des deux parties
--     manque. Elles utilisent concat_ws, qui ignore les valeurs vides.
--
--  Rejouable. Appliqué sur la base de DEV le 2026-10-12. À coller dans
--  l'éditeur SQL de Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

update public.customers
   set first_name = nullif(split_part(btrim(full_name), ' ', 1), ''),
       last_name  = nullif(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
 where first_name is null and last_name is null
   and nullif(btrim(full_name), '') is not null;

create or replace view public.v_reservations_detail with (security_invoker = true) as
SELECT r.id AS reservation_id,
    r.business_id,
    r.starts_at,
    r.ends_at,
    r.status,
    c.id AS customer_id,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text) AS customer_full_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    s.id AS service_id,
    s.name AS service_name,
    s.duration_min AS service_duration,
    s.price_cents AS service_price_cents,
    e.id AS employee_id,
    e.first_name AS employee_first_name,
    e.last_name AS employee_last_name
   FROM reservations r
     LEFT JOIN customers c ON r.customer_id = c.id
     LEFT JOIN services s ON r.service_id = s.id
     LEFT JOIN employees e ON r.employee_id = e.id;

create or replace view public.v_invoices_summary with (security_invoker = true) as
SELECT inv.id AS invoice_id,
    inv.business_id,
    inv.number AS invoice_number,
    inv.kind,
    inv.status,
    inv.issued_at,
    inv.due_date,
    inv.subtotal_cents,
    inv.discount_cents,
    inv.subtotal_cents - inv.discount_cents AS total_ht_net_cents,
    inv.tax_cents,
    inv.total_cents AS total_ttc_cents,
    inv.amount_paid_cents,
    inv.total_cents - inv.amount_paid_cents AS remaining_balance_cents,
    inv.currency,
    c.id AS customer_id,
    NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text) AS customer_name,
    c.email AS customer_email,
    (inv.status = ANY (ARRAY['issued'::text, 'partially_paid'::text])) AND inv.due_date < CURRENT_DATE AS is_overdue
   FROM invoices inv
     LEFT JOIN customers c ON inv.customer_id = c.id;

-- Contrôle.
select count(*) as clients,
       count(*) filter (where first_name is not null or last_name is not null) as avec_prenom_ou_nom,
       count(*) filter (where first_name is null and last_name is null and full_name is not null) as non_repris,
       (select count(customer_full_name) from public.v_reservations_detail) as reservations_avec_nom
  from public.customers;
