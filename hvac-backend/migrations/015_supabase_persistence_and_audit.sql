-- Phase 15: Supabase Persistence & Audit Storage Schema

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  requested_output_type VARCHAR(50),
  location VARCHAR(255),
  building_type VARCHAR(255),
  total_spaces INT DEFAULT 0,
  total_area_sqft NUMERIC(12, 2) DEFAULT 0,
  total_volume_cuft NUMERIC(12, 2) DEFAULT 0,
  total_occupants INT DEFAULT 0,
  cooling_required BOOLEAN DEFAULT TRUE,
  ventilation_required BOOLEAN DEFAULT TRUE,
  spaces_json JSONB,
  missing_information_json JSONB,
  raw_input TEXT,
  overall_status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents Meta Table
CREATE TABLE IF NOT EXISTS documents_meta (
  document_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50),
  revision_number INT DEFAULT 1,
  is_superseded BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fact Provenance Table
CREATE TABLE IF NOT EXISTS fact_provenance (
  fact_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  document_id VARCHAR(100),
  file_name VARCHAR(255),
  document_type VARCHAR(50),
  page_number INT,
  section VARCHAR(255),
  source VARCHAR(100),
  field_name VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Conflicts Table
CREATE TABLE IF NOT EXISTS conflict_records (
  conflict_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  document_a VARCHAR(255),
  document_b VARCHAR(255),
  page_a INT,
  page_b INT,
  field VARCHAR(100) NOT NULL,
  value_a TEXT,
  value_b TEXT,
  severity VARCHAR(20) DEFAULT 'HIGH',
  resolution_status VARCHAR(50) NOT NULL,
  required_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Engineering Sizing Table
CREATE TABLE IF NOT EXISTS engineering_sizing (
  sizing_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) UNIQUE REFERENCES projects(project_id) ON DELETE CASCADE,
  cooling_load_tr NUMERIC(10, 2),
  cooling_status VARCHAR(50) NOT NULL,
  cooling_load_basis TEXT,
  airflow_cfm NUMERIC(10, 2),
  fresh_air_cfm NUMERIC(10, 2),
  fresh_air_basis TEXT,
  fresh_air_status VARCHAR(50),
  formula_basis TEXT,
  breakdown_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Verified Equipment Selections Table
CREATE TABLE IF NOT EXISTS equipment_selections (
  equipment_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  equipment_type VARCHAR(100) NOT NULL,
  capacity VARCHAR(100),
  airflow VARCHAR(100),
  quantity INT DEFAULT 1,
  application VARCHAR(100),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  voltage VARCHAR(100),
  efficiency VARCHAR(100),
  unit_price NUMERIC(14, 2),
  total_price NUMERIC(14, 2),
  currency VARCHAR(10) DEFAULT 'INR',
  supplier VARCHAR(255),
  verification_status VARCHAR(50) NOT NULL,
  price_verification_status VARCHAR(50),
  datasheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BOQ Items Table
CREATE TABLE IF NOT EXISTS boq_items (
  item_code VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  category VARCHAR(100),
  description TEXT NOT NULL,
  specification TEXT,
  quantity NUMERIC(10, 2),
  unit VARCHAR(50),
  unit_rate NUMERIC(14, 2),
  total_amount NUMERIC(14, 2),
  currency VARCHAR(10) DEFAULT 'INR',
  catalog_id VARCHAR(100),
  supplier_id VARCHAR(100),
  price_id VARCHAR(100),
  verification_status VARCHAR(50) NOT NULL,
  provenance VARCHAR(100) NOT NULL,
  calculation_basis TEXT,
  inputs_used_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tender Compliance Table
CREATE TABLE IF NOT EXISTS tender_compliance (
  item_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  category VARCHAR(100),
  source_document VARCHAR(255),
  page_number INT,
  section VARCHAR(255),
  requirement_type VARCHAR(50),
  tender_requirement TEXT NOT NULL,
  our_response TEXT,
  status VARCHAR(50) NOT NULL,
  evidence_text TEXT,
  evidence_provenance TEXT,
  deviation TEXT,
  unresolved_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Commercial Quotes Table
CREATE TABLE IF NOT EXISTS commercial_quotes (
  quotation_number VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  currency VARCHAR(10) DEFAULT 'INR',
  boq_subtotal NUMERIC(14, 2),
  verified_subtotal NUMERIC(14, 2),
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  discount_amount NUMERIC(14, 2) DEFAULT 0,
  discount_status VARCHAR(50),
  freight_amount NUMERIC(14, 2),
  freight_status VARCHAR(50),
  installation_amount NUMERIC(14, 2),
  installation_status VARCHAR(50),
  taxable_amount NUMERIC(14, 2),
  tax_percent NUMERIC(5, 2),
  tax_amount NUMERIC(14, 2),
  tax_status VARCHAR(50) NOT NULL,
  tax_basis VARCHAR(50) DEFAULT 'TAX_EXCLUSIVE',
  grand_total NUMERIC(14, 2),
  grand_total_status VARCHAR(50) NOT NULL,
  pricing_verified BOOLEAN DEFAULT FALSE,
  resolution_report_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Technical Bid Envelopes Table
CREATE TABLE IF NOT EXISTS technical_bid_envelopes (
  envelope_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) UNIQUE REFERENCES projects(project_id) ON DELETE CASCADE,
  technical_envelope_status VARCHAR(50) NOT NULL,
  design_basis_json JSONB,
  hvac_calculations_json JSONB,
  ventilation_basis_json JSONB,
  equipment_schedule_json JSONB,
  datasheet_references_json JSONB,
  maf_requirements_json JSONB,
  method_statements_json JSONB,
  testing_commissioning_tab_json JSONB,
  project_schedule_json JSONB,
  experience_certificates_json JSONB,
  compliance_matrix_json JSONB,
  deviations_conflicts_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Generated Bid Documents Table
CREATE TABLE IF NOT EXISTS generated_bid_documents (
  document_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  quotation_number VARCHAR(100),
  document_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  pdf_base64 TEXT,
  document_html TEXT,
  review_items_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
  event_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
  checkpoint VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR FAST QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents_meta(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_project_id ON boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_project_id ON tender_compliance(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON commercial_quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_project_id ON audit_events(project_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_sizing ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_bid_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_bid_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- TENANT ISOLATION POLICIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_user_isolation') THEN
    CREATE POLICY projects_user_isolation ON projects FOR ALL USING (auth.uid()::text = user_id);
  END IF;
END $$;
