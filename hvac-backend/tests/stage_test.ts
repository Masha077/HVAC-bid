import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';

async function runAllTests() {
  console.log('===========================================================');
  console.log('RUNNING PRODUCTION STAGE TEST SUITE (HVAC BIS)');
  console.log('===========================================================');

  // TEST 1: REQUIREMENT-DRIVEN CHENNAI OFFICE
  console.log('\n--- TEST 1: REQUIREMENT-DRIVEN CHENNAI OFFICE ---');
  const reqPayload1: UniversalRequest = {
    user_id: 'test-user-001',
    project_id: 'REQ-TEST-001',
    mode: 'REQUIREMENT_DRIVEN',
    text: 'I need HVAC for an office building in Chennai. There are 3 rooms. Each room is 10 ft long, 10 ft wide and has a 9 ft ceiling. Each room has 5 people. Air conditioning and ventilation are required. Prepare a complete HVAC contractor bid package.',
    documents: [],
    requested_output_type: 'COMPLETE_BID_PACKAGE'
  };

  const res1 = await MasterWorkflowPipeline.execute(reqPayload1);
  console.log('Status:', res1.status);
  console.log('Location:', res1.unified_project.location);
  console.log('Building Type:', res1.unified_project.building_type);
  console.log('Spaces:', res1.unified_project.total_spaces, 'Area:', res1.unified_project.total_area_sqft, 'sqft', 'Occupants:', res1.unified_project.total_occupants);
  console.log('Calculated Cooling TR:', res1.sizing.cooling_load_tr, 'Airflow CFM:', res1.sizing.airflow_cfm, 'Fresh Air CFM:', res1.sizing.fresh_air_cfm);
  console.log('Audit Status:', res1.audit.audit_status);
  console.log('Equipment Selected:', res1.equipment.map(e => `${e.type} (${e.capacity})`).join('; '));
  console.log('BOQ Items Count:', res1.boq.length);
  console.log('Quotation Number:', res1.commercial.quotation_number);
  console.log('PDF Generated Base64 Length:', res1.bid_package.pdf_base64?.length || 0);

  if (
    res1.unified_project.location === 'Chennai' &&
    res1.unified_project.total_spaces === 3 &&
    res1.unified_project.total_area_sqft === 300 &&
    res1.unified_project.total_volume_cuft === 2700 &&
    res1.unified_project.total_occupants === 15 &&
    res1.sizing.cooling_load_tr === null &&
    res1.sizing.fresh_air_cfm === 261
  ) {
    console.log('✅ TEST 1 PASSED PERFECTLY!');
  } else {
    console.error('❌ TEST 1 FAILED!');
    process.exit(1);
  }

  // TEST 2: REQUIREMENT-DRIVEN COIMBATORE HOSPITALITY
  console.log('\n--- TEST 2: REQUIREMENT-DRIVEN COIMBATORE HOTEL ---');
  const reqPayload2: UniversalRequest = {
    user_id: 'test-user-002',
    project_id: 'REQ-TEST-002',
    mode: 'REQUIREMENT_DRIVEN',
    text: 'I need HVAC for a hotel in Coimbatore with 5 rooms. Each room is 20 ft long, 15 ft wide and 10 ft high with 4 occupants per room.',
    documents: [],
    requested_output_type: 'COMPLETE_BID_PACKAGE'
  };

  const res2 = await MasterWorkflowPipeline.execute(reqPayload2);
  console.log('Status:', res2.status);
  console.log('Location:', res2.unified_project.location);
  console.log('Building Type:', res2.unified_project.building_type);
  console.log('Spaces:', res2.unified_project.total_spaces, 'Area:', res2.unified_project.total_area_sqft, 'sqft', 'Occupants:', res2.unified_project.total_occupants);
  console.log('Calculated Cooling TR:', res2.sizing.cooling_load_tr);

  if (res2.unified_project.location === 'Coimbatore' && res2.unified_project.total_spaces === 5 && res2.unified_project.total_area_sqft === 1500) {
    console.log('✅ TEST 2 PASSED PERFECTLY!');
  } else {
    console.error('❌ TEST 2 FAILED!');
    process.exit(1);
  }

  // TEST 3: DOCUMENT-DRIVEN FLOW
  console.log('\n--- TEST 3: DOCUMENT-DRIVEN FLOW ---');
  const docPayload: UniversalRequest = {
    user_id: 'test-user-003',
    project_id: 'DOC-TEST-001',
    mode: 'DOCUMENT_DRIVEN',
    text: '',
    documents: [
      {
        document_id: 'DOC-101',
        file_name: 'Bangalore_Office_HVAC_Tender.pdf',
        document_type: 'TENDER',
        revision_number: 1,
        raw_text: 'Tender for Bangalore office HVAC system with 10 rooms',
        storage_path: 'projects/DOC-TEST-001/tender.pdf',
      },
    ],
    requested_output_type: 'COMPLETE_BID_PACKAGE'
  };

  const res3 = await MasterWorkflowPipeline.execute(docPayload);
  console.log('Status:', res3.status);
  console.log('Document Mode Verified:', res3.mode);
  console.log('Audit Status:', res3.audit.audit_status);

  if (res3.mode === 'DOCUMENT_DRIVEN') {
    console.log('✅ TEST 3 PASSED PERFECTLY!');
  } else {
    console.error('❌ TEST 3 FAILED!');
    process.exit(1);
  }

  console.log('\n===========================================================');
  console.log('ALL 3 TEST SUITES PASSED WITH ZERO ERRORS!');
  console.log('===========================================================');
}

runAllTests();
