import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';
import { SpecificationAuditor } from '../src/audit/auditor';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { EquipmentSourcingEngine } from '../src/equipment/sourcing';
import { UnifiedProjectModel } from '../src/domain/models';

async function runPhase4ETests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 4E EQUIPMENT SELECTION GATE TESTS');
  console.log('======================================================');

  // TEST CASE 1: Phase 4C Benchmark (300 sqft, 15 occupants) — Ungated Cooling Load (cooling_load_tr is null)
  console.log('\n--- CASE 1: Phase 4C Case (Cooling Load TR is NULL) ---');
  const project1: UnifiedProjectModel = {
    project_id: 'REQ-TEST-4E-01',
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

  const sizing1 = DeterministicCalculators.calculateSizing(300, 2700, 15);
  const audit1 = SpecificationAuditor.audit(project1, sizing1);
  const equipment1 = await EquipmentSourcingEngine.selectAndSource(project1, sizing1, audit1);

  console.log('Cooling TR:', sizing1.cooling_load_tr);
  console.log('Audit Equipment Selection Allowed:', audit1.equipment_selection_allowed);
  console.log('Equipment List Length:', equipment1.length);
  console.log('Audit Status:', audit1.audit_status);

  if (sizing1.cooling_load_tr === null && audit1.equipment_selection_allowed === false && equipment1.length === 0) {
    console.log('CASE 1 RESULT: PASS (Equipment selection correctly blocked for null cooling load)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Cross-Document Conflict Case (Conflicts Present)
  console.log('\n--- CASE 2: Cross-Document Conflict Case ---');
  const project2: UnifiedProjectModel = {
    ...project1,
    project_id: 'REQ-TEST-4E-02',
    conflicts: [
      {
        conflict_id: 'CONF-01',
        project_id: 'REQ-TEST-4E-02',
        document_a: 'Tender PDF',
        document_b: 'Drawing PDF',
        field: 'room_count',
        value_a: '3 rooms',
        value_b: '5 rooms',
        severity: 'HIGH',
        resolution_status: 'UNRESOLVED',
        required_action: 'Client clarification required',
      },
    ],
  };

  const sizing2 = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 });
  const audit2 = SpecificationAuditor.audit(project2, sizing2);
  const equipment2 = await EquipmentSourcingEngine.selectAndSource(project2, sizing2, audit2);

  console.log('Cooling TR:', sizing2.cooling_load_tr);
  console.log('Audit Equipment Selection Allowed:', audit2.equipment_selection_allowed);
  console.log('Equipment List Length:', equipment2.length);
  console.log('Audit Status:', audit2.audit_status);

  if (audit2.equipment_selection_allowed === false && equipment2.length === 0 && audit2.audit_status === 'CONFLICT') {
    console.log('CASE 2 RESULT: PASS (Equipment selection correctly blocked due to conflict)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Approved Calculation Basis Path (Configured sqft/TR Basis)
  console.log('\n--- CASE 3: Approved Basis Without Fabricated Brand/Model Data ---');
  const sizing3 = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 });
  const audit3 = SpecificationAuditor.audit(project1, sizing3);
  const equipment3 = await EquipmentSourcingEngine.selectAndSource(project1, sizing3, audit3, { catalogRecords: [] });

  console.log('Cooling TR:', sizing3.cooling_load_tr);
  console.log('Audit Equipment Selection Allowed:', audit3.equipment_selection_allowed);
  console.log('Equipment Items Selected:', equipment3.length);
  if (equipment3.length > 0) {
    console.log('EQ 1 Details:', JSON.stringify(equipment3[0], null, 2));
  }

  if (
    sizing3.cooling_load_tr === 2.4 &&
    audit3.equipment_selection_allowed === true &&
    equipment3.length > 0 &&
    equipment3[0].manufacturer === null &&
    equipment3[0].model === null &&
    equipment3[0].unit_price === null &&
    equipment3[0].verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA'
  ) {
    console.log('CASE 3 RESULT: PASS (Selected equipment container without fabricating brand/model/price data)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Master Workflow Pipeline Integration Execution
  console.log('\n--- CASE 4: Master Workflow Pipeline Integration ---');
  const reqPayload: UniversalRequest = {
    user_id: 'test-user-001',
    project_id: 'REQ-TEST-4E-PIPELINE',
    mode: 'REQUIREMENT_DRIVEN',
    text: 'I need HVAC for an office building in Chennai. There are 3 rooms. Each room is 10 ft long, 10 ft wide and has a 9 ft ceiling. Each room has 5 people. Air conditioning and ventilation are required. Prepare a complete HVAC contractor bid package.',
    documents: [],
    requested_output_type: 'COMPLETE_BID_PACKAGE',
  };

  const output = await MasterWorkflowPipeline.execute(reqPayload);
  console.log('Pipeline Output Sizing TR:', output.sizing.cooling_load_tr);
  console.log('Pipeline Audit Equipment Selection Allowed:', output.audit.equipment_selection_allowed);
  console.log('Pipeline Equipment Count:', output.equipment.length);
  console.log('Pipeline Audit Status:', output.audit.audit_status);

  if (
    output.sizing.cooling_load_tr === null &&
    output.audit.equipment_selection_allowed === false &&
    output.equipment.length === 0
  ) {
    console.log('CASE 4 RESULT: PASS (Master workflow blocked equipment selection for ungated Phase 4C case)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 4E TEST SUMMARY: ALL 4 CASES PASSED PERFECTLY!');
  console.log('======================================================');
}

runPhase4ETests();
