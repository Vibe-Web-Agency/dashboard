# Cahier des Charges & Plan de Travail - Dashboard SaaS V2

## 1. Context & Architecture Overview

The V2 Platform is a modular, multi-tenant SaaS platform built with **Next.js**, **Supabase (PostgreSQL / RLS / Auth / Realtime)**, and **Tailwind CSS**.

### Key Architectural Pillars

1. **Multi-Tenancy & Scope:** Isolation powered by `business_id` and overarching agency isolation via `agency_id`.

2. **Modular Dynamic Gating (`hasModule()`):** Features and sidebar links are dynamically rendered or hidden based on active modules (`plans`, `business_plans`, and `business_module_settings`).

3. **Dynamic Domain Vocabulary:** UI labels adapt per business type via `customer_noun` (e.g., *Client*, *Patient*, *Élève*) and `service_noun` (e.g., *Prestation*, *Formule*, *Soin*), complete with proper gender/plural agreement.

4. **Real-time Engine:** Core operational tables (`reservations`, `customers`, `quotes`, etc.) stream updates live via `supabase_realtime`.

## 2. Technical Specifications & Requirements

### 2.1 Navigation & Navigation Gating

* **Fixed Core Routes:** *Vue d'ensemble* (`/`), *Paramètres* (`/settings`), *Support* (`/support`).

* **Dynamic Module Routes:** Conditioned strictly by `hasModule(slug)`.

* **Strict V1 Purge:** All legacy or incomplete V1 routes (e.g., *Site multilingue*, *Assistant IA*, *Finance*, *Contenu*) must remain hidden or removed until fully ported to V2 modules.

### 2.2 Domain Separation (Reservations vs. Catalog)

* **`services` Table:** Reservable items (`booking_noun` / `service_noun`). Represent appointments, tasting menus, classes, or time-slotted events.

* **`menu_items` / `menu_sections` Tables:** Non-reservable catalog products. Represent dishes, drinks, retail products, or inventory.

### 2.3 SuperAdmin & Back-Office Core

To safely manage database complexity without direct SQL intervention, a dedicated SuperAdmin interface is required for:

* Business onboarding and `business_type` mapping.

* Plan creation, feature gating matrix (`plan_modules`), and tenant add-ons (`business_module_settings`).

* Membership management (`profiles` $\leftrightarrow$ `businesses` $\leftrightarrow$ `agency_id`).

## 3. Work Plan (Phased Roadmap)

### Phase 1: Core Navigation & Domain Vocabulary Cleanup

* \[x\] Enforce `hasModule()` checks across `lib/v2/navigation.ts`.

* \[x\] Implement dynamic grammar and vocabulary hooks (`useTenant()`).

* \[x\] Migrate catalog dishes from `services` to `menu_items`.

### Phase 2: Operational Dashboard Modules (V2 Core)

* \[x\] **Bookings & Calendar Module (`/reservations`):**

  * Live status tracking, timeline calendar, interactive slot picker.

  * Full Realtime subscription on `reservations` table.

* \[x\] **Customer Directory (`/customers`):**

  * Dynamic vocabulary rendering (*Clients* / *Patients* / *Élèves*).

  * Quick action modal for booking/history lookup.

* \[x\] **Catalog & Offerings Management (`/services` & `/menu`):**

  * Contextual UI rendering based on `business_type` ("Formules" vs "Prestations").

  * Seamless CRUD for menus, sections, and reservable services.

### Phase 3: Realtime Engine & Notifications

* \[x\] Configure `supabase_realtime` channels for live sidebar badges (e.g., unread bookings, new quotes).

* \[x\] Implement optimistic UI updates for instant UI feedback.

### Phase 4: SuperAdmin Platform Back-Office

* \[x\] Tenant Management (`/admin/tenants`): Inspect and edit business profiles, types, and agency links.

* \[x\] Module Matrix Editor (`/admin/plans`): Toggle features per plan or per tenant in real-time.

* \[x\] User & Membership Manager (`/admin/memberships`): Assign `owner`, `administrator`, `member`, or `viewer` roles (the `staff` role does not exist in the database).

## 4. Claude Execution Prompts (Copy-Paste Directives)

### Prompt 1: Finalizing Operational Pages

```
Claude, please complete Phase 2 by implementing the V2 Dashboard operational views:
1. Ensure `/reservations` consumes `service_noun` for label displays and listens to live updates via `supabase_realtime`.
2. Ensure `/customers` correctly applies plural and gender agreements based on `useTenant().customerNoun`.
3. Provide a unified, clean UI component following our Tailwind design system.

```

### Prompt 2: Preparing SuperAdmin Groundwork

```
Claude, let's start the SuperAdmin Back-Office foundation:
1. Create a protected `/admin` route group reserved for global admin users.
2. Build the Plan & Gating Matrix view (`/admin/plans`) to visually toggle modules (`plan_modules`) and per-tenant overrides (`business_module_settings`).
3. Commit under `feat(admin): plan and gating management UI`.

```

## 5. Deployment & Database Checklist

* \[ \] Execute production migrations from `supabase/manual/`:

  * `next-document-number-service-role.sql`

  * `business-types-customer-noun.sql`

  * `business-types-service-noun.sql`

  * `realtime-publication.sql`

* \[ \] Ensure non-production scripts (`dev-*.sql`) are excluded from production runs.

* \[ \] Verify `agency_id` RLS policies across all newly exposed tables.