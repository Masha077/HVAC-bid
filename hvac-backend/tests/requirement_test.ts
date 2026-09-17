import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';

async function runRequirementTest() {
  console.log('====================================================');
  console.log('RUNNING TEST 1: REQUIREMENT-DRIVEN SIMPLE OFFICE (ZERO DOCS)');
  console.log('====================================================');

  const payload: UniversalRequest = {
    user_id: 'test-user-001',
    project_id: 'REQ-TEST-001',
    mode: 'REQUIREMENT_DRIVEN',
    text: 'I need HVAC for an office building in Chennai. There are 3 rooms. Each room is 10 ft long, 10 ft wide and has a 9 ft ceiling. Each room has 5 people. Air conditioning and ventilation are required. Prepare a complete HVAC contractor bid package.',
    documents: [],
    requested_output_type: 'COMPLETE_BID_PACKAGE',
  };

  console.log('Input Payload:', JSON.stringify(payload, null, 2));

  const result = await MasterWorkflowPipeline.execute(payload);

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log('Pipeline Status:', result.status);
  console.log('Project ID:', result.project_id);
  console.log('Location:', result.unified_project.location);
  console.log('Building Type:', result.unified_project.building_type);
  console.log('Total Spaces:', result.unified_project.total_spaces);
  console.log('Total Area (sq ft):', result.unified_project.total_area_sqft);
  console.log('Total Volume (cu ft):', result.unified_project.total_volume_cuft);
  console.log('Total Occupants:', result.unified_project.total_occupants);

  console.log('\n--- SIZING RESULT ---');
  console.log('Cooling Load (TR):', result.sizing.cooling_load_tr);
  console.log('Cooling Status:', result.sizing.cooling_status);
  console.log('Cooling Basis:', result.sizing.cooling_load_basis);
  console.log('Airflow (CFM):', result.sizing.airflow_cfm);
  console.log('Fresh Air (CFM):', result.sizing.fresh_air_cfm);

  console.log('\n--- AUDIT REPORT ---');
  console.log('Audit Status:', result.audit.audit_status);
  console.log('Equipment Selection Allowed:', result.audit.equipment_selection_allowed);

  console.log('\n--- COMPLIANCE MATRIX ---');
  console.log(JSON.stringify(result.compliance_matrix, null, 2));

  console.log('\n--- OUTPUT DOCUMENTS GENERATED ---');
  console.log(
    result.bid_package.output_documents.map((d) => ({
      type: d.document_type,
      title: d.title,
      has_base64: Boolean(d.pdf_base64),
    }))
  );

  // Assertions
  if (
    result.unified_project.location === 'Chennai' &&
    result.unified_project.total_spaces === 3 &&
    result.unified_project.total_area_sqft === 300 &&
    result.unified_project.total_volume_cuft === 2700 &&
    result.unified_project.total_occupants === 15 &&
    result.sizing.cooling_load_tr === null &&
    result.sizing.cooling_status === 'NEEDS_REVIEW' &&
    result.sizing.fresh_air_cfm === 261
  ) {
    console.log('\n✅ TEST 1 (REQUIREMENT-DRIVEN ZERO DOCS) PASSED PERFECTLY!');
  } else {
    console.error('\n❌ TEST 1 ASSERTION FAILED!');
    process.exit(1);
  }
}

runRequirementTest();
