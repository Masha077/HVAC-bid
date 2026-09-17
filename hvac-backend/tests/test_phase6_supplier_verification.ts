import { SpecificationAuditor } from '../src/audit/auditor';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { EquipmentSourcingEngine } from '../src/equipment/sourcing';
import { UnifiedProjectModel, VerifiedCatalogRecord, VerifiedSupplierRecord } from '../src/domain/models';

async function runPhase6Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 6 SUPPLIER VERIFICATION TESTS');
  console.log('======================================================');

  const baseProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P6-01',
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

  const sizing = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 }); // 2.4 TR
  const audit = SpecificationAuditor.audit(baseProject, sizing);

  // TEST CASE 1: Verified Supplier Match Case
  console.log('\n--- CASE 1: Verified Supplier Match Case ---');
  const verifiedSuppliers: VerifiedSupplierRecord[] = [
    {
      supplier_id: 'SUP-CHE-01',
      name: 'Chennai HVAC Distributors Pvt Ltd',
      city: 'Chennai',
      address: '12 Mount Road, Anna Salai, Chennai 600002',
      phone: '+91-44-28520001',
      email: 'sales@chennaihvac.co.in',
      source_url: 'https://suppliers.hvac-backend.internal/che-01',
      supported_manufacturers: ['Daikin', 'Voltas'],
      supported_equipment_types: ['Commercial Inverter Ductable Split Unit'],
      verification_status: 'VERIFIED',
      source_provenance: 'Verified Regional Dealer Audit 2025',
    },
  ];

  const eq1 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers,
  });

  console.log('Case 1 Supplier Match:', eq1[0]?.supplier, eq1[0]?.supplier_address, eq1[0]?.supplier_verification_status);
  if (
    eq1[0]?.supplier === 'Chennai HVAC Distributors Pvt Ltd' &&
    eq1[0]?.supplier_address === '12 Mount Road, Anna Salai, Chennai 600002' &&
    eq1[0]?.supplier_verification_status === 'VERIFIED'
  ) {
    console.log('CASE 1 RESULT: PASS (Matched verified regional supplier)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: No Supplier Match Case (Location Mismatch)
  console.log('\n--- CASE 2: No Supplier Match Case (Location Mismatch) ---');
  const projectBangalore: UnifiedProjectModel = {
    ...baseProject,
    project_id: 'REQ-TEST-P6-02',
    location: 'Bangalore',
  };

  const eq2 = await EquipmentSourcingEngine.selectAndSource(projectBangalore, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers, // Only has Chennai supplier
  });

  console.log('Case 2 Supplier Match:', eq2[0]?.supplier, eq2[0]?.supplier_verification_status);
  if (eq2[0]?.supplier === null && eq2[0]?.supplier_verification_status === 'NEEDS_VERIFIED_SUPPLIER_DATA') {
    console.log('CASE 2 RESULT: PASS (Preserved null supplier and NEEDS_VERIFIED_SUPPLIER_DATA for location mismatch)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Unverified Supplier Rejection Case
  console.log('\n--- CASE 3: Unverified Supplier Rejection Case ---');
  const unverifiedSuppliers: VerifiedSupplierRecord[] = [
    {
      supplier_id: 'SUP-CHE-UNVERIFIED',
      name: 'Unverified Dealer Chennai',
      city: 'Chennai',
      address: 'Unknown Street, Chennai',
      verification_status: 'NEEDS_REVIEW',
    },
  ];

  const eq3 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogDaikin,
    supplierRecords: unverifiedSuppliers,
  });

  console.log('Case 3 Supplier Match:', eq3[0]?.supplier, eq3[0]?.supplier_verification_status);
  if (eq3[0]?.supplier === null && eq3[0]?.supplier_verification_status === 'NEEDS_VERIFIED_SUPPLIER_DATA') {
    console.log('CASE 3 RESULT: PASS (Rejected unverified supplier marked NEEDS_REVIEW)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Blocked Equipment Selection Case (Cooling TR is null)
  console.log('\n--- CASE 4: Blocked Equipment Selection Case ---');
  const sizingNull = DeterministicCalculators.calculateSizing(300, 2700, 15); // Cooling TR is null
  const auditNull = SpecificationAuditor.audit(baseProject, sizingNull);

  const eq4 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizingNull, auditNull, {
    catalogRecords: catalogDaikin,
    supplierRecords: verifiedSuppliers,
  });

  console.log('Case 4 Equipment Count:', eq4.length);
  if (eq4.length === 0) {
    console.log('CASE 4 RESULT: PASS (Equipment and supplier selection blocked for null cooling load)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 6 TEST SUMMARY: ALL 4 SUPPLIER VERIFICATION CASES PASSED!');
  console.log('======================================================');
}

runPhase6Tests();
