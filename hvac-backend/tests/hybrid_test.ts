import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';

async function runHybridTest() {
  console.log('====================================================');
  console.log('RUNNING TEST 2: HYBRID MODE WITH MULTI-DOCS & CONFLICT');
  console.log('====================================================');

  const payload: UniversalRequest = {
    user_id: 'test-user-002',
    project_id: 'HYBRID-TEST-001',
    mode: 'HYBRID',
    text: 'Client Requirement: I need a 10 TR chiller system for an office in Coimbatore with 5 rooms.',
    documents: [
      {
        document_id: 'DOC-01',
        file_name: 'tender_specifications.pdf',
        document_type: 'TENDER',
        revision_number: 1,
        raw_text: 'Tender Section 4: Project location is Coimbatore. Minimum cooling capacity required is 15 TR for 5 rooms.',
      },
      {
        document_id: 'DOC-02',
        file_name: 'boq_schedule.pdf',
        document_type: 'BOQ',
        revision_number: 1,
        raw_text: 'Schedule of Quantities: Item 1. Supply of 12 TR Modular Air Cooled Chiller Unit.',
      },
    ],
    requested_output_type: 'COMPLETE_BID_PACKAGE',
  };

  console.log('Input Payload:', JSON.stringify(payload, null, 2));

  const result = await MasterWorkflowPipeline.execute(payload);

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log('Pipeline Status:', result.status);
  console.log('Mode:', result.mode);
  console.log('Processed Documents Count:', result.unified_project.documents_meta.length);
  console.log('Documents Meta Status:');
  result.unified_project.documents_meta.forEach((d) => console.log(` - [${d.document_id}] ${d.file_name}: ${d.status}`));

  console.log('\n--- CONFLICTS DETECTED ---');
  console.log(JSON.stringify(result.unified_project.conflicts, null, 2));

  console.log('\n--- AUDIT STATUS ---');
  console.log('Audit Status:', result.audit.audit_status);

  // Assertions: Multi-document intake succeeded and conflicts detected
  if (
    result.unified_project.documents_meta.length === 2 &&
    result.unified_project.conflicts.length > 0 &&
    (result.status === 'NEEDS_REVIEW' || result.status === 'SUCCESS')
  ) {
    console.log('\n✅ TEST 2 (HYBRID MULTI-DOC & CONFLICT DETECT) PASSED PERFECTLY!');
  } else {
    console.error('\n❌ TEST 2 ASSERTION FAILED!');
    process.exit(1);
  }
}

runHybridTest();
