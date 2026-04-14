# IntegrateOS — Self-Learning B2B Integration Platform

## What This Project Is

IntegrateOS is a B2B integration mapping and partner onboarding platform that replaces manual Excel-based EDI mapping workflows (called DMAs — Design Mapping Assignments) with an interactive, collaborative web application.

The core problem: companies like AIT Worldwide Logistics onboard 50+ trading partners per year on platforms like IBM Sterling. Each onboarding takes 6-12 weeks of manual work — primarily because mapping specifications are managed in Excel spreadsheets emailed back and forth. IntegrateOS eliminates this by providing a shared workspace where both sides collaborate on mappings in real-time.

## Domain Context (Critical — Read This)

### What is EDI Mapping?

EDI (Electronic Data Interchange) is how companies exchange business documents electronically. A "mapping" defines how data from one format transforms into another. For example:
- X12 204 Load Tender (shipper sends to carrier): "Put the shipment ID from B2*04 into the XML field /shipmentIdentificationNumber"
- X12 214 Shipment Status (carrier sends back): "Put the status code from AT7*01 into the JSON field .statusCode"

### The Real-World Complexity (from actual Coyote/RXO DMA files we analyzed)

1. **Customer-specific overrides are the dominant pattern**: The same field (e.g., ISA*06 Sender ID) can have 15+ different rules depending on which customer is involved. Example: "If InterchangeReceiverID = ELOGEX, hardcode 'SWY'. If InterchangeReceiverID = VISISHIPTMT and N4*02 = CA, use alternate sender. Otherwise, pass through."

2. **Multiple source/target format combinations**: 
   - EDI X12 (versions 3040, 4010, 4030, 5010) ↔ Internal XML (XPath-based)
   - EDI ↔ JSON API (REST endpoints)
   - OTM XML (Oracle Transportation Management) ↔ EDI
   - Generic XML (invoices) ↔ EDI 210
   - EDI ↔ CSV/Flat files
   - SOAP/WS-Security ↔ XML

3. **Hierarchical document structures**: 
   - 856 ASN has 5 HL levels: Shipment → Order → Tare/Pallet → Pack/Case → Item
   - 850 PO has nested loops: PO1 line items → PID descriptions → SDQ store allocations
   - 204 Load Tender has S5 stop loops with nested L11 references, G62 dates, AT8 weights, N1 parties

4. **Rule types found in real DMAs**:
   - Direct passthrough
   - Hardcode values ("hardcode = CLLQ")
   - Current date/time injection
   - Auto-increment counters (HL01)
   - Conditional logic ("If ISA*06 = KUEBIX and N1*01 = BT...")
   - Suppress/Do Not Send ("Do not send L11 when ReceiverID = X")
   - Lookup/code conversion tables (UOM, timezone, country code 2→3 letter)
   - String concatenation, splitting, substring extraction
   - Date format conversion (YYYYMMDD → ISO 8601)
   - XML tag parsing (extracting values from OTM SSRemarks)

5. **Transaction types in logistics**:
   - 204 Motor Carrier Load Tender (shipper → carrier)
   - 990 Response to Load Tender (carrier → shipper)
   - 214 Shipment Status Message (carrier → shipper)
   - 210 Motor Carrier Freight Invoice (carrier → shipper)
   - 856 Advance Ship Notice / ASN (shipper → receiver)
   - 850 Purchase Order (buyer → seller)
   - 855 PO Acknowledgment (seller → buyer)
   - 810 Invoice (seller → buyer)

### Key Insight from Analyzing Real DMAs

The mapping tool must support a **base mapping + customer override stack** architecture. Each field has:
- One base/default rule (applies to all customers)
- Zero or more customer-specific overrides (each with a condition, rule type, and value)
- Notes and comments per mapping
- Confirmation/review status tracking
- Change log with author attribution

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (or separate FastAPI if needed for heavy processing)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (for partner collaboration — both sides need to log in)
- **State**: React useReducer for complex mapping state, React Query for server state
- **Deployment**: Vercel (frontend) + managed PostgreSQL (Supabase or Neon)

## Project Structure

```
integrateos/
├── CLAUDE.md                    # This file
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Landing / dashboard
│   │   ├── workspace/
│   │   │   └── [partnerId]/
│   │   │       ├── page.tsx     # Partner workspace
│   │   │       ├── mapping/     # Mapping studio
│   │   │       ├── comm/        # Communication setup
│   │   │       └── activity/    # Chat & activity
│   │   └── api/
│   │       ├── mappings/        # CRUD for mapping specs
│   │       ├── partners/        # Partner management
│   │       ├── schemas/         # EDI schema definitions
│   │       └── export/          # Excel/PDF export
│   ├── components/
│   │   ├── mapper/              # Hierarchical mapping UI
│   │   │   ├── TreePanel.tsx    # Source/target tree renderer
│   │   │   ├── TreeRow.tsx      # Individual tree row
│   │   │   ├── RulePanel.tsx    # Bottom rule detail panel
│   │   │   ├── OverrideStack.tsx # Customer override UI
│   │   │   └── LoopConfig.tsx   # Array/loop handling
│   │   ├── workspace/           # Partner workspace components
│   │   ├── common/              # Shared UI components
│   │   └── export/              # Excel export logic
│   ├── lib/
│   │   ├── schemas/             # EDI schema definitions (the data)
│   │   │   ├── x12/
│   │   │   │   ├── envelope.ts  # Shared ISA/GS/ST
│   │   │   │   ├── 204.ts      # 204 Load Tender segments
│   │   │   │   ├── 214.ts      # 214 Shipment Status
│   │   │   │   ├── 210.ts      # 210 Freight Invoice
│   │   │   │   ├── 990.ts      # 990 Tender Response
│   │   │   │   ├── 850.ts      # 850 Purchase Order
│   │   │   │   ├── 856.ts      # 856 ASN
│   │   │   │   ├── 855.ts      # 855 PO Ack
│   │   │   │   └── 810.ts      # 810 Invoice
│   │   │   └── targets/
│   │   │       ├── xml.ts       # Internal XML targets
│   │   │       ├── json.ts      # JSON API targets
│   │   │       ├── otm.ts       # OTM XML targets
│   │   │       └── csv.ts       # CSV/flat file targets
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── db.ts                # Prisma client
│   │   └── export.ts            # Excel export utilities
│   └── styles/
│       └── globals.css
├── prisma/
│   └── schema.prisma            # Database schema
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.local
```

## Database Schema (Prisma)

Key models:
- **Partner**: name, scac, type, status, contactInfo
- **MappingSpec**: partnerId, txType, ediVersion, sourceFormat, targetFormat, status
- **FieldMapping**: mappingSpecId, sourceFieldId, targetFieldId, ruleType, value, confirmed, notes
- **CustomerOverride**: fieldMappingId, customerName, ruleType, value, condition, active
- **LoopConfig**: mappingSpecId, loopId, operation (copy_all/filter/first/aggregate), condition
- **Comment**: mappingSpecId, fieldMappingId (optional), author, text, timestamp
- **ChangeLogEntry**: mappingSpecId, author, summary, timestamp

## What's Already Built (Prototypes in /prototypes)

The `prototypes/` directory contains working React artifacts built during the design phase:

1. **integrateos-mapper-final.jsx** — The most complete version. Features:
   - Transaction type selector (204/214/210/990/850/856/855/810)
   - EDI version selector (3040/4010/4030/5010)
   - Target format selector (XML/JSON/OTM XML/CSV)
   - Hierarchical source tree with ISA/GS/ST envelope + transaction-specific body
   - Hand-crafted target schemas per tx type × format combination
   - Click-to-map interaction (click source → click target)
   - Auto-map with fuzzy label matching
   - Base mapping + customer override stack architecture
   - 15 rule types (direct, hardcode, conditional, suppress, currentDate, etc.)
   - Bottom rule detail panel with override management
   - Notes and sample data per mapping

2. **integrateos-collaboration-workspace.jsx** — Partner collaboration workspace:
   - Partner list sidebar with status tracking
   - Communication setup tab (protocol, credentials, certificates)
   - Field mapping tab with inline commenting
   - Activity/chat tab with threaded conversations
   - Onboarding checklist

3. **integrateos-856-blueyonder-mapper.jsx** — 856 ASN → Blue Yonder WMS mapping with Excel export

## Design Guidelines

- **Aesthetic**: Warm paper tones (#f3f1ec background, #faf8f5 paper), precision spreadsheet feel
- **Fonts**: Karla for body, Fira Code for monospace/code
- **Interaction**: Click-to-map (source → target), inline rule editing, collapsible tree nodes
- **Color coding**: Blue for source/groups, Purple for target/XML, Orange for customer overrides, Green for confirmed, Amber for loops
- **Layout**: Three-panel — source tree (left), target tree (right), rule detail (bottom)

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npx prisma migrate   # Run database migrations
npx prisma studio    # Visual database editor

# Testing
npm run test         # Run tests
npm run lint         # Lint check
```

## Priority Features for V1

1. ✅ Hierarchical mapping UI with all transaction types
2. ✅ Customer override stack per field
3. ✅ Multiple source/target format support
4. ⬜ Persist mappings to PostgreSQL
5. ⬜ Partner workspace with auth (both sides log in)
6. ⬜ Excel export of complete mapping spec (7-sheet workbook)
7. ⬜ Import existing DMA Excel files and parse into the mapping model
8. ⬜ Real-time collaboration (WebSocket or polling)
9. ⬜ Change log with author tracking
10. ⬜ Sample EDI file paste/upload with live transform preview
