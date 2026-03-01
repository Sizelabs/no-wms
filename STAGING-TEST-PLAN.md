# no-wms Staging Test Plan

Use this guide to test the staging environment at **http://localhost:3001** (run `pnpm dev:staging` from `apps/web`).

**Password for all users:** `TestPassword1234`

---

## Test 1: Login & Role-Based Access

### 1.1 Super Admin Login
- **User:** `superadmin@test.nowms.dev`
- **Expected:** Login succeeds, redirects to dashboard. Should see all organizations (ACME Logistics, Globex Trading, Pinnacle Freight). Should have access to all menu items.

### 1.2 Company Admin Login
- **User:** `companyadmin@test.nowms.dev`
- **Expected:** Login succeeds. Should only see ACME Logistics data. Should have access to company settings, users, warehouses, agencies.

### 1.3 Warehouse Admin Login
- **User:** `whadmin.mia@test.nowms.dev`
- **Expected:** Login succeeds. Should only see Miami Warehouse (MIA) data. Should NOT see GYE or MAD warehouse data.

### 1.4 Warehouse Operator Login
- **User:** `operator.mia@test.nowms.dev`
- **Expected:** Login succeeds. Limited to MIA warehouse operational views (inventory, work orders). Should NOT have admin settings access.

### 1.5 Agency User Login
- **User:** `agency.rapidito@test.nowms.dev`
- **Expected:** Login succeeds. Should only see Rapidito Express data — their warehouse receipts, consignees, and shipping instructions. Should NOT see other agencies' data.

### 1.6 Cross-Org Isolation
- **User:** `globex.admin@test.nowms.dev`
- **Expected:** Should only see Globex Trading data. Should NOT see any ACME Logistics or Pinnacle Freight data (no WRs, no agencies, no warehouses from other orgs).

### 1.7 Invalid Login
- **Email:** `notauser@test.nowms.dev` / **Password:** `WrongPassword`
- **Expected:** Login fails with an error message displayed on the login page.

---

## Test 2: Warehouse Receipts (Inventory)

### 2.1 View Inventory List
- **User:** `operator.mia@test.nowms.dev`
- **Expected:** Should see MIA warehouse receipts (GLP0001–GLP0020). Should NOT see GYE (GLP0021-25), LAX (GLP0026-28), or JFK (GLP0029-30) records.
- **Verify dates:** Records should show different received dates spread across Dec 2025–Feb 2026, NOT all the same date. Specifically:
  - GLP0001–GLP0004 (received): received mid-to-late February, showing ~1-2 weeks in DÍAS
  - GLP0005–GLP0010 (in_warehouse): received early-mid February, showing ~2-3 weeks in DÍAS
  - GLP0019–GLP0020 (dispatched): received Dec 2025, showing ~60-70 days in DÍAS
- **Verify statuses:** Mix of Recibida, En Bodega, En Orden de Trabajo, En Despacho, Despachada

### 2.2 Filter by Status
- Filter by "Recibida" — should show GLP0001-GLP0004 (4 records at MIA)
- Filter by "Despachada" — should show GLP0019-GLP0020 (2 records at MIA)
- Filter by "En Bodega" — should show GLP0005-GLP0010 (6 records at MIA)

### 2.3 Search Functionality
- Search by tracking number `1Z999AA10123456784` — should find GLP0001
- Search by WR number `GLP0007` — should find the DHL package
- Search by consignee name `Maria Garcia` — should find her packages

### 2.4 View WR Details
- Click on GLP0001 — should show:
  - Tracking: 1Z999AA10123456784
  - Carrier: UPS
  - Agency: RAP (Rapidito Express)
  - Consignee: Maria Garcia
  - Weight: 3.50 lb
  - Dimensions: 12.0 × 8.0 × 6.0 in
  - Content: Ropa y accesorios
  - Declared value: $85.00
  - Status: Recibida
  - Location: A1-1

### 2.5 Damaged WR
- **User:** `whadmin.gye@test.nowms.dev`
- View GLP0023 — should show:
  - Status: Dañada
  - Damage description: "Caja aplastada, 2 platos rotos..."
  - Should have damage flag visible

### 2.6 Abandoned WR
- View GLP0025 — should show:
  - Status: Abandonada
  - Received ~95 days ago (Nov 25, 2025)
  - DÍAS should show ~95d

### 2.7 GYE Operator Sees Only GYE Data
- **User:** `operator.gye@test.nowms.dev`
- **Expected:** Should see GLP0021–GLP0025 only (GYE warehouse). Should NOT see MIA, LAX, or JFK records.

---

## Test 3: Work Orders

### 3.1 View Work Orders List
- **User:** `operator.mia@test.nowms.dev`
- **Expected:** Should see WO00001-WO00007 (MIA warehouse). Should NOT see WO00008 (GYE warehouse).
- **Verify statuses:** completed (WO1, WO5), in_progress (WO2, WO6), requested (WO3), approved (WO4), cancelled (WO7)

### 3.2 View Completed Work Order
- View WO00001 (photos, completed):
  - Type: Fotos
  - Status: Completada
  - Requested by: Agency Rapidito
  - Assigned to: Operator Miami
  - Instructions: "Tomar fotos del contenido del paquete"
  - Result: "Fotos tomadas: 4 imagenes subidas"
  - Should show linked WR: GLP0011

### 3.3 View In-Progress Work Order
- View WO00002 (group, in_progress):
  - Type: Agrupar
  - Priority: Alta
  - Should show 2 linked WRs: GLP0011, GLP0013
  - No result_notes yet (still in progress)

### 3.4 View Pickup Authorization
- View WO00004 (authorize_pickup, approved):
  - Pickup date should be ~3 days from today
  - Pickup time: 14:00
  - Location: Oficina MIA - Puerta 3
  - Authorized person: Carlos Mendoza
  - Contact: +593991234567

### 3.5 View Cancelled Work Order
- View WO00007 (abandon, cancelled):
  - Cancellation reason: "Cliente reclamo el paquete antes del vencimiento"
  - Status history should show: requested → cancelled

---

## Test 4: Shipping Instructions

### 4.1 View Shipping Instructions List
- **User:** `shipping@test.nowms.dev`
- **Expected:** Should see SI00001–SI00006
- **Verify statuses:** requested (SI1, SI2), approved (SI3), finalized (SI4, SI5), rejected (SI6)

### 4.2 View Finalized SI
- View SI00004 (finalized):
  - Agency: Rapidito Express
  - Destination: Ecuador
  - Modality: courier_a
  - Consignee: Maria Garcia
  - Cédula: 0901234567
  - Total pieces: 1, Weight: 5.90 lb
  - Approved by: Dest Admin Ecuador
  - Should have linked HAWB(s)

### 4.3 View Rejected SI
- View SI00006 (rejected):
  - Rejection reason: "Valor declarado excede limite para categoria E..."
  - Should show status history: requested → rejected

### 4.4 Agency View of SIs
- **User:** `agency.rapidito@test.nowms.dev`
- **Expected:** Should only see SIs for Rapidito Express (SI1, SI3, SI4, SI6). Should NOT see SI2 (Box4You) or SI5 (Envios del Sur).

---

## Test 5: Manifests (MAWBs / HAWBs / Sacas)

### 5.1 View MAWBs
- **User:** `shipping@test.nowms.dev`
- **Expected:** Should see 3 MAWBs:
  - 123-45678901 (LATAM LA602, created, flight Mar 3) — 2 HAWBs
  - 123-45678902 (Avianca AV234, in_transit, flight Feb 25) — 1 HAWB
  - 123-45678903 (Copa CM456, arrived, flight Feb 18) — 1 HAWB

### 5.2 View MAWB Details
- View MAWB 123-45678901:
  - Airline: LATAM, Flight: LA602
  - Destination: Ecuador
  - Total pieces: 3, Weight: 28.02 lb
  - Status: Creada
  - Should show 2 HAWBs: GLP00001 and GLP00002

### 5.3 View Sacas
- Should see 3 sacas:
  - SC00001 (open) — linked to MAWB1, contains WR15 + WR16
  - SC00002 (closed) — linked to MAWB2, contains WR19
  - SC00003 (dispatched) — linked to MAWB3, contains WR20

---

## Test 6: Companies & Organization Management

### 6.1 Super Admin Company List
- **User:** `superadmin@test.nowms.dev`
- Navigate to Companies
- **Expected:** Should see 3 companies: ACME Logistics, Globex Trading, Pinnacle Freight
- Plus the platform org "No-WMS" from the migration

### 6.2 View Company Details
- Click on ACME Logistics:
  - 3 warehouses: MIA, GYE, MAD
  - Multiple users assigned
  - 5 agencies
  - 3 destination countries

### 6.3 View Company Users
- Navigate to ACME Logistics users
- **Expected:** Should see 11 users (superadmin, companyadmin, 2 wh admins, 2 operators, shipping clerk, 2 dest admins, 2 agency users)

---

## Test 7: Warehouses & Locations

### 7.1 Company Admin Views Warehouses
- **User:** `companyadmin@test.nowms.dev`
- **Expected:** Should see 3 warehouses: MIA, GYE, MAD

### 7.2 View Warehouse Details
- Click on MIA warehouse:
  - 3 zones: Zona Recepcion (REC), Zona Almacenaje (ALM), Zona Despacho (DES)
  - 9 locations total (3 per zone): A1-1, A1-2, A1-3, B1-1, B1-2, B1-3, C1-1, C1-2, C1-3

### 7.3 Warehouse Admin Scope
- **User:** `whadmin.mia@test.nowms.dev`
- **Expected:** Should only see MIA warehouse, not GYE or MAD

---

## Test 8: Agencies & Consignees

### 8.1 View Agencies
- **User:** `companyadmin@test.nowms.dev`
- **Expected:** Should see 5 ACME agencies: Rapidito Express (RAP), Box4You (B4Y), Envios del Sur (EDS), Andina Cargo (AND), CasilleroEC (CAS)

### 8.2 View Agency Details
- Click on Rapidito Express:
  - Type: Corporativo
  - Destination: Ecuador
  - 3 contacts: Carlos Mendoza (admin, primary), Ana Vega (operations), Luis Paredes (billing)
  - 3 consignees: Maria Garcia, Jose Lopez, Ana Martinez

### 8.3 Agency User View
- **User:** `agency.rapidito@test.nowms.dev`
- **Expected:** Should only see Rapidito Express data. Should see their 3 consignees. Should NOT see Box4You or other agencies' consignees.

---

## Test 9: Tickets

### 9.1 View Tickets
- **User:** `whadmin.mia@test.nowms.dev`
- **Expected:** Should see 2 tickets:
  - TK00001 (open, high priority): "Paquete GLP0023 recibido con dano"
  - TK00002 (resolved, normal): "Consulta sobre tiempo de almacenamiento gratuito"

### 9.2 View Ticket Messages
- Open TK00001:
  - Should show 2 messages in chronological order
  - First from WH Admin Miami, then from Agency Rapidito
- Open TK00002:
  - Should show 2 messages
  - Marked as resolved

---

## Test 10: Cross-Organization Data Isolation

### 10.1 Globex Admin
- **User:** `globex.admin@test.nowms.dev`
- **Expected:**
  - Warehouses: LAX, BOG only
  - Agencies: Paqueteria Global, ChileBox only
  - WRs: GLP0026-GLP0028 only
  - Should see ZERO ACME or Pinnacle data

### 10.2 Pinnacle Admin
- **User:** `pinnacle.admin@test.nowms.dev`
- **Expected:**
  - Warehouses: JFK only
  - Agencies: Costa Express only
  - WRs: GLP0029-GLP0030 only
  - GLP0029 should be flagged as "unknown" (is_unknown = true)

---

## Test Summary Checklist

| # | Test | Status |
|---|------|--------|
| 1.1 | Super Admin Login | |
| 1.2 | Company Admin Login | |
| 1.3 | Warehouse Admin Login | |
| 1.4 | Warehouse Operator Login | |
| 1.5 | Agency User Login | |
| 1.6 | Cross-Org Isolation | |
| 1.7 | Invalid Login | |
| 2.1 | Inventory List with Dates | |
| 2.2 | Filter by Status | |
| 2.3 | Search | |
| 2.4 | WR Detail View | |
| 2.5 | Damaged WR | |
| 2.6 | Abandoned WR | |
| 2.7 | GYE Operator Scope | |
| 3.1 | Work Orders List | |
| 3.2 | Completed WO | |
| 3.3 | In-Progress WO | |
| 3.4 | Pickup Authorization | |
| 3.5 | Cancelled WO | |
| 4.1 | SI List | |
| 4.2 | Finalized SI | |
| 4.3 | Rejected SI | |
| 4.4 | Agency SI Scope | |
| 5.1 | MAWBs List | |
| 5.2 | MAWB Details | |
| 5.3 | Sacas | |
| 6.1 | Company List | |
| 6.2 | Company Details | |
| 6.3 | Company Users | |
| 7.1 | Warehouses List | |
| 7.2 | Warehouse Locations | |
| 7.3 | WH Admin Scope | |
| 8.1 | Agencies List | |
| 8.2 | Agency Details | |
| 8.3 | Agency User Scope | |
| 9.1 | Tickets List | |
| 9.2 | Ticket Messages | |
| 10.1 | Globex Isolation | |
| 10.2 | Pinnacle Isolation | |
