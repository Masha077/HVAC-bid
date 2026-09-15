# HVAC BIS — Intelligent Bid & Spec Processor

> AI-powered HVAC bid document processor that extracts equipment and requirements, cross-checks specifications, schedules, drawings, and addenda, flags missing or conflicting data, and provides source-backed evidence in structured data for faster, more reliable estimating.

---

## 🏗️ Project Overview

**HVAC BIS** is a specialized engineering and bid evaluation workbench tailored for mechanical estimators, HVAC engineers, and commercial MEP contractors. Estimating commercial HVAC bids often requires reconciling disparate tender packages—unstructured narrative briefs, engineering schedules, CAD/PDF drawings, addenda, and supplier equipment catalogs. 

HVAC BIS accelerates and de-risks this process by:
- Structuring raw requirements into deterministic parameters.
- Tracing every calculation and figure back to an exact source fact or engineering rule.
- Highlighting discrepancies, conflicts, and missing information before tender submission.
- Connecting equipment specifications directly with verified regional supplier networks.

---

## 🌟 Key Features

### 1. HVAC-Specific Extraction & Workspace
- **Requirement-Driven Processing**: Ingest tender briefs, project scope summaries, and space constraints.
- **Preliminary Engineering Sizing**: Deterministic estimations for cooling load (TR), airflow (CFM), ventilation/fresh air, and space allocations.
- **Traceability & Provenance**: Every number and decision is explicitly labeled by provenance (`SOURCE FACT`, `DETERMINISTIC CALCULATION`, `PRELIMINARY ESTIMATE`, `AI RECOMMENDATION`, `VERIFIED`, `NEEDS REVIEW`, or `CONFLICT`).

### 2. Cross-Document Validation & Consistency
- Automatically cross-checks equipment schedules, design criteria, and architectural drawings.
- Flags missing parameters (e.g., glazing orientation, operating diversity, electrical voltage requirements).
- Maintains a strict review posture—conflicts and missing data are never silently filled in or assumed.

### 3. Equipment Catalog & Regional Supplier Network
- **Equipment Records**: Structured engineering profiles covering capacity, airflow, quantities, manufacturer specs, voltage, efficiency, and pricing.
- **Supplier Availability Map**: Real, interactive Leaflet & OpenStreetMap geospatial network covering verified HVAC commercial distributors, authorized manufacturer dealers (Daikin, Blue Star, Voltas, Carrier/Midea), and component suppliers.
- **Territory Support**: Dedicated hubs with verified physical addresses, phone numbers, and direct Google Maps navigation across:
  - Chennai
  - Coimbatore
  - Bangalore
  - Mumbai
  - Madurai

### 4. Supabase Authentication & Database Integration
- Email/password authentication, persistent sessions, and secure protected routes.
- Profile management with Row Level Security (RLS).
- Production-ready PostgreSQL database migrations with indexed tables and read-only reference data policies for verified suppliers.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [Wouter](https://github.com/molefrog/wouter) (lightweight, client-side routing)
- **Styling**: Vanilla CSS + Tailwind CSS with custom HSL tokens, warm architectural palette (`#1E1E24`, `#FFF8F0`, `#92140C`, `#D99A79`), and typography (`DM Sans`, `Michroma`)
- **Interactive Maps**: [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles (no paid API key required)
- **Backend & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **Package Management**: [pnpm](https://pnpm.io/) workspaces

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) (v9 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/Masha077/HVAC-bid.git
cd HVAC-bid
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration
Navigate to the frontend directory (`artifacts/hvac-bis/`) and create a `.env.local` file from the example template:

```bash
cp artifacts/hvac-bis/.env.example artifacts/hvac-bis/.env.local
```

Configure your Supabase project credentials in `artifacts/hvac-bis/.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

> **Note**: Never commit `.env.local` or any private/secret keys (`sb_secret_*`, `service_role`). Only client-safe publishable keys are used by the frontend.

### 4. Database Setup (Optional / Reference)
Database schema migrations are located in `supabase/migrations/`:
- `20260915_hvac_bis_schema.sql`: Core schema (profiles, projects, requirements, equipment, validation, RLS policies).
- `20260915_suppliers_schema.sql`: Supplier availability schema and 20 verified real commercial HVAC suppliers.

You can execute these SQL files in your Supabase project SQL Editor. If not run immediately, the frontend automatically falls back to curated local verified datasets.

### 5. Run the Application

Start the local development server:
```bash
pnpm --filter @workspace/hvac-bis run dev
```

The frontend will start at `http://localhost:21893` (or the next available port).

---

## 🧪 Build & Quality Verification

Run type checking across all workspace packages:
```bash
pnpm --filter @workspace/hvac-bis run typecheck
```

Generate a production bundle:
```bash
pnpm --filter @workspace/hvac-bis run build
```

---

## 📂 Project Structure

```
├── artifacts/
│   └── hvac-bis/               # Primary React + Vite frontend
│       ├── src/
│       │   ├── components/     # AppShell, SupplierMap, UI components
│       │   ├── contexts/       # Supabase AuthContext & Session hooks
│       │   ├── data/           # Demo projects, verified supplier datasets
│       │   ├── lib/            # Supabase client initialization
│       │   ├── pages/          # Workspace, Projects, Requirements, Equipment, Library
│       │   ├── services/       # Mock & backend API service layers
│       │   ├── App.tsx         # Route configuration & ProtectedRoutes
│       │   ├── main.tsx        # React entry point
│       │   └── index.css       # Design tokens, fonts, theme styles
│       ├── .env.example        # Environment variable template
│       ├── package.json        # Frontend dependencies
│       └── vite.config.ts      # Vite build configuration
├── supabase/
│   └── migrations/             # SQL migrations & RLS security definitions
├── package.json                # Root workspace definition
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── README.md                   # Project documentation
```

---

## 📄 License
Commercial proprietary software. All rights reserved.
