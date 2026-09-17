# HVAC BIS — Bid Intelligence System

> Intelligent HVAC bid evaluation and engineering sizing platform. Processes tender briefs, specifications, schedules, drawings, and addenda; extracts equipment and design parameters; cross-checks requirements with zero-fabrication rules; and generates compliant tender bid packages with verified supplier networks.

---

## 🏛️ Architecture Overview

The system operates as a unified monorepo with dedicated frontend and backend services:

```
hvac-project/
├── hvac-backend/                  # Express / Node.js API server (Target: Railway)
│   ├── src/
│   │   ├── controllers/          # HVAC & Webhook API endpoints
│   │   ├── pipeline/             # Deterministic sizing & multi-mode routers
│   │   ├── services/             # Supabase persistence & PDF generation
│   │   └── validators/           # Zod schemas & zero-fabrication rules
│   ├── railway.json              # Railway deployment configuration
│   ├── Procfile                  # Process definition for PaaS deployment
│   └── package.json
│
├── hvac-frontend/                 # React 19 + Vite frontend application
│   ├── artifacts/
│   │   └── hvac-bis/             # Main client SPA (Target: Vercel)
│   │       ├── src/
│   │       │   ├── components/   # Workspace UI, SupplierMap, Trace cards
│   │       │   ├── contexts/     # Supabase Auth Context
│   │       │   ├── pages/        # Workspace, Projects, Requirements, Equipment, BOQ
│   │       │   └── services/     # HVACApiClient (VITE_BACKEND_API_URL)
│   │       ├── vercel.json       # Vercel SPA routing & cache headers
│   │       ├── vite.config.ts    # Optimized Vite build configuration
│   │       └── package.json
│   └── supabase/
│       └── migrations/           # Database schemas, RLS policies & supplier seeds
│
└── README.md
```

---

## 🚀 Key Features

1. **Three Execution Modes**:
   - **Requirement-Driven**: Natural language HVAC brief with guided project details (location, space breakdown, scope selections).
   - **Document-Driven**: Drag-and-drop tender PDF parsing, extraction, and verification.
   - **Hybrid Mode**: Merges narrative project context with uploaded PDF evidence.
2. **Deterministic Engineering Sizing**: Sizing calculations (TR, CFM, sensible/latent loads, ventilation) with zero fabricated numbers.
3. **Rigorous Provenance**: Every figure is tagged as `SOURCE FACT`, `DETERMINISTIC CALCULATION`, `PRELIMINARY ESTIMATE`, or `NEEDS REVIEW`.
4. **Verified Supplier Network**: Interactive Leaflet geospatial map linking verified commercial distributors (Daikin, Blue Star, Voltas, Carrier/Midea) across Chennai, Coimbatore, Bangalore, Mumbai, and Madurai.
5. **Bid Package PDF Generation**: Complete tender package generation with executive summary, equipment schedule, and audit trail.

---

## 🌐 Production Deployment

### 1. Backend on [Railway](https://railway.app)
- **Root Directory**: `hvac-backend`
- **Builder**: `NIXPACKS` (defined in `railway.json`)
- **Environment Variables**:
  ```env
  NODE_ENV=production
  PORT=3001
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
  ALLOWED_ORIGINS=https://your-frontend.vercel.app
  ```

### 2. Frontend on [Vercel](https://vercel.com)
- **Root Directory**: `hvac-frontend/artifacts/hvac-bis`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  ```env
  VITE_BACKEND_API_URL=https://your-backend.up.railway.app
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```

---

## 💻 Local Development

### Prerequisites
- Node.js >= 18
- npm or pnpm

### Start Backend
```bash
cd hvac-backend
npm install
npm run build
npm start
# Runs on http://localhost:3001
```

### Start Frontend
```bash
cd hvac-frontend/artifacts/hvac-bis
npm install
npm run dev
# Runs on http://localhost:21893 (or 5173)
```

---

## 🔒 Security & Secrets Hygiene
- All sensitive variables (`SUPABASE_SERVICE_ROLE_KEY`, API tokens) remain exclusively on the server.
- The client bundle only consumes public publishable keys prefixed with `VITE_`.
- All `.env` and `.env.local` files are ignored via `.gitignore`.
