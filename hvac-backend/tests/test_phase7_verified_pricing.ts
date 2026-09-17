import { SpecificationAuditor } from '../src/audit/auditor';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { EquipmentSourcingEngine } from '../src/equipment/sourcing';
import { UnifiedProjectModel, VerifiedCatalogRecord, VerifiedSupplierRecord, VerifiedPriceRecord } from '../src/domain/models';

async function runPhase7Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 7 VERIFIED PRICING TESTS');
  console.log('======================================================');

  const baseProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P7-01',
    user_id: 'test-user-001',
    mode: 'REQUIREMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Chennai',
    building_type: 'Office',
    spaces: [
      { name: 'Room 1', length_ft: 10, width_ft: 10, height_ft: 9, area_sqft: 100, volume_cuft: 900, occupants: 5 },
      { name: 'Room 2', length_ft: 10, width_ft: 10, height_ft: 9, area_sqft: 100, volume_cuft: 900, occupants: 5 },
      { name: 'Room 3', length_ft: 10, width_ft: 10, height_ft: 9, area_sqft: 100, volume_cuft: 900, occupants: 5 },
    ],
    total_spaces: 3,
    total_area_sqft: 300,
    total_volume_cuft: 2700,
    total_occupants: 15,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    raw_input: '300 sqft office in Chennai for 15 occupants',
    documents_meta: [],
    fact_provenance: [],
    conflicts: [],
  };

  const catalogDaikin: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-DAIKIN-2.4TR',
      equipment_type: 'Commercial Inverter Ductable Split Unit',
      manufacturer: 'Daikin Industries India',
      model: 'FDBHQ36BAV16',
      capacity_tr: 2.4,
      airflow_cfm: 960,
      source_provenance: 'OEM Technical Datasheet v4.2',
      verification_status: 'VERIFIED',
    },
  ];

  const verifiedSuppliers: VerifiedSupplierRecord[] = [
    {
      supplier_id: 'SUP-CHE-01',
      name: 'Chennai HVAC Distributors Pvt Ltd',
      city: 'Chennai',
      address: '12 Mount Road, Anna Salai, Chennai 600002',
      phone: '+91-44-28520001',
      supported_manufacturers: ['Daikin'],
      supported_equipment_types: ['Commercial Inverter Ductable Split Unit'],
      verification_status: 'VERIFIED',
      source_provenance: 'Verified Regional Dealer Audit 2025',
    },
  ];

  const sizing = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 }); // 2.4 TR
  const audit = SpecificationAuditor.audit(baseProject, sizing);

  // TEST CASE 1: Verified Price Match Case
  console.log('\n--- CASE 1: Verified Price Match Case ---');
  const validPrices: VerifiedPriceRecord[] = [
    {
      price_id: 'PR-DAIKIN-01',
      catalog_id: 'CAT-DAIKIN-2.4TR',
      supplier_id: 'SUP-CHE-01',
      supplier_name: 'Chennai HVAC Distributors Pvt Ltd',
      unit_price: 125000,
      currency: 'INR',
      price_basis: 'Ex-Factory / Ex-Godown per unit',
      effective_date: '2026-01-01',
      validity_expiry_date: '2026-12-31',
      source_url: 'https://pricing.hvac-backend.internal/pr-daikin-01.pdf',
      verification_status: 'VERIFIED',
      source_provenance: 'Official OEM Authorized Dealer Price List Q1 2026',
    },
  ];

  const eq1 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers,
    priceRecords: validPrices,
  });

  console.log('Case 1 Price Details:', eq1[0]?.unit_price, eq1[0]?.currency, eq1[0]?.price_basis, eq1[0]?.price_verification_status);
  if (
    eq1[0]?.unit_price === 125000 &&
    eq1[0]?.total_price === 125000 &&
    eq1[0]?.currency === 'INR' &&
    eq1[0]?.price_verification_status === 'VERIFIED'
  ) {
    console.log('CASE 1 RESULT: PASS (Matched verified unit price and provenance)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Expired Price Case
  console.log('\n--- CASE 2: Expired Price Case ---');
  const expiredPrices: VerifiedPriceRecord[] = [
    {
      price_id: 'PR-DAIKIN-EXPIRED',
      catalog_id: 'CAT-DAIKIN-2.4TR',
      supplier_id: 'SUP-CHE-01',
      unit_price: 120000,
      currency: 'INR',
      price_basis: 'Ex-Factory',
      effective_date: '2024-01-01',
      validity_expiry_date: '2024-12-31', // Expired date
      verification_status: 'VERIFIED',
      source_provenance: 'Expired Dealer Pricelist 2024',
    },
  ];

  const eq2 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers,
    priceRecords: expiredPrices,
  });

  console.log('Case 2 Price Details:', eq2[0]?.unit_price, eq2[0]?.price_verification_status);
  if (eq2[0]?.unit_price === null && eq2[0]?.price_verification_status === 'EXPIRED') {
    console.log('CASE 2 RESULT: PASS (Rejected expired price record and set price_verification_status: EXPIRED)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Supplier Mismatch Case
  console.log('\n--- CASE 3: Supplier Mismatch Case ---');
  const mismatchedSupplierPrices: VerifiedPriceRecord[] = [
    {
      price_id: 'PR-DAIKIN-BANGALORE',
      catalog_id: 'CAT-DAIKIN-2.4TR',
      supplier_name: 'Bangalore HVAC Dealer', // Mismatch with Chennai supplier
      unit_price: 118000,
      currency: 'INR',
      price_basis: 'Ex-Factory',
      effective_date: '2026-01-01',
      validity_expiry_date: '2026-12-31',
      verification_status: 'VERIFIED',
      source_provenance: 'Bangalore Dealer Pricelist',
    },
  ];

  const eq3 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers, // Chennai supplier
    priceRecords: mismatchedSupplierPrices,
  });

  console.log('Case 3 Price Details:', eq3[0]?.unit_price, eq3[0]?.price_verification_status);
  if (eq3[0]?.unit_price === null && eq3[0]?.price_verification_status === 'PRICE_DATA_NOT_YET_VERIFIED') {
    console.log('CASE 3 RESULT: PASS (Rejected price due to supplier mismatch; preserved null unit_price)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Unverified Price Rejection Case
  console.log('\n--- CASE 4: Unverified Price Rejection Case ---');
  const unverifiedPrices: VerifiedPriceRecord[] = [
    {
      price_id: 'PR-DAIKIN-UNVERIFIED',
      catalog_id: 'CAT-DAIKIN-2.4TR',
      unit_price: 110000,
      currency: 'INR',
      price_basis: 'Web Scraping Estimate',
      effective_date: '2026-01-01',
      verification_status: 'NEEDS_REVIEW', // Unverified status
      source_provenance: 'Unverified Online Store Quote',
    },
  ];

  const eq4 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers,
    priceRecords: unverifiedPrices,
  });

  console.log('Case 4 Price Details:', eq4[0]?.unit_price, eq4[0]?.price_verification_status);
  if (eq4[0]?.unit_price === null && eq4[0]?.price_verification_status === 'PRICE_DATA_NOT_YET_VERIFIED') {
    console.log('CASE 4 RESULT: PASS (Rejected unverified price record marked NEEDS_REVIEW)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Blocked Equipment Selection Case
  console.log('\n--- CASE 5: Blocked Equipment Selection Case ---');
  const sizingNull = DeterministicCalculators.calculateSizing(300, 2700, 15); // Cooling TR is null
  const auditNull = SpecificationAuditor.audit(baseProject, sizingNull);

  const eq5 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizingNull, auditNull, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers,
    priceRecords: validPrices,
  });

  console.log('Case 5 Equipment Count:', eq5.length);
  if (eq5.length === 0) {
    console.log('CASE 5 RESULT: PASS (Equipment selection and pricing blocked for unapproved cooling load)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 7 TEST SUMMARY: ALL 5 VERIFIED PRICING CASES PASSED!');
  console.log('======================================================');
}

runPhase7Tests();
