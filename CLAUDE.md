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

**CRM Ingestion :** `customers`.
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
- Un client existant n'est jamais écrasé par un formulaire public : on complète seulement `full_name` et `phone` s'ils sont vides.
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
    "full_name": "string",
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
Insertion dans `reservations` : `business_id`, `customer_id`, `guest_name` (= `full_name`), `service_id`, `starts_at`, `party_size`, `customer_message` (= `notes`), `status: 'confirmed'`, `source: 'website'`.

Retour : `{ "success": true, "reservation_id": "UUID" }`, HTTP 201.

### 2.2 Route : POST /api/v1/public/quotes
Fichier : `app/api/v1/public/quotes/route.ts`

Payload JSON entrant (contrat strict) :
```json
{
  "business_id": "UUID",
  "customer": {
    "full_name": "string",
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
  - `listCustomers` : pagination côté serveur (25 par page), recherche sur nom, email et téléphone, filtre par `source`. Exclut les clients anonymisés (`anonymized_at`). Les statistiques viennent de la vue `customer_stats`. Les caractères qui structurent un filtre PostgREST sont retirés du terme recherché.
  - `getCustomerDetail` : fiche, statistiques, réservations et demandes du client, ou `null` si le client est absent ou appartient à un autre commerce.
  - `createCustomer` : création manuelle (`source: 'manual'`). Si un doublon existe (même email, ou même téléphone quand il n'y a pas d'email), rien n'est créé et la fonction renvoie `{ created: false, id, matchedBy }`.
  - `updateCustomer` : modification de la fiche. Un email déjà porté par un autre client lève `DuplicateCustomerError` avec l'id de l'autre fiche.
  - Emails toujours normalisés avec `normalizeEmail`.
- **`/customers`** : tableau, recherche instantanée (300 ms après la dernière frappe), filtre par source, pagination, export CSV de tous les résultats filtrés, modale de création ouverte par le bouton ou par `?new=1`.
- **`/customers/[id]`** : fiche (source, statut bloqué, ancienneté), coordonnées modifiables, contact rapide (`mailto:`, `tel:`, WhatsApp), statistiques, historique des réservations et des demandes avec liens vers leur détail.
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

### 6.2 Navigation dynamique
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

### 6.3 Test en session réelle — 2026-10-06
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
- **Libellés :** `bookingLabels` expose `serviceTitle` / `serviceSingularTitle` / `servicePlural` (depuis `service_noun`). `/services` s'affiche « Formules » (restaurant), « Prestations » (barbier) ou « Soins ».
- **Page `/services` migrée en V2** (`lib/v2/data/services.ts`, hook `useServices`) :
  - titre et boutons au vocabulaire du métier ;
  - cartes par catégorie ; prix en centimes (« Sur devis » si vide) ; durée facultative ; interrupteur en ligne / hors ligne ;
  - `?new=1` pour le bouton Topbar ; écriture réservée au rôle member et plus ;
  - slug généré depuis le nom (sans accents, suffixe `-2`… si déjà pris, index unique `(business_id, slug)`) et **jamais recalculé** au renommage, car le site public peut s'en servir ;
  - suppression refusée avec un message explicite si la prestation est liée à des réservations ou à des employés (FK) : on la désactive à la place.
- **Accords de genre :** `bookingLabels` fournit des formes accordées pour chaque nom (`booking`, `customer`, `service`) : `the`, `a`, `this`, `of`, `newTitle`, `none` (« Nouvelle formule », « Nouvel élève », « Aucune réservation », « cet essayage », « l'intervention »). Les noms féminins sont listés dans `FEMININE` (`lib/v2/labels.ts`) : à compléter lors de l'ajout d'un nom féminin dans `business_types`. Pages Réservations et Clients corrigées (elles affichaient « Nouveau réservation », « Détails du réservation »…).
  - Reste : les libellés de statut des réservations sont au féminin (« Confirmée », « Annulée ») quel que soit le nom (« rendez-vous » est masculin).
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
- `lib/database.v2.types.ts` est un ancien export obsolète, remplacé par `types/supabase.ts` (à supprimer à la migration).
- `lib/database.types.ts` (V1) est encore utilisé par `lib/supabase.ts` et `lib/supabase-server.ts`, jusqu'à la migration.
- Le middleware exclut `/api/*` : les routes publiques ne sont pas redirigées vers `/login`.
