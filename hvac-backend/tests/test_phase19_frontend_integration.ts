import request from 'supertest';
import app from '../src/app';

console.log('=== PHASE 19 HVAC BIS FRONTEND INTEGRATION & COMMERCIAL TAX AUDIT TESTS ===\n');

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

async function runPhase19Tests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: REQUIREMENT_DRIVEN Mode Frontend Webhook API Integration
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: REQUIREMENT_DRIVEN Mode Webhook Integration');
  {
    const reqPayload = {
      project_id: 'PRJ-FRONTEND-P19-01',
      user_id: 'user-frontend-001',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Office building in Chennai. Three spaces require comfort cooling and fresh air: open office (600 sqft), meeting room (300 sqft), and server support (200 sqft).',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'HTTP POST /api/v1/webhook returns 200 OK');
    assert(res.body.project_id === 'PRJ-FRONTEND-P19-01', 'Preserves exact project_id');
    assert(res.body.unified_project?.user_id === 'user-frontend-001', 'Preserves exact user_id in unified project');
    assert(res.body.mode === 'REQUIREMENT_DRIVEN', 'Preserves REQUIREMENT_DRIVEN mode');
    assert(res.body.sizing !== undefined, 'Contains engineering sizing card data');
    assert(res.body.sizing.cooling_status !== undefined, 'Cooling status evaluated deterministically');
    assert(res.body.bid_package?.pdf_base64 !== undefined, 'Generated PDF bid package base64 present');
    assert(res.body.bid_package?.bid_package?.status !== undefined || res.body.bid_package?.pdf_base64 !== undefined, 'Generated bid package status evaluated');
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: DOCUMENT_DRIVEN Mode with Multi-PDF Upload Intake
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: DOCUMENT_DRIVEN Mode Multi-Document Intake');
  {
    const samplePdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (HVAC Tender Specification) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');

    const reqPayload = {
      project_id: 'PRJ-FRONTEND-P19-02',
      user_id: 'user-frontend-002',
      mode: 'DOCUMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: '',
      documents: [
        {
          document_id: 'doc-001',
          file_name: 'Tender_Specification_Chennai.pdf',
          document_type: 'TENDER' as const,
          revision_number: 1,
          content_base64: samplePdfBase64
        },
        {
          document_id: 'doc-002',
          file_name: 'BOQ_Schedule_HVAC.pdf',
          document_type: 'BOQ' as const,
          revision_number: 1,
          content_base64: samplePdfBase64
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'HTTP POST /api/v1/webhook returns 200 OK for Multi-PDF DOCUMENT_DRIVEN mode');
    assert(res.body.project_id === 'PRJ-FRONTEND-P19-02', 'Preserves project_id for multi-PDF document intake');
    assert(res.body.unified_project?.documents_meta?.length === 2, 'Analyzed 2 multi-PDF documents');
    assert(res.body.boq !== undefined, 'BOQ takeoff generated from documents');
    assert(res.body.compliance_matrix !== undefined, 'Tender compliance matrix compiled');
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: HYBRID Mode Integration (Prompt + PDF Intake)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: HYBRID Mode Prompt + PDF Integration');
  {
    const samplePdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (HVAC Drawing Specs) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');

    const reqPayload = {
      project_id: 'PRJ-FRONTEND-P19-03',
      user_id: 'user-frontend-003',
      mode: 'HYBRID' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Additional requirement: Operating hours 14 hrs/day. Server room needs 24x7 precision cooling.',
      documents: [
        {
          document_id: 'doc-hybrid-01',
          file_name: 'Drawing_Specification.pdf',
          document_type: 'SPECIFICATION' as const,
          revision_number: 1,
          content_base64: samplePdfBase64
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    assert(res.status === 200, 'HTTP POST /api/v1/webhook returns 200 OK for HYBRID mode');
    assert(res.body.mode === 'HYBRID', 'Output mode is HYBRID');
    assert(res.body.commercial !== undefined, 'Commercial quotation compiled');
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Missing Input & Validation Error Handling
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Missing Input & Validation Error Handling');
  {
    // REQUIREMENT_DRIVEN with empty text & empty documents
    const resInvalidReq = await request(app)
      .post('/api/v1/webhook')
      .send({
        project_id: 'PRJ-ERR-01',
        mode: 'REQUIREMENT_DRIVEN',
        text: '',
        documents: []
      });

    assert(resInvalidReq.status === 400, 'Returns 400 Bad Request when REQUIREMENT_DRIVEN text is empty');
    assert(resInvalidReq.body.status === 'FAILED', 'Error response status is FAILED');
    assert(resInvalidReq.body.message !== undefined, 'Error response contains descriptive message');

    // Invalid mode
    const resInvalidMode = await request(app)
      .post('/api/v1/webhook')
      .send({
        project_id: 'PRJ-ERR-02',
        mode: 'INVALID_MODE',
        text: 'Test prompt'
      });

    assert(resInvalidMode.status === 400, 'Returns 400 Bad Request when mode is invalid');
  }

  // -----------------------------------------------------------------------------
  // Test Case 5: Commercial Tax Audit (No Hardcoded 18% Tax Rate Assumed)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 5: Commercial Tax Audit - Unprovided Tax vs Configured Tax');
  {
    // 5a. Unprovided Tax Rate Case (Default)
    const reqDefault = {
      project_id: 'PRJ-TAX-AUDIT-01',
      user_id: 'user-tax-01',
      mode: 'REQUIREMENT_DRIVEN' as const,
      text: 'Office space 1000 sqft in Chennai.'
    };

    const resDefault = await request(app)
      .post('/api/v1/webhook')
      .send(reqDefault);

    const commDefault = resDefault.body.commercial;
    assert(commDefault.tax_status === 'NOT_PROVIDED', 'Default tax status is NOT_PROVIDED when tax_percent is omitted');
    assert(commDefault.tax_percent === null, 'Default tax_percent is null (no 18% hardcoded assumption)');
    assert(commDefault.tax_amount === null, 'Default tax_amount is null when tax is not provided');
    assert(commDefault.grand_total === null, 'Default grand_total is null when tax is not provided');
    assert(commDefault.grand_total_status === 'NOT_AVAILABLE' || commDefault.grand_total_status === 'NEEDS_REVIEW', 'grand_total_status is NOT_AVAILABLE / NEEDS_REVIEW when tax is not provided');

    // 5b. Webhook execution for tax audit succeeded
    assert(resDefault.status === 200, 'Webhook execution for tax audit succeeded');
  }

  // -----------------------------------------------------------------------------
  // Test Case 6: Generated PDF Base64 Binary Decoding Verification
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 6: Generated PDF Base64 Binary Decoding Verification');
  {
    const reqPayload = {
      project_id: 'PRJ-FRONTEND-P19-06',
      user_id: 'user-frontend-006',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Standard office space 1000 sqft in Chennai.',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(reqPayload);

    const pdfBase64 = res.body.bid_package?.pdf_base64;
    assert(pdfBase64 !== undefined && pdfBase64.length > 100, 'PDF Base64 string returned');

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const magicHeader = pdfBuffer.slice(0, 4).toString('utf-8');
    assert(magicHeader === '%PDF', 'Decoded Base64 buffer starts with valid %PDF magic header');
  }

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------
  console.log(`\nPhase 19 Commercial Tax Audit & Frontend Integration Tests Complete: ${testsPassed} Passed, ${testsFailed} Failed.`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase19Tests().catch((err) => {
  console.error('Unhandled failure in Phase 19 test suite:', err);
  process.exit(1);
});
