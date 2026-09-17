import request from 'supertest';
import app from '../src/app';

async function runPDFBridgeTests() {
  console.log('====================================================');
  console.log('TESTING HVAC BACKEND PDF BINARY BRIDGE');
  console.log('====================================================\n');

  // Minimal valid PDF binary buffer
  const samplePdfBuffer = Buffer.from(
    'JVBERi0xLjQKJSDi48OUCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCA0ND4+CnN0cmVhbQpCVCAvRiAxMiBURiA3MiA3MTIgVEQgKEhWQUMgVGVuZGVyIFNwZWNpZmljYXRpb24pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4KJSVFT0Y='
  );

  // 1. TEST EXISTING JSON REQUEST SUPPORT (Backward Compatibility)
  console.log('1. Testing Existing JSON Payload Endpoint (POST /api/v1/webhook)...');
  const jsonRes = await request(app)
    .post('/api/v1/webhook')
    .send({
      user_id: 'test-user-json',
      project_id: 'JSON-TEST-001',
      mode: 'REQUIREMENT_DRIVEN',
      text: 'I need HVAC for an office building in Chennai with 3 rooms.',
      documents: [],
      requested_output_type: 'COMPLETE_BID_PACKAGE'
    });

  console.log('   JSON Request Response Status:', jsonRes.status);
  console.log('   JSON Request Pipeline Status:', jsonRes.body?.status);
  if (jsonRes.status === 200 && jsonRes.body?.project_id === 'JSON-TEST-001') {
    console.log('   ✅ JSON Request Support: PASSED\n');
  } else {
    console.error('   ❌ JSON Request Support: FAILED\n');
    process.exit(1);
  }

  // 2. TEST MULTIPART PDF UPLOAD (DOCUMENT_DRIVEN) WITH REAL PDF BUFFER
  console.log('2. Testing Multipart PDF Upload (POST /api/hvac/document)...');
  const pdfRes = await request(app)
    .post('/api/hvac/document')
    .field('user_id', 'test-user-pdf')
    .field('project_id', 'DOC-BRIDGE-001')
    .field('mode', 'DOCUMENT_DRIVEN')
    .field('requested_output_type', 'COMPLETE_BID_PACKAGE')
    .attach('file', samplePdfBuffer, 'HVAC-villivakkam-br-air-conditioning-tender.pdf');

  console.log('   PDF Upload Response Status:', pdfRes.status);
  console.log('   PDF Upload Response OK:', pdfRes.body?.ok);
  
  const documentsMeta = pdfRes.body?.data?.unified_project?.documents_meta || [];
  console.log('   Processed Documents Count:', documentsMeta.length);
  if (documentsMeta.length > 0) {
    console.log('   First Document Name:', documentsMeta[0].file_name);
    console.log('   First Document Status:', documentsMeta[0].status);
  }

  if (
    pdfRes.status === 200 &&
    pdfRes.body?.ok === true &&
    documentsMeta.length > 0 &&
    documentsMeta[0].file_name === 'HVAC-villivakkam-br-air-conditioning-tender.pdf'
  ) {
    console.log('   ✅ Multipart PDF Upload & Processing: PASSED\n');
  } else {
    console.error('   ❌ Multipart PDF Upload: FAILED\n');
    process.exit(1);
  }

  // 3. TEST VALIDATION REJECTIONS (Empty Buffer & Invalid Type)
  console.log('3. Testing Empty File Buffer Rejection...');
  const emptyRes = await request(app)
    .post('/api/hvac/document')
    .field('user_id', 'test-user-pdf')
    .field('mode', 'DOCUMENT_DRIVEN')
    .attach('file', Buffer.from(''), 'empty.pdf');

  console.log('   Empty Buffer Status:', emptyRes.status, 'Message:', emptyRes.body?.message);
  if (emptyRes.status === 400 && emptyRes.body?.message?.includes('empty')) {
    console.log('   ✅ Empty Buffer Rejection: PASSED\n');
  } else {
    console.error('   ❌ Empty Buffer Rejection: FAILED\n');
    process.exit(1);
  }

  console.log('4. Testing Invalid File Type Rejection...');
  const invalidRes = await request(app)
    .post('/api/hvac/document')
    .field('user_id', 'test-user-pdf')
    .field('mode', 'DOCUMENT_DRIVEN')
    .attach('file', Buffer.from('Plain text file content'), 'test.txt');

  console.log('   Invalid File Type Status:', invalidRes.status, 'Message:', invalidRes.body?.message);
  if (invalidRes.status === 400 && invalidRes.body?.message?.includes('Unsupported')) {
    console.log('   ✅ Invalid File Type Rejection: PASSED\n');
  } else {
    console.error('   ❌ Invalid File Type Rejection: FAILED\n');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🎉 ALL BACKEND PDF BRIDGE TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

runPDFBridgeTests();
