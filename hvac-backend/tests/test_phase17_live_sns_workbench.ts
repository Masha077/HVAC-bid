import request from 'supertest';
import app from '../src/app';
import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';
import { chromium } from 'playwright';

console.log('=== PHASE 17 LIVE SNS WORKFLOW INTEGRATION & REGRESSION TESTS ===\n');

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

async function runPhase17Tests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: REQUIREMENT_DRIVEN Mode Live Workflow Execution
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: REQUIREMENT_DRIVEN Mode Live Workflow Execution');
  {
    const reqPayload: UniversalRequest = {
      project_id: 'PRJ-P17-REQ-01',
      user_id: 'user-p17-01',
      mode: 'REQUIREMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: 'I need HVAC for an office showroom in Hyderabad. Space area is 1500 sq.ft with 9 ft ceiling height. Occupancy is 15 persons.',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'REQUIREMENT_DRIVEN HTTP POST returns 200 OK');
    assert(res.body.project_id === 'PRJ-P17-REQ-01', 'Output retains exact project_id');
    assert(res.body.mode === 'REQUIREMENT_DRIVEN', 'Output mode is REQUIREMENT_DRIVEN');
    assert(res.body.unified_project?.total_area_sqft === 1500, 'Calculated area is 1500 sq.ft');
    assert(res.body.sizing?.cooling_status !== undefined, 'Engineering sizing status evaluated');
    assert(res.body.bid_package?.pdf_base64 !== undefined, 'PDF base64 generated');
    assert(res.body.bid_package?.technical_envelope !== undefined, 'Technical envelope assembled');
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: DOCUMENT_DRIVEN Mode Multi-Document Intake (Extracted Text, Zero Bloat)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: DOCUMENT_DRIVEN Mode Multi-Document Intake');
  {
    const reqPayload: UniversalRequest = {
      project_id: 'PRJ-P17-DOC-02',
      user_id: 'user-p17-02',
      mode: 'DOCUMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: '',
      documents: [
        {
          document_id: 'DOC-P17-01',
          file_name: 'Tender_Specification_Chennai.pdf',
          document_type: 'TENDER',
          revision_number: 1,
          extracted_text: 'HVAC system requirement for 2000 sq.ft Commercial Bank in Chennai with 20 occupants. VRF outdoor unit required with nitrogen pressure holding test.'
        },
        {
          document_id: 'DOC-P17-02',
          file_name: 'BOQ_Schedule_Rev1.pdf',
          document_type: 'BOQ',
          revision_number: 1,
          extracted_text: 'Bill of Quantities: 1 set 16 TR VRF Outdoor Unit, GI ducting 500 sq.ft, 32mm uPVC drain pipe 50 Rft.'
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'DOCUMENT_DRIVEN HTTP POST returns 200 OK');
    assert(res.body.project_id === 'PRJ-P17-DOC-02', 'Multi-document output retains project_id');
    assert(res.body.unified_project?.documents_meta?.length === 2, 'Intake registered 2 documents with extracted_text');
    assert(res.body.compliance_matrix?.length >= 3, 'Tender compliance matrix extracted items');
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: HYBRID Mode Live Integration
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: HYBRID Mode Live Integration');
  {
    const reqPayload: UniversalRequest = {
      project_id: 'PRJ-P17-HYB-03',
      user_id: 'user-p17-03',
      mode: 'HYBRID',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      text: 'Outdoor VRF condensing unit on terrace level.',
      documents: [
        {
          document_id: 'DOC-P17-03',
          file_name: 'Hospital_Spec.pdf',
          document_type: 'SPECIFICATION',
          revision_number: 1,
          extracted_text: 'Operating room HVAC system requirement: 600 sq.ft area, 6 occupants, 20 ACH fresh air.'
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'HYBRID HTTP POST returns 200 OK');
    assert(res.body.mode === 'HYBRID', 'Output mode is HYBRID');
    assert(res.body.unified_project?.raw_input?.includes('terrace level'), 'User text incorporated');
    assert(res.body.unified_project?.raw_input?.includes('Hospital_Spec'), 'Document text incorporated');
    assert(res.body.sizing?.fresh_air_cfm > 0, 'Fresh air CFM calculated deterministically');
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Cross-Document Conflict & Error Propagation
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Cross-Document Conflict & Error Propagation');
  {
    const conflictPayload: UniversalRequest = {
      project_id: 'PRJ-P17-CONF-04',
      user_id: 'user-p17-04',
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

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(conflictPayload);

    assert(res.status === 200, 'Conflict case returns HTTP 200 with error/status flags');
    assert(res.body.unified_project?.conflicts?.length > 0, 'Cross-document conflict detected');
    assert(res.body.status === 'NEEDS_REVIEW', 'Workflow status is NEEDS_REVIEW');
    assert(res.body.bid_package?.technical_envelope?.technical_envelope_status === 'CONFLICT', 'Technical envelope status is CONFLICT');
  }

  // -----------------------------------------------------------------------------
  // Test Case 5: Live SNS Workbench Builder Workspace Synchronization Test
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 5: Live SNS Workbench Builder Workspace Verification');
  try {
    const userDataDir = 'C:\\Users\\varun\\OneDrive\\Documents\\hvac-project\\.chrome_user_data';
    const context = await chromium.launchPersistentContext(userDataDir, { headless: true });
    const page = await context.newPage();
    await page.goto('https://agents.snsihub.ai/builder?workspaceId=95c0b155-6bd1-4001-a3ec-d7daf3c677d2&workflowId=5177da98-1708-4f0e-9d9b-af6f4a54dc4e');
    await page.waitForTimeout(3000);

    const wf = await page.evaluate(async () => {
      const res = await fetch('https://api.agents.snsihub.ai/workflows/5177da98-1708-4f0e-9d9b-af6f4a54dc4e', { credentials: 'include' });
      return await res.json();
    });

    assert(wf.id === '5177da98-1708-4f0e-9d9b-af6f4a54dc4e', 'Live SNS workflow ID verified');
    assert(wf.nodes.length >= 33, 'Live SNS workflow contains required node graph');
    const bridgeNode = wf.nodes.find((n: any) => n.id === 'node-19-bridge-backend');
    assert(bridgeNode !== undefined, 'Master backend bridge node present in live workflow');
    assert(bridgeNode.toolId === 'httpRequest', 'Backend bridge node configured with httpRequest tool');

    await context.close();
  } catch (err: any) {
    console.error('Live SNS Workbench verification error:', err.message);
    assert(false, 'Live SNS Workbench verification failed');
  }

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase17Tests();
