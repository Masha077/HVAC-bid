import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { UniversalRequest } from '../src/validators/schemas';

async function runRevisionAndCustomTest() {
  console.log('====================================================');
  console.log('RUNNING TEST 3: DOCUMENT REVISION & CUSTOM TENDER PACKAGE');
  console.log('====================================================');

  const payload: UniversalRequest = {
    user_id: 'test-user-003',
    project_id: 'REV-TEST-001',
    mode: 'DOCUMENT_DRIVEN',
    documents: [
      {
        document_id: 'DOC-REV-01',
        file_name: 'tender_spec_v1.pdf',
        document_type: 'TENDER',
        revision_number: 1,
        parent_document_id: 'DOC-TENDER-MAIN',
        raw_text: 'Tender Spec Rev 1: Office in Chennai requires 10 TR cooling.',
      },
      {
        document_id: 'DOC-REV-02',
        file_name: 'tender_spec_v2_addendum.pdf',
        document_type: 'TENDER',
        revision_number: 2,
        parent_document_id: 'DOC-TENDER-MAIN',
        raw_text: 'Tender Spec Rev 2 (Addendum 01): Office in Chennai requires 12 TR cooling capacity with ASHRAE 62.1 fresh air.',
      },
    ],
    requested_output_type: 'CUSTOM_TENDER_PACKAGE',
  };

  console.log('Input Payload:', JSON.stringify(payload, null, 2));

  const result = await MasterWorkflowPipeline.execute(payload);

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log('Pipeline Status:', result.status);
  console.log('Processed Documents Count:', result.unified_project.documents_meta.length);
  result.unified_project.documents_meta.forEach((d) => {
    console.log(` - [${d.document_id}] ${d.file_name} (Rev ${d.revision_number}): status=${d.status}, is_superseded=${d.is_superseded}`);
  });

  console.log('\n--- FACT PROVENANCE COUNT ---');
  console.log('Total Facts Tracked:', result.unified_project.fact_provenance.length);

  // Assertions: Rev 1 is marked is_superseded = true, Rev 2 is active
  const rev1 = result.unified_project.documents_meta.find((d) => d.revision_number === 1);
  const rev2 = result.unified_project.documents_meta.find((d) => d.revision_number === 2);

  if (rev1 && rev1.is_superseded === true && rev2 && rev2.is_superseded === false) {
    console.log('\n✅ TEST 3 (DOCUMENT REVISION & CUSTOM PACKAGE) PASSED PERFECTLY!');
  } else {
    console.error('\n❌ TEST 3 ASSERTION FAILED!');
    process.exit(1);
  }
}

runRevisionAndCustomTest();
