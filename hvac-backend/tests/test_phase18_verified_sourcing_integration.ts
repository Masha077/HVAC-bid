import { EquipmentSourcingEngine } from '../src/equipment/sourcing';
import { UnifiedProjectModel, HVACSizingResult, AuditReport, VerifiedCatalogRecord, VerifiedSupplierRecord, VerifiedPriceRecord } from '../src/domain/models';
import { AppConfig } from '../src/config/app_config';

console.log('=== PHASE 18 VERIFIED EQUIPMENT, SUPPLIER & PRICING INTEGRATION TESTS ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
  }
}

async function runPhase18Tests() {
  const dummyProject: UnifiedProjectModel = {
    project_id: 'PRJ-P18-TEST',
    user_id: 'user-p18',
    mode: 'REQUIREMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Chennai',
    building_type: 'Office Showroom',
    total_spaces: 1,
    spaces: [
      { name: 'Showroom Main Area', length_ft: 50, width_ft: 30, height_ft: 9, area_sqft: 1500, volume_cuft: 13500, occupants: 15 }
    ],
    total_area_sqft: 1500,
    total_volume_cuft: 13500,
    total_occupants: 15,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    documents_meta: [],
    fact_provenance: [],
    conflicts: [],
  };

  const dummySizing: HVACSizingResult = {
    cooling_load_tr: 5.0,
    cooling_status: 'DETERMINISTIC_CALCULATION',
    cooling_load_basis: 'Heat load calculation based on 1500 sq.ft showroom.',
    airflow_cfm: 2000,
    fresh_air_cfm: 300,
    formula_basis: 'Rule of Thumb: 300 sq.ft/TR for Commercial Showroom',
    provenance: 'DETERMINISTIC_CALCULATION',
    breakdown: {
      area_cooling_tr: 5.0,
      occupant_cooling_tr: 0.75,
      volume_cooling_tr: 5.0,
      base_cfm: 2000,
      fresh_air_occupant_cfm: 75,
      fresh_air_area_cfm: 225,
    },
  };

  const dummyAudit: AuditReport = {
    audit_status: 'READY_FOR_EQUIPMENT_SELECTION',
    conflicts: [],
    missing_fields: [],
    equipment_selection_allowed: true,
    audit_entries: [],
  };

  // Sample catalog fixtures
  const catalog5Tr: VerifiedCatalogRecord = {
    catalog_id: 'CAT-DAIKIN-5TR',
    equipment_type: 'Commercial Inverter Ductable Split Unit',
    manufacturer: 'Daikin',
    model: 'FDM50V1',
    capacity_tr: 5.0,
    airflow_cfm: 2000,
    voltage: '415V/3Ph/50Hz',
    efficiency: '3.5 COP',
    datasheet_url: 'https://oem.daikin.com/datasheets/fdm50v1.pdf',
    source_provenance: 'TEST_DATA',
    verification_status: 'VERIFIED',
    is_test_data: true,
  };

  const catalog55Tr: VerifiedCatalogRecord = {
    catalog_id: 'CAT-DAIKIN-55TR',
    equipment_type: 'Commercial Inverter Ductable Split Unit',
    manufacturer: 'Daikin',
    model: 'FDM55V1',
    capacity_tr: 5.5,
    airflow_cfm: 2200,
    voltage: '415V/3Ph/50Hz',
    efficiency: '3.6 COP',
    datasheet_url: 'https://oem.daikin.com/datasheets/fdm55v1.pdf',
    source_provenance: 'TEST_DATA',
    verification_status: 'VERIFIED',
    is_test_data: true,
  };

  const catalog10Tr: VerifiedCatalogRecord = {
    catalog_id: 'CAT-DAIKIN-10TR',
    equipment_type: 'Commercial Inverter Ductable Split Unit',
    manufacturer: 'Daikin',
    model: 'FDM100V1',
    capacity_tr: 10.0,
    airflow_cfm: 4000,
    voltage: '415V/3Ph/50Hz',
    efficiency: '3.8 COP',
    datasheet_url: 'https://oem.daikin.com/datasheets/fdm100v1.pdf',
    source_provenance: 'TEST_DATA',
    verification_status: 'VERIFIED',
    is_test_data: true,
  };

  // Sample supplier fixture
  const supplierChennai: VerifiedSupplierRecord = {
    supplier_id: 'SUP-CHENNAI-01',
    name: 'Chennai Cool Tech Systems Pvt Ltd',
    category: 'HVAC OEM Distributor',
    city: 'Chennai',
    address: '124 Mount Road, Guindy, Chennai 600032',
    phone: '+91-44-22500123',
    email: 'sales@chennaicooltech.com',
    source_url: 'https://chennaicooltech.com',
    supported_manufacturers: ['Daikin', 'Voltas'],
    supported_equipment_types: ['Commercial Inverter Ductable Split Unit'],
    verification_status: 'VERIFIED',
    source_provenance: 'TEST_DATA',
    is_test_data: true,
  };

  // Sample price fixtures
  const priceValid: VerifiedPriceRecord = {
    price_id: 'PRC-VALID-01',
    catalog_id: 'CAT-DAIKIN-5TR',
    equipment_type: 'Commercial Inverter Ductable Split Unit',
    manufacturer: 'Daikin',
    model: 'FDM50V1',
    supplier_id: 'SUP-CHENNAI-01',
    supplier_name: 'Chennai Cool Tech Systems Pvt Ltd',
    unit_price: 185000,
    currency: 'INR',
    price_basis: 'Ex-Factory',
    effective_date: '2026-01-01',
    validity_expiry_date: '2026-12-31',
    source_url: 'https://chennaicooltech.com/quote-101.pdf',
    source_provenance: 'TEST_DATA',
    verification_status: 'VERIFIED',
    is_test_data: true,
  };

  const priceExpired: VerifiedPriceRecord = {
    price_id: 'PRC-EXPIRED-01',
    catalog_id: 'CAT-DAIKIN-5TR',
    equipment_type: 'Commercial Inverter Ductable Split Unit',
    manufacturer: 'Daikin',
    model: 'FDM50V1',
    supplier_id: 'SUP-CHENNAI-01',
    supplier_name: 'Chennai Cool Tech Systems Pvt Ltd',
    unit_price: 160000,
    currency: 'INR',
    price_basis: 'Ex-Factory',
    effective_date: '2024-01-01',
    validity_expiry_date: '2024-12-31',
    source_url: 'https://chennaicooltech.com/quote-old.pdf',
    source_provenance: 'TEST_DATA',
    verification_status: 'VERIFIED',
    is_test_data: true,
  };

  const priceOtherSupplier: VerifiedPriceRecord = {
    price_id: 'PRC-OTHER-SUP-01',
    catalog_id: 'CAT-DAIKIN-5TR',
    equipment_type: 'Commercial Inverter Ductable Split Unit',
    manufacturer: 'Daikin',
    model: 'FDM50V1',
    supplier_id: 'SUP-MUMBAI-99',
    supplier_name: 'Mumbai Climate Corp',
    unit_price: 180000,
    currency: 'INR',
    price_basis: 'Ex-Factory',
    effective_date: '2026-01-01',
    validity_expiry_date: '2026-12-31',
    source_url: 'https://mumbaiclimate.com/quote.pdf',
    source_provenance: 'TEST_DATA',
    verification_status: 'VERIFIED',
    is_test_data: true,
  };

  // -----------------------------------------------------------------------------
  // Test Case 1: Exact Match Sourcing (Catalog + Supplier + Price Verified)
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: Exact Match Sourcing');
  {
    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [catalog5Tr],
      supplierRecords: [supplierChennai],
      priceRecords: [priceValid],
      matchingConfig: { allow_exact_match_only: true },
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment item generated');
    assert(items[0].verification_status === 'VERIFIED', 'Catalog verification_status is VERIFIED');
    assert(items[0].manufacturer === 'Daikin', 'Manufacturer matched');
    assert(items[0].model === 'FDM50V1', 'Model matched');
    assert(items[0].supplier === 'Chennai Cool Tech Systems Pvt Ltd', 'Supplier matched');
    assert(items[0].supplier_verification_status === 'VERIFIED', 'Supplier verification_status is VERIFIED');
    assert(items[0].unit_price === 185000, 'Unit price matched');
    assert(items[0].price_verification_status === 'VERIFIED', 'Price verification_status is VERIFIED');
    assert(items[0].price_source_url === 'https://chennaicooltech.com/quote-101.pdf', 'Price source URL preserved');
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: Approved Oversizing Tolerance (5.5 TR for 5.0 TR load with 15% oversize)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: Approved Oversizing Tolerance');
  {
    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [catalog55Tr],
      supplierRecords: [supplierChennai],
      priceRecords: [],
      matchingConfig: { max_oversize_percent: 15 },
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment item generated under 15% oversizing allowance');
    assert(items[0].verification_status === 'VERIFIED', 'Catalog item within 15% oversize is VERIFIED');
    assert(items[0].model === 'FDM55V1', 'Model FDM55V1 selected');
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: Rejected Oversizing (10 TR for 5.0 TR load with 15% max oversize)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: Rejected Oversizing');
  {
    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [catalog10Tr],
      supplierRecords: [supplierChennai],
      priceRecords: [],
      matchingConfig: { max_oversize_percent: 15 },
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment entry generated');
    assert(items[0].verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA', 'Catalog item exceeding oversizing tolerance is REJECTED');
    assert(items[0].model === null, 'No model assigned for rejected oversizing');
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Supplier Mismatch Rejection
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Supplier Mismatch Rejection');
  {
    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [catalog5Tr],
      supplierRecords: [supplierChennai],
      priceRecords: [priceOtherSupplier],
      matchingConfig: { max_oversize_percent: 10 },
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment item generated');
    assert(items[0].verification_status === 'VERIFIED', 'Catalog record is VERIFIED');
    assert(items[0].price_verification_status === 'PRICE_DATA_NOT_YET_VERIFIED', 'Mismatched supplier price rejected');
    assert(items[0].unit_price === null, 'Unit price remains null on supplier mismatch');
  }

  // -----------------------------------------------------------------------------
  // Test Case 5: Expired Price Rejection
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 5: Expired Price Rejection');
  {
    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [catalog5Tr],
      supplierRecords: [supplierChennai],
      priceRecords: [priceExpired],
      matchingConfig: { max_oversize_percent: 10 },
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment item generated');
    assert(items[0].price_verification_status === 'EXPIRED', 'Expired price record marked as EXPIRED');
    assert(items[0].unit_price === null, 'Unit price remains null for expired price record');
  }

  // -----------------------------------------------------------------------------
  // Test Case 6: Unverified Data Filtering
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 6: Unverified Data Filtering');
  {
    const unverifiedCatalog: VerifiedCatalogRecord = {
      ...catalog5Tr,
      catalog_id: 'CAT-UNVERIFIED',
      verification_status: 'NEEDS_REVIEW',
    };

    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [unverifiedCatalog],
      supplierRecords: [supplierChennai],
      priceRecords: [priceValid],
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment entry generated');
    assert(items[0].verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA', 'Unverified catalog record rejected');
    assert(items[0].model === null, 'Unverified catalog model is null');
  }

  // -----------------------------------------------------------------------------
  // Test Case 7: Missing Data Handling (Zero Fabrication)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 7: Missing Data Handling (Zero Fabrication)');
  {
    const items = await EquipmentSourcingEngine.selectAndSource(dummyProject, dummySizing, dummyAudit, {
      catalogRecords: [],
      supplierRecords: [],
      priceRecords: [],
      allowTestData: true,
    });

    assert(items.length > 0, 'Equipment item generated');
    assert(items[0].status === 'REQUIRES_VERIFIED_CATALOG_DATA', 'Status is REQUIRES_VERIFIED_CATALOG_DATA');
    assert(items[0].manufacturer === null, 'Manufacturer is null (not fabricated)');
    assert(items[0].model === null, 'Model is null (not fabricated)');
    assert(items[0].unit_price === null, 'Unit price is null (not fabricated)');
    assert(items[0].supplier === null, 'Supplier is null (not fabricated)');
  }

  // -----------------------------------------------------------------------------
  // Test Case 8: AppConfig & Backend API URL Production Environment Verification
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 8: AppConfig & Production Environment Configuration');
  {
    assert(typeof AppConfig.backendApiUrl === 'string' && AppConfig.backendApiUrl.length > 0, 'AppConfig.backendApiUrl exported');
    assert(typeof AppConfig.port === 'number', 'AppConfig.port is defined');
    assert(typeof AppConfig.hasServiceRoleKey === 'boolean', 'Service role key check evaluated safely without exposing secrets');
  }

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase18Tests();
