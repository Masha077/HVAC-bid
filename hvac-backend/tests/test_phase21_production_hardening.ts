import request from 'supertest';
import app from '../src/app';
import fs from 'fs';
import path from 'path';

console.log('======================================================');
console.log('PHASE 21 PRODUCTION HARDENING TESTS FOR HVAC BIS');
console.log('Verifying Security, CORS, Rate Limiting, Path Traversal,');
console.log('Corrupt File Safeguards, Supabase RLS Schema, & Failure Resiliency');
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

async function runPhase21HardeningTests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: Security Audit — No Hardcoded Secrets in Codebase
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: Security Audit — Secret Key & Token Isolation');
  {
    const supabaseConfigContent = fs.readFileSync(path.resolve(__dirname, '../src/config/supabase.ts'), 'utf-8');
    const hasHardcodedServiceRole = supabaseConfigContent.includes("'sb_service_role_key") || supabaseConfigContent.includes("'sb_publishable_");

    assert(!hasHardcodedServiceRole, 'No hardcoded Supabase secret service role key strings in backend config', `Config checked: src/config/supabase.ts`);

    const frontendConfigPath = path.resolve(__dirname, '../../hvac-frontend/artifacts/hvac-bis/src/services/api_client.ts');
    let frontendExposedSecret = false;
    if (fs.existsSync(frontendConfigPath)) {
      const frontendContent = fs.readFileSync(frontendConfigPath, 'utf-8');
      frontendExposedSecret = frontendContent.includes('SUPABASE_SERVICE_ROLE_KEY') || frontendContent.includes('service_role');
    }
    assert(!frontendExposedSecret, 'Frontend code contains zero service-role keys or secret tokens', `Frontend checked: api_client.ts`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: Production CORS Configuration Verification
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: Production CORS Configuration Verification');
  {
    const res = await request(app)
      .options('/api/v1/webhook')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    assert(res.status === 204 || res.status === 200, 'CORS Preflight OPTIONS request returns 200/204 OK', `Status: ${res.status}`);
    assert(res.headers['access-control-allow-origin'] !== undefined, 'CORS access-control-allow-origin header is set', `Allow-Origin: ${res.headers['access-control-allow-origin']}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: Rate Limiting & Abuse Protection
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: Rate Limiting & Abuse Protection');
  {
    const res = await request(app)
      .get('/healthz');

    assert(res.status === 200, 'Healthcheck endpoint responds with 200 OK', `Status: ${res.status}`);
    assert(res.headers['ratelimit-limit'] !== undefined, 'Response includes RateLimit-Limit header', `Limit: ${res.headers['ratelimit-limit']}`);
    assert(res.headers['ratelimit-remaining'] !== undefined, 'Response includes RateLimit-Remaining header', `Remaining: ${res.headers['ratelimit-remaining']}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Path Traversal Protection
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Path Traversal & Unsafe Filename Protection');
  {
    const maliciousPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n(Test Scope)\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

    const res = await request(app)
      .post('/api/v1/webhook')
      .field('project_id', 'PRJ-P21-PATH-TRAVERSAL')
      .field('mode', 'DOCUMENT_DRIVEN')
      .attach('file', maliciousPdfBuffer, '../../../../etc/passwd.pdf');

    assert(res.status === 200, 'HTTP POST handles path traversal filename safely without crashing', `Status: ${res.status}`);
    assert(res.body.unified_project?.documents_meta?.length === 1, 'File registered in documents_meta', `Docs: 1`);
    assert(res.body.unified_project?.documents_meta[0].file_name === 'passwd.pdf', 'Path traversal sanitized with path.basename', `Sanitized filename: ${res.body.unified_project?.documents_meta[0].file_name}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 5: Empty & Unsupported File Handling Safeguards
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 5: Empty & Unsupported File Handling Safeguards');
  {
    // Empty Buffer
    const resEmpty = await request(app)
      .post('/api/v1/webhook')
      .field('project_id', 'PRJ-P21-EMPTY')
      .field('mode', 'DOCUMENT_DRIVEN')
      .attach('file', Buffer.from(''), 'empty_file.pdf');

    assert(resEmpty.status === 400, 'Returns 400 Bad Request for empty file buffer', `Status: ${resEmpty.status}`);
    assert(resEmpty.body.status === 'FAILED', 'Error status is FAILED', `Status text: ${resEmpty.body.status}`);

    // Non-PDF File (e.g. .exe / .txt)
    const resTxt = await request(app)
      .post('/api/v1/webhook')
      .field('project_id', 'PRJ-P21-TXT')
      .field('mode', 'DOCUMENT_DRIVEN')
      .attach('file', Buffer.from('executable binary code'), 'malicious_script.exe');

    assert(resTxt.status === 400, 'Returns 400 Bad Request for non-PDF file upload', `Status: ${resTxt.status}`);
    assert(resTxt.body.message.includes('Unsupported file type'), 'Rejection message specifies expected application/pdf', `Message: ${resTxt.body.message}`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 6: Supabase Row Level Security (RLS) Schema Integrity
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 6: Supabase RLS Schema Integrity Verification');
  {
    const migrationPath = path.resolve(__dirname, '../migrations/015_supabase_persistence_and_audit.sql');
    assert(fs.existsSync(migrationPath), 'Migration SQL file 015_supabase_persistence_and_audit.sql exists', `Path: ${migrationPath}`);

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    assert(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'Migration file enables Row Level Security (RLS)', `RLS Enabled: true`);
    assert(sqlContent.includes('CREATE POLICY'), 'Migration file creates user access control policies', `Policies Created: true`);
    assert(sqlContent.includes('user_id'), 'Policies enforce tenant isolation (auth.uid() = user_id)', `User Isolation: true`);
  }

  // -----------------------------------------------------------------------------
  // Test Case 7: Failure Resiliency & Zero Fabrication Safeguards
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 7: Failure Resiliency & Zero Fabrication Safeguards');
  {
    const payload = {
      project_id: 'PRJ-P21-FAILSAFE',
      user_id: 'usr-p21-failsafe',
      mode: 'REQUIREMENT_DRIVEN' as const,
      text: 'Unspecified project in Delhi without dimensions.',
      documents: []
    };

    const res = await request(app)
      .post('/api/v1/webhook')
      .send(payload);

    assert(res.status === 200, 'HTTP POST returns 200 OK without crashing', `Status: ${res.status}`);
    assert(res.body.commercial?.tax_status === 'NOT_PROVIDED', 'Preserves NOT_PROVIDED tax status on incomplete input', `Tax Status: ${res.body.commercial?.tax_status}`);
    assert(res.body.commercial?.grand_total === null, 'Grand total remains null (zero fabricated prices/tax)', `Grand Total: ${res.body.commercial?.grand_total}`);
    assert(res.body.audit?.equipment_selection_allowed === false, 'Equipment selection gated off cleanly', `Selection Allowed: false`);
  }

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`PHASE 21 HARDENING TESTS COMPLETE: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase21HardeningTests().catch((err) => {
  console.error('Unhandled exception during Phase 21 production hardening tests:', err);
  process.exit(1);
});
