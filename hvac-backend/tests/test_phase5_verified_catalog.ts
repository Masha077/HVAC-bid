import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';
import { SpecificationAuditor } from '../src/audit/auditor';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { EquipmentSourcingEngine } from '../src/equipment/sourcing';
import { UnifiedProjectModel, VerifiedCatalogRecord } from '../src/domain/models';

async function runPhase5Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 5 VERIFIED EQUIPMENT CATALOG TESTS');
  console.log('======================================================');

  // Base Project Setup (300 sqft, 15 occupants)
  const baseProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P5-01',
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

  // Mock Verified Catalog Entry
  const verifiedCatalogRecords: VerifiedCatalogRecord[] = [
    {
      catalog_id: 'CAT-DAIKIN-2.4TR',
      equipment_type: 'Commercial Inverter Ductable Split Unit',
      manufacturer: 'Daikin Industries India',
      model: 'FDBHQ36BAV16',
      capacity_tr: 2.4,
      capacity_kw: 8.44,
      airflow_cfm: 960,
      voltage: '415V / 3Ph / 50Hz',
      refrigerant: 'R-410A',
      efficiency: 'ISEER 4.2',
      datasheet_url: 'https://catalog.hvac-backend.internal/datasheets/FDBHQ36BAV16.pdf',
      source_provenance: 'OEM Official Technical Datasheet Rev 4.2',
      verification_status: 'VERIFIED',
    },
  ];

  // TEST CASE 1: Verified Match Case
  console.log('\n--- CASE 1: Verified Match Case ---');
  const sizing1 = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 }); // 2.4 TR
  const audit1 = SpecificationAuditor.audit(baseProject, sizing1);
  const equipment1 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing1, audit1, {
    catalogRecords: verifiedCatalogRecords,
  });

  console.log('Calculated Cooling TR:', sizing1.cooling_load_tr);
  console.log('Equipment Selected Count:', equipment1.length);
  if (equipment1.length > 0) {
    console.log('Selected Equipment Details:', JSON.stringify(equipment1[0], null, 2));
  }

  if (
    equipment1.length > 0 &&
    equipment1[0].manufacturer === 'Daikin Industries India' &&
    equipment1[0].model === 'FDBHQ36BAV16' &&
    equipment1[0].verification_status === 'VERIFIED' &&
    (equipment1[0].status === 'VERIFIED' || equipment1[0].status === 'PRICE_DATA_NOT_YET_VERIFIED') &&
    equipment1[0].datasheet_url === 'https://catalog.hvac-backend.internal/datasheets/FDBHQ36BAV16.pdf'
  ) {
    console.log('CASE 1 RESULT: PASS (Equipment successfully selected from verified catalog record)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: No-Match Case (Catalog contains no verified record for capacity)
  console.log('\n--- CASE 2: No-Match Case ---');
  const sizing2 = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 }); // 2.4 TR
  const audit2 = SpecificationAuditor.audit(baseProject, sizing2);
  const equipment2 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing2, audit2, {
    catalogRecords: [], // Empty catalog
  });

  console.log('Equipment Selected Count:', equipment2.length);
  if (equipment2.length > 0) {
    console.log('Unverified Container Details:', JSON.stringify(equipment2[0], null, 2));
  }

  if (
    equipment2.length > 0 &&
    equipment2[0].manufacturer === null &&
    equipment2[0].model === null &&
    equipment2[0].verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA' &&
    equipment2[0].status === 'REQUIRES_VERIFIED_CATALOG_DATA'
  ) {
    console.log('CASE 2 RESULT: PASS (Preserved REQUIRES_VERIFIED_CATALOG_DATA with null brand/model when no match exists)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Blocked-Engineering Case (Cooling Load TR is NULL)
  console.log('\n--- CASE 3: Blocked-Engineering Case ---');
  const sizing3 = DeterministicCalculators.calculateSizing(300, 2700, 15); // Ungated cooling load (null)
  const audit3 = SpecificationAuditor.audit(baseProject, sizing3);
  const equipment3 = await EquipmentSourcingEngine.selectAndSource(baseProject, sizing3, audit3, {
    catalogRecords: verifiedCatalogRecords, // Verified records present but engineering is blocked
  });

  console.log('Cooling TR:', sizing3.cooling_load_tr);
  console.log('Audit Equipment Selection Allowed:', audit3.equipment_selection_allowed);
  console.log('Equipment Selected Count:', equipment3.length);

  if (sizing3.cooling_load_tr === null && audit3.equipment_selection_allowed === false && equipment3.length === 0) {
    console.log('CASE 3 RESULT: PASS (Equipment selection blocked despite catalog records because cooling load is unapproved)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 5 TEST SUMMARY: ALL 3 VERIFIED CATALOG CASES PASSED!');
  console.log('======================================================');
}

runPhase5Tests();
