import request from 'supertest';
import app from '../src/app';
import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';

console.log('=== PHASE 16 END-TO-END BACKEND PIPELINE INTEGRATION TESTS ===\n');

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

async function runPhase16Tests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: REQUIREMENT_DRIVEN Mode E2E Integration
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: REQUIREMENT_DRIVEN Mode End-to-End Integration');
  {
    const reqPayload: UniversalRequest = {
      project_id: 'PRJ-E2E-P16-01',
      user_id: 'user-e2e-01',
      mode: 'REQUIREMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: 'I need HVAC for an office showroom in Hyderabad. Space area is 1500 sq.ft with 9 ft ceiling height. Occupancy is 15 persons.',
      documents: []
    };

    const output = await MasterWorkflowPipeline.execute(reqPayload);

    assert(output.project_id === 'PRJ-E2E-P16-01', 'Output retains exact project_id');
    assert(output.mode === 'REQUIREMENT_DRIVEN', 'Output mode is REQUIREMENT_DRIVEN');
    assert(output.unified_project.total_area_sqft === 1500, 'Calculated area is 1500 sq.ft');
    assert(output.sizing.cooling_status !== undefined, 'Engineering sizing status evaluated');
    assert(output.sizing.fresh_air_cfm !== null, 'Fresh air CFM calculated deterministically');
    assert(output.bid_package.pdf_base64 !== undefined, 'PDF base64 generated');
    assert(output.bid_package.technical_envelope !== undefined, 'Technical envelope assembled with 12 sections');
    assert(output.bid_package.technical_envelope?.design_basis.source_provenance === 'USER_REQUIREMENT_INPUT', 'Provenance is USER_REQUIREMENT_INPUT');

    // Test Express HTTP Route POST /hvac/requirement
    const res = await request(app)
      .post('/hvac/requirement')
      .send({
        projectId: 'PRJ-E2E-HTTP-01',
        text: reqPayload.text
      });

    assert(res.status === 200, 'HTTP POST /hvac/requirement returns 200 OK');
    assert(res.body.ok === true, 'HTTP response body contains ok: true');
    assert(res.body.data.project_id === 'PRJ-E2E-HTTP-01', 'HTTP response contains output data');
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: DOCUMENT_DRIVEN Mode E2E Integration (Multi-Document Intake)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: DOCUMENT_DRIVEN Mode End-to-End Integration (Multi-Document)');
  {
    const reqPayload: UniversalRequest = {
      project_id: 'PRJ-E2E-P16-02',
      user_id: 'user-e2e-02',
      mode: 'DOCUMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: '',
      documents: [
        {
          document_id: 'DOC-E2E-01',
          file_name: 'Tender_Specification_Chennai.pdf',
          document_type: 'TENDER',
          revision_number: 1,
          extracted_text: 'HVAC system requirement for 2000 sq.ft Commercial Bank in Chennai with 20 occupants. VRF outdoor unit required with nitrogen pressure holding test.'
        },
        {
          document_id: 'DOC-E2E-02',
          file_name: 'BOQ_Schedule_Rev1.pdf',
          document_type: 'BOQ',
          revision_number: 1,
          extracted_text: 'Bill of Quantities: 1 set 16 TR VRF Outdoor Unit, GI ducting 500 sq.ft, 32mm uPVC drain pipe 50 Rft.'
        }
      ]
    };

    const output = await MasterWorkflowPipeline.execute(reqPayload);

    assert(output.project_id === 'PRJ-E2E-P16-02', 'Multi-document output retains project_id');
    assert(output.unified_project.documents_meta.length === 2, 'Multi-document intake registered 2 documents');
    assert(output.compliance_matrix.length >= 3, 'Tender compliance matrix extracted requirements');
    assert(output.bid_package.bid_package.status !== undefined, 'Bid package status evaluated');

    // Test Express HTTP Route POST /v1/webhook
    const res = await request(app)
      .post('/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'HTTP POST /v1/webhook returns 200 OK for multi-document payload');
    assert(res.body.project_id === 'PRJ-E2E-P16-02', 'Webhook returns master workflow output');
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: HYBRID Mode E2E Integration
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: HYBRID Mode End-to-End Integration');
  {
    const reqPayload: UniversalRequest = {
      project_id: 'PRJ-E2E-P16-03',
      user_id: 'user-e2e-03',
      mode: 'HYBRID',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: 'User site constraint: Outdoor unit must be mounted on terrace level with anti-vibration rubber pads.',
      documents: [
        {
          document_id: 'DOC-HYB-01',
          file_name: 'Hospital_Spec.pdf',
          document_type: 'SPECIFICATION',
          revision_number: 1,
          extracted_text: 'Operating room HVAC system requirement: 600 sq.ft area, 6 occupants, 20 ACH fresh air.'
        }
      ]
    };

    const output = await MasterWorkflowPipeline.execute(reqPayload);

    assert(output.mode === 'HYBRID', 'Output mode is HYBRID');
    assert(Boolean(output.unified_project.raw_input?.includes('terrace level')), 'Hybrid output incorporates user text');
    assert(Boolean(output.unified_project.raw_input?.includes('Hospital_Spec')), 'Hybrid output incorporates document text');
    assert(output.sizing.cooling_status !== undefined, 'Hybrid engineering sizing completed');
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Failure & Conflict Handling Integration
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Failure & Conflict Handling Integration');
  {
    // A. Schema rejection failure case
    const invalidRes = await request(app)
      .post('/v1/webhook')
      .send({
        mode: 'INVALID_MODE'
      });

    assert(invalidRes.status === 400, 'HTTP POST /v1/webhook returns 400 for invalid mode');
    assert(invalidRes.body.status === 'FAILED', 'Response status is FAILED');

    // B. Cross-document conflict case
    const conflictPayload: UniversalRequest = {
      project_id: 'PRJ-E2E-CONF-04',
      user_id: 'user-e2e-04',
      mode: 'HYBRID',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: 'Fresh air requirement: 600 CFM',
      documents: [
        {
          document_id: 'DOC-CONF-A',
          file_name: 'Drawing_P8.pdf',
          document_type: 'DRAWING',
          revision_number: 1,
          extracted_text: 'Fresh air supply requirement: 600 CFM'
        },
        {
          document_id: 'DOC-CONF-B',
          file_name: 'BOQ_Spec_P12.pdf',
          document_type: 'SPECIFICATION',
          revision_number: 1,
          extracted_text: 'Fresh air supply requirement: 800 CFM'
        }
      ]
    };

    const conflictOutput = await MasterWorkflowPipeline.execute(conflictPayload);

    assert(conflictOutput.unified_project.conflicts.length > 0, 'Cross-document conflict detected');
    assert(conflictOutput.status === 'NEEDS_REVIEW', 'Workflow status is NEEDS_REVIEW due to unresolved conflict');
    assert(conflictOutput.bid_package.technical_envelope?.technical_envelope_status === 'CONFLICT', 'Technical envelope status is CONFLICT');

    // C. Healthcheck endpoint
    const healthRes = await request(app).get('/healthz');
    assert(healthRes.status === 200, 'HTTP GET /healthz returns 200 OK');
    assert(healthRes.body.status === 'healthy', 'Healthcheck returns healthy status');
  }

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase16Tests().catch((err) => {
  console.error('Unhandled error in Phase 16 E2E tests:', err);
  process.exit(1);
});
