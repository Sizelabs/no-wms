# no-wms — AI-Native WMS for 3PLs & Freight Forwarders
### no-wms.com

## One-Pager v1.0

---

## The Problem

3PLs and freight forwarders serving LATAM (and specifically Ecuador's courier import market) are stuck on legacy systems like GBI and Magaya that are slow, rigid, and disconnected. Warehouse operators juggle manual WhatsApp coordination, Excel spreadsheets for tariffs, and clunky UIs that require 10+ clicks to do basic tasks. Sub-courier agencies — the primary users — lack visibility, can't self-serve efficiently, and depend on phone calls for status updates.

## The Vision

**A world-class warehouse management platform with AI woven into its DNA.** The primary experience is a beautifully designed, blazing-fast web application — think Linear, Vercel Dashboard, or Notion-level craft. Every interaction feels instant, every screen is purposeful, every workflow is fewer clicks than competitors. AI is embedded *within* this experience as an enhancement layer: smart search, inline suggestions, anomaly detection, natural language commands for power users. Additionally, users can interact via email or WhatsApp for common actions — but the web UI is the hero product, not a wrapper around an agent.

## Who Uses It (MVP Roles)

| Role | Location | Core Job |
|------|----------|----------|
| **Warehouse Admin** | Origin warehouse (e.g., Miami) | Supervises operations, approves dispatches, manages tariffs, generates reports |
| **Warehouse Operator** | Origin warehouse | Receives cargo (scan, weigh, measure, photograph), executes work orders, prepares shipments, builds manifests |
| **Shipping Clerk** | Office / Remote | Cuts MAWB/HAWB documentation, billing, SED, coordinates airline reservations and transport |
| **Destination Admin** | Remote (e.g., Ecuador) | Manages sub-courier agencies, approves/cancels orders, sets tariffs by agency, invoicing, mass status updates & notifications |
| **Destination Operator** | Remote | Status updates, ticket management, notifications, pickup coordination, WR reporting |
| **Sub-courier Agency** | Remote | Reviews WRs, creates shipping instructions by modality, requests work orders, raises tickets, manages their clients |
| **Super Admin** | — | System configuration, role management, multi-warehouse setup |

*Phase 2: End customer (mailbox client) portal, customer self-service.*

## What It Does (MVP Modules)

### Core Operations
- **Warehouse Receipt (WR)**: Scan/manual tracking entry, weigh, measure, photograph, assign to agency/recipient. Auto-generates unique WR. Duplicate detection. Damage reporting with mandatory photos. DGR flagging.
- **Inventory / Warehouse View**: Real-time view of all WRs by agency, recipient, status, days in warehouse. Search, filter, export. Storage day counter with configurable alerts and auto-abandon rules.
- **Work Orders (13 types)**: Abandon, Group, Authorize Pickup, Consolidate, Delivery, Divide, Ship, Photos, Inspection, Inventory Count, Repack, Return, Special Request. Each with its own workflow, validation rules, and status lifecycle.
- **Shipping Instructions**: Multi-modality support — Courier categories (A, B, C, D, E, F, G per Ecuador regulations), Air Cargo, LCL, FCL. Configurable per destination country. HAWB generation.
- **Manifests & Documentation**: MAWB/HAWB creation and tracking, manifest generation per airline/day, status lifecycle (created → ready for flight → in transit → arrived → delivered).
- **Unknown WRs**: Packages without identifiable recipient go to a separate queue. Agencies claim via tracking match + purchase invoice verification.

### Search — A Core Product Pillar
Search in no-wms is not a feature — it's the **primary navigation paradigm**. Current systems like GBI force users to navigate menus, select filters manually, and enter exact tracking numbers with zero tolerance for typos. A single wrong character means "not found." This is where we win decisively.

**Universal Search (always accessible, ⌘K or top bar):**
- **Fuzzy matching**: Finds packages even with typos, transposed characters, partial numbers. "1Z999AA1012" matches "1Z999AA10123456784."
- **Multi-field**: A single query searches across tracking number, WR number, HAWB, recipient name, agency name, content description, notes, and carrier — simultaneously.
- **Instant results**: <50ms response time. Results appear as you type, no "search" button needed.
- **Smart ranking**: Most relevant results first — exact matches on top, then partial matches, then fuzzy. Recent and active items weighted higher than archived.
- **Contextual awareness**: Search adapts to user role. An agency only sees their packages. An operator sees everything but results are ranked by their current tasks.

**Advanced Filtering (composable, persistent, shareable):**
- Filters stack like Linear: status + agency + date range + weight range + days in warehouse + modality + carrier — any combination.
- Filters are persistent per session and shareable via URL (an operator can send a filtered view to a colleague).
- Saved filters / views: agencies can save "My packages over 30 days" or "Pending work orders for client X."
- Bulk actions from any filtered view: select all → create work order, create shipping instruction, export.

**Scan-First for Operators:**
- Camera/barcode scanner input feeds directly into universal search.
- Scan a tracking barcode → instant WR detail with full history and available actions.
- Batch scan mode: scan 20 packages in sequence, system queues them for bulk action.

**Natural Language Queries (via ⌘K):**
- "Packages from Amazon for agency Express older than 15 days" → instant filtered results.
- "All WRs with pending work orders" → filtered view.
- "Juan Pérez's packages ready to ship" → scoped results with one-click dispatch action.

**Search Intelligence:**
- **Recent searches**: Quick access to your last 10 searches.
- **Suggested searches**: Based on role and current context ("You have 12 WRs approaching storage limit" → click to view).
- **Zero-result recovery**: When no results found, system suggests corrections ("Did you mean 1Z999AA10123456784?") and offers to search in archived/historical records.
- **Cross-reference search**: Paste a purchase order number, an Amazon order ID, or a sender name — system matches against all available metadata.
- **Command bar (⌘K)**: Natural language search and actions — "Show me all packages for Juan Pérez over 30 days" or "Create a consolidation for agency Express with these 5 WRs."
- **Smart suggestions**: When creating shipping instructions, system suggests optimal category/modality based on weight, value, and destination.
- **Omnichannel actions**: Agencies can check status, request work orders, or approve dispatches via email reply or WhatsApp — the system parses intent and executes.
- **Proactive alerts**: AI monitors patterns — storage approaching limits, unusual package volumes, cost optimization opportunities — and surfaces them in-app and via notifications.
- **Intelligent document processing**: Auto-extract data from purchase invoices, shipping labels, return labels (Phase 2).
- **Anomaly detection**: Flag duplicate-looking packages, weight discrepancies, suspicious patterns.

### Business Management
- **Tariff Management**: Configurable per agency, by weight ranges (1-100 lb, 101-200 lb, etc.), by modality, by category.
- **Billing & Invoicing**: no-wms bills agencies. Agencies collect from their end customers. Per-agency invoicing, storage charges (configurable free days), work order charges, connection to accounting (QuickBooks Phase 2, SRI Ecuador Phase 2).
- **Ticketing System**: Agencies report issues, require origin review before resolution. Full audit trail.
- **Notifications Engine**: Mass notifications (delays, announcements), per-event notifications, multi-channel (email MVP, WhatsApp Phase 2).
- **Reports**: Cargo received/dispatched/pending, work orders by status, daily costs, agency-specific reports, WR aging.

### Settings — A Core Product Pillar
Settings in no-wms are not an afterthought. The system must serve Ecuador today, Colombia tomorrow, and any LATAM country next year — each with different courier categories, customs rules, weight limits, and tax structures. Every configurable dimension is a setting, not code.

**Settings Hierarchy (cascading, inheritable, overridable):**
```
Super Admin (Platform)
  └─ Organization (e.g., GLP)
       └─ Warehouse / Origin (e.g., Miami, Spain, China)
       └─ Destination Country (e.g., Ecuador, Colombia)
            └─ Agency (e.g., Express Courier Quito)
                 └─ User-level preferences
```
Settings cascade downward: a value set at Organization level applies to all warehouses and destinations unless overridden at a lower level.

**Platform-Level Settings (Super Admin):**
- Supported countries, currencies, languages
- Global feature flags (enable/disable modules)
- Default roles and permission templates
- System-wide limits (max upload size, photo count, etc.)

**Organization-Level Settings:**
- Company branding (logo, colors for white-label potential)
- Default dimensional factor (166 / 139 / custom) — overridable per modality
- Default free storage days — overridable per destination/agency
- Auto-abandon threshold (days) — overridable per destination/agency
- Work order types enabled/disabled
- Notification templates and channels
- Audit log retention period

**Warehouse / Origin Settings:**
- Physical location, timezone, operating hours
- Warehouse zones, racks, locations schema
- Carriers handled (FedEx, UPS, DHL, USPS, Amazon, etc.)
- Scale/dimensioner integration settings
- Label format and printer configuration
- Receipt workflow (required fields, mandatory photos count, DGR checklist)
- Barcode/scanning preferences

**Destination Country Settings:**
- Courier categories with weight/value limits (e.g., Ecuador Cat C: 100 lbs / $500)
- Shipment modalities enabled (Courier, Air, LCL, FCL)
- Customs requirements (cedula/RUC, Cupo 4x4, content declarations)
- Tax/duty calculation rules
- Required documentation per modality
- Consignee validation rules (ID format, name matching)
- Currency for invoicing
- HAWB numbering format

**Agency-Level Settings:**
- Tariff schedule (by weight range, by modality, by category)
- Credit terms and limits
- Approved dispatch: self-approve or requires admin approval (configurable)
- Free storage days override
- Auto-abandon days override
- Notification preferences (which events, which channels)
- Default destination country
- Allowed modalities
- Contact information for automated communications

**User-Level Preferences:**
- Language (ES / EN)
- Timezone display
- Dashboard layout / default view
- Notification preferences
- Saved search filters / views
- Keyboard shortcut customization

## Key Business Rules

1. **Storage billing**: Configurable free days per setting. After threshold, daily charges apply. After X days (configurable), auto-abandon status — client loses the package.
2. **No dispatch with pending WOs**: WRs with active/pending work orders are blocked from shipping instructions.
3. **Unknown WR protocol**: Unidentifiable packages reported without exposing tracking numbers. Claimed via tracking match + purchase invoice.
4. **Damage reporting**: Mandatory photos (min 3) + written description. Immediate notification to agency.
5. **WR transfers between agencies**: Only with authorization letter from client + admin approval + invoice verification.
6. **Failed work orders/shipping**: Must notify destination before manifest close. Cancel or correct.
7. **Duplicate tracking prevention**: Hard block on duplicate tracking numbers at receipt.
8. **Weight-based billing**: Always charges the greater of actual vs. volumetric weight.

## Shipment Modalities (Ecuador Focus, Configurable Per Country)

| Modality | Description |
|----------|-------------|
| **Courier Cat. C** | Up to 100 lbs / $500 — most common for personal imports |
| **Courier Cat. D** | Up to $2,000 |
| **Courier Cat. E/F** | Higher value tiers |
| **Courier Cat. B/G/A** | Box categories (different regulatory treatment) |
| **Air Cargo** | Commercial air freight, full documentation |
| **LCL** | Less than container load (sea) |
| **FCL** | Full container load (sea) |

*Categories and limits are configurable per destination country.*

## Status Lifecycles

### WR (Warehouse Receipt)
```
(new) → Received → In Warehouse → [In Work Order ↔ In Warehouse] → In Dispatch → Dispatched
                                                                    → Damaged (branch)
                                                                    → Abandoned (auto/manual)
```

### Shipping Instruction / Dispatch
```
Requested → Approved → In Preparation → Manifested → Ready for Flight → In Transit → Arrived → Delivered
         → Rejected / Cancelled (with reason)
```

### Work Order
```
Requested → Approved → In Progress → Completed → [triggers notification]
         → Cancelled (with reason + notification)
         → Pending (blocked, needs correction)
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 15 (App Router) + Tailwind + shadcn/ui | SSR, blazing fast, component library |
| **Backend** | Next.js API Routes + Supabase | Serverless, real-time subscriptions, RLS |
| **Database** | Supabase (PostgreSQL) | Row-level security, real-time, edge functions |
| **Search** | PostgreSQL full-text search + pg_trgm (trigram fuzzy matching) | Sub-50ms fuzzy search without external dependencies. Upgrade path to Meilisearch/Typesense if needed at scale |
| **Auth** | Supabase Auth | Multi-tenant, role-based, SSO-ready |
| **AI** | Anthropic Claude API | Natural language processing, document understanding |
| **Storage** | Supabase Storage | Photos, documents, labels |
| **Deployment** | Vercel | Edge network, zero-config, preview deploys |
| **Email** | Resend or Supabase Edge Functions | Transactional notifications |
| **WhatsApp** | Twilio / WhatsApp Business API | Phase 2 omnichannel |
| **Printing** | Browser Print API + thermal label support | Etiquetas, MAWB, HAWB |

## Architecture Principles

1. **UI-first, AI-enhanced**: The web application is the primary product — fast, beautiful, complete. AI augments every module but never replaces direct UI controls. Every action possible via AI is also possible (and discoverable) via traditional UI.
2. **Performance is a feature**: Target <100ms for page transitions, <200ms for search results, optimistic UI updates everywhere. Feels like a native app.
3. **Search is navigation**: Every screen is reachable from search. Every entity is findable with partial, fuzzy, or natural language input. Search is never "no results" — it always offers a next step.
4. **Multi-tenant from day one**: Every query scoped by organization. Row-level security at DB level.
5. **Configurable everything**: Roles, statuses, modalities, categories, tariff structures, storage rules — all configurable via a cascading settings hierarchy (Platform → Organization → Warehouse → Destination Country → Agency → User). Ecuador is day one; the architecture serves any country without code changes.
6. **Real-time**: Supabase subscriptions for live inventory updates, work order status changes, dispatch progress.
7. **Offline-capable receipt**: Warehouse operators must be able to receive cargo even with spotty internet (queue and sync).
8. **Audit everything**: Every state change logged with who, when, what, and why.
9. **AI as infrastructure**: Every module exposes an intent-based API that the AI layer can call. The UI is the primary client; email/WhatsApp are secondary clients.

## MVP Scope (Phase 1)

**Goal**: Replace GBI for 3-5 sub-courier agencies shipping from Miami to Ecuador. Multi-warehouse architecture from day one.

- WR receipt (scan, weigh, measure, photo, assign) with offline queue & sync
- Warehouse inventory view with search/filter
- All 13 work order types with basic workflows
- Shipping instructions for Ecuador courier categories (A–G) + Air Cargo
- Manifest generation (MAWB/HAWB)
- Tariff management (per agency, per weight range, per modality)
- Role-based access for all 7 MVP roles
- Email notifications (receipt, dispatch, WO completion, alerts)
- Storage day tracking with configurable alerts and auto-abandon
- Unknown WR management
- Ticket system
- Agency invoicing (no-wms → agency billing)
- Basic reporting (cargo in/out, aging, by agency)
- Ecuador destination country settings (courier categories, cupo 4x4, cedula/RUC validation)
- Full settings panel at every level (organization, warehouse, destination, agency, user)
- AI: Command bar (⌘K) with natural language search, smart WR assignment suggestions, inline contextual help

## Phase 2 (Post-MVP)

- WhatsApp integration (full bidirectional)
- End customer (mailbox client) portal
- LCL/FCL modalities
- Additional destination countries (Colombia, Peru, etc. — settings-driven, no code changes)
- QuickBooks / SRI integration
- Multi-origin warehouses operational (Spain, China — architecture supports from MVP)
- Advanced AI: document processing (invoice OCR, label reading), predictive ops, cost optimization
- Carrier API integration (FedEx, UPS, DHL tracking)
- Multi-currency support
- Data migration tools from GBI
- SED generation assistance

## Phase 3

- Mobile native app for warehouse operators
- IoT integrations (smart scales, dimensioners)
- Advanced analytics & BI dashboard
- Marketplace / API for third-party integrations
- Multi-language UI (ES/EN)

---

## Resolved Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Naming | ✅ **no-wms** / no-wms.com |
| 2 | Dimensional factor | Configurable per modality in settings |
| 3 | Agency self-approval of dispatches | Configurable per agency in settings |
| 4 | Photo storage retention | Unlimited in MVP (Supabase Storage) |
| 5 | Offline receipt | ✅ Yes — critical. Queue and sync when connection restores |
| 6 | SED generation | TBD — research needed. Manual process in MVP |
| 7 | Airline reservation workflow | Manual in MVP. System tracks reservations, doesn't create them |
| 8 | Ecuador regulatory specifics | ✅ Ecuador is first destination country. Cupo 4x4, cedula/RUC, courier categories — all in MVP |
| 9 | Multiple warehouses | ✅ Multi-warehouse from day one. Miami primary, architecture supports N origins |
| 10 | Billing model | no-wms bills agencies. Agencies collect from their end customers. Agency invoicing is core MVP |

---

*This document is the alignment checkpoint. Once we agree on scope and priorities, next step is the database schema and module architecture.*
