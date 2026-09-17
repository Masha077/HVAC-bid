import { SpecificationAuditor } from '../src/audit/auditor';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { EquipmentSourcingEngine, isEquipmentTypeCompatible } from '../src/equipment/sourcing';
import { UnifiedProjectModel, VerifiedCatalogRecord } from '../src/domain/models';

async function runPhase5ATests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 5A EQUIPMENT MATCHING RULES TESTS');
  console.log('======================================================');

  const baseProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P5A-01',
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

  const sizing = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 }); // 2.4 TR
  const audit = SpecificationAuditor.audit(baseProject, sizing);

  // TEST CASE 1: Exact Match Case (2.4 TR exact match)
  console.log('\n--- CASE 1: Exact Match Case ---');
  const catalogExact: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-2.4TR-EXACT',
      equipment_type: 'Commercial Inverter Ductable Split Unit',
      manufacturer: 'Carrier Midea India',
      model: '38KDS024-EXACT',
      capacity_tr: 2.4,
      airflow_cfm: 960,
      source_provenance: 'OEM Datasheet v1.0',
      verification_status: 'VERIFIED',
    },
  ];

  const eq1 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogExact,
    matchingConfig: { max_oversize_percent: 0 },
  });

  console.log('Case 1 Selected Equipment:', eq1[0]?.manufacturer, eq1[0]?.model, eq1[0]?.verification_status);
  if (eq1[0]?.manufacturer === 'Carrier Midea India' && eq1[0]?.model === '38KDS024-EXACT' && eq1[0]?.verification_status === 'VERIFIED') {
    console.log('CASE 1 RESULT: PASS (Exact capacity match selected)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Compliant Configured Tolerance Case (2.5 TR unit with 10% configured oversizing limit)
  console.log('\n--- CASE 2: Compliant Configured Tolerance Case ---');
  const catalogTolerance: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-2.5TR-TOLERANCE',
      equipment_type: 'Commercial Inverter Ductable Split Unit',
      manufacturer: 'Voltas Limited',
      model: 'V-SPLIT-25',
      capacity_tr: 2.5,
      airflow_cfm: 1000,
      source_provenance: 'Voltas Commercial Catalog 2025',
      verification_status: 'VERIFIED',
    },
  ];

  const eq2 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogTolerance,
    matchingConfig: { max_oversize_percent: 10 }, // 10% oversizing allows up to 2.64 TR
  });

  console.log('Case 2 Selected Equipment:', eq2[0]?.manufacturer, eq2[0]?.model, eq2[0]?.verification_status);
  if (eq2[0]?.manufacturer === 'Voltas Limited' && eq2[0]?.model === 'V-SPLIT-25' && eq2[0]?.verification_status === 'VERIFIED') {
    console.log('CASE 2 RESULT: PASS (Matched 2.5 TR unit within configured 10% oversizing tolerance)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Incompatible Capacity Case (3.0 TR unit [+25%] exceeds 10% configured oversizing limit)
  console.log('\n--- CASE 3: Incompatible Capacity Case ---');
  const catalogOversized: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-3.0TR-OVERSIZED',
      equipment_type: 'Commercial Inverter Ductable Split Unit',
      manufacturer: 'Blue Star Limited',
      model: 'BS-SPLIT-30',
      capacity_tr: 3.0,
      airflow_cfm: 1200,
      source_provenance: 'Blue Star Spec Sheet 2025',
      verification_status: 'VERIFIED',
    },
  ];

  const eq3 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogOversized,
    matchingConfig: { max_oversize_percent: 10 }, // 10% oversizing allows up to 2.64 TR; 3.0 TR is rejected!
  });

  console.log('Case 3 Selected Equipment:', eq3[0]?.manufacturer, eq3[0]?.model, eq3[0]?.verification_status);
  if (eq3[0]?.manufacturer === null && eq3[0]?.model === null && eq3[0]?.verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA') {
    console.log('CASE 3 RESULT: PASS (Rejected 3.0 TR unit as outside 10% configured tolerance; preserved null model)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Incompatible Equipment Type Case (2.4 TR Chilled Water AHU instead of Ductable Split)
  console.log('\n--- CASE 4: Incompatible Equipment Type Case ---');
  const catalogTypeMismatch: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-2.4TR-AHU',
      equipment_type: 'Chilled Water Air Handling Unit (AHU)',
      manufacturer: 'Trane India',
      model: 'AHU-CW-024',
      capacity_tr: 2.4,
      airflow_cfm: 960,
      source_provenance: 'Trane AHU Engineering Manual',
      verification_status: 'VERIFIED',
    },
  ];

  console.log(
    'Equipment Type Compatibility Check:',
    isEquipmentTypeCompatible('Commercial Inverter Ductable Split Unit', 'Chilled Water Air Handling Unit (AHU)')
  );

  const eq4 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogTypeMismatch,
    matchingConfig: { max_oversize_percent: 10 },
  });

  console.log('Case 4 Selected Equipment:', eq4[0]?.manufacturer, eq4[0]?.model, eq4[0]?.verification_status);
  if (eq4[0]?.manufacturer === null && eq4[0]?.model === null && eq4[0]?.verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA') {
    console.log('CASE 4 RESULT: PASS (Rejected incompatible equipment type AHU for split requirement)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: No Verified Catalog Case (Unverified record with NEEDS_REVIEW status)
  console.log('\n--- CASE 5: No Verified Catalog Case ---');
  const catalogUnverified: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-2.4TR-UNVERIFIED',
      equipment_type: 'Commercial Inverter Ductable Split Unit',
      manufacturer: 'Unverified OEM',
      model: 'UNV-240',
      capacity_tr: 2.4,
      airflow_cfm: 960,
      source_provenance: 'Unverified Web Scraping',
      verification_status: 'NEEDS_REVIEW',
    },
  ];

  const eq5 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing, audit, {
    catalogRecords: catalogUnverified,
    matchingConfig: { max_oversize_percent: 10 },
  });

  console.log('Case 5 Selected Equipment:', eq5[0]?.manufacturer, eq5[0]?.model, eq5[0]?.verification_status);
  if (eq5[0]?.manufacturer === null && eq5[0]?.model === null && eq5[0]?.verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA') {
    console.log('CASE 5 RESULT: PASS (Blocked unverified catalog record marked NEEDS_REVIEW)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 5A TEST SUMMARY: ALL 5 MATCHING RULE CASES PASSED!');
  console.log('======================================================');
}

runPhase5ATests();
