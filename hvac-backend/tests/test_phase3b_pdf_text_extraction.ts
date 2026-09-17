import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/app';

async function runTests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 3B AUTOMATED TESTS');
  console.log('======================================================');

  const pdfPath = path.join(__dirname, 'HVAC-villivakkam-br-air-conditioning-tender.pdf');
  const pdfExists = fs.existsSync(pdfPath);
  console.log(`PDF file path: ${pdfPath}`);
  console.log(`PDF file exists: ${pdfExists}`);

  if (!pdfExists) {
    throw new Error(`Test PDF file missing at ${pdfPath}`);
  }

  const testFileBuffer = fs.readFileSync(pdfPath);
  const testFileName = 'HVAC-villivakkam-br-air-conditioning-tender.pdf';

  // --- TEST A: DOCUMENT_DRIVEN ---
  console.log('\n--- TEST A: DOCUMENT_DRIVEN (Multipart PDF Upload) ---');
  const resA = await request(app)
    .post('/api/v1/webhook')
    .field('user_id', 'test-user-doc-001')
    .field('project_id', 'DOC-PROJ-VILLIVAKKAM')
    .field('mode', 'DOCUMENT_DRIVEN')
    .field('requested_output_type', 'COMPLETE_BID_PACKAGE')
    .attach('file', testFileBuffer, testFileName);

  console.log(`HTTP Status: ${resA.status}`);
  console.log(`Response Status: ${resA.body.status}`);

  const processedDocA = resA.body.unified_project?.documents_meta?.[0];
  console.log('Processed Document Meta (TEST A):', JSON.stringify({
    document_id: processedDocA?.document_id,
    file_name: processedDocA?.file_name,
    status: processedDocA?.status,
    extracted_word_count: processedDocA?.extracted_word_count,
    hasExtractedText: Boolean(processedDocA?.extracted_text && processedDocA?.extracted_text.length > 0)
  }, null, 2));

  const textSnippetA = (processedDocA?.extracted_text || resA.body.unified_project?.raw_input || '').trim();
  console.log('Extracted Text Beginning (TEST A):\n', textSnippetA.substring(0, 300));

  const testAPassed =
    resA.status === 200 &&
    resA.body.status !== 'FAILED' &&
    processedDocA?.file_name === testFileName &&
    processedDocA?.extracted_word_count > 0 &&
    textSnippetA.length > 0;

  console.log(`TEST A RESULT: ${testAPassed ? 'PASS' : 'FAIL'}`);

  // --- TEST B: HYBRID ---
  console.log('\n--- TEST B: HYBRID (Multipart PDF Upload + Requirement Text) ---');
  const userTextB = 'Prepare HVAC requirements from the provided tender document.';
  const resB = await request(app)
    .post('/api/v1/webhook')
    .field('user_id', 'test-user-hybrid-001')
    .field('project_id', 'HYBRID-PROJ-VILLIVAKKAM')
    .field('mode', 'HYBRID')
    .field('text', userTextB)
    .field('requested_output_type', 'COMPLETE_BID_PACKAGE')
    .attach('file', testFileBuffer, testFileName);

  console.log(`HTTP Status: ${resB.status}`);
  console.log(`Response Status: ${resB.body.status}`);

  const processedDocB = resB.body.unified_project?.documents_meta?.[0];
  const rawInputB = resB.body.unified_project?.raw_input || '';

  console.log('Raw Input Combined (TEST B):', rawInputB.substring(0, 300).replace(/\n+/g, ' '));

  const testBPassed =
    resB.status === 200 &&
    resB.body.status !== 'FAILED' &&
    rawInputB.includes(userTextB) &&
    processedDocB?.file_name === testFileName &&
    processedDocB?.extracted_word_count > 0;

  console.log(`TEST B RESULT: ${testBPassed ? 'PASS' : 'FAIL'}`);

  // --- TEST C: Backward Compatibility (JSON Payload with base64 / binary / raw_text) ---
  console.log('\n--- TEST C: Backward Compatibility (JSON Payload) ---');
  const resC = await request(app)
    .post('/api/v1/webhook')
    .send({
      user_id: 'test-user-json-001',
      project_id: 'JSON-PROJ-001',
      mode: 'DOCUMENT_DRIVEN',
      text: '',
      documents: [
        {
          document_id: 'DOC-JSON-001',
          file_name: 'tender_spec.pdf',
          document_type: 'TENDER',
          revision_number: 1,
          raw_text: 'The contractor shall supply 3 units of 5 TR VRF systems for Villivakkam site.',
          content_base64: testFileBuffer.toString('base64'),
          binary: `data:application/pdf;base64,${testFileBuffer.toString('base64')}`
        }
      ],
      requested_output_type: 'COMPLETE_BID_PACKAGE'
    });

  const testCPassed = resC.status === 200 && resC.body.status !== 'FAILED';
  console.log(`TEST C RESULT: ${testCPassed ? 'PASS' : 'FAIL'}`);

  console.log('\n======================================================');
  console.log('SUMMARY OF PHASE 3B TESTS:');
  console.log(`TEST A (DOCUMENT_DRIVEN): ${testAPassed ? 'PASS' : 'FAIL'}`);
  console.log(`TEST B (HYBRID):          ${testBPassed ? 'PASS' : 'FAIL'}`);
  console.log(`TEST C (BACKWARD COMPAT): ${testCPassed ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  if (!testAPassed || !testBPassed || !testCPassed) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
