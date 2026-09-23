# Qui a le droit de faire quoi

<!-- Fichier GÉNÉRÉ : ne pas modifier à la main. `npm run db:matrix` -->

Tableau déduit automatiquement des politiques RLS de
[`schema-v2.sql`](./schema-v2.sql) : il ne peut pas se désynchroniser.

**Comment lire** : « commerce : member » signifie qu'il faut être membre de ce
commerce, avec au moins le rôle `member`. « agence : admin » vaut aussi pour
tous les commerces de l'agence, un rôle d'agence s'appliquant à ses commerces.
Un tiret veut dire **personne via l'application** : ces écritures sont
réservées au serveur (clé service role), par exemple le journal des envois,
les visites du tracker ou la consommation.

Hiérarchie : `owner` > `administrator` > `member` > `viewer`.

| Table | Lire | Créer | Modifier | Supprimer |
|---|---|---|---|---|
| `agencies` | agence : viewer | plateforme | agence : admin | — |
| `agency_domains` | agence : admin | agence : admin | agence : admin | agence : admin |
| `agency_email_senders` | agence : admin | agence : admin | agence : admin | agence : admin |
| `agency_plan_modules` | tout connecté | plateforme | plateforme | plateforme |
| `agency_plans` | tout connecté | plateforme | plateforme | plateforme |
| `agency_portfolio_items` | agence : viewer | agence : member | agence : member | agence : member |
| `agency_subscriptions` | agence : admin · plateforme | plateforme | plateforme | plateforme |
| `audit_log` | agence : admin · plateforme | — | — | — |
| `blog_posts` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `business_addons` | commerce : viewer · agence : admin | agence : admin | agence : admin | agence : admin |
| `business_closures` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `business_hours` | commerce : viewer | commerce : admin | commerce : admin | commerce : admin |
| `business_module_settings` | commerce : viewer | commerce : admin | commerce : admin | commerce : admin |
| `business_plans` | commerce : viewer · agence : admin | agence : admin | agence : admin | agence : admin |
| `business_type_modules` | tout connecté | plateforme | plateforme | plateforme |
| `business_types` | tout connecté | plateforme | plateforme | plateforme |
| `businesses` | commerce : viewer | agence : admin | commerce : admin | — |
| `campaigns` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `communication_optouts` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `conversation_messages` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `conversations` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `customer_notes` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `customers` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `document_sequences` | — | — | — | — |
| `employee_absences` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `employee_availabilities` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `employee_hr` | commerce : admin | commerce : admin | commerce : admin | commerce : admin |
| `employee_services` | commerce : viewer | commerce : admin | commerce : admin | commerce : admin |
| `employees` | commerce : viewer | commerce : admin | commerce : admin | commerce : admin |
| `expenses` | agence : admin | agence : admin | agence : admin | agence : admin |
| `invitations` | commerce : admin · agence : admin | — | — | — |
| `invoice_items` | commerce : viewer | commerce : admin | commerce : admin | commerce : admin |
| `invoices` | commerce : viewer | commerce : admin | commerce : admin | — |
| `memberships` | commerce : viewer · agence : viewer | — | — | — |
| `menu_items` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `menu_sections` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `modules` | tout connecté | plateforme | plateforme | plateforme |
| `order_items` | commerce : viewer | commerce : member | commerce : member | — |
| `orders` | commerce : viewer | commerce : member | commerce : member | — |
| `outbound_messages` | commerce : viewer | — | — | — |
| `plan_modules` | agence : admin · plateforme | agence : admin · plateforme | agence : admin · plateforme | agence : admin · plateforme |
| `plan_quotas` | plateforme | plateforme | plateforme | plateforme |
| `plans` | agence : viewer · plateforme | agence : admin · plateforme | agence : admin · plateforme | agence : admin · plateforme |
| `platform_admins` | plateforme | — | — | — |
| `product_variants` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `products` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `profiles` | — | — | — | — |
| `project_talents` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `projects` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `prospect_activities` | agence : viewer | agence : member | agence : member | agence : member |
| `prospects` | agence : viewer | agence : member | agence : member | agence : member |
| `quote_items` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `quotes` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `reservations` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `reviews` | commerce : viewer | commerce : member | commerce : member | — |
| `services` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `sessions` | commerce : viewer | — | — | — |
| `shifts` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `talents` | commerce : viewer | commerce : member | commerce : member | commerce : member |
| `tasks` | agence : viewer | agence : member | agence : member | agence : member |
| `ticket_messages` | agence : viewer · plateforme | — | — | — |
| `tickets` | commerce : viewer · agence : viewer · plateforme | commerce : member · agence : member · plateforme | commerce : member · agence : member · plateforme | commerce : member · agence : member · plateforme |
| `usage_events` | commerce : viewer | — | — | — |

---

122 politiques · 63 tables · généré depuis le schéma, vérifié par `npm run db:check`.
