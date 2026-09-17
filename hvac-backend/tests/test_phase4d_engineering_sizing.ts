import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { MasterWorkflowPipeline } from '../src/services/pipeline';

async function runPhase4DTests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 4D ENGINEERING SIZING & VENTILATION TESTS');
  console.log('======================================================');

  // Case 1: Phase 4C case (300 sqft, 2700 cuft, 15 occupants) without configured cooling load basis
  console.log('\n--- CASE 1: Phase 4C Case (300 sqft, 15 occupants) Without Configured Cooling Basis ---');
  const sizing1 = DeterministicCalculators.calculateSizing(300, 2700, 15);

  console.log('Sizing Result 1:', JSON.stringify(sizing1, null, 2));

  const case1Passed =
    sizing1.cooling_load_tr === null &&
    sizing1.cooling_status === 'NEEDS_REVIEW' &&
    sizing1.airflow_cfm === null &&
    sizing1.fresh_air_cfm === 261 &&
    sizing1.fresh_air_status === 'DETERMINISTIC_CALCULATION' &&
    sizing1.breakdown.fresh_air_occupant_cfm === 225 &&
    sizing1.breakdown.fresh_air_area_cfm === 36;

  console.log(`CASE 1 RESULT: ${case1Passed ? 'PASS' : 'FAIL'}`);

  // Case 2: Configured Cooling Basis ({ sqft_per_tr: 125 })
  console.log('\n--- CASE 2: Configured Cooling Load Basis ({ sqft_per_tr: 125 }) ---');
  const sizing2 = DeterministicCalculators.calculateSizing(300, 2700, 15, { sqft_per_tr: 125 });

  console.log('Sizing Result 2:', JSON.stringify(sizing2, null, 2));

  const case2Passed =
    sizing2.cooling_load_tr === 2.4 &&
    sizing2.cooling_status === 'DETERMINISTIC_CALCULATION' &&
    sizing2.airflow_cfm === 960 &&
    sizing2.fresh_air_cfm === 261;

  console.log(`CASE 2 RESULT: ${case2Passed ? 'PASS' : 'FAIL'}`);

  // Case 3: Pipeline Integration Test for Phase 4C Requirement
  console.log('\n--- CASE 3: Master Workflow Pipeline Integration ---');
  const result = await MasterWorkflowPipeline.execute({
    user_id: 'test-user-001',
    project_id: 'REQ-TEST-001',
    mode: 'REQUIREMENT_DRIVEN',
    text: 'I need HVAC for an office building in Chennai. There are 3 rooms. Each room is 10 ft long, 10 ft wide and has a 9 ft ceiling. Each room has 5 people. Air conditioning and ventilation are required. Prepare a complete HVAC contractor bid package.',
    documents: [],
    requested_output_type: 'COMPLETE_BID_PACKAGE'
  });

  console.log('Pipeline Sizing:', JSON.stringify(result.sizing, null, 2));
  console.log('Audit Status:', result.audit.audit_status);
  console.log('Equipment Selection Allowed:', result.audit.equipment_selection_allowed);

  const case3Passed =
    result.sizing.cooling_load_tr === null &&
    result.sizing.cooling_status === 'NEEDS_REVIEW' &&
    result.sizing.fresh_air_cfm === 261 &&
    result.audit.audit_entries.find(e => e.checkpoint === 'ENGINEERING_READINESS_GATE')?.status === 'NEEDS_REVIEW';

  console.log(`CASE 3 RESULT: ${case3Passed ? 'PASS' : 'FAIL'}`);

  console.log('\n======================================================');
  console.log('PHASE 4D TEST SUMMARY:');
  console.log(`CASE 1 (UNGATED COOLING NULL / FRESH AIR 261): ${case1Passed ? 'PASS' : 'FAIL'}`);
  console.log(`CASE 2 (CONFIGURED 125 SQFT/TR BASIS):         ${case2Passed ? 'PASS' : 'FAIL'}`);
  console.log(`CASE 3 (PIPELINE INTEGRATION):                 ${case3Passed ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  if (!case1Passed || !case2Passed || !case3Passed) {
    process.exit(1);
  }
}

runPhase4DTests().catch(err => {
  console.error('Phase 4D test error:', err);
  process.exit(1);
});
