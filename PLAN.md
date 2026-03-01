# no-wms — Phase 1 (MVP) Implementation Plan

## Context

**Problem**: 3PLs and freight forwarders in LATAM (Ecuador focus) are stuck on legacy WMS systems (GBI, Magaya) that are slow, rigid, and disconnected. Sub-courier agencies lack visibility and self-service capabilities.

**Goal**: Build an AI-native, world-class WMS web platform that replaces GBI for 3-5 sub-courier agencies shipping from Miami to Ecuador. Multi-warehouse architecture from day one (Miami primary, Spain and China as full warehouse instances).

**Current state**: Phase 1a complete + Phase 1b complete. Role hierarchy updated to include `company_admin` (3PL/freight forwarder owner). Monorepo scaffolded, DB schema written, auth + RLS configured, dashboard shell with role-specific layouts built, cascading settings hierarchy implemented. WR receipt, inventory, search, unknown WRs, email notifications, and batch import all implemented.

**Tech stack** (confirmed by user): Supabase-centric — Next.js 15 + Supabase (DB/Auth/Storage/Realtime) + Tailwind v4 + shadcn/ui + Vercel. Monorepo with Turborepo + pnpm.

**Source documents**: `WMS_ONE_PAGER.md` (vision + architecture), `NO_WMS_REQUIREMENTS.md` (detailed role/entity/flow specs).

---

## Monorepo Structure

```
no-wms/
  apps/
    web/                          # Next.js 15 App Router (only app for MVP)
      src/
        app/[locale]/             # i18n routing (es primary, en scaffolded)
          (auth)/                 # Login, signup
          (dashboard)/            # All authenticated pages
            warehouse-receipts/   # WR receipt + detail
            inventory/            # Inventory view (search/filter/bulk actions hub)
            work-orders/          # 13 WO types + execution
            shipping/             # Shipping instructions + pickup coordination
            manifests/            # MAWB/HAWB/sacas
            agencies/             # Agency management
            tariffs/              # Tariff schedules
            invoicing/            # Billing + invoices + statements
            tickets/              # Issue tracking
            reports/              # Reporting hub
            settings/             # Cascading settings (all levels)
            unknown-wrs/          # Unknown WR queue
        components/
          ui/                     # shadcn/ui (generated)
          layout/                 # Shell, sidebar, topbar, command-bar
          warehouse/              # WR-specific
          work-orders/            # WO-specific
          shipping/               # SI/manifest/saca/pickup
          settings/               # Settings hierarchy
          search/                 # Universal search + filters
        lib/
          supabase/               # Client factories (server.ts, client.ts, middleware.ts)
          actions/                # Server Actions by domain
          hooks/
          utils/
          search/                 # pg_trgm + FTS query builder
          ai/                     # Claude API integration
          email/                  # Resend
          offline/                # Service Worker + IndexedDB
        i18n/                     # next-intl config + messages/
  packages/
    supabase/                     # Migrations, seed, generated types, Edge Functions
    shared/                       # Zod validators, constants, business-rule pure fns
    tsconfig/                     # base.json, nextjs.json
  tooling/
    eslint/                       # Flat config
  turbo.json
  pnpm-workspace.yaml
  package.json
```

**Key architectural decisions**:
- **No separate API server** — Next.js Server Actions + Supabase client (RLS handles auth). Route Handlers only for webhooks.
- **No ORM** — Supabase PostgREST client with generated types provides type safety.
- **`packages/supabase`** owns schema (migrations), generated types, and seed data.
- **`packages/shared`** owns business logic (status transitions, weight calculations, Ecuador validations) testable independently of UI.
- **Spanish-first MVP** — next-intl scaffolded for ES/EN but only ES translations required for Phase 1. EN is Phase 2.
- **Mobile-first for operator screens** — WR receipt, WO execution, and scanner views designed tablet-first with touch-optimized controls.

---

## Phase 1 Sub-Phases

### Phase 1a — Foundation (Scaffolding, DB Schema, Auth, Shell, Settings) ✅ COMPLETE
> No dependencies. This is the starting point.

**What gets built**:
1. Turborepo + pnpm monorepo scaffolding (all packages)
2. Next.js 15 app with Tailwind v4, shadcn/ui, next-intl (ES primary)
3. Supabase project (local dev via CLI + config)
4. **Complete database schema** — all MVP tables created upfront to avoid mid-flight migrations
5. RLS policies for multi-tenancy (org-scoped) + role-based access + **super_admin platform-level bypass**
6. Supabase Auth (email/password, role metadata)
7. Dashboard shell with **role-specific dashboards** (8 roles, 8 distinct layouts — see below)
8. Settings hierarchy UI with cascading resolution (Platform → Org → Warehouse → Destination → Agency → User)
9. User management (invite, assign roles by scope, deactivate)
10. Audit log infrastructure (PG triggers on all business tables)
11. Organization (= Company) + warehouse + destination country + agency CRUD
12. CI: Vercel deployment, linting, typecheck

**Core database tables** (full schema created in 1a):

| Group | Tables |
|-------|--------|
| Multi-tenancy | `organizations`, `profiles`, `user_roles` |
| Settings | `settings` (polymorphic: scope_type + scope_id + key + value JSONB) |
| Structure | `warehouses`, `warehouse_zones`, `warehouse_locations`, `destination_countries`, `courier_categories`, `agencies` (with `type`: corporativo/box), `agency_contacts` (multiple per agency: admin, operations, billing) |
| WR | `warehouse_receipts` (with `warehouse_location_id`, `sender_name`, `free_storage_override_days/reason`), `wr_photos`, `wr_status_history`, `wr_notes`, `unknown_wrs` (with `sender_name`, `package_type`, tracking hidden from agencies), `consignees` |
| Work Orders | `work_orders` (with `priority` auto-set by agency type), `work_order_items`, `work_order_status_history` |
| Shipping | `shipping_instructions` (with `additional_charges` JSONB, `sed_validation_data` JSONB), `shipping_instruction_items`, `shipping_instruction_status_history`, `sacas`, `saca_items` (FK → `warehouse_receipt_id`), `mawbs` (airline document: mawb_number, airline), `hawbs` (FK → `mawb_id`, FK → `shipping_instruction_id`), `manifest_status_history`, `cargo_releases` |
| Reservations | `airline_reservations` (airline, reserved_mawb_numbers JSONB, week_start, week_end, status) |
| Billing | `tariff_schedules`, `tariff_rates`, `invoices`, `invoice_line_items`, `storage_charges` |
| Tickets | `tickets` (with `origin_reviewed_at`, `origin_reviewed_by`), `ticket_messages`, `ticket_status_history` |
| Notifications | `notification_templates`, `notifications`, `notification_preferences`, `mass_notifications` |
| Pickup | `pickup_requests` (date, time, location, authorized_person, contact, status) |
| Search | `saved_searches`, `recent_searches` |
| Audit | `audit_logs` |
| Offline | `sync_queue` |

**Schema clarifications**:
- **`mawbs` table** is explicit: the Master Air Waybill is its own entity (airline document, numbered like `906-13203201`). Previously called "manifests" — renamed for clarity. Contains: `mawb_number`, `airline`, `flight_number`, `flight_date`, `destination_country_id`, `status`, totals.
- **`hawbs` table**: FK → `mawb_id`. One MAWB groups multiple HAWBs. HAWB number format is configurable (e.g., `GLP12345`), different numbering from WR numbers.
- **`sacas` + `saca_items`**: `saca_items` references `warehouse_receipt_id` (physical packages go into physical bags). The HAWB relationship is derived: "which HAWBs are in this saca" = distinct HAWBs of the WRs in the saca. A saca can contain WRs from multiple HAWBs, and a HAWB's WRs could span multiple sacas.
- **`airline_reservations`**: simple tracking for weekly MAWB number reservations from airlines. Manual entry in MVP.
- **`cargo_releases`**: document authorizing cargo release. FK → `mawb_id` or `hawb_id`, template-based PDF generation.

**Role hierarchy** (8 roles):

```
Super Admin (platform-level, cross-company)
  └── Company Admin (3PL / freight forwarder — owns warehouses + agencies)
        ├── Warehouse Admin (scoped to a warehouse within the company)
        ├── Warehouse Operator (scoped to a warehouse)
        ├── Shipping Clerk (scoped to a warehouse)
        ├── Destination Admin (scoped to a destination country)
        ├── Destination Operator (scoped to a destination country)
        └── Agency (subcourier — company-level, works across ALL company warehouses)
```

- **Super Admin**: Platform operator. Sees all companies, all data. Manages company onboarding, platform settings, global configuration.
- **Company Admin**: The 3PL/freight forwarder owner. Has full visibility across all their warehouses and all their agencies. Manages tariffs, invoicing, reports, settings at the company level. Can do everything warehouse/destination admins can do within their company.
- **Warehouse Admin/Operator/Shipping Clerk**: Origin-side roles scoped to a specific warehouse.
- **Destination Admin/Operator**: Destination-side roles scoped to a destination country.
- **Agency**: Subcourier agency user. **Agencies are company-level entities** — they work with the entire company, not a specific warehouse. An agency's packages can exist across any of the company's warehouses (e.g., Miami + Texas + Spain). Inventory views for agencies aggregate across all warehouses.

**Agency type (Corporativo vs Box) — broader implications**:
- Affects WO priority (Corporativo = high)
- May affect tariff schedules and approval workflows
- Dashboard grouping: destination admin UI filters/groups agencies by type
- WO queues visually distinguish corporativo vs box

**RLS pattern**:
- Every table has `organization_id` (organization = company).
- **Super admin**: bypasses org-level RLS on ALL tables — `auth_has_role('super_admin')` check in every policy.
- **Company admin + warehouse/destination roles**: `organization_id = auth_org_id()` — scoped to their company's data.
- **Agency users**: additional RLS restriction — only see records matching their `agency_id` (via `auth_agency_ids()` helper).
- Child/junction tables without `organization_id` inherit access via parent FK join.

**Role-specific dashboards** (each role sees different widgets):

| Role | Dashboard Widgets |
|------|------------------|
| **Super Admin** | All companies, Global stats, All agencies, All warehouses, Platform settings |
| **Company Admin** | All warehouses (their company), All agencies, Boxes received today (all warehouses), Total WR across warehouses, Pending WOs, Storage alerts, Pending dispatches, Reports, Invoicing, Settings |
| **Warehouse Admin** | Agency list, Boxes received today, Total WR in warehouse, Pending WOs, Storage alerts (>X days), Pending dispatch approvals, WR history, Reports, Tickets, Unknown WR history |
| **Warehouse Operator** | In-warehouse (tracking to process), Bodega MIA (WR inventory), Assigned WOs, Dispatches in preparation, MAWBs/Manifests (create/update), WR history, Unknown WRs, Tickets |
| **Shipping Clerk** | Dispatches by modality, Bodega MIA, MAWBs/Manifests, HAWB list, Weekly MAWB/HAWB reserved numbers, Airline reservations, Tickets, Daily cost reports, WO reports |
| **Destination Admin** | Agencies (grouped by type), In-warehouse, Bodega MIA by agency, Bodega España by agency, MAWBs (status updates), WR history, Unknown WRs, Tickets, Reports, Notifications, Invoicing |
| **Destination Operator** | Agencies, In-warehouse, Bodega MIA by agency, Bodega China by agency, MAWBs, WR history, Unknown WRs, Tickets, Reports, Notifications, Pickup coordination |
| **Agency (Subcourier)** | All warehouses inventory (their WRs across all company warehouses), MAWBs (tracking status), WR history, Unknown WRs, Tickets, Notifications, Invoicing/Statements/Tariff schedules |

**Key settings**: `dimensional_factor` (per modality), `free_storage_days`, `auto_abandon_days`, `min_receipt_photos` (default 1), `min_damage_photos` (default 3), `session_timeout_minutes`, `dgr_checklist` (JSONB), `label_format`, `hawb_number_format`, `enabled_work_order_types`, `dispatch_approval_required` (per agency), `wr_entry_sla_hours` (for timeliness tracking).

**Settings resolution**: PG function `resolve_setting(org_id, key, warehouse_id?, destination_id?, agency_id?, user_id?)` walks from most specific scope upward. First non-null value wins. Company admin and super admin can manage settings at any level within their scope.

---

### Phase 1b — WR Receipt + Inventory View + Search + WR Notifications ✅ COMPLETE
> Depends on: 1a ✅

**What gets built**:

**WR Receipt (mobile-first, tablet-optimized)**:
1. Receipt flow follows specific step order:
   - Open receipt screen → **select agency first** → scan/type tracking → duplicate check (hard block) → select carrier → weigh (manual or scale) → measure dimensions → take photos (min 1, configurable via settings) → select destinatario (filtered by agency, virtualized searchable dropdown for 1000s of recipients) → piece count → warehouse location (optional) → notes (damage/DGR/observations) → **Confirm Receipt**
2. Quick-create destinatario inline if not found (minimal fields: name + agency)
3. After confirmation: show WR summary + **Print Internal Label** + **Register Another Box** (pre-fills same agency)
4. Duplicate tracking → hard block: "Esta guía ya fue recibida el [fecha]. ¿Desea ver el recibo existente?"
5. Damage flow: mandatory 3+ photos + written description → immediate email notification to agency
6. DGR flagging with configurable checklist from settings
7. Photo upload to Supabase Storage (retry on failure, allow continue with warning)
8. Auto-generated WR number (org-scoped sequential, e.g., GLP1234)
9. Volumetric weight = (L×W×H) ÷ dimensional_factor (from settings per modality)
10. Billable weight = MAX(actual, volumetric) — always displayed
11. Scanner support: camera via device + keyboard-wedge HID input (USB/Bluetooth scanners work natively as keyboard input — just needs focus management on the tracking field)
12. **WR receipt email notification** — on every successful WR creation, auto-send email to agency: "Se recibió caja [tracking] para [destinatario], peso: X lb" (this is in 1b, not deferred to 1e)

**Manual WR Import (for non-Miami warehouses)**:
13. Simplified batch entry mode for Spain/China warehouses where destination staff enter WRs
14. CSV upload or form-based batch entry (tracking, weight, dimensions, agency, recipient)
15. Scoped to destination admin/operator roles
16. Same duplicate-tracking and validation rules apply

**Inventory View**:
17. Data table with all WR fields, storage day counter, color-coded alerts (yellow approaching, red exceeded)
18. **Universal search**: `pg_trgm` + full-text search indexes. Single query across tracking, WR#, HAWB, recipient name, agency name, notes, carrier — <50ms, results as you type
19. Fuzzy matching with smart ranking (exact > prefix > fuzzy, recent/active weighted higher)
20. Contextual by role: agencies only see their packages, operators see all ranked by their tasks
21. Composable filters (status, agency, date range, weight, days in warehouse, carrier, warehouse/origin) — stackable like Linear, persistent per session, shareable via URL
22. Saved filters/views per user
23. Bulk selection + bulk actions (create WO, create SI, export, **mass status update**)
24. **Mass status update** — destination admin can select multiple WRs and update status in bulk (e.g., "Arrived", "Delivered")
25. WR detail view: full history, photos, notes, linked WOs/SIs, status timeline
26. Realtime: live inventory updates via Supabase subscriptions

**Storage Tracking**:
27. Storage day counter from `received_at`
28. Configurable alerts: yellow at X days, red at Y days (from settings per agency/destination)
29. Auto-abandon: pg_cron or Edge Function marks WRs as abandoned after threshold
30. Admin can extend free storage for specific WR with documented reason

**Unknown WRs**:
31. Separate queue showing: sender name, carrier, package type, date — **tracking number hidden** (security)
32. Agency claim flow: agency provides tracking number → system matches internally → if match, assign to agency
33. If no match: agency uploads purchase invoice for manual verification

**Key business rules enforced**:
- Duplicate tracking → hard block at receipt
- Damage → mandatory 3+ photos + description + immediate agency email
- Greater of actual vs. volumetric weight for billing
- Storage: configurable free days → daily charges → auto-abandon
- Unknown WR: tracking never exposed to agencies
- WR receipt → immediate email to agency (not deferred)

---

### Phase 1c — Work Orders + Shipping Instructions + MAWB/HAWB/Sacas
> Depends on: 1b

**What gets built**:

**Work Orders (13 types)**:
1. WO creation: select type, select WRs from inventory (with search), add instructions. Agency users create WOs for their packages across any warehouse — the WO is routed to the correct warehouse based on WR location.
2. **Auto-priority** based on agency type: Corporativo = high, Box = normal. WO queue sorted by priority, visually distinguished.
3. Per-type validation rules:
   - Abandon: requires company_admin or warehouse_admin approval
   - Group: requires 2+ WRs
   - Divide: requires 1 WR
   - Photos: requires photo instructions
   - Consolidate: requires 2+ WRs
   - Authorize Pickup: requires pickup details (date/time, location, authorized person name/ID, contact info)
   - All others: standard validation
4. WO list/detail views with status lifecycle
5. WO execution: operator marks steps → uploads photos/notes → completes
6. **Completion validation**: notes field required + at least 1 photo/report uploaded
7. WR ↔ WO status interlocking: WR → "In Work Order" while WO active, returns to "In Warehouse" on completion
8. Business rule: WRs with active/pending WOs **blocked** from shipping instructions (company_admin/warehouse_admin can force-cancel WO with documentation)

**Shipping Instructions**:
9. SI creation: select modality (Courier Cat A-G, Air Cargo), select WRs, assign consignee
10. Ecuador validation: cupo 4x4, cedula/RUC format, weight/value limits per category
11. SI approval workflow: configurable per agency (self-approve or admin approval required)
12. **Unprocessable instructions**: mark as "Pending", notify destination before MAWB close, allow cancel or correct
13. Additional charges field for shipping clerk to add surcharges
14. **SED validation fields**: data capture for product line items to help shipping clerk prepare SED manually (full SED auto-generation is Phase 2, but the data fields exist now)
15. HAWB generation: auto-numbered, configurable format (e.g., GLP12345), different numbering from WR numbers
16. SI lifecycle happy path: Requested → Approved → Finalized (HAWB generated). Also: Rejected/Cancelled with reason.

**Sacas (bags — separate entity)**:
17. Saca creation: group WRs into physical bags
18. Saca number auto-generated
19. `saca_items` links saca → `warehouse_receipt_id` (WRs go into bags)
20. HAWB relationship is derived: "which HAWBs are in this saca" = distinct HAWBs of the WRs in the saca

**MAWB (Master Air Waybill)**:
21. MAWB is its own table/entity. One MAWB per airline per day (unique constraint: `org_id + mawb_number`)
22. Group HAWBs into MAWB, assign airline, flight number, flight date
23. MAWB status lifecycle: Created → Ready for Flight → In Transit → Arrived → Delivered
24. "Ready for Flight" status set when sacas handed to internal transport

**Airline Reservations**:
25. Simple tracking table: airline + reserved MAWB numbers + week date range + status
26. Company admin or warehouse admin requests reservations weekly, shipping clerk tracks available numbers
27. Weekly MAWB/HAWB number list view on shipping clerk dashboard

**Documents**:
28. **Cargo release** document generation: template-based PDF, linked to MAWB or HAWB
29. Print support: HAWB labels, MAWB docs, cargo release, internal labels (browser Print API + thermal printer support)

**WR Transfers Between Agencies**:
30. Transfer request flow (not immediate): authorization letter upload + invoice verification + company_admin/warehouse_admin approval
31. On approval, WR re-assigned to new agency with full audit trail. Since agencies are company-level, transfers between agencies within the same company are straightforward. Cross-company transfers are not supported in MVP.

**Pickup Coordination** (destination operator — lives under `/shipping/pickup`):
32. Pickup requests: date/time, location, authorized person name/ID, contact info
33. Pickup status tracking (requested → scheduled → completed)
34. Linked to WRs being picked up

**13 WO types**: Abandon, Group, Authorize Pickup, Consolidate, Delivery, Divide, Ship, Photos, Inspection, Inventory Count, Repack, Return, Special Request

---

### Phase 1d — Tariffs, Invoicing, Storage Billing
> Depends on: 1c (shipping data generates billable events)

**What gets built**:
1. Tariff schedule management (per agency × modality × category × weight ranges: 1-100 lb, 101-200 lb, etc.)
2. Tariff rate CRUD + bulk CSV import
3. Greater-of-actual-vs-volumetric billing rule (always, no exceptions)
4. Invoice generation: select agency + date range → auto-calculate from dispatched WRs + tariff rates + surcharges
5. Storage charge calculation: free days from settings → daily rate after threshold → per-WR tracking
6. Work order charges: configurable per WO type
7. Additional charges from shipping clerk (surcharges on SIs flow into invoice line items)
8. Invoice detail view: line item breakdown (shipping, storage, WO, surcharges)
9. Invoice status lifecycle: Draft → Sent → Paid → Overdue → Void
10. Invoice PDF generation (for download/print)
11. **Agency billing dashboard**: outstanding balance, statements, recent invoices, payment history
12. **Agency-facing views**: agencies can view/download invoices, see their tariff schedule, view statements/account balance (read-only)
13. Agency credit terms management (from settings)

---

### Phase 1e — Tickets, Notifications, Reporting
> Depends on: 1b-1d (references entities from all prior phases)

**What gets built**:

**Tickets**:
1. Ticket creation: agency links to WR(s), selects category, describes issue
2. Ticket message thread: agency ↔ origin operations conversation
3. **Origin-review requirement**: tickets cannot be closed unless at least one comment exists from an origin warehouse role user (`origin_reviewed_at` + `origin_reviewed_by` must be set)
4. Ticket status lifecycle with tracking

**Notifications** (note: WR receipt email is already in 1b):
5. Email notifications via Resend for remaining events: WR dispatched, WO completed/cancelled, SI approved/rejected, storage alert, invoice generated, ticket update
6. Notification templates: configurable per organization, Spanish content
7. Notification preferences per user (opt in/out per event type)
8. **Mass notifications**: company_admin/destination_admin creates announcement → appears as alert/banner on system login + email backup sent to all registered agency contacts (admin, operations, billing contacts)
9. Mass notification tracking (follow-up on delivery)

**Reporting**:
10. Cargo received/dispatched/pending (by date range, by agency, by warehouse)
11. WR aging report (days in warehouse distribution)
12. Work orders by status/type
13. Daily operations summary (daily cost report for shipping clerk)
14. Per-agency reports
15. **WR timeliness report**: flag delays between physical receipt and system entry (compare `received_at` vs expected SLA from `wr_entry_sla_hours` setting)
16. Report export: CSV and PDF

---

### Phase 1f — Offline Receipt + AI Command Bar + Polish
> Depends on: all prior phases

**What gets built**:

**Offline Receipt**:
1. Service Worker for offline WR receipt: intercepts creation when offline, stores in IndexedDB queue
2. Offline WRs get temporary local IDs. Server-generated WR numbers (e.g., GLP1234, org-scoped sequential) are assigned only on sync. UI shows "pending sync" state with temporary local ID until server confirms.
3. Sync on reconnect: `client_id` field for idempotency, handles duplicate tracking conflicts (flagged for manual resolution by operator)
4. Offline indicator UI + sync status bar (shows pending count, sync progress, conflicts)

**AI Command Bar**:
5. Cmd+K dialog: natural language → search queries + filter states + actions via Claude API
6. Smart WR assignment suggestions: AI suggests likely agency based on historical patterns (carrier, sender, content)

**Polish**:
7. Performance optimization: query tuning, connection pooling, lazy loading, skeleton states, image optimization
8. Virtualized lists for high-volume views (thousands of destinatarios, large WR inventories)
9. E2E tests (Playwright, including mobile viewports for operator screens)
10. Accessibility audit
11. Production deployment: Supabase prod project, Vercel prod, DNS for no-wms.com
12. Seed data for demo: sample company (org), company_admin user, warehouses (Miami, Spain, China), agencies (corporativo + box) working across all warehouses, destinatarios, WRs across warehouses

---

## Dependency Graph

```
1a: Foundation ✅ ──→ 1b: WR + Inventory + Search + Notifications ✅ ──→ 1c: WO + SI + MAWB/HAWB/Sacas + Pickup
                                                                              │
                                                                              ├──→ 1d: Tariffs + Invoicing + Statements
                                                                              │
                                                                              └──→ 1e: Tickets + Notifications + Reports
                                                                                        │
                                                                              ┌────────┘
                                                                              v
                                                                       1f: Offline + AI + Polish
```

> 1d and 1e can be parallelized if working with multiple developers.

---

## Key Business Rules Summary

| # | Rule | Enforcement |
|---|------|------------|
| 1 | Storage billing: free days → daily charges → auto-abandon | Settings-driven, pg_cron auto-abandon, company_admin/warehouse_admin can extend per-WR |
| 2 | No dispatch with pending WOs | Hard block on SI creation, company_admin/warehouse_admin can force-cancel WO |
| 3 | Unknown WR protocol: hide tracking, claim via match + invoice | RLS + UI hides tracking, server-side match verification |
| 4 | Damage reporting: 3+ photos + description + immediate notification | Validation on WR update, auto email trigger |
| 5 | Unprocessable instructions: pending + notify before MAWB close | Cron check before MAWB deadline |
| 6 | WR transfers: auth letter + invoice + company_admin/warehouse_admin approval | Transfer request approval flow |
| 7 | Billing by greater weight (actual vs volumetric) | Always computed, no exceptions |
| 8 | Duplicate tracking prevention | Unique constraint + hard UI block |
| 9 | Ticket origin-review before closure | DB constraint: origin_reviewed_by required |
| 10 | WO priority: Corporativo > Box | Auto-set from agency.type, queue sorted + visually distinct |
| 11 | WR receipt → immediate email to agency | Auto-trigger on WR creation (Phase 1b) |

---

## Future Phases (Architecture-Ready, No Code Yet)

**Phase 2**: WhatsApp (add channel to notification engine), end-customer portal (new role + RLS), English translations, additional countries (insert rows, zero code changes), LCL/FCL modalities, carrier APIs, QuickBooks/SRI, advanced AI (OCR, predictive ops), declared value + content description on WR form, multi-currency, GBI data migration, full SED auto-generation.

**Phase 3**: Native mobile app (Supabase REST/Realtime works directly), IoT (smart scales, dimensioners), analytics/BI, marketplace/API.

All future phases build on Phase 1 infrastructure without architectural changes.

---

## Verification Plan

After each sub-phase:
- `pnpm typecheck` — no type errors
- `pnpm lint` — clean
- `pnpm build` — successful Next.js build
- `pnpm test` — all unit/integration tests pass
- Manual testing: full flow in browser + mobile viewport for operator screens
- Supabase: `supabase db reset` + seed data works
- RLS verification: test queries with different role JWTs (admin sees all, agency sees only their data)
- Search: verify <200ms response, fuzzy matching works with typos
