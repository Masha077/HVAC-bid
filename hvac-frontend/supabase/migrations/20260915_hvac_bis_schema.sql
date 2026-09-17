-- ============================================================================
-- HVAC BIS SUPABASE PRODUCTION SCHEMA & ROW LEVEL SECURITY (RLS)
-- Migration: 20260915_hvac_bis_schema.sql
-- Description: Company-aware HVAC Engineering & Bid Intelligence Schema
-- Target: Supabase PostgreSQL
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    company_name TEXT,
    role TEXT NOT NULL DEFAULT 'HVAC_ESTIMATOR',
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- 4. HELPER FUNCTION FOR COMPANY-AWARE RLS
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 5. NEW USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_company_name TEXT;
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_company_name := COALESCE(new.raw_user_meta_data->>'company_name', 'Default MEP');
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'HVAC_ESTIMATOR');

  -- Create default company for the new user if not set
  INSERT INTO public.companies (name)
  VALUES (v_company_name)
  RETURNING id INTO v_company_id;

  INSERT INTO public.profiles (id, email, full_name, company_id, company_name, role)
  VALUES (new.id, new.email, v_full_name, v_company_id, v_company_name, v_role)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      company_name = EXCLUDED.company_name,
      updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    organization TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);

-- 7. HVAC PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.hvac_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    building_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_HOLD', 'CLOSED', 'IN REVIEW')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hvac_projects_company ON public.hvac_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_hvac_projects_status ON public.hvac_projects(status);

-- 8. PROJECT REQUIREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.project_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    location TEXT,
    building_type TEXT,
    spaces JSONB NOT NULL DEFAULT '[]'::jsonb,
    occupancy INT NOT NULL DEFAULT 0,
    cooling_required BOOLEAN NOT NULL DEFAULT true,
    ventilation_required BOOLEAN NOT NULL DEFAULT true,
    missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT,
    confidence TEXT,
    raw_input TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_requirements_project ON public.project_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_requirements_company ON public.project_requirements(company_id);

-- 9. HVAC CALCULATIONS TABLE
CREATE TABLE IF NOT EXISTS public.hvac_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cooling_load TEXT NOT NULL,
    airflow TEXT NOT NULL,
    fresh_air TEXT NOT NULL,
    spaces_count INT NOT NULL DEFAULT 0,
    occupants_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PRELIMINARY_ESTIMATE',
    inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hvac_calculations_project ON public.hvac_calculations(project_id);
CREATE INDEX IF NOT EXISTS idx_hvac_calculations_company ON public.hvac_calculations(company_id);

-- 10. EQUIPMENT CATALOG & SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    capacity TEXT,
    airflow TEXT,
    quantity INT DEFAULT 1,
    application TEXT,
    status TEXT NOT NULL DEFAULT 'AWAITING_VERIFIED_DATA',
    manufacturer TEXT,
    model TEXT,
    voltage TEXT,
    efficiency TEXT,
    price NUMERIC(14,2),
    supplier TEXT,
    datasheet_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_project ON public.equipment(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON public.equipment(company_id);

-- 11. MATERIALS & PRICING TABLE
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT NOT NULL DEFAULT 'm',
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    supplier TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_company ON public.materials(company_id);

-- 12. BOQ ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.boq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    item_code TEXT,
    description TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'nos',
    unit_rate NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boq_items_project ON public.boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_company ON public.boq_items(company_id);

-- 13. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    quotation_number TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_percent NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REVISED', 'REJECTED')),
    terms TEXT,
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotations_project ON public.quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company ON public.quotations(company_id);

-- 14. QUOTATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.quotation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    version INT NOT NULL,
    action TEXT NOT NULL,
    change_summary TEXT,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_history_quotation ON public.quotation_history(quotation_id);

-- 15. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size_bytes BIGINT,
    storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'Processed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id);

-- 16. AUDIT ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.audit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.hvac_projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    decision TEXT NOT NULL,
    calculation TEXT,
    recommendation TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entries_project ON public.audit_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_company ON public.audit_entries(company_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hvac_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hvac_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own profile and profiles in their company
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.get_current_user_company_id());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Companies: Users can read their own company
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_current_user_company_id());

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.get_current_user_company_id())
  WITH CHECK (id = public.get_current_user_company_id());

-- Customers
CREATE POLICY "customers_all" ON public.customers
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- HVAC Projects
CREATE POLICY "hvac_projects_all" ON public.hvac_projects
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Project Requirements
CREATE POLICY "project_requirements_all" ON public.project_requirements
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- HVAC Calculations
CREATE POLICY "hvac_calculations_all" ON public.hvac_calculations
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Equipment
CREATE POLICY "equipment_all" ON public.equipment
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Materials
CREATE POLICY "materials_all" ON public.materials
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- BOQ Items
CREATE POLICY "boq_items_all" ON public.boq_items
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Quotations
CREATE POLICY "quotations_all" ON public.quotations
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Quotation History
CREATE POLICY "quotation_history_all" ON public.quotation_history
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Documents
CREATE POLICY "documents_all" ON public.documents
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());

-- Audit Entries
CREATE POLICY "audit_entries_all" ON public.audit_entries
  FOR ALL TO authenticated
  USING (company_id = public.get_current_user_company_id() OR created_by = auth.uid())
  WITH CHECK (company_id = public.get_current_user_company_id() OR created_by = auth.uid());
