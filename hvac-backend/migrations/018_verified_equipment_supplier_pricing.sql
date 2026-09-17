-- Phase 18: Verified Equipment, Supplier & Pricing Data Integration Schema

-- 1. Equipment Catalog Table
CREATE TABLE IF NOT EXISTS equipment_catalog (
  catalog_id VARCHAR(100) PRIMARY KEY,
  equipment_type VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  capacity_tr NUMERIC(10, 2) NOT NULL,
  capacity_kw NUMERIC(10, 2),
  airflow_cfm NUMERIC(10, 2) NOT NULL,
  voltage VARCHAR(100),
  refrigerant VARCHAR(50),
  efficiency VARCHAR(100),
  datasheet_url TEXT,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
  source_provenance VARCHAR(100) NOT NULL DEFAULT 'VERIFIED_CATALOG_DB',
  is_test_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(100),
  source_url TEXT,
  supported_manufacturers JSONB,
  supported_equipment_types JSONB,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
  source_provenance VARCHAR(100) DEFAULT 'VERIFIED_SUPPLIER_DB',
  is_test_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Equipment Prices Table
CREATE TABLE IF NOT EXISTS equipment_prices (
  price_id VARCHAR(100) PRIMARY KEY,
  catalog_id VARCHAR(100) REFERENCES equipment_catalog(catalog_id) ON DELETE CASCADE,
  equipment_type VARCHAR(100),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  supplier_id VARCHAR(100) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  supplier_name VARCHAR(255),
  unit_price NUMERIC(14, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  price_basis VARCHAR(50) DEFAULT 'Ex-Factory',
  effective_date DATE NOT NULL,
  validity_expiry_date DATE,
  source_url TEXT,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
  source_provenance VARCHAR(100) DEFAULT 'VERIFIED_PRICING_DB',
  is_test_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_catalog_type_cap ON equipment_catalog(equipment_type, capacity_tr);
CREATE INDEX IF NOT EXISTS idx_catalog_status ON equipment_catalog(verification_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(verification_status);
CREATE INDEX IF NOT EXISTS idx_prices_catalog_supplier ON equipment_prices(catalog_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_prices_expiry ON equipment_prices(validity_expiry_date);
CREATE INDEX IF NOT EXISTS idx_prices_status ON equipment_prices(verification_status);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_prices ENABLE ROW LEVEL SECURITY;

-- SEED TEST FIXTURES (CLEARLY MARKED AS TEST DATA - NEVER TREATED AS PROD DATA)
INSERT INTO equipment_catalog (catalog_id, equipment_type, manufacturer, model, capacity_tr, capacity_kw, airflow_cfm, voltage, refrigerant, efficiency, datasheet_url, verification_status, source_provenance, is_test_data)
VALUES 
('TEST-CAT-01', 'Commercial Inverter Ductable Split Unit', 'Daikin', 'FDM50V1', 5.0, 17.58, 2000, '415V/3Ph/50Hz', 'R410A', '3.5 COP', 'https://oem.daikin.com/datasheets/fdm50v1.pdf', 'VERIFIED', 'TEST_DATA', TRUE),
('TEST-CAT-02', 'Commercial Inverter Ductable Split Unit', 'Daikin', 'FDM55V1', 5.5, 19.34, 2200, '415V/3Ph/50Hz', 'R410A', '3.6 COP', 'https://oem.daikin.com/datasheets/fdm55v1.pdf', 'VERIFIED', 'TEST_DATA', TRUE),
('TEST-CAT-03', 'Modular Commercial VRF Outdoor Unit', 'Voltas', 'VVRF-16T', 16.0, 56.27, 6000, '415V/3Ph/50Hz', 'R410A', '4.1 ISEER', 'https://voltas.com/datasheets/vvrf-16t.pdf', 'VERIFIED', 'TEST_DATA', TRUE)
ON CONFLICT (catalog_id) DO NOTHING;

INSERT INTO suppliers (supplier_id, name, category, city, address, phone, email, source_url, supported_manufacturers, supported_equipment_types, verification_status, source_provenance, is_test_data)
VALUES 
('TEST-SUP-01', 'Chennai Cool Tech Systems Pvt Ltd', 'HVAC OEM Distributor', 'Chennai', '124 Mount Road, Guindy, Chennai 600032', '+91-44-22500123', 'sales@chennaicooltech.com', 'https://chennaicooltech.com', '["Daikin", "Voltas", "Blue Star"]', '["Commercial Inverter Ductable Split Unit", "Modular Commercial VRF Outdoor Unit"]', 'VERIFIED', 'TEST_DATA', TRUE)
ON CONFLICT (supplier_id) DO NOTHING;

INSERT INTO equipment_prices (price_id, catalog_id, equipment_type, manufacturer, model, supplier_id, supplier_name, unit_price, currency, price_basis, effective_date, validity_expiry_date, source_url, verification_status, source_provenance, is_test_data)
VALUES 
('TEST-PRC-01', 'TEST-CAT-01', 'Commercial Inverter Ductable Split Unit', 'Daikin', 'FDM50V1', 'TEST-SUP-01', 'Chennai Cool Tech Systems Pvt Ltd', 185000, 'INR', 'Ex-Factory', '2026-01-01', '2026-12-31', 'https://chennaicooltech.com/quote-ref-101.pdf', 'VERIFIED', 'TEST_DATA', TRUE),
('TEST-PRC-EXP', 'TEST-CAT-01', 'Commercial Inverter Ductable Split Unit', 'Daikin', 'FDM50V1', 'TEST-SUP-01', 'Chennai Cool Tech Systems Pvt Ltd', 160000, 'INR', 'Ex-Factory', '2024-01-01', '2024-12-31', 'https://chennaicooltech.com/quote-ref-old.pdf', 'VERIFIED', 'TEST_DATA', TRUE)
ON CONFLICT (price_id) DO NOTHING;
