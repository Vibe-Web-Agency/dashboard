# RLS : état avant le durcissement du 2026-10-12

**Corrigé le 2026-10-12 par `rls-hardening.sql`** (retour arrière : `rls-hardening-rollback.sql`). Ce document décrit l'état d'avant et sert de justification.

Relevé du 2026-10-12 sur la base de dev (`pg_policies`, `pg_proc`).
Les politiques PostgreSQL permissives se cumulent : une politique large annule la restriction d'une politique stricte posée sur la même table.

Déjà corrigé le même jour, pour mémoire : récursion sur `memberships`, `accessible_business_ids`, lecture anonyme de `conversation_messages`, colonnes de `businesses` en anonyme, suppression de commerce, jeton de `google_connexions`.

## 1. Critique — écriture ouverte à tout membre (41 politiques)

Ces politiques `ALL` reposent sur `has_business_access` / `has_agency_access`, qui acceptent **toute** membership active de l'agence. Conséquences, constatées en session réelle :
- un `viewer` peut créer, modifier et supprimer ;
- un membre rattaché à un seul commerce agit sur tous les commerces de la même agence.

**Correctif proposé :** supprimer la politique ouverte quand une politique d'origine couvre déjà l'écriture avec le bon seuil ; sinon la remplacer par une politique au seuil indiqué.

| Table | Politique ouverte | Politique d'origine en écriture | Action proposée |
|---|---|---|---|
| `agency_domains` | `agency_domains_agency_manage` | aucune | Remplacer : administrator (agence) — configuration de l'agence |
| `agency_email_senders` | `agency_email_senders_agency_manage` | aucune | Remplacer : administrator (agence) — configuration de l'agence |
| `blog_posts` | `blog_posts_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `business_addons` | `baddons_member_manage` | `agence` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `business_closures` | `closures_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `business_hours` | `hours_member_manage` | `ecriture` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `business_knowledge_base` | `bkb_member_manage` | aucune | Remplacer : administrator — contenu qui alimente les réponses automatiques |
| `business_module_settings` | `bms_member_manage` | `configuration` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `business_plans` | `bplans_member_manage` | `agence` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `campaigns` | `campaigns_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `conversation_messages` | `conv_messages_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `conversations` | `conversations_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `customer_notes` | `customer_notes_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `customers` | `customers_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `document_sequences` | `doc_sequences_member_manage` | aucune | Remplacer : aucune écriture directe — numérotation comptable : uniquement via `next_document_number` |
| `employee_absences` | `employee_absences_business_manage` | aucune | Remplacer : member — planning courant |
| `employee_availabilities` | `employee_availabilities_business_manage` | aucune | Remplacer : member — planning courant |
| `employee_hr` | `employee_hr_business_manage` | aucune | Remplacer : administrator — données RH (contrat, salaire) |
| `employee_services` | `emp_services_member_manage` | `ecriture` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `employees` | `employees_member_manage` | `ecriture` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `expenses` | `expenses_agency_manage` | `ecriture` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `invitations` | `invitations_agency_manage` | aucune | Remplacer : aucune écriture directe — uniquement via `invite_member` / `accept_invitation` |
| `invoice_items` | `invoice_items_member_manage` | `ecriture` (ALL, seuil administrator) | Supprimer la politique ouverte |
| `invoices` | `invoices_member_manage` | `ajout` (INSERT, seuil administrator) ; `modification` (UPDATE, seuil administrator) | Supprimer la politique ouverte |
| `menu_items` | `menu_items_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `menu_sections` | `menu_sections_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `order_items` | `order_items_member_manage` | `ajout` (INSERT, seuil member) ; `modification` (UPDATE, seuil member) | Supprimer la politique ouverte |
| `orders` | `orders_member_manage` | `ajout` (INSERT, seuil member) ; `modification` (UPDATE, seuil member) | Supprimer la politique ouverte |
| `product_variants` | `variants_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `products` | `products_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `project_talents` | `project_talents_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `projects` | `projects_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `prospect_activities` | `prospect_activities_agency_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `prospects` | `prospects_agency_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `reservations` | `reservations_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `reviews` | `reviews_member_manage` | `ajout` (INSERT, seuil member) ; `moderation` (UPDATE, seuil member) | Supprimer la politique ouverte |
| `services` | `services_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `shifts` | `shifts_business_manage` | aucune | Remplacer : member — planning courant |
| `talents` | `talents_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |
| `ticket_messages` | `ticket_messages_member_manage` | `ecriture` (INSERT, seuil propre à la table) | Supprimer la politique ouverte |
| `tickets` | `tickets_member_manage` | `ecriture` (ALL, seuil member) | Supprimer la politique ouverte |

Tables à traiter en premier : `document_sequences` (numérotation), `business_plans` et `business_addons` (un membre peut s'attribuer un plan ou une option), `invitations`, `employee_hr`, `invoices` / `invoice_items`.

## 2. Élevé — lecture ouverte entre commerces d'une même agence (11 politiques)

Même cause en lecture : un membre d'un commerce lit les données des autres commerces de son agence.

| Table | Politique | Politique d'origine en lecture | Action proposée |
|---|---|---|---|
| `agencies` | `agencies_member_select` | `lecture` (seuil propre à la table) | Supprimer la politique ouverte |
| `agency_domains` | `agency_domains_select_public` | aucune | Remplacer par `accessible_business_ids('viewer')` ou `accessible_agency_ids('viewer')` |
| `agency_subscriptions` | `agency_subscriptions_agency_select` | aucune | Remplacer par `accessible_business_ids('viewer')` ou `accessible_agency_ids('viewer')` |
| `businesses` | `businesses_member_select` | `lecture` (seuil viewer) | Supprimer la politique ouverte |
| `communication_optouts` | `optouts_member_select` | `lecture` (seuil viewer) | Supprimer la politique ouverte |
| `cookie_consents` | `cookie_consents_member_select` | aucune | Remplacer par `accessible_business_ids('viewer')` ou `accessible_agency_ids('viewer')` |
| `memberships` | `memberships_agency_select` | `lecture` (seuil viewer) | Supprimer la politique ouverte |
| `outbound_messages` | `outbound_messages_member_select` | `lecture` (seuil viewer) | Supprimer la politique ouverte |
| `review_collector_logs` | `review_collector_member_select` | aucune | Remplacer par `accessible_business_ids('viewer')` ou `accessible_agency_ids('viewer')` |
| `sessions` | `sessions_member_select` | `lecture` (seuil viewer) | Supprimer la politique ouverte |
| `usage_events` | `usage_events_member_select` | `lecture` (seuil viewer) | Supprimer la politique ouverte |

## 3. Élevé — insertions anonymes sans contrôle (12 politiques, toutes `WITH CHECK true`)

Un visiteur muni de la clé publique insère ce qu'il veut, pour n'importe quel commerce. Cela contourne l'API publique du dashboard (validation, dédoublonnage, futur anti-spam).

**Correctif proposé :** faire passer ces écritures par des routes serveur (clé de service) et supprimer ces politiques ; à défaut, les restreindre (`business_is_operational`, colonnes imposées, statut forcé).

| Table | Politique | Risque |
|---|---|---|
| `communication_optouts` | `optouts_public_insert` | n'importe qui peut désinscrire n'importe quelle adresse |
| `conversation_messages` | `conv_messages_public_widget_insert` | messages injectables dans toute conversation de tout commerce |
| `conversations` | `conversations_public_widget_insert` | création de conversations en masse |
| `cookie_consents` | `cookie_consents_public_insert` | faible (journal de consentement) |
| `customers` | `customers_public_widget_insert` | contourne l'API publique : pas de validation, pas de dédoublonnage |
| `order_items` | `order_items_public_widget_insert` | lignes de commande arbitraires |
| `orders` | `orders_public_widget_insert` | commandes arbitraires, prix non contrôlés |
| `reservations` | `reservations_public_widget_insert` | contourne l'API publique : statut, commerce et service non contrôlés |
| `review_collector_logs` | `review_collector_public_insert` | faible (journal) |
| `reviews` | `reviews_public_widget_insert` | faux avis, sur tout commerce |
| `sessions` | `sessions_public_insert` | faible (statistiques de visite), mais gonflable |
| `usage_events` | `usage_events_insert_all` | compteurs d'usage (SMS, email, crédits IA) falsifiables : facturation et quotas |

## 4. Moyen — lecture anonyme (24 politiques)

La plupart sont voulues (vitrine publique). Celles en `USING true` exposent toute la table :

| Table | Politique | Avis |
|---|---|---|
| `agency_plan_modules` | `agency_plan_modules_select_public` | contenu des offres d'agence : à confirmer |
| `business_closures` | `closures_public_select` | voulu (vitrine) |
| `business_hours` | `hours_public_select` | voulu (vitrine) |
| `business_type_modules` | `bt_modules_select_all` | voulu (référentiel) |
| `business_types` | `business_types_select_public` | voulu (référentiel) |
| `employee_availabilities` | `employee_availabilities_select_public` | à restreindre aux employés affichés sur le site |
| `employee_services` | `emp_services_public_widget_select` | à restreindre aux employés affichés sur le site |
| `talents` | `talents_public_select` | toute la table, y compris les champs privés : à restreindre aux colonnes et lignes publiées |
| `verticals` | `verticals_select_public` | voulu (référentiel) |

Les autres lectures anonymes sont filtrées (lignes actives ou publiées) : `agency_domains`, `agency_plans`, `blog_posts`, `business_knowledge_base`, `business_module_settings`, `businesses`, `employees`, `invitations`, `menu_items`, `menu_sections`, `modules`, `product_variants`, `products`, `reviews`, `services`.
Rappel : la RLS filtre des lignes, pas des colonnes. Pour `employees`, `products`, `services`, `reviews`, `invitations`, vérifier qu'aucune colonne interne n'est lisible (comme pour `businesses`, corrigé par des droits par colonne).

## 5. Moyen — fonctions `SECURITY DEFINER`

- **Sans `search_path` fixé (6) :** `activer_modules_de_coeur`, `handle_new_user_signup`, `has_agency_access`, `has_business_access`, `is_platform_admin`, `purge_old_sessions`. Ajouter `SET search_path = public` (ou `''`).
- **Exécutables par `anon` :** les 23 fonctions `SECURITY DEFINER`, car PostgreSQL accorde `EXECUTE` à `PUBLIC` par défaut. `purge_old_sessions()` supprime des lignes et peut être appelée par un visiteur anonyme. Révoquer `EXECUTE` à `PUBLIC` et `anon`, puis ne l'accorder qu'aux rôles utiles.
- **Code mort :** `handle_new_user_signup()` n'est branchée sur aucun trigger (c'est `handle_new_user` qui s'exécute à la création d'un compte). Si elle l'était, toute inscription échouerait : elle insère un commerce sans `agency_id`, `business_type_id` ni `slug`, tous obligatoires. À supprimer.

## 6. Faible — cohérence

- `agencies_owner_update`, `profiles_team_select`, et les politiques de `daily_session_summaries` et `website_audits` interrogent `memberships` directement. Elles ne bouclent pas, mais dupliquent la logique des fonctions d'accès : préférer `accessible_agency_ids` / `accessible_business_ids`.
- Deux jeux de noms coexistent (`lecture` / `ecriture` et `*_member_manage`) : n'en garder qu'un.
- Tables sans aucune politique : `business_integrations`, `google_connexions`. C'est voulu (jetons, serveur uniquement) ; vérifier que les rôles `anon` et `authenticated` n'y ont aucun droit, comme c'est fait pour `google_connexions`.
