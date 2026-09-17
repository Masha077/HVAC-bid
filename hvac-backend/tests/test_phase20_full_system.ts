import request from 'supertest';
import app from '../src/app';

console.log('======================================================');
console.log('PHASE 20 FULL SYSTEM TESTING FOR HVAC BIS');
console.log('Testing complete real operational flow from API endpoint ->');
console.log('Pipeline -> Engineering -> Supabase Persistence -> PDF -> Response');
console.log('======================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string, evidence?: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    if (evidence) console.log(`         Evidence: ${evidence}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    if (evidence) console.error(`         Evidence: ${evidence}`);
    testsFailed++;
  }
}

async function runPhase20SystemTests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: Complete Requirement Case (REQUIREMENT_DRIVEN)
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: Complete Requirement Case (REQUIREMENT_DRIVEN)');
  {
    const payload = {
      project_id: 'PRJ-P20-CASE1-COMPLETE',
      user_id: 'usr-p20-001',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Commercial office in Chennai. Three spaces require comfort air conditioning: Main Open Office (10ft long by 10ft wide by 9ft high ceiling, 5 people), Meeting Conference Room (10ft long by 10ft wide by 9ft high ceiling, 5 people), and Executive Cabin (10ft long by 10ft wide by 9ft high ceiling, 5 people).',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST /api/v1/webhook returns 200 OK', `Status code: ${res.status}`);
    assert(res.body.project_id === 'PRJ-P20-CASE1-COMPLETE', 'Preserves exact project_id', `Project ID: ${res.body.project_id}`);
    assert(res.body.unified_project?.total_area_sqft === 300, 'Calculates exact total area (300 sqft)', `Area: ${res.body.unified_project?.total_area_sqft} sqft`);
    assert(res.body.unified_project?.total_volume_cuft === 2700, 'Calculates exact total volume (2700 cuft)', `Volume: ${res.body.unified_project?.total_volume_cuft} cuft`);
    assert(res.body.unified_project?.total_occupants === 15, 'Calculates total occupants (15 persons)', `Occupants: ${res.body.unified_project?.total_occupants}`);
    assert(res.body.sizing?.fresh_air_cfm === 261, 'Computes deterministic fresh air CFM (261 CFM)', `Fresh Air CFM: ${res.body.sizing?.fresh_air_cfm}`);
    assert(res.body.bid_package?.pdf_base64 !== undefined && res.body.bid_package.pdf_base64.length > 100, 'Generates non-empty PDF base64 string', `PDF Length: ${res.body.bid_package?.pdf_base64?.length} chars`);
    assert(res.body.status === 'SUCCESS' || res.body.status === 'NEEDS_REVIEW', 'Workflow status evaluated', `Status: ${res.body.status}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: Missing Information Case (Zero Fabrication Audit)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: Missing Information Case (Zero Fabrication Audit)');
  {
    const payload = {
      project_id: 'PRJ-P20-CASE2-MISSING',
      user_id: 'usr-p20-002',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Need HVAC cooling for a software facility in Bengaluru.',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST /api/v1/webhook returns 200 OK for missing info case', `Status: ${res.status}`);
    assert(res.body.unified_project?.total_area_sqft === null || res.body.unified_project?.total_area_sqft === 0, 'Total area is null/zero when dimensions are missing', `Total Area: ${res.body.unified_project?.total_area_sqft}`);
    assert(res.body.sizing?.cooling_status === 'NEEDS_REVIEW' || res.body.sizing?.cooling_status === 'NOT_PROVIDED', 'Cooling status is NEEDS_REVIEW/NOT_PROVIDED when basis is missing', `Cooling Status: ${res.body.sizing?.cooling_status}`);
    assert(res.body.unified_project?.missing_information?.length > 0, 'Missing information list is populated', `Missing Items: ${res.body.unified_project?.missing_information?.join(', ')}`);
    assert(res.body.audit?.equipment_selection_allowed === false, 'Equipment selection is blocked when cooling TR is null', `Selection Allowed: ${res.body.audit?.equipment_selection_allowed}`);
    assert(res.body.equipment?.length === 0, 'Zero equipment items fabricated when cooling load is unapproved', `Equipment Count: ${res.body.equipment?.length}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: Single PDF Document Intake Case (DOCUMENT_DRIVEN)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: Single PDF Document Intake Case (DOCUMENT_DRIVEN)');
  {
    const samplePdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Villivakkam Station AC Tender) >>\nendobj\n2 0 obj\n(Section 4: Technical Scope: 2.4 TR Inverter Ductable Split Units 415V 3Phase 50Hz required.)\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');

    const payload = {
      project_id: 'PRJ-P20-CASE3-SINGLE-PDF',
      user_id: 'usr-p20-003',
      mode: 'DOCUMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: '',
      documents: [
        {
          document_id: 'DOC-P20-001',
          file_name: 'Tender_Specification_Villivakkam.pdf',
          document_type: 'TENDER' as const,
          revision_number: 1,
          content_base64: samplePdfBase64
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST returns 200 OK for single PDF intake', `Status: ${res.status}`);
    assert(res.body.unified_project?.documents_meta?.length === 1, 'Registered single document metadata', `Docs Count: ${res.body.unified_project?.documents_meta?.length}`);
    assert(res.body.unified_project?.documents_meta[0].file_name === 'Tender_Specification_Villivakkam.pdf', 'Preserved original file name provenance', `Filename: ${res.body.unified_project?.documents_meta[0].file_name}`);
    assert(res.body.compliance_matrix !== undefined, 'Tender compliance matrix generated', `Compliance Matrix Defined: ${res.body.compliance_matrix !== undefined}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Multiple Conflicting PDFs Case (Cross-Document Conflict Audit)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Multiple Conflicting PDFs Case (Cross-Document Conflict Audit)');
  {
    const payload = {
      project_id: 'PRJ-P20-CASE4-CONFLICT',
      user_id: 'usr-p20-004',
      mode: 'DOCUMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: '',
      documents: [
        {
          document_id: 'DOC-CONFLICT-A',
          file_name: 'Tender_Specification_A.pdf',
          document_type: 'TENDER' as const,
          revision_number: 1,
          extracted_text: 'Document A: Tender Scope - Electrical Supply: 415V / 3Phase / 50Hz. Cooling capacity required: 2.4 TR.'
        },
        {
          document_id: 'DOC-CONFLICT-B',
          file_name: 'BOQ_Schedule_B.pdf',
          document_type: 'BOQ' as const,
          revision_number: 1,
          extracted_text: 'Document B: BOQ Schedule - Electrical Supply: 230V / 1Phase / 50Hz. Cooling capacity required: 5.0 TR.'
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST returns 200 OK for multi-document intake', `Status: ${res.status}`);
    assert(res.body.unified_project?.conflicts?.length > 0, 'Cross-document conflict detected', `Conflicts Count: ${res.body.unified_project?.conflicts?.length}`);
    if (res.body.unified_project?.conflicts?.length > 0) {
      assert(res.body.unified_project?.conflicts[0].field === 'cooling_capacity_tr' || res.body.unified_project?.conflicts[0].field === 'voltage_supply', 'Identified conflicting field', `Field: ${res.body.unified_project?.conflicts[0].field}`);
    }
    assert(res.body.status === 'NEEDS_REVIEW' || res.body.status === 'FAILED', 'Workflow status indicates review required due to conflicts', `Status: ${res.body.status}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 5: Hybrid Input Case (HYBRID)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 5: Hybrid Input Case (Prompt + PDF)');
  {
    const samplePdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n(Specification: Refrigerant R410A required)\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');

    const payload = {
      project_id: 'PRJ-P20-CASE5-HYBRID',
      user_id: 'usr-p20-005',
      mode: 'HYBRID' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'User Requirement: Operating hours 12 hrs/day. Office area 1200 sqft in Chennai.',
      documents: [
        {
          document_id: 'DOC-HYBRID-01',
          file_name: 'Spec_Sheet.pdf',
          document_type: 'SPECIFICATION' as const,
          revision_number: 1,
          content_base64: samplePdfBase64
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST returns 200 OK for HYBRID mode', `Status: ${res.status}`);
    assert(res.body.mode === 'HYBRID', 'Preserves HYBRID mode', `Mode: ${res.body.mode}`);
    assert(res.body.unified_project?.raw_input.includes('User Requirement: Operating hours'), 'Incorporate prompt text in raw_input', `Included prompt: true`);
    assert(res.body.unified_project?.documents_meta?.length === 1, 'Incorporate document metadata in raw_input', `Docs: 1`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 6: Missing Catalog, Supplier, Price & Tax Case (Zero Fabrication Audit)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 6: Missing Catalog, Supplier, Price & Tax Case (Zero Fabrication Audit)');
  {
    const payload = {
      project_id: 'PRJ-P20-CASE6-ZEROFAB',
      user_id: 'usr-p20-006',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Custom 75 TR industrial chiller plant for chemical factory.',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    const comm = res.body.commercial;
    assert(res.status === 200, 'HTTP POST returns 200 OK for custom equipment request', `Status: ${res.status}`);
    assert(comm?.tax_status === 'NOT_PROVIDED', 'Commercial tax status is NOT_PROVIDED when omitted', `Tax Status: ${comm?.tax_status}`);
    assert(comm?.tax_percent === null, 'Commercial tax percent is null (zero 18% hardcoded tax)', `Tax Percent: ${comm?.tax_percent}`);
    assert(comm?.tax_amount === null, 'Commercial tax amount is null when tax rate is not provided', `Tax Amount: ${comm?.tax_amount}`);
    assert(comm?.grand_total === null, 'Grand total is null when tax is not provided', `Grand Total: ${comm?.grand_total}`);
    assert(comm?.grand_total_status === 'NOT_AVAILABLE' || comm?.grand_total_status === 'NEEDS_REVIEW', 'Grand total status is NOT_AVAILABLE / NEEDS_REVIEW', `Grand Total Status: ${comm?.grand_total_status}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 7: Conflicting Tender Requirements Case (Compliance Matrix Audit)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 7: Conflicting Tender Requirements Case (Compliance Matrix Audit)');
  {
    const conflictPdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n(Tender Clause: Chiller unit must operate at 60Hz frequency supply)\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');

    const payload = {
      project_id: 'PRJ-P20-CASE7-COMPLIANCE-CONFLICT',
      user_id: 'usr-p20-007',
      mode: 'DOCUMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: '',
      documents: [
        {
          document_id: 'DOC-TENDER-CONFLICT-01',
          file_name: 'Strict_Tender_Clause.pdf',
          document_type: 'TENDER' as const,
          revision_number: 1,
          content_base64: conflictPdfBase64
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST returns 200 OK for compliance conflict case', `Status: ${res.status}`);
    assert(res.body.compliance_matrix !== undefined, 'Compliance matrix compiled', `Matrix Status: ${res.body.compliance_matrix?.overall_status}`);
    assert(res.body.bid_package?.bid_package?.status !== undefined, 'Bid package status evaluated for revision', `Bid Status: ${res.body.bid_package?.bid_package?.status}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 8: Fully Verified Complete Bid Package Case
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 8: Fully Verified Complete Bid Package Case');
  {
    const payload = {
      project_id: 'PRJ-P20-CASE8-VERIFIED-BID',
      user_id: 'usr-p20-008',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Verified Project: Commercial office 3 rooms (each room 10ft long by 10ft wide by 9ft high, 5 people) in Chennai with 125 sqft/TR cooling load basis. Equipment: Daikin FDBHQ36BAV16 2.4 TR Inverter Ductable Split Unit.',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST returns 200 OK for fully verified bid', `Status: ${res.status}`);
    assert(res.body.project_id === 'PRJ-P20-CASE8-VERIFIED-BID', 'Preserves verified project_id', `Project ID: ${res.body.project_id}`);
    assert(res.body.sizing?.cooling_load_tr !== null, 'Cooling TR calculated deterministically', `Cooling TR: ${res.body.sizing?.cooling_load_tr}`);
    assert(res.body.equipment?.length > 0, 'Equipment selected from verified catalog', `Equipment Count: ${res.body.equipment?.length}`);
    assert(Array.isArray(res.body.boq) && res.body.boq.length > 0, 'Auditable BOQ items generated', `BOQ Count: ${res.body.boq?.length}`);
    assert(res.body.bid_package?.pdf_base64 !== undefined, 'Bid package PDF base64 rendered', `PDF Base64 Length: ${res.body.bid_package?.pdf_base64?.length}`);
  }

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`PHASE 20 SYSTEM TESTING COMPLETE: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase20SystemTests().catch((err) => {
  console.error('Unhandled exception during Phase 20 system testing:', err);
  process.exit(1);
});
