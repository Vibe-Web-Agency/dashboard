# 📋 MASTER PLAN ARCHITECTURE V2 & SPECS TECHNIQUE (CLAUDE.md)

Ce document constitue la spécification technique absolue pour le refactoring du Dashboard Vibe Web Agency (V2). 
Chaque composant, route d'API, schéma JSON et politique de sécurité doit être implémenté en respectant strictement ce document.
En cas de divergence entre ce document et la base, **le schéma réel (`types/supabase.ts`) fait foi** : corriger ce document.

---

## 🎯 PHILOSOPHIE & RÈGLES DE DÉVELOPPEMENT

1. **Function First, Polish Later :** Priorité absolue au fonctionnement des flux de données et de la multi-tenancy. Utiliser les composants Shadcn UI / Tailwind de base sans fioritures visuelles inutiles.
2. **Typage Strict :** Ne JAMAIS créer de types `interface Reservation` ou `interface Customer` manuels. Tous les types TypeScript doivent dériver directement de `types/supabase.ts` (généré via Supabase CLI), via les helpers `Tables<'x'>`, `TablesInsert<'x'>`, `TablesUpdate<'x'>`.
3. **Multi-Tenant Native :** Toute donnée liée à un commerce doit impérativement porter et filtrer sur `business_id`.
4. **Isolations RLS :** Toutes les requêtes `supabase-js` côté client/dashboard s'exécutent sous le rôle de l'utilisateur authentifié. Les endpoints publics `/api/v1/public/*` utilisent le client `service_role`.

---

## SECTION 1 : TYPAGE TYPESCRIPT & CONFIGURATION BASE DE DONNÉES ✅

### 1.1 Génération des Types
Types générés dans `types/supabase.ts` (64 tables + 3 vues, conforme au dump `text.txt`). Pour les régénérer (nécessite `npx supabase login`) :
```bash
npx supabase gen types typescript --project-id oeejvntknmpmgbbppolh > types/supabase.ts
```
Derrière le proxy d'entreprise, voir « Notes d'environnement » plus bas.

### 1.2 Schéma des Tables Clés (Structure V2 réelle)

**Vocabulaire métier :** `verticals` → `business_types` (`vertical_id`, nullable) → `businesses` (`business_type_id`).
- `booking_noun` : ce qu'on réserve (« réservation », « leçon », « consultation »…).
- `customer_noun` (ajouté le 2026-10-06, défaut « client ») : nom des clients dans l'interface (« client », « patient », « élève », « membre », « joueur », « prospect »).
- `service_noun` (ajouté le 2026-10-06, défaut « prestation ») : nom de ce qu'on réserve dans `services` (« formule » pour la restauration, « soin » pour institut et spa). Script : `supabase/manual/business-types-service-noun.sql`.
- `party_noun` : unité de `reservations.party_size` (« couvert », « joueur », « personne »), NULL quand le nombre de personnes n'a pas de sens. Depuis le 2026-10-06, il ne sert plus à nommer les clients. Script : `supabase/manual/business-types-customer-noun.sql`.

**Prestations et carte (décision du 2026-10-06) :**
- `services` (module de base « Prestations ») = ce qui est **réservable** : formules, brunch, privatisation, coupe, soin… Lié à `reservations.service_id` et au champ `service_id` de l'API publique.
- `menu` (`menu_sections` / `menu_items`) = la **carte** : plats et boissons, non réservables.

**Modules :** `modules` (slug, `is_core`), activés par commerce dans `business_module_settings.is_enabled`, accordés par plan (`business_plans` → `plan_modules`) ou option (`business_addons`). `enabled_modules(p_business)` / `has_feature(p_business, slug)` renvoient ce qui est à la fois activé et accordé (`is_core`, plan actif ou option), pour un commerce actif.

**Tenancy & Auth :** `agencies`, `businesses`, `profiles`, `memberships`.
- `memberships` relie `profile_id` à `agency_id` (obligatoire) et `business_id` (nullable).
- Rôles : `owner | administrator | member | viewer`.
- `business_id` NULL = membre au niveau agence, qui accède à tous les commerces de l'agence.
- **`profiles` (2026-10-13, `supabase/manual/profiles-names-status.sql`, à rejouer en production) :**
  - `first_name` et `last_name`, comme `customers` et `employees` ; la colonne `full_name` a été supprimée (`drop-full-name-columns.sql`). Affichage par `personName()`. Le trigger `handle_new_user` ne fabrique plus de nom à partir de l'adresse email : un profil sans nom s'affiche par son email.
  - `status` : `invited` (créé par invitation, jamais connecté), `pending` (inscription libre, jamais connecté), `active` (connecté au moins une fois). `last_sign_in_at` : copie de la dernière connexion. Les deux sont tenus par des triggers sur `auth.users` (`handle_new_user`, `handle_user_sign_in`) ; personne ne les écrit à la main. Côté code : `PROFILE_STATUS_UI` et `isPendingProfile` (`lib/v2/statuses.ts`). L'état des comptes se lit donc dans `profiles`, sous RLS, sans passer par l'API d'administration.
  - **Droits de colonne :** un utilisateur ne modifie que `first_name`, `last_name`, `phone`, `avatar_url` et `locale` de son profil. Avant, il pouvait changer son `email`, donc usurper l'adresse d'un autre et recevoir à sa place un accès donné par email.

**CRM Ingestion :** `customers`.
- **Nom (décision du 2026-10-12) :** on écrit `first_name` et `last_name`. La colonne `full_name` a été supprimée le 2026-10-13 (`supabase/manual/drop-full-name-columns.sql`, à rejouer en production en dernier). Affichage : `personName()` (`lib/v2/names.ts`). Les clients existants ont été repris (`supabase/manual/customers-first-last-name.sql`).
- Index unique **partiel** : `customers_business_id_email_idx ON (business_id, email) WHERE email IS NOT NULL`. Pas d'unicité sur le téléphone.
- `email` doit être en minuscules (CHECK `email = lower(email)`).
- `source` : `reservation | order | quote | review | form | manual | import | instagram | whatsapp`.

**Opérationnel :**
- `reservations` : date = `starts_at` (timestamptz, obligatoire), `ends_at` optionnel. `party_size` entre 1 et 500. Statuts `pending | confirmed | completed | no_show | cancelled`, défaut `confirmed`. `source` défaut `website`. Message du client dans `customer_message`, note interne dans `internal_note`. `customer_id` nullable, `guest_name` disponible.
- `quotes` : statuts `request | draft | sent | accepted | declined | expired | cancelled`, défaut `request`. Message brut dans `request_message`, détails structurés dans `request_details` (jsonb objet). `customer_id` obligatoire.
- Les FK composites `(customer_id, business_id)` et `(service_id, business_id)` empêchent de rattacher un client ou un service d'un autre commerce.

### 1.3 Politiques RLS (Row Level Security)
Toutes les tables doivent avoir la RLS activée. Pour isoler les commerces, s'appuyer sur la fonction existante `accessible_business_ids()`, qui couvre aussi les membres de niveau agence (`business_id` NULL) :

```sql
CREATE POLICY "Tenant Isolation" ON "public"."reservations"
FOR ALL USING (
  business_id IN (SELECT accessible_business_ids())
);
```
#### Audit RLS du 2026-10-06 (base de dev, `pg_policies` via `supabase db query --linked`)
- **Activation :** RLS active sur les 65 tables de `public`. La table `google_connexions` existe en base mais pas dans `text.txt`.
- **Fonction d'accès :** `accessible_business_ids(min_role)` (SECURITY DEFINER) renvoie les commerces où l'utilisateur a une membership active de rang ≥ `min_role`, directe ou de niveau agence (via `accessible_agency_ids`). Rangs (`role_rank`) : viewer 1, member 2, administrator 3, owner 4.
- **Politiques des tables du dashboard :**

  | Table | Lecture | Écriture |
  |---|---|---|
  | `businesses` | viewer | UPDATE administrator ; INSERT administrator d'agence ; pas de DELETE |
  | `business_hours`, `business_module_settings` | viewer | administrator (ALL) |
  | `customers`, `reservations`, `quotes` | viewer | member (ALL) |
  | `profiles` | soi-même et membres visibles | UPDATE soi-même uniquement |
  | `memberships` | agences visibles | aucune politique d'écriture : uniquement via les RPC (`invite_member`, `change_member_role`…) |
  | `document_sequences` | aucune | aucune : uniquement via `next_document_number` |

  L'isolation par `business_id` et la restriction owner/administrator sur l'établissement sont donc garanties en base. Les Server Actions de la section 5.2 font le même contrôle côté interface.
- **Vues :** `customer_stats` et `campaign_stats` sont `security_invoker=true` et suivent la RLS. `google_connexions_etat` est `security_invoker=false` mais filtre elle-même sur `accessible_business_ids('viewer')` (0 ligne en anonyme, vérifié) et masque `refresh_token`.
- **Écritures refusées en silence :** un UPDATE ou DELETE refusé par la RLS ne lève pas d'erreur (0 ligne). Toutes les écritures de `lib/v2/data/*` vérifient le nombre de lignes touchées et lèvent `NotAllowedError` (`lib/v2/data/errors.ts`). L'interface masque les actions d'écriture aux rôles sous member (`canWrite` dans `lib/v2/roles.ts`).
- **`next_document_number` — corrigé le 2026-10-06 (base de dev) :** le passe-droit de la clé de service testait `current_setting('request.jwt.claim.role')`, que PostgREST ne renseigne plus. Aucun appel serveur (crons, routes d'API) ne pouvait numéroter. La condition utilise maintenant `auth.role()`, qui lit les deux formats. Vérifié : la clé de service obtient `DEV-2026-0001`, l'anonyme est refusé, et un devis passé à `sent` reçoit son numéro. Script à rejouer sur chaque base V2, dont la production : `supabase/manual/next-document-number-service-role.sql`.

#### Incident RLS du 2026-10-12 (base de dev)
Toutes les pages du dashboard répondaient 500 : `42P17 infinite recursion detected in policy for relation "memberships"`. Entre le 6 et le 12 octobre, un script a ajouté 126 politiques (noms en anglais : `…_member_select`, `…_platform_admin_all`, `…_public_widget_…`) par-dessus les 107 politiques d'origine (`lecture`, `ecriture`, `modification`…), et réécrit `accessible_business_ids`.
- **Corrigé** (`supabase/manual/fix-rls-recursion-and-access-function.sql`, qui garde les définitions remplacées) :
  - suppression de `memberships_agency_manage`, une politique posée sur `memberships` qui relisait `memberships`. Elle contenait aussi une comparaison toujours vraie (`memberships_1.agency_id = memberships_1.agency_id`). Les écritures sur `memberships` repassent par les RPC ;
  - rétablissement de la définition auditée de `accessible_business_ids`. La version réécrite ignorait les membres de niveau agence et attendait `'admin'`, alors que 16 politiques et `guard_business_columns` passent `'administrator'`.
- **Règle :** une politique ne doit jamais interroger sa propre table, ni `memberships` directement. Passer par les fonctions `SECURITY DEFINER` (`accessible_business_ids`, `accessible_agency_ids`). Le rôle s'écrit `administrator`, jamais `admin`.
- **Corrigé ensuite le même jour** (les politiques permissives se cumulent : les nouvelles élargissaient les anciennes) :
  - `fix-rls-public-exposure.sql` :
    - suppression de la lecture anonyme de `conversation_messages` (`USING true`). Un widget de discussion public doit passer par une route serveur ;
    - le rôle `anon` ne lit plus que les colonnes de vitrine de `businesses` (droits par colonne). `billing_email`, `billing_address`, `siren`, `stripe_customer_id`, `allowed_origins`, `byok_override`, `agency_id` ne sont plus lisibles, et un `select *` anonyme échoue (42501) ;
    - suppression de `businesses_member_write` (ALL), qui permettait de supprimer un commerce.
  - `business-operational-statuses.sql` : `business_is_operational(status)` = `active | active_client | lead_demo`, utilisée par `granted_module_ids` et par la politique de vitrine publique. Côté code : `OPERATIONAL_BUSINESS_STATUSES` (`lib/v2/statuses.ts`), utilisée par l'API publique. `suspended`, `churned` et `agency` restent hors service.
- **Vues :** `customer_stats`, `campaign_stats` et `google_connexions_etat` n'existent plus. Les 7 vues `v_*` sont décrites dans `db.md` (section « Views »).
  - `lib/v2/data/customers.ts` lit les statistiques des clients dans `v_customer_profiles_360` (visites terminées, dernière visite, total payé, note moyenne), par lots de 100 ids.
  - `v_reservations_detail` et `v_invoices_summary` composent le nom avec `concat_ws` (l'ancien `first_name || ' ' || last_name` donnait NULL partout).
  - **Jeton Google :** `google_connexions` est fermée aux rôles `anon` et `authenticated` (plus de droits ni de politiques : serveur uniquement). `v_google_connections_status` est le seul accès côté dashboard : elle s'exécute avec les droits de son propriétaire, filtre sur `accessible_business_ids('viewer')` et n'expose pas `refresh_token` (`supabase/manual/google-connexions-hide-refresh-token.sql`).
- **Durcissement du 2026-10-12** (`supabase/manual/rls-hardening.sql`, retour arrière dans `rls-hardening-rollback.sql`, détail de l'état d'avant dans `RLS-A-CORRIGER.md`). À rejouer en production.
  - **Écriture :** les 41 politiques `*_member_manage` / `*_agency_manage` (fondées sur `has_business_access` / `has_agency_access`, donc ouvertes à toute membership de l'agence) sont supprimées. Les seuils des politiques d'origine s'appliquent de nouveau. Les tables qui n'avaient qu'elles reçoivent `lecture` / `ecriture` : `agency_domains` et `agency_email_senders` (administrateur d'agence), `business_knowledge_base` (écriture administrator), `employee_absences`, `employee_availabilities`, `shifts` (écriture member), `employee_hr` (lecture et écriture administrator). `document_sequences` n'a plus ni politique ni droits de table. `invitations` ne s'écrit que par les RPC.
  - **Lecture :** plus de lecture entre commerces d'une même agence (11 politiques). Les plans des autres agences ne sont plus visibles.
  - **Visiteur anonyme :**
    - insertion directe **supprimée** sur `customers`, `reservations`, `orders`, `order_items`, `conversations`, `conversation_messages`, `usage_events` : ces écritures passent par une route serveur (`/api/v1/public/*` pour les réservations et les demandes ; rien n'existe encore pour les commandes et la messagerie) ;
    - insertion **bornée** sur `sessions`, `cookie_consents`, `review_collector_logs`, `reviews` (toujours `pending`, source `internal`) et `communication_optouts` (marketing, lien de désinscription) : le commerce doit être en service (`business_accepts_public_writes`) ;
    - lecture : `invitations` fermée (elle exposait les emails invités et les empreintes de jeton), `employee_availabilities` et `employee_services` limitées aux employés affichés sur le site, `talents` aux profils actifs.
  - **Fonctions :** `search_path` fixé partout ; `handle_new_user_signup` supprimée ; `purge_old_sessions` et `aggregate_daily_sessions` réservées à pg_cron ; les fonctions d'accès et les RPC de gestion ne sont plus exécutables par `anon`. `is_platform_admin`, `role_rank` et `business_is_operational` le restent, car des politiques publiques les appellent.
  - **Règle :** ne jamais recréer de politique fondée sur `has_business_access` / `has_agency_access`. Une nouvelle table reçoit `lecture` (`accessible_business_ids('viewer')`) et `ecriture` avec le seuil voulu.
  - **Vérifié en session réelle (51 contrôles) :** un viewer de FiFi ne voit que FiFi, ne lit rien des autres commerces de son agence, et ne peut ni modifier une réservation, ni créer un client, ni s'attribuer un plan ; l'owner lit et écrit comme avant et toutes les pages répondent ; l'anonyme lit la vitrine, ne peut plus insérer de réservation, de client ni d'événement d'usage, et ses sessions de visite sont acceptées.
  - **Restent ouverts, par choix :** `agency_plan_modules` lisible par tous (contenu des offres) ; `talents.date_of_birth` lisible par un visiteur pour les profils actifs (à masquer par des droits de colonne si la date ne doit pas être publique) ; `profiles.lecture` interroge `memberships` directement, sous RLS.

Autres fonctions disponibles : `has_feature`, `effective_rank`, `role_rank`, `is_platform_admin`, `enabled_modules`, `invite_member`, `accept_invitation`, `change_member_role`, `remove_member`, `next_document_number`.

---

## SECTION 2 : API GATEWAY & INGESTION PUBLIQUE (/api/v1/public) ✅

Validée le 2026-10-06 par un test de bout en bout sur le commerce de démo, données nettoyées ensuite : création, réutilisation du client, préservation des données existantes, service d'un autre commerce refusé sans créer de client, commerce inconnu en 404, 5 requêtes simultanées donnant un seul client.

Les sites web clients envoient des requêtes POST publiques (cross-origin, CORS ouvert). Les endpoints résolvent le client dans `customers` avant d'insérer l'événement métier. Logique partagée dans `lib/v2/ingestion.ts`.

### 2.0 Règles communes
- Client Supabase `service_role` typé avec `types/supabase.ts` (`lib/v2/supabase-admin.ts`).
- Le commerce doit exister et avoir `status = 'active'`, sinon 404.
- Email normalisé : `email.toLowerCase().trim()`.
- **Résolution du client (au lieu d'un upsert `onConflict`) :** l'index unique est partiel, et PostgREST ne sait pas transmettre le prédicat `WHERE email IS NOT NULL` dans `ON CONFLICT`. Un `upsert({ onConflict: 'business_id,email' })` échoue donc avec l'erreur 42P10. La route fait : SELECT par `(business_id, email)` → INSERT si absent → en cas de conflit concurrent (23505), nouveau SELECT.
- Un client existant n'est jamais écrasé par un formulaire public : on complète seulement le nom (si la fiche n'en a aucun) et `phone` s'ils sont vides.
- Si `service_id` est fourni, le service doit appartenir au commerce et être actif. Il est vérifié **avant** la résolution du client, pour ne pas créer de fiche sur une demande refusée.
- Réponses : 201 succès, 400 payload invalide (`{ success: false, error, details }`), 404 commerce inconnu ou inactif, 500 erreur serveur (message générique, détail dans les logs).

### 2.0 bis Sécurité & anti-spam — ⚠️ À FAIRE AVANT LA MISE EN PROD
Aujourd'hui, ces routes sont ouvertes à toute origine (`Access-Control-Allow-Origin: *`) sans limite de débit : quiconque connaît un `business_id` peut créer des réservations et des fiches clients.
- **Rate limiting :** limiter par IP et par `business_id`, par exemple avec Upstash Ratelimit / Redis ou un middleware Next.js. Le compteur doit être partagé entre les instances serverless : un compteur en mémoire ne suffit pas sur Vercel.
- **Vérification de l'en-tête `Origin` :** comparer `Origin` au `businesses.website_url` du commerce, renvoyer cet origin dans `Access-Control-Allow-Origin` au lieu de `*`, et refuser les autres. `Origin` est falsifiable hors navigateur, donc c'est un complément au rate limiting, pas un remplacement.

### 2.1 Route : POST /api/v1/public/reservations
Fichier : `app/api/v1/public/reservations/route.ts`

Payload JSON entrant (contrat strict) :
```json
{
  "business_id": "UUID",
  "customer": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string (optionnel)"
  },
  "booking_details": {
    "service_id": "UUID (optionnel)",
    "starts_at": "ISO8601 String",
    "party_size": "number (1-500)",
    "notes": "string (optionnel)"
  }
}
```
Au moins un des deux champs `first_name` / `last_name` est requis. L'ancien champ `full_name` reste accepté : il est découpé au premier espace.

Insertion dans `reservations` : `business_id`, `customer_id`, `guest_name` (= prénom et nom), `service_id`, `starts_at`, `party_size`, `customer_message` (= `notes`), `status: 'confirmed'`, `source: 'website'`.

Retour : `{ "success": true, "reservation_id": "UUID" }`, HTTP 201.

### 2.2 Route : POST /api/v1/public/quotes
Fichier : `app/api/v1/public/quotes/route.ts`

Payload JSON entrant (contrat strict) :
```json
{
  "business_id": "UUID",
  "customer": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string (optionnel)"
  },
  "request_details": {
    "event_type": "string",
    "preferred_date": "string (YYYY-MM-DD)",
    "estimated_guests": "number",
    "message": "string"
  }
}
```
Insertion dans `quotes` : `business_id`, `customer_id`, `status: 'request'`, `request_message` (= `message`), `request_details` (= `{ event_type, preferred_date, estimated_guests }`).

Retour : `{ "success": true, "quote_id": "UUID" }`, HTTP 201.

---

## SECTION 3 : ARCHITECTURE NEXT.JS & TENANT CONTEXT

### 3.1 Structure des Dossiers
```plaintext
app/
├── (auth)/
│   └── login/page.tsx
├── (admin)/admin/             <-- Back-office plateforme (section 7, phase 4)
├── (dashboard)/
│   ├── layout.tsx             <-- Wrap avec TenantProvider
│   ├── reservations/page.tsx  <-- Vue RDV / Réservations
│   ├── quotes/page.tsx        <-- Vue Demandes de Devis / Leads
│   ├── customers/page.tsx     <-- Vue CRM Base Clients
│   └── settings/page.tsx      <-- Paramètres du Commerce
└── api/
    └── v1/
        └── public/
            ├── reservations/route.ts
            └── quotes/route.ts
providers/
└── TenantProvider.tsx         <-- Contexte React Tenant (client)
lib/v2/
├── supabase-admin.ts          <-- Client service_role typé (routes publiques uniquement)
├── supabase-server.ts         <-- Client serveur typé, session utilisateur (RLS)
├── ingestion.ts               <-- Logique partagée des routes /api/v1/public
├── tenant.ts                  <-- getTenantContext() : résolution serveur du commerce courant
├── tenant-actions.ts          <-- Server Action setCurrentBusiness()
├── roles.ts                   <-- Classement des rôles + effectiveRole()
├── statuses.ts                <-- Statuts réservations / devis
├── supabase-browser.ts        <-- Client navigateur typé, session utilisateur (RLS)
├── data/                      <-- Accès aux données par domaine (voir 4.0, 5, 6.4)
└── hooks/                     <-- Hooks React par domaine (voir 4.0)
```

### 3.2 Spécification TenantProvider (providers/TenantProvider.tsx) ✅

Architecture validée le 2026-10-06. Le parcours connecté (RLS sur `memberships` et `businesses` sous une vraie session) reste à vérifier au premier lancement. Le sélecteur de commerce dans l'interface sera fait lors de la migration de la Topbar/Sidebar.

Le provider expose, via le hook `useTenant()` :
- `currentBusiness` : ligne `businesses` du commerce sélectionné (`Tables<'businesses'>`).
- `currentRole` : rôle effectif `owner | administrator | member | viewer`, ou `null` (accès sans membership, par exemple admin plateforme).
- `userBusinesses` : commerces accessibles, triés par nom.
- `switchBusiness(businessId)` : change le commerce actif. `isSwitching` indique le rechargement en cours.

Fonctionnement :
- **Chargement côté serveur :** `app/(dashboard)/layout.tsx` (Server Component) appelle `getTenantContext()` sous la session de l'utilisateur, puis passe le résultat au provider. Pas de chargement côté client, donc pas d'écran intermédiaire vide.
- **Commerces accessibles :** `accessible_business_ids()` (RPC), puis lecture de `businesses` sur ces ids.
- **Rôle effectif :** le plus élevé parmi les memberships actives qui couvrent le commerce, soit directement (`business_id`), soit au niveau de son agence (`business_id` NULL). Ordre identique à `role_rank()` : viewer 1 < member 2 < administrator 3 < owner 4.
- **Commerce actif :** stocké dans le cookie httpOnly `vwa_business_id` par la Server Action `setCurrentBusiness`, qui vérifie l'accès. Le cookie n'est qu'une préférence : `getTenantContext()` l'ignore s'il désigne un commerce non accessible, et retombe sur le premier commerce. Les Server Components des pages peuvent appeler `getTenantContext()` pour filtrer sur le même commerce.
- **Cas limites :** sans session, redirection vers `/login` ; sans commerce accessible, un message remplace le dashboard.

---

## SECTION 4 : SPÉCIFICATIONS UI & DASHBOARD (VAGUE 1) ✅

Validée le 2026-10-06. Reste à observer au premier usage connecté : rendu des pages, temps réel, et numérotation des devis par `next_document_number` (la RPC exige une session utilisateur).

### 4.0 Couche données & hooks V2 ✅
Les pages ne doivent plus utiliser `useUserProfile` / `lib/supabase.ts` (table V1 `users`). Elles passent par :
- **`lib/v2/data/*`** : fonctions qui prennent un client Supabase typé et le `business_id`, et filtrent toujours sur `business_id` en plus de la RLS. Testables avec n'importe quel client. Types des lignes dérivés des requêtes (`ReservationWithCustomer`, `QuoteWithCustomer`), avec le client joint.
  - `reservations.ts` : `listReservations` (`scope` : `upcoming | history | all`, filtre de statut), `getReservation`, `updateReservationStatus` (pose ou efface `cancelled_at`), `createManualReservation` (rattache ou crée le client, `source: 'dashboard'`, `created_by`), `deleteReservation`.
  - `quotes.ts` : `listQuotes`, `getQuote`, `updateQuoteStatus` (pose `sent_at`, `accepted_at` ou `declined_at` selon le statut), `deleteQuote`.
  - `customers.ts` : `normalizeEmail`, `resolveCustomer`, partagés avec l'ingestion publique. Recherche par email, sinon par téléphone (fiche la plus ancienne, le téléphone n'étant pas unique). Sans email ni téléphone, renvoie `null` : la réservation n'a pas de client, seulement `guest_name`. L'ingestion publique exige toujours un email.
  - Une réservation reste « à venir » 15 min après `starts_at` (`upcomingThreshold()`, comportement repris de la V1).
- **`lib/v2/labels.ts`** : `bookingLabels(business)`, libellés tirés de `business_types.booking_noun` / `party_noun` (remplace `lib/businessConfig.ts` côté V2). `party_noun` NULL = pas de champ couverts/participants.
- **`lib/v2/datetime.ts`** : dates saisies et affichées dans le fuseau du commerce (`businesses.timezone`), pas celui du navigateur. Correct les jours de changement d'heure.
- **`lib/v2/hooks/*`** : `useReservations`, `useReservation(id)`, `useQuotes`, `useQuote(id)`, construits sur `useBusinessQuery`. Ce hook lit le commerce via `useTenant()`, recharge en temps réel (Supabase Realtime filtré sur `business_id`) et n'expose jamais les données d'un autre commerce pendant un changement de commerce.
- **`lib/v2/statuses.ts`** : `RESERVATION_STATUSES` et `QUOTE_STATUSES` (CHECK en base, sans enum généré).

Tests d'écriture du 2026-10-06 sur le commerce de démo, données nettoyées :
- **Réservations :** tous les cas passent (création manuelle, `cancelled_at` posé puis effacé, filtres `starts_at` et statut, suppression). Une mise à jour ou une suppression avec un autre `business_id` ne modifie rien et lève `NotAllowedError` (depuis l'audit RLS).
- **Ingestion (section 2) :** pas de régression après l'extraction de `customers.ts`.
- **Devis — numérotation :** contrainte `quotes_check` = `CHECK (status IN ('request','draft','cancelled') OR number IS NOT NULL)`. Hors de ces trois statuts, `updateQuoteStatus` attribue un numéro via la RPC `next_document_number(p_business, 'quote')` si le devis n'en a pas.
  - Le numéro n'est posé que si `number` est encore NULL (`.is('number', null)`). En cas d'envoi simultané, un seul numéro est gardé ; l'autre crée un trou dans la séquence.
  - Sous `service_role`, `next_document_number` levait « Authentification requise » à cause d'un défaut de la fonction, corrigé le 2026-10-06 (voir « Audit RLS » en 1.3). Chemin numéroté testé de bout en bout depuis : `sent` → `DEV-2026-0002`, numéro conservé ensuite, un seul numéro en cas d'envois simultanés. Le chemin numéroté (`sent`, `accepted`, `declined`, `expired`) n'est donc testable qu'en étant connecté. Si la RPC échoue, le statut reste inchangé (vérifié).
  - Testé sous `service_role` : `request`, `draft` et `cancelled` sans numéro, garde contre un autre commerce, suppression.

### 4.1 Vue Réservations (/reservations) ✅
Pages `app/(dashboard)/reservations/page.tsx` et `[id]/page.tsx`, sur `useReservations` / `useReservation`. Plus aucune dépendance à `useUserProfile` ni aux statuts V1 (`scheduled`, `attended`).

- **Structure V1 conservée :** onglets « À venir » (groupés par jour), « Historique » et « Calendrier », recherche, export CSV, pagination, ouverture de la modale via `?new=1`.
- **Partition sur `starts_at`**, avec le délai de grâce de 15 min.
- **Filtres par statut**, avec compteurs : `pending | confirmed | completed | no_show | cancelled`.
- **Contenu de chaque ligne :** date/heure, client (`customers.full_name`, à défaut `guest_name`), téléphone ou email, couverts (si le type de commerce en a), statut, actions.
- **Actions rapides en 1 clic** (`RESERVATION_QUICK_ACTIONS`) :
  - en attente → confirmer ou refuser ;
  - confirmée → venu, no show ou annuler ;
  - venu ↔ no show ;
  - annulée → rétablir.
- **Modale de création manuelle :** nom, email, téléphone, date et heure dans le fuseau du commerce, couverts, note interne. Créée avec `source: 'dashboard'` et le statut `confirmed`.
- **Détail :** message du client et note interne séparés, prestation, liens `mailto:` / `tel:`, suppression avec confirmation.
- **Validé :** `tsc`, `eslint`, `next build`, logique de données testée en écriture sur le commerce de démo, fonctions de date testées (y compris les changements d'heure). **Non validé :** le rendu dans le navigateur avec une session réelle.

### 4.2 Vue Devis & Demandes (/quotes) ✅
La section « Devis » couvre **toutes les demandes entrantes** : privatisations, demandes d'informations, événements particuliers, propositions. L'interface dit donc « Demandes & devis » et des libellés neutres (« Nouvelle demande », « En cours », « Proposition envoyée », « Classée sans suite »…), dans `QUOTE_STATUS_UI`.

- **`/quotes` :** vue en deux colonnes à partir de `lg`.
  - À gauche, les cartes : contact, type, invités, extrait du message, date de réception, statut.
  - À droite, le détail de la demande sélectionnée.
  - Recherche, filtres par statut avec compteurs, export CSV.
  - Sous `lg`, un clic ouvre `/quotes/[id]`.
- **`/quotes/[id]` :** même détail, en lien direct ou sur mobile.
- **Composant commun :** `app/(dashboard)/quotes/_components/QuoteDetail.tsx`.
- **Contenu du détail :**
  - contact (nom, email, téléphone) ;
  - type de demande, date souhaitée, invités estimés, lus dans `request_details` ; les autres clés éventuelles sont affichées telles quelles ;
  - numéro et montant s'ils existent ;
  - message brut (`request_message`).
- **Actions :**
  - `mailto:`, `tel:`, WhatsApp (`wa.me`, numéro national converti en international selon `businesses.country` ; bouton masqué si la conversion est impossible) ;
  - sélecteur de statut : `request | draft | sent | accepted | declined | cancelled` (`expired` n'est pas un choix manuel). Le statut « contacté » du cahier initial devient `draft` ou `sent` ;
  - suppression avec confirmation.
- **À observer au premier envoi connecté :** attribution du numéro par `next_document_number`.

---

## SECTION 5 : CLIENTS & PARAMÈTRES DU COMMERCE (VAGUE 2) — 🟡 code fait, à valider connecté

### 5.1 Vue Clients (/customers)
Remplace l'ancienne page `/clients`, qui reconstituait les clients à partir des devis, réservations, avis et commandes. `/clients` redirige désormais vers `/customers`, et les liens de navigation pointent vers `/customers`.

- **Données** (`lib/v2/data/customers.ts`, hooks `useCustomers` / `useCustomer`) :
  - `listCustomers` : pagination côté serveur (25 par page), recherche sur prénom, nom, email et téléphone (chaque mot saisi doit se retrouver dans l'un de ces champs), filtre par `source`. Exclut les clients anonymisés (`anonymized_at`). Les statistiques viennent de la vue `v_customer_profiles_360`. Les caractères qui structurent un filtre PostgREST sont retirés du terme recherché.
  - `getCustomerDetail` : fiche, statistiques, réservations et demandes du client, ou `null` si le client est absent ou appartient à un autre commerce.
  - `createCustomer` : création manuelle (`source: 'manual'`). Si un doublon existe (même email, ou même téléphone quand il n'y a pas d'email), rien n'est créé et la fonction renvoie `{ created: false, id, matchedBy }`.
  - `updateCustomer` : modification de la fiche. Un email déjà porté par un autre client lève `DuplicateCustomerError` avec l'id de l'autre fiche.
  - Emails toujours normalisés avec `normalizeEmail`.
- **`/customers`** : tableau, recherche instantanée (300 ms après la dernière frappe), filtre par source, pagination, export CSV de tous les résultats filtrés, modale de création ouverte par le bouton ou par `?new=1`.
- **`/customers/[id]`** : fiche (source, statut bloqué, ancienneté), coordonnées modifiables, contact rapide (`mailto:`, `tel:`, WhatsApp), chiffres, habitudes, notes internes, étiquettes, historique des réservations et des demandes avec liens vers leur détail. Détail en 9.11.
- **Non repris de la V1 :** la « campagne email » de l'ancienne page Clients, qui relève du module `campaigns`.

### 5.2 Paramètres du commerce (/settings)
`page.tsx` est un Server Component : il charge le commerce courant, ses horaires et le profil de l'utilisateur. Les formulaires sont dans `_components/SettingsSections.tsx`.

- **Données** (`lib/v2/data/businesses.ts`) :
  - `validateBusinessInfo` / `updateBusinessInfo` : champs modifiables `EDITABLE_BUSINESS_FIELDS` (nom, description, email, téléphone, site, adresse, code postal, ville, pays, lien Maps, fuseau). Le type de commerce, le slug, l'agence et le statut ne sont pas modifiables ici.
  - `replaceBusinessHours` : insère les nouveaux créneaux puis supprime les anciens. Si la suppression échoue, les nouveaux sont retirés, pour ne laisser ni trou ni doublon. `day_of_week` va de 1 (lundi) à 7 (dimanche), et une fermeture après minuit est autorisée.
  - `updateProfile` : nom et téléphone de l'utilisateur.
  - Une écriture qui ne modifie aucune ligne (refus RLS) lève `NotAllowedError`.
- **Server Actions** (`app/(dashboard)/settings/actions.ts`) : le commerce visé est toujours le commerce courant résolu côté serveur, jamais un id envoyé par le client. `saveBusinessInfo` et `saveBusinessHours` exigent le rôle `owner` ou `administrator`. `saveProfile` est ouvert à tout utilisateur, pour son propre profil.
- **Interface :**
  - « Mon compte » (l'email de connexion reste en lecture seule) ;
  - « Mon établissement » ;
  - « Horaires d'ouverture », avec plusieurs créneaux par jour ;
  - « Sécurité & session » (mot de passe via `auth.updateUser`, déconnexion).
  
  Pour les rôles `member` et `viewer`, les formulaires de l'établissement sont désactivés et un bandeau l'explique.
- **Non repris de la V1 :** le portail de facturation (routes V1 sur la table `users`) et la réinitialisation de l'onboarding.
- **Préférences de réservation / devis — décision du 2026-10-06 :** elles iront dans `business_module_settings.settings` (jsonb), par module (`reservations`, `quotes`). Leur schéma sera défini avec le chantier API publique, en même temps que le code qui les applique (ingestion, crons). Pas d'écran d'ici là : aucun réglage sans effet réel.
- **RLS :** vérifiée le 2026-10-06, voir « Audit RLS » en section 1.3.

Tests du 2026-10-06 (commerce de démo, données nettoyées) : validation des champs et des horaires ; création, doublon par email et par téléphone, modification et email en conflit ; recherche (y compris caractères spéciaux), filtre et pagination ; isolation entre commerces ; mise à jour de l'établissement ; remplacement des horaires. La ligne `businesses` de la démo a été restaurée, sauf `updated_at`, qu'un trigger remet à l'heure courante.

---

## SECTION 6 : CONTEXTE DYNAMIQUE & UI (VAGUE 3) ✅

### 6.1 Contexte commerce
- `getTenantContext()` charge le commerce avec `business_type` (`booking_noun`, `customer_noun`, `party_noun`) et sa `vertical` (slug, label, icon), ainsi que `modules`, la liste renvoyée par `enabled_modules(p_business)`.
- On lit `enabled_modules` et non `business_module_settings.is_enabled` seul : un module activé mais non accordé (pas de plan, pas d'option, pas `is_core`) n'est pas accessible.
- `useTenant()` expose `modules` et `hasModule(slug)`.
- `lib/v2/labels.ts` (`bookingLabels`) fournit les libellés : `title` / `singularTitle` (booking), `customerTitle` / `customerSingularTitle` / `customerPlural` (customer), `showParty` / `partyTitle` / `partyCount` (party).

### 6.2 Navigation dynamique — état du 6 octobre, remplacé par les sections 7 et 9
- `lib/v2/navigation.ts` (`NAV_ITEMS`) est la source unique de la Sidebar, de la Topbar (titre de page, bouton « + ») et de la recherche (`SearchPalette`). Chaque entrée porte son `module`, son groupe et un titre fixe ou tiré du vocabulaire.
- **Correspondance entrée → module :**
  - `/reservations` et `/calendar` → reservations ;
  - `/quotes` → quotes ;
  - `/orders` et `/products` → shop ;
  - `/reviews` → reviews ;
  - `/customers` → customers ;
  - `/services` → services ;
  - `/people` → talents ;
  - `/team` → team ;
  - `/projects` → projects ;
  - `/blog` → blog ;
  - `/campaigns` et `/email` → campaigns ;
  - `/messaging` → inbox ;
  - `/stats` et `/analytics` → analytics ;
  - `/reputation` → google_reviews.
- **Entrées sans module** (`module: null`, toujours visibles) : accueil, Mini CRM, facturation de l'abonnement, support, paramètres.
- **Retirées de la navigation le 2026-10-06** (aucun module V2) : Réseaux sociaux, Chatbot web, Référencement, Publicité digitale, Programme fidélité, Site multilingue, Finance, Espace équipe, Chèques cadeaux, Assistant IA. Leurs pages V1 restent joignables par URL (titre conservé dans la Topbar). Elles reviendront dans `NAV_ITEMS`, avec leur slug, quand leur module existera. La page Contenu (`/content`, simple redirection vers l'accueil) est supprimée.
- **Libellés dynamiques :** « Réservations » devient `booking_noun` (Rendez-vous, Leçons, Consultations…) et « Clients » devient `customer_noun` (Patients, Élèves…), dans la Sidebar, la Topbar, la recherche et les pages `/customers`. Les boutons « + » suivent (« + Leçon », « + Élève »). Il n'y en a pas sur une page dont le module est inactif.
- **Badges de la Sidebar en V2**, chacun calculé seulement si le module est actif :
  - réservations du jour, selon `starts_at` dans le fuseau du commerce ;
  - demandes au statut `request` ;
  - avis au statut `pending` ;
  - commandes au statut `pending`.
- **Constat sur les données de dev :** la démo (barbier) n'a pas le module `reservations` (non core, sans plan) : ses menus Réservations et Calendrier sont masqués. FiFi a son plan `dev`.
- **Encore en V1 :** `NotificationBell` (colonnes `customer_name`, `date`) et le compteur de support de la Topbar (`ticket_messages.sender`, devenu `author_id` en V2). Ils seront à migrer avec le module Support. Les pages des entrées sans module restent elles aussi en V1.
- **Prévu, chantier « gating applicatif » :** bloquer dans le middleware l'accès direct par URL aux pages d'un module inactif (décision du 2026-10-06). Aujourd'hui, seuls les menus sont masqués.
- **Démo :** pour qu'un module non core (ex. `reservations`) apparaisse, 'is_enabled' ne suffit pas : il faut aussi un plan actif qui l'inclut (`business_plans` → `plan_modules`) ou une option (`business_addons`), sinon `enabled_modules` l'écarte.

### 6.3 Test en session réelle — 2026-10-06 (menu de l'époque, voir section 9 pour le menu actuel)
Méthode : sessions ouvertes par lien magique admin (`generateLink` + `verifyOtp`, aucun email envoyé) pour `test-auth@vwa.local` (owner de l'agence Vibe Web Agency) et `lecteur-test@vwa.local` (viewer FiFi). Les pages sont rendues par `next start` avec les cookies `@supabase/ssr`. Les données de test ont été nettoyées, le compteur de numérotation restauré, et seules les sessions du test ont été fermées (`signOut({ scope: 'local' })`).

- ✅ **Sans session :** redirection vers `/login`.
- ✅ **Navigation et vocabulaire :** Sidebar de FiFi filtrée par modules (Commandes, Produits, Profils et Projets masqués), libellés « Réservations », « Clients », « Demandes & devis ».
- ✅ **Navigation épurée** (re-testée en session owner et viewer) : 13 entrées sur FiFi (accueil ; Réservations, Calendrier, Demandes & devis, Avis, Clients ; Services, Équipe, Actualités ; Statistiques, Analyse web ; Mini CRM, Facturation). Aucune des 11 entrées retirées, `/content` en 404, `/seo` joignable par URL.
- ✅ **Rôles :**
  - owner : formulaires de paramètres actifs, bouton « Nouveau » présent ;
  - viewer : bandeau lecture seule, pas de bouton « Nouveau ». Changement de statut et modification de l'établissement refusés par la RLS (`NotAllowedError`), rien n'est modifié.
- ✅ **Isolation :** un cookie pointant vers un commerce d'une autre agence est ignoré. `accessible_business_ids`, `enabled_modules` et `memberships` fonctionnent sous session.
- ✅ **Numérotation :** un devis passé à `sent` en session owner reçoit son numéro (`next_document_number`, chemin membre).
- ✅ **Realtime** (corrigé le 2026-10-06) : la publication `supabase_realtime` ne contenait aucune table de `public`. `reservations`, `quotes`, `customers`, `reviews` et `orders` y sont maintenant publiées (`supabase/manual/realtime-publication.sql`, à rejouer en production). Vérifié :
  - un owner reçoit les nouvelles réservations et demandes de son commerce ;
  - un viewer FiFi reçoit celles de FiFi et **rien** de la démo, car Realtime applique la RLS ;
  - le badge « demandes » compte bien sous session.

  Note pour les tests : laisser environ 2 s entre `SUBSCRIBED` et la première insertion, le temps que Realtime enregistre le filtre.
- ✅ **Démo :** l'agence de `client-demo` n'avait aucun membre. `test-auth@vwa.local` y est rattaché comme owner (base de dev uniquement : `supabase/manual/dev-demo-agency-member.sql`). Modules synchronisés depuis son type (`supabase/manual/sync-business-modules-from-type.sql`) : 11 modules. Vérifié en session : Sidebar « Rendez-vous », « Clients », sans Commandes, Produits, Profils ni Projets ; `/reservations` titré « Rendez-vous », sans champ « Couverts ». FiFi garde « Réservations ».

### 6.4 Carte & prestations — 2026-10-06 ✅
- **Décision du 2026-10-12 : plus de module `services` pour les restaurants.** Pour `restaurant`, `pizzeria` et `bar-pub`, le module est retiré de `business_type_modules` et éteint pour les commerces existants (`supabase/manual/restaurants-without-services.sql`). FiFi n'a plus d'entrée « Formules » ; ses 4 lignes de `services` sont conservées en base, masquées. Le libellé « Formules » ne concerne plus que `caterer` et `food-truck`. Les mentions de « Formules » chez FiFi ci-dessous décrivent l'état du 6 octobre.
- **Libellés :** `bookingLabels` expose `serviceTitle` / `serviceSingularTitle` / `servicePlural` (depuis `service_noun`). `/services` s'affiche « Formules » (restaurant), « Prestations » (barbier) ou « Soins ».
- **Page `/services` migrée en V2** (`lib/v2/data/services.ts`, hook `useServices`) :
  - titre et boutons au vocabulaire du métier ;
  - cartes par catégorie ; prix en centimes (« Sur devis » si vide) ; durée facultative ; interrupteur en ligne / hors ligne ;
  - `?new=1` pour le bouton Topbar ; écriture réservée au rôle member et plus ;
  - slug généré depuis le nom (sans accents, suffixe `-2`… si déjà pris, index unique `(business_id, slug)`) et **jamais recalculé** au renommage, car le site public peut s'en servir ;
  - suppression refusée avec un message explicite si la prestation est liée à des réservations ou à des employés (FK) : on la désactive à la place.
- **Accords de genre :** `bookingLabels` fournit des formes accordées pour chaque nom (`booking`, `customer`, `service`) : `the`, `a`, `this`, `of`, `newTitle`, `none` (« Nouvelle formule », « Nouvel élève », « Aucune réservation », « cet essayage », « l'intervention »). Les noms féminins sont listés dans `FEMININE` (`lib/v2/labels.ts`) : à compléter lors de l'ajout d'un nom féminin dans `business_types`. Pages Réservations et Clients corrigées (elles affichaient « Nouveau réservation », « Détails du réservation »…).
  - Statuts des réservations accordés (2026-10-13) : `reservationStatusUI(labels.booking.feminine)` donne « Confirmée », « Annulée » ou « Confirmé », « Annulé ». Ne pas lire les libellés autrement.
- **Page `/menu` (« Carte »)**, entrée de navigation liée au module `menu`, bouton Topbar « + Plat » :
  - rubriques et plats, ordre réglable (↑/↓), plat disponible ou indisponible, allergènes (les 14 du CHECK de `menu_items.allergens`), prix facultatif ;
  - données dans `lib/v2/data/menu.ts`, hook `useMenu` ;
  - une rubrique ne peut être supprimée que vide, jamais avec ses plats ;
  - écriture réservée au rôle member et plus (même seuil que la RLS) ;
  - tables non publiées en Realtime : la carte se recharge après chaque modification.
- **Données FiFi** (`supabase/manual/dev-fifi-move-dishes-to-menu.sql`) : « Plat du jour » a rejoint la rubrique « Plats ». « Bœuf bourguignon » existait déjà sur la carte à 13,50 € : la ligne de la carte est gardée (description complétée), et le prix de 29,90 € de l'ancienne version `services` n'a pas été repris. `services` ne contient plus que les formules et la privatisation.
- **Plans :** depuis la création des plans par agence, il existe deux « Pro ». Celui de Vibe Web Agency (`…0012`) n'accordait aucun module, et FiFi avait perdu Réservations et Carte. Correction immédiate : il reçoit les modules du « Pro » de l'Agence Démo (`supabase/manual/dev-vwa-pro-plan-modules.sql`). Les plans `starter` et `enterprise` de l'Agence Démo n'accordent toujours aucun module.
  - **À trancher :** plans communs à toutes les agences (`agency_id` NULL) ou plans par agence.
  - **À faire :** allumer automatiquement les modules du type à la création d'un commerce (trigger reprenant `sync-business-modules-from-type.sql`).
- **Vérifié :**
  - couche de données de la carte : 14 cas en écriture sur FiFi, carte restaurée à l'identique ;
  - session réelle : FiFi affiche « Réservations », « Formules », « Carte » ; la démo affiche « Rendez-vous », « Prestations », sans carte ; le viewer voit la carte sans bouton d'édition.

## SECTION 7 : CAHIER DES CHARGES V2 (`cahier_des_charges_plan_de_travail_v2.md`)

### Phases 2 et 3 — faites le 2026-10-12
- **Réservations :**
  - `_components/CreateReservationModal.tsx` : prénom / nom, prestation (libellé `service_noun`, seulement si le commerce a le module `services`), heure de fin = début + durée de la prestation, et **sélecteur de créneaux**. Les créneaux viennent de `business_hours` (`lib/v2/slots.ts`, pas de 30 min, fermetures après minuit gérées). Chaque créneau indique ce qui est déjà réservé ; aucun n'est bloqué, la saisie manuelle de l'heure reste possible.
  - `_components/DayTimeline.tsx` : **frise du jour**, ouverte en cliquant un jour du calendrier. Une ligne par heure d'ouverture, les réservations à leur heure, un « + » pour créer sur l'heure choisie.
  - Préremplissage : `/reservations?new=1&customer=<id>` ouvre la création avec le client rempli.
- **Clients :** `_components/CustomerQuickView.tsx`, action rapide (éclair) dans la liste : contact, chiffres clés, dernières réservations et demandes, « nouvelle réservation » préremplie, lien vers la fiche.
- **Catalogue :** `/services` et `/menu` (section 6.4).
- **Temps réel :** badges de la Sidebar et listes abonnés à `supabase_realtime` (section 6.3).
- **Mises à jour optimistes :** `useBusinessQuery().optimistic(updater, action)` applique le changement à l'écran, lance l'écriture, puis recharge. En cas d'échec, le rechargement rétablit l'état réel. Utilisé pour les statuts des réservations et des demandes, l'interrupteur des prestations et la disponibilité des plats.
- **Vérifié :** calcul des créneaux (9 cas), 13 vérifications en session réelle (pages, horaires sous RLS, réservation avec prestation et heure de fin, préremplissage, statistiques). **Non vérifié :** les interactions dans un navigateur (clics dans la frise et le sélecteur).

### Périmètre réduit aux pages V2 — 2026-10-12
Décision : ne garder que ce qui sert aux quatre premiers clients. Tout ce qui lisait le schéma V1 est supprimé (retrouvable dans l'historique git) et reviendra réécrit en V2, module par module.
- **Menu** (`lib/v2/navigation.ts`) : Vue d'ensemble, Réservations, Demandes & devis, Clients, Prestations, Carte, Paramètres. Cette liste **remplace** celles des sections 6.2 et 6.3 (Mini CRM, facturation, support, statistiques, calendrier, avis, équipe… n'existent plus).
- **Accueil** (`app/(dashboard)/page.tsx`) réécrit en V2 : prochaines réservations (hors annulées, compteurs du jour et en attente) et demandes au statut `request`, chacun affiché seulement si son module est actif. Raccourcis de création masqués sous le rôle member.
- **Supprimé :** 35 pages V1 du dashboard, l'inscription V1 (`/signup`, `/api/auth/signup`), le support (`/messages`), les composants `Navbar`, `AdminNavbar`, `NotificationBell`, `OnboardingModal`, `LockedScreen`, et les fichiers V1 devenus inutiles de `lib/` (`supabase.ts`, `useUserProfile`, `useFeatureAccess`, `businessConfig`, `plans`, `formatters`, `statusConfig`, `sharedStyles`, `database.v2.types`). Sidebar : plus de verrous par plan ni de badges avis / commandes.
- **Connexion :** `/login` envoie les admins plateforme (`is_platform_admin`) vers `/admin`, les autres vers `/`. `/auth/callback` n'écrit plus dans la table V1 `users`. Les pages mot de passe utilisent le client V2.
- **Routes d'API V1 supprimées le 2026-10-12 :** facturation, campagnes, crons, invitation, commandes, tickets, désinscription, webhook Stripe, avec leurs fichiers `lib/` (`supabase-admin`, `supabase-server`, `database.types`, `emails`, `resend`, `stripe`, `twilio`…) et `vercel.json` (cron des rappels). Il ne reste dans `lib/` que `utils.ts` et `v2/`, et dans `app/api` que `v1/public/*` et `revalidate-iconik` (relais vers un site client, sans lien avec la base). Les rappels, les emails et Stripe seront réécrits en V2 quand ils seront nécessaires.
- **Création de compte :** par invitation depuis `/admin` (voir ci-dessous). L'inscription libre n'a plus de page ; le trigger `handle_new_user` crée toujours un établissement de démonstration pour un compte créé hors invitation.

### Phase 4 — back-office plateforme (`/admin`) — 2026-10-12
Remplace entièrement l'espace admin V1 (9 pages, 10 routes `/api/admin`, supprimées).
- **Accès :** réservé aux profils de `platform_admins` (RPC `is_platform_admin`). `getPlatformAdmin()` (`lib/v2/admin.ts`) est appelé par le layout, par chaque page et par **chaque Server Action** avant tout usage de la clé de service. Sans session : `/login`. Connecté sans être admin : `/`.
- **`/admin/tenants`** : liste (agence, type, statut, plan) et création (nom, identifiant d'URL, agence, type, statut ; le trigger `businesses_activer_coeur` active les modules du type).
- **`/admin/tenants/[id]`** : nom, type, statut ; plan en cours ; modules du commerce (`business_module_settings.is_enabled`), avec pour chacun ce qui l'accorde (module de base, plan, option) et s'il est visible. L'agence n'est pas modifiable (clés composites `(id, agency_id)`).
- **`/admin/plans`** : matrice plans × modules (`plan_modules`). Les modules `is_core` ne sont pas cochables.
- **`/admin/memberships`** : rôles `owner | administrator | member | viewer` (le rôle `staff` du cahier n'existe pas), activation, et rattachement d'un compte existant par email, à une agence entière ou à un seul commerce.
- **Règles de `lib/v2/admin.ts` :**
  - un seul plan en cours par commerce (index unique partiel) : changer de plan passe l'ancien à `cancelled` puis insère le nouveau en `active`, au prix du plan ;
  - un plan d'une autre agence est refusé ;
  - le dernier propriétaire actif de niveau agence ne peut être ni rétrogradé ni désactivé (aucun trigger ne le garantit en base) ;
  - `lib/v2/admin-constants.ts` porte ce qui est importé côté client (statuts, libellés).
- **Vérifié (lecture seule, 2026-10-12) :** chargeurs sur la base de dev (4 commerces, 5 plans × 19 modules, 8 memberships) ; modules « visibles » de FiFi identiques à `enabled_modules` ; `/admin/*` redirige vers `/login` sans session et vers `/` pour un owner et un viewer ; accueil et pages V2 en 200 ; pages supprimées en 404.
- **Non vérifié :** le rendu des écrans admin et les Server Actions sous une session d'admin plateforme, car `platform_admins` est vide. La couche de données, elle, est testée (ci-dessous).

#### Invitations, clients et CRM — 2026-10-12
Menu : Tableau de bord, Clients, Prospects, Tâches, Utilisateurs, Plans & modules.
- **Invitations** (`lib/v2/admin-invite.ts`) :
  - la base ne sait pas envoyer d'email. `inviteUser` crée le compte et son lien à usage unique avec Supabase Auth (`generateLink`, type `invite`), insère la `memberships`, puis envoie l'email par Resend (`RESEND_API_KEY`, expéditeur `noreply@vibewebagency.fr`). La table `invitations` et les RPC `invite_member` / `accept_invitation` ne sont pas utilisées ;
  - le lien est toujours affiché à l'admin, pour le transmettre à la main si l'email ne part pas. Il vaut 24 heures (réglage Supabase Auth) ;
  - si l'adresse a déjà un compte, l'accès est ajouté sans email ;
  - si la membership ne peut pas être créée, le compte créé est supprimé ;
  - le lien pointe vers `/auth/confirm?token_hash=…&type=invite|recovery` (`app/auth/confirm/route.ts`), qui ouvre la session côté serveur puis redirige vers `/set-password`. Le middleware laisse passer cette route, même si une autre session est ouverte ;
  - « Renvoyer l'invitation » / « Envoyer un lien » produit un lien `recovery` ;
  - un compte jamais connecté est affiché « Invitation en attente » (`profiles.status = 'invited'`, voir 1.2).
- **Trigger `handle_new_user`** (`supabase/manual/handle-new-user-invited.sql`, à rejouer en production) : un compte invité porte `vwa_invited = true` dans ses métadonnées et ne reçoit **pas** d'établissement de démonstration. L'agence par défaut des inscriptions libres est maintenant l'agence interne, et non plus une agence prise au hasard (`LIMIT 1` sans ordre).
- **Nouveau client** (`/admin/tenants/new`) : commerce, plan, email du propriétaire, en un seul envoi. Le commerce créé n'est pas annulé si le plan ou l'invitation échoue : l'étape est signalée et se refait depuis la fiche. `?prospect=<id>` préremplit depuis un prospect et le passe à « signé ».
- **Fiche client** : en plus du plan et des modules, section « Accès » (membres directs et membres de niveau agence, invitation verrouillée sur ce commerce) et section « Suivi » (tâches du client).
- **CRM** (`lib/v2/admin-crm.ts`), sur les tables existantes :
  - `prospects` appartient à l'agence interne (`agencies.is_internal`) ; statuts `nouveau | contacte | en_discussion | signe | perdu`. Contraintes en base : « perdu » exige `lost_reason`, et `converted_at` est renseigné si et seulement si le statut est « signé ». Chaque changement de statut s'inscrit dans `prospect_activities` (`status_change`) ;
  - `converted_business_id` n'est posé que si le commerce est dans la même agence que le prospect (clé composite) ;
  - `tasks` : liée à un client **ou** à un prospect, ou à personne ; elle porte l'agence de son sujet. `done_at` est renseigné si et seulement si le statut est `done` ;
  - « en retard » est calculé côté serveur (`isLate`), pas au rendu.
- **Tableau de bord** (`/admin`) : revenu mensuel (somme de `business_plans.price_monthly_cents` des plans en cours), clients par statut, prospects en cours et leur valeur, invitations en attente, relances et tâches dues.
- **Vérifié (32 contrôles, données de test supprimées, base revenue à l'identique)** : prospects, statuts, historique, tâches, tableau de bord ; invitation d'une adresse nouvelle (profil créé, aucun établissement de démonstration, une seule membership), lien ouvrant `/set-password` puis le dashboard du commerce, lien refusé au second usage, renvoi, jeton inconnu, refus des doublons et des commerces d'une autre agence.
- **Non vérifié :** l'envoi réel de l'email par Resend (la clé était retirée du test pour ne rien envoyer) et le domaine d'expédition.
- **RLS :** corrigée le 2026-10-12, voir « Durcissement » en section 1.3.

## SECTION 9 : COMPLÉMENTS DE L'INTERFACE CLIENT — 2026-10-12

Menu actuel (`lib/v2/navigation.ts`), chaque entrée soumise à son module : Vue d'ensemble, Statistiques (`analytics`) ; Réservations, Demandes & devis, Clients, Avis (`reviews`) ; Prestations, Carte ; Équipe (`team`), Actualités (`blog`) ; Support, Paramètres.

### 9.1 Accès et navigation
- **Sélecteur de commerce :** liste déroulante dans la Sidebar, affichée seulement si le compte a plusieurs commerces (`switchBusiness`).
- **Blocage par module :** `components/ModuleGate.tsx`, posé par un `layout.tsx` dans chaque dossier de page à module. Une page dont le module est inactif affiche un message au lieu de son contenu, même ouverte par son adresse. C'est un composant **client** : il lit les modules déjà chargés par le layout du dashboard (`useTenant().hasModule`).
- **Temps de chargement (2026-10-13)** : la première version de la garde relisait le contexte du commerce côté serveur à chaque navigation, soit 4 allers-retours avec la base et environ 400 ms par page. Corrigé :
  - la garde ne fait plus aucun appel au serveur : une navigation interne vers une page cliente ne coûte plus que le middleware (environ 10 ms mesurés) ;
  - `getTenantContext()` tient en 2 étapes parallèles au lieu de 4 : (utilisateur + commerces), puis (rôle + modules). Les commerces sont lus directement dans `businesses`, que la RLS limite déjà aux commerces accessibles. Il expose aussi `user` (id, email), pour éviter un second `auth.getUser()` dans les pages ;
  - `readModuleSettings` fait une seule requête (jointure sur `modules`) ;
  - la page Paramètres lance toutes ses lectures en parallèle.
  - Mesures sur le build de production, depuis le poste de dev (proxy d'entreprise) : chargement complet d'une page 420 → 300 ms, Paramètres 1 200 → 510 ms.
  - **Règle :** pas de lecture serveur dans un `layout.tsx` de page ; ce qui dépend du commerce courant vient de `useTenant()`.
- **Accès de l'équipe** (Paramètres, propriétaire et administrateurs) : inviter par email, changer un rôle, retirer un accès (`app/(dashboard)/settings/team-actions.ts`).
  - le commerce visé est toujours le commerce courant ; on ne peut pas attribuer un rôle supérieur au sien ;
  - rôle et retrait passent par les RPC `change_member_role` / `remove_member` sous la session de l'utilisateur : la base applique ses règles ;
  - l'invitation réutilise `inviteUser` (section 7) ;
  - les membres de niveau agence apparaissent en lecture seule.
- **Mon abonnement** (Paramètres) : plan en cours, prix et modules actifs, en lecture seule. Pas de paiement en ligne.

### 9.2 API publique : anti-spam (remplace l'avertissement de la section 2.0 bis)
`lib/v2/public-guard.ts`, appelé par `refusePublicRequest` avant toute écriture.
- **Origine :** les origines autorisées sont `businesses.allowed_origins` et le site du commerce (`website_url`), avec ou sans `www`. Une autre origine reçoit 403. Si rien n'est configuré, tout passe (démo, site pas encore en ligne). Une requête sans en-tête `Origin` (serveur à serveur) passe aussi : seule la limite de débit la retient. `Access-Control-Allow-Origin` reste `*` ; le refus se fait par le 403.
- **Limite de débit :** 10 demandes par 10 minutes par adresse IP et par commerce, 120 par heure par commerce. Au-delà : 429 avec `Retry-After`. Le compteur est en base (`api_rate_limits`, RPC `rate_limit_hit`, clé de service uniquement ; `supabase/manual/api-rate-limits.sql`, à rejouer en production). Si le compteur est en panne, la requête passe.
- **À faire pour chaque client :** renseigner `website_url` ou `allowed_origins`, sinon son API accepte toutes les origines.

### 9.3 Messages automatiques
`lib/v2/notifications.ts` (envois), `lib/v2/mailer.ts` (Resend, Twilio).
- **Ce qui part :**
  - confirmation par email au client, à l'arrivée d'une réservation par le site, ou sur demande à la création manuelle (case à cocher) ;
  - avis par email au commerce (`businesses.email`) pour chaque réservation ou demande venue du site ;
  - rappel la veille par email, et par SMS si le commerce l'active **et que son offre en inclut** (voir « SMS payants » ci-dessous).
- **Réglages :** quatre interrupteurs dans Paramètres → Messages automatiques, rangés dans `business_module_settings.settings.notifications` du module `reservations` (les préférences de réservation prévues en 5.2 commencent ici). Défauts : tout actif sauf le SMS.
- **Journal et dédoublonnage :** chaque envoi est d'abord inscrit dans `outbound_messages` avec une clé d'idempotence (`reservation_confirmation:<id>`…). Un message ne part qu'une fois, et le trigger `guard_optout` écarte les destinataires désinscrits. Le statut (`sent` / `failed`) et l'erreur y sont notés.
- **Routes publiques :** les emails partent après la réponse (`after` de Next) ; un envoi raté n'annule rien.
- **Rappels :** `GET /api/cron/reminders`, protégé par `CRON_SECRET`, lancé chaque jour à 7 h UTC (`vercel.json`). Chaque exécution traite les réservations confirmées qui commencent entre 12 h et 36 h plus tard et pose `reminder_sent_at`. Une réservation prise moins de 12 h avant n'a pas de rappel.
- **Expéditeur :** `<nom du commerce> <noreply@vibewebagency.fr>`, réponses vers l'email du commerce.
- **SMS payants (2026-10-13)** : `lib/v2/usage.ts`. Le réglage du commerce ne suffit pas, il faut un droit.
  - droit mensuel = quota du plan en cours (`plan_quotas`, meter `sms`) + options actives (`business_addons.extra_monthly_limit`, meter `sms`) ;
  - consommation = somme de `usage_events` (meter `sms`) depuis le début du mois (UTC). Chaque SMS **réellement envoyé** y est inscrit, avec la clé d'idempotence du message ; un SMS en échec n'est pas compté ;
  - sans droit, ou quota atteint : aucun SMS n'est tenté (`smsSkipped` dans le compte rendu du cron) ;
  - Paramètres : l'interrupteur SMS est verrouillé si l'offre n'inclut aucun SMS, et la Server Action refuse de l'activer ; sinon il affiche la consommation du mois ;
  - `/admin` → fiche client → « SMS de rappel » : consommation et option (nombre de SMS par mois en plus du plan, 0 pour la retirer). Le quota d'un plan se règle dans `plan_quotas`, sans écran.

### 9.4 Devis chiffrés
`lib/v2/data/quote-items.ts`, `quotes/_components/QuoteBuilder.tsx`, `quotes/actions.ts`.
- Éditeur dans le détail d'une demande : objet, lignes (désignation, quantité, prix unitaire **hors taxes**, taux de TVA), remise, date de validité, message au client.
- Totaux : la remise s'applique au total HT, la TVA de chaque ligne est calculée sur sa part après remise.
- Enregistrer une demande (`request`) avec un contenu la passe en brouillon (`draft`). Modifiable en `request`, `draft` et `sent` ; figé ensuite.
- « Envoyer au client » : passe le devis à `sent` (numéro attribué par `next_document_number`) puis envoie l'email avec les lignes, les totaux, le PDF et un bouton « Voir et accepter le devis ».
- **Acceptation en ligne (2026-10-13)** : page publique `/devis/[id]?t=<jeton>` (`app/devis/[id]`), sans compte.
  - le jeton est une signature de l'identifiant du devis (`lib/v2/quote-link.ts`, HMAC dérivé de `SUPABASE_SERVICE_ROLE_KEY`) : rien n'est stocké, et changer cette clé invalide les liens déjà envoyés. Jeton absent ou faux : 404. Le middleware laisse passer `/devis/` ;
  - la page montre le devis, le lien du PDF (`/api/quotes/[id]/pdf?t=<jeton>`), et « J'accepte » / « Je refuse ». Un brouillon n'a pas de page ;
  - `lib/v2/quote-response.ts` : une seule réponse, seulement pour un devis `sent` dont la date de validité n'est pas dépassée (dernier jour inclus, heure de Paris). La Server Action revérifie le jeton ;
  - la première ouverture est notée dans `viewed_at` ; le commerce reçoit un email à la réponse.
- **PDF (2026-10-13)** : `lib/v2/quote-pdf.tsx` (`@react-pdf/renderer`, rendu serveur), `lib/v2/quote-document.ts`, route `GET /api/quotes/[id]/pdf`.
  - La route vérifie elle-même la session (le middleware ne couvre pas `/api`) et lit le devis sous RLS : sans session 401, devis hors de portée 404.
  - **Émetteur :** nom, adresse, téléphone et email viennent de « Mon établissement » ; raison sociale, SIREN/SIRET, n° de TVA et autres mentions viennent de Paramètres → « Mentions légales des devis » (`business_module_settings.settings.issuer` du module `quotes`). À l'envoi, l'émetteur est copié dans `quotes.seller` : un devis envoyé ne change plus si le commerce modifie ses coordonnées.
  - **Destinataire :** société, contact, adresse, n° de TVA, saisis dans l'éditeur et rangés dans `quotes.buyer`. Sans saisie, le contact de la demande est repris.
  - Colonnes `quotes.buyer` et `quotes.seller` ajoutées par `supabase/manual/quotes-seller-buyer.sql` (à rejouer en production).
  - Le PDF se télécharge depuis l'éditeur (après enregistrement) et part en pièce jointe de l'email. S'il ne peut pas être produit, l'email part quand même avec le détail dans le texte.
  - Les polices PDF de base ne connaissent pas les espaces insécables du format français : les montants passent par `plain()`.
  - Un devis sans numéro (jamais envoyé) porte la mention « Brouillon ».

### 9.5 Pages ajoutées
- **Avis** (`/reviews`) : filtres par statut, note moyenne des avis publiés, publier / masquer, réponse de l'établissement. Pas de suppression.
- **Équipe** (`/team`, table `employees`) : les personnes présentées sur le site. Écriture réservée aux administrateurs (RLS). Suppression refusée si la personne est liée à des réservations : on la désactive. Le planning (`shifts`) et le lien employé ↔ prestation ne sont pas faits.
- **Actualités** (`/blog`) : brouillon, publié, archivé. L'adresse (slug) vient du titre, est rendue unique et n'est jamais recalculée. La date de première publication est conservée.
- **Statistiques** (`/stats`) : sur 30 jours, 3 mois ou 12 mois ; détail en 9.11.
- **Support** (`/support` et `/admin/support`) : le commerce ouvre une demande et suit le fil ; l'agence répond depuis le back-office. `open` = à traiter par l'agence, `pending` = réponse reçue par le commerce. À l'ouverture d'une demande, l'agence reçoit un email (`notifyAgencyOfTicket`, vers `agencies.contact_email` ; rien n'est envoyé si ce champ est vide), un seul par demande.

### 9.8 Analyse web — 2026-10-13
Page `/analytics` (« Analyse web », module `analytics`), reprise de la version en production et complétée. `/stats` reste la page de l'activité (réservations, devis).
- **Source :** la table `sessions` (une ligne par visite : pages vues, provenance, largeur d'écran, durée), lue sous RLS, par pages de 1 000 lignes et jusqu'à 5 000 visites. Au-delà, les répartitions portent sur les visites les plus récentes et la page le dit ; le nombre de visites et sa tendance restent exacts (comptage en base).
- **Contenu** (`lib/v2/data/web-analytics.ts`), sur 7, 30 ou 90 jours :
  - visiteurs en ligne (activité depuis moins de 5 minutes, relu toutes les 30 secondes) ;
  - visites et évolution par rapport à la période précédente, visiteurs et visiteurs revenus, pages vues et pages par visite, durée moyenne, part des visites d'une seule page, part des accès directs ;
  - visites par jour, dans le fuseau du commerce, avec le meilleur jour ;
  - pages les plus vues, pages d'arrivée, provenance des visiteurs, appareils (mobile sous 768 px, tablette sous 1 024 px, ordinateur au-delà).
- **Microsoft Clarity (décision du 2026-10-13 : ses chiffres s'affichent dans le dashboard).** L'agence installe Clarity sur le site ; le dashboard relève ses chiffres.
  - **Où sont les jetons :** `business_integrations` (provider `clarity`, `account_id` = identifiant du projet, `refresh_token` = jeton d'API). Table réservée au serveur : RLS sans politique, aucun droit pour `anon` ni `authenticated`. Le jeton n'est jamais renvoyé au navigateur.
  - **Ce qui est public :** `business_module_settings.settings.clarity = { project_id, connected }` (module `analytics`), pour le bouton « Ouvrir Clarity » et l'état de la liaison. Jamais le jeton.
  - **Liaison :** sur la page Analyse web, un propriétaire ou un administrateur saisit l'identifiant et le jeton (Clarity → Paramètres → Exportation de données). La Server Action `saveClarityConnection` essaie le jeton avant de l'enregistrer et garde ce premier relevé. Jeton refusé : rien n'est enregistré. Identifiant vide : le commerce est délié, les chiffres déjà relevés restent.
  - **Relevé :** `lib/v2/clarity.ts`, `GET /api/cron/clarity` (protégé par `CRON_SECRET`, chaque jour à 23 h UTC, `vercel.json`). L'API d'export (`project-live-insights?numOfDays=1`) couvre les dernières 24 heures et accepte 10 appels par projet et par jour. Un relevé fait **4 appels** : l'ensemble du site, puis `dimension1=URL`, `Device` et `Source`. Il est rangé à la date du jour (UTC) dans `clarity_daily_metrics` (`supabase/manual/clarity-daily-metrics.sql`, à rejouer en production) ; un second relevé le même jour remplace le premier. Un détail qui échoue est simplement absent, et l'échec d'un projet n'arrête pas les autres.
  - **Pas de heatmaps ni d'enregistrements dans l'API :** ils ne se consultent que dans Clarity. La page y renvoie par deux boutons.
  - **Forme des réponses (constatée sur le projet de FiFi le 2026-10-13) :**
    - ensemble : `Traffic` (`totalSessionCount`, `totalBotSessionCount`, `distinctUserCount`, `pagesPerSessionPercentage`), `ScrollDepth` (`averageScrollDepth`), `EngagementTime` (`activeTime`), et pour `DeadClickCount`, `RageClickCount`, `QuickbackClick`, `ExcessiveScroll`, `ScriptErrorCount`, `ErrorClickCount` le champ `sessionsWithMetricPercentage` ;
    - la réponse d'ensemble contient aussi des répartitions `{ name, sessionsCount }` : `Browser`, `Device`, `OS`, `Country`, `ReferrerUrl`, `PageTitle`, et `PopularPages` (`url`, `visitsCount`) ;
    - réponse découpée : les mêmes indicateurs, une ligne par valeur, la valeur dans un champ `Url`, `Device` ou `Source`. Une provenance vide désigne les accès directs.
  - **Table `clarity_daily_metrics` :** `metrics` = chiffres d'ensemble, `distributions` (navigateurs, systèmes, pays, sites d'origine) et `breakdowns` (pages, appareils, provenances) ; `raw` = les quatre réponses brutes. Lecture : membres du commerce (RLS, viewer). Écriture : clé de service uniquement.
  - **Affichage** (`analytics/_components/ClarityPanel.tsx`) :
    - chiffres d'ensemble : visites hors robots, défilement, temps actif, pages par visite ;
    - signaux de gêne : clics de rage, clics morts, retours rapides, défilement excessif, erreurs. En rouge au-dessus d'un seuil indicatif (3, 15, 15, 10 et 5 % des visites) ;
    - « Pages à regarder en priorité » : pour chacun des trois premiers signaux, la page la plus touchée parmi celles d'au moins 10 visites ;
    - tableaux page par page, par appareil et par provenance ; répartitions par pays, navigateur, système et site d'origine ; visites relevées par jour.
    - Volumes additionnés, autres mesures en moyenne pondérée par les visites de chaque jour. Les pages sont regroupées par chemin, et les adresses à identifiant (`/reserver/<uuid>`) en une seule ligne `/reserver/…`.
  - **Limite :** l'historique commence le jour de la liaison ; l'API ne remonte pas plus loin que 3 jours.
  - **Vérifié sur des données réelles :** le relevé de FiFi (139 visites) ; les sommes par page, par appareil et par provenance égalent le total. **Non vérifié :** le déclenchement du cron par Vercel.
- **Règle :** les réglages de module (`lib/v2/data/module-settings.ts`) sont lisibles par un visiteur anonyme. Aucun secret n'y va.
- **Vérifié :** sur FiFi, le total égale le nombre de lignes en base (216), la somme des jours égale le total, les répartitions sont cohérentes ; un viewer ne lit rien d'un autre commerce et ne peut pas changer l'identifiant Clarity.

### 9.9 Fiche Google et avis Google — 2026-10-13
- **Où va l'identifiant :** `businesses.gbp_place_id` = identifiant de lieu Google (`ChIJ…`). `businesses.google_location_id` et la table `google_connexions` sont réservés à la connexion Google du commerce (ci-dessous), pas encore faite.
- **Choix définitif pour le commerce (décision du 2026-10-13) :** une fiche reliée ne se change ni ne se délie depuis la page Avis. Le commerce confirme son choix avant de relier, puis la page le renvoie vers le support. `claimGooglePlace` n'écrit que si `gbp_place_id` est encore NULL (deux demandes simultanées n'en relient qu'une), et la recherche de fiche est refusée une fois la fiche reliée. Seule l'agence délie : `/admin` → fiche client → « Fiche Google » (`resetGoogleListing`, qui efface aussi la note et les avis relevés). Ce n'est pas garanti en base : un administrateur du commerce qui écrirait directement dans `businesses` passerait outre ; un trigger serait à ajouter si cela compte.
- **Liaison** (page Avis, propriétaire et administrateurs) : recherche de la fiche par nom et ville (`places:searchText`), ou saisie directe de l'identifiant. La fiche est lue avant d'être enregistrée ; un identifiant faux n'est jamais gardé. `app/(dashboard)/reviews/actions.ts`, `lib/v2/google-places.ts` (API Places (New), clé `GOOGLE_PLACES_API_KEY`, serveur uniquement).
- **Ce qui est relevé :** la note moyenne, le nombre d'avis et le lien vers la fiche, rangés dans `business_module_settings.settings.google` du module `reviews` (informations publiques). Relevé à la liaison, puis chaque matin par le cron `/api/cron/reminders`, qui regroupe les tâches du matin.
- **Texte des avis — constat du 2026-10-13 :** avec la clé du projet, Places renvoie la note et le nombre d'avis mais **pas** le champ `reviews`, et l'ancienne API Places répond « You must enable Billing ». La cause la plus probable est donc la facturation non activée sur le projet Google Cloud ; ce n'est pas confirmé. Le code d'import est en place : dès que Google renvoie les avis (5 au plus), ils entrent dans `reviews` (source `google`, statut `published`, `external_id` = `places/<lieu>/reviews/<avis>`).
- **Remplacement à chaque relevé :** les avis venus de Places ne sont pas accumulés. Chaque relevé garde ceux que Google renvoie ce jour-là et retire les autres, car les conditions de Places interdisent de conserver durablement son contenu. Les avis Google d'une autre origine (`external_id` sans le préfixe `places/`) ne sont jamais touchés.
- **Dans la page Avis :** un avis Google est en lecture seule (ni modération ni réponse ici) ; un bouton mène à la fiche Google pour répondre.
- **Tous les avis et la réponse depuis le dashboard : pas fait.** Il faut la connexion Google du commerce (OAuth, portée `business.manage`) et l'accès à l'API des fiches d'établissement, que Google n'accorde que sur demande. À faire quand l'agence aura un projet Google Cloud avec cet accès et un identifiant client OAuth. La table `google_connexions` (serveur uniquement) et la vue `v_google_connections_status` sont prêtes à recevoir le jeton.
- **Vérifié sur l'API réelle :** recherche de la fiche de FiFi, lecture de sa note (4,1 sur 29 avis), identifiant inconnu ou mal formé refusé, remplacement des avis, retrait à la déliaison.

### 9.6 Vérifications du 2026-10-12
Données de test supprimées à chaque fois, aucun email ni SMS réellement envoyé (clés retirées des tests).
- anti-spam et messages : 21 contrôles (origines, compteur, 403, 429, confirmation journalisée une seule fois, fenêtre des rappels, envoi après la réponse) ;
- devis : 10 contrôles (totaux, remplacement des lignes, refus d'un autre commerce, devis figé) ;
- pages et accès : 35 contrôles en session réelle (pages, menu, sélecteur, garde de module, droits du viewer, avis, équipe, actualités, statistiques, support).
- devis en PDF, mentions légales et analyse web (2026-10-13) : 16 contrôles en session réelle, et le PDF produit a été relu (mise en page, accents, montants).
- **Non vérifié :** l'envoi réel par Resend et Twilio, le déclenchement du cron par Vercel, les Server Actions de l'équipe et de l'envoi de devis (appelées seulement par un navigateur), et tout clic dans un navigateur.

### 9.11 Statistiques et fiche client selon le secteur — 2026-10-13
Rien n'est écrit « pour les restaurants » : chaque bloc dépend d'un trait du commerce.
- **Traits :**
  - `party_noun` non NULL (`labels.showParty`) → blocs couverts / joueurs / personnes, au vocabulaire du type ;
  - verticale (`lib/v2/verticals.ts`, `dayParts`) → découpage de la journée : « Midi » (dès 5 h) et « Soir » (dès 16 h) pour `food`, « Matin », « Après-midi » (12 h), « Soir » (18 h) ailleurs. Les heures d'après minuit comptent dans le dernier moment. Pour un autre découpage par secteur, c'est ici qu'on l'ajoute ;
  - modules actifs → prestations, demandes et devis, note des avis.
- **`/stats`** (`lib/v2/data/stats.ts`, `computeReservationStats` est pure et testée) :
  - réservations et couverts avec l'évolution par rapport à la période précédente de même durée ; couverts par réservation et plus grand groupe ; taux d'annulation ; taux d'absence ; nouveaux clients ; part des clients qui avaient déjà une fiche avant la période ; délai médian entre la prise de réservation et sa date ; jour le plus chargé ;
  - répartitions : par jour de la semaine (réservations, et couverts), par moment de la journée (avec la moyenne de couverts), par heure, par taille de groupe (1, 2, 3 à 4, 5 à 6, 7 et plus), par prestation, par provenance (`reservations.source`) ;
  - les annulées ne comptent ni dans les réservations ni dans les couverts ;
  - les réservations sont lues par pages de 1 000 (20 000 au plus), sur deux fois la période.
- **Fiche client** (`/customers/[id]`, `lib/v2/customer-insights.ts`, pure et testée) :
  - prochaine réservation, bouton de nouvelle réservation préremplie ;
  - venues (notées « venu », ou passées et restées confirmées), couverts au total et par réservation, absences et leur part, annulations ; total payé et note seulement s'ils existent ;
  - habitudes : jour, moment et prestation préférés (au moins deux fois), rythme moyen entre deux venues, première et dernière venue ;
  - pastille : Nouveau (au plus une venue), Habitué (deux et plus), Fidèle (cinq et plus), À relancer (absent depuis plus de deux fois son rythme et plus de 30 jours, sans réservation à venir) ;
  - **notes internes** (`customer_notes`, écriture member, jamais montrées au client) et **étiquettes** libres (`customers.tags`, 12 au plus, 30 caractères, sans doublon) ;
  - consentement aux messages promotionnels, en lecture seule.
  - La liste des clients et l'aperçu rapide lisent toujours « visites » dans `v_customer_profiles_360` (réservations notées « venu » seulement) : les deux chiffres peuvent différer tant que l'issue n'est pas notée.
- **Vérifié :** 8 tests de plus (calculs, droits sur les notes et les étiquettes, fiche Google reliée une seule fois) ; pages rendues sous session sur FiFi (restaurant) et la démo (barbier), à 375 et 1 280 px, sans débordement ni erreur. **Non vérifié :** les clics (ajout de note, d'étiquette, confirmation de la fiche Google) et l'écran « Fiche Google » du back-office.

### 9.10 Tests automatiques — 2026-10-13
`npm test` (lanceur de tests de Node avec `tsx`, dossier `tests/`, mode d'emploi dans `tests/README.md`). 40 tests : droits par rôle, API publique, devis (contenu, PDF, lien public, réponse), messages automatiques et SMS, règles de calcul.
- Ils écrivent en base : `tests/helpers.ts` refuse de tourner ailleurs que sur le projet de développement.
- Ils retirent les clés Resend et Twilio du processus : aucun envoi réel.
- Les tests HTTP sont ignorés si aucun serveur ne répond sur `TEST_BASE_URL`.
- **Règle :** toute vérification qui mérite d'être refaite va dans `tests/`, pas dans un script jetable.

### 9.7 Non fait, en attente de décisions
- **Boutique** (`products`, `orders`) : une commande ne peut plus être créée par le site (insertion anonyme fermée) et aucun paiement n'est branché.
- **Campagnes** (`campaigns`) : envoi en masse, donc consentement, lien de désinscription et domaine d'expédition à trancher.
- **Paiement de l'abonnement** (Stripe) : seul l'affichage du plan existe.

## FEUILLE DE ROUTE D'EXÉCUTION PAS À PAS
Lorsque vous travaillez sur cette base de code, suivez l'ordre strict suivant :

1. ✅ Importer `types/supabase.ts` et vérifier la connexion au nouveau projet Supabase V2 dans `.env.local`.
2. ✅ Implémenter les deux Route Handlers d'ingestion publique (`/api/v1/public/reservations` et `/api/v1/public/quotes`).
3. ✅ Créer le TenantProvider et le wrapper dans `app/(dashboard)/layout.tsx`.
4. ✅ Implémenter la vue `/reservations` (affichage, changement de statut, ajout manuel).
5. ✅ Implémenter la vue `/quotes` (split-screen, gestion des leads).
6. 🟡 (code fait, à valider connecté) Implémenter la vue `/customers` (liste et historique) — section 5.1.
7. 🟡 (code fait, préférences réservation/devis en attente de décision) Implémenter les paramètres du commerce `/settings` — section 5.2.
8. ✅ Contexte dynamique (verticale, vocabulaire, modules) et navigation — section 6.

---

## ANNEXE : MAPPING ET USAGE DES VARIABLES D'ENVIRONNEMENT (`.env.local`)

L'application s'appuie strictement sur les variables d'environnement suivantes :

### 1. Base de Données & Auth (Supabase V2)
- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase V2.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé publique/anon pour les requêtes client et RLS.
- `SUPABASE_SERVICE_ROLE_KEY` : Clé secrète d'administration (utilisée UNIQUEMENT dans les endpoints d'ingestion `/api/v1/public/*` pour bypasser le RLS lors des UPSERTS).

### 2. Core & URLs de l'Application
- `NEXT_PUBLIC_SITE_URL` : URL publique du dashboard (`https://dashboard.vibewebagency.fr`).
- `VWA_SITE_URL` : URL du site agence principal (`https://vibewebagency.fr`).
- `REVALIDATE_SECRET` : Clé de revalidation du cache Next.js (On-Demand ISR).
- `CRON_SECRET` : Clé de sécurisation des tâches automatiques (relances RDV, nettoyage BDD).

### 3. Facturation & Subscriptions (Stripe)
- `STRIPE_SECRET_KEY` : Clé d'API Stripe côté serveur pour la création de sessions/abonnements.
- `STRIPE_WEBHOOK_SECRET` : Secret pour valider les webhooks Stripe entrants (`app/api/webhooks/stripe/route.ts`).

### 4. Notifications & SMS (Communication Clients)
- `RESEND_API_KEY` : Envoi d'emails transactionnels (confirmations de RDV, notifications de devis).
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` : Envoi de SMS automatiques de confirmation ou rappels de RDV.

### 5. Intégrations Tierces
- `GOOGLE_PLACES_API_KEY` : Récupération des avis, adresses et photos pour la configuration automatique des fiches commerces.

---

## NOTES D'ENVIRONNEMENT (constatées)

- Projet Supabase V2 (dev) : ref `oeejvntknmpmgbbppolh`, variables dans `.env.local`.
- Réseau d'entreprise avec proxy TLS : Node doit tourner avec `--use-system-ca` (ou `NODE_OPTIONS=--use-system-ca`), sinon `SELF_SIGNED_CERT_IN_CHAIN`. Ne pas désactiver la vérification TLS.
- La CLI Supabase 2.x n'utilise pas le magasin de certificats Windows : exporter les racines Windows en PEM, puis préfixer la commande de génération par `NODE_EXTRA_CA_CERTS=<roots.pem> SSL_CERT_FILE=<roots.pem>`.
- `text.txt` = dump du schéma de dev (64 tables). Il n'inclut ni les vues (`campaign_stats`, `customer_stats`, `google_connexions_etat`), ni les index uniques, ni les CHECK multi-colonnes (ex. `quotes_check`), ni les triggers. Pour ces éléments, interroger `pg_indexes` / `pg_constraint` / `pg_trigger`.
- Le contrôle d'accès avant chaque page est dans `proxy.ts` (nom du `middleware` depuis Next 16 ; le texte de ce document dit encore « middleware »). Il exclut `/api/*` : les routes publiques ne sont pas redirigées vers `/login`.
