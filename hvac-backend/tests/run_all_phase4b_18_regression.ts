import { execSync } from 'child_process';
import path from 'path';

console.log('==================================================');
console.log('   HVAC BIS BACKEND PHASE 4B - 18 REGRESSION RUNNER');
console.log('==================================================\n');

const testFiles = [
  'tests/test_phase3b_pdf_text_extraction.ts',
  'tests/test_phase4b_normalization.ts',
  'tests/test_phase4c_requirement_driven.ts',
  'tests/test_phase4d_engineering_sizing.ts',
  'tests/test_phase4e_equipment_selection_gate.ts',
  'tests/test_phase5_verified_catalog.ts',
  'tests/test_phase5a_matching_rules.ts',
  'tests/test_phase6_supplier_verification.ts',
  'tests/test_phase7_verified_pricing.ts',
  'tests/test_phase8_boq_takeoff.ts',
  'tests/test_phase9_boq_validation.ts',
  'tests/test_phase10_commercial_rules.ts',
  'tests/test_phase10a_commercial_readiness_gate.ts',
  'tests/test_phase11_commercial_quotation_engine.ts',
  'tests/test_phase12_tender_compliance.ts',
  'tests/test_phase13_technical_bid_content.ts',
  'tests/test_phase14_document_generation.ts',
  'tests/test_phase15_supabase_persistence.ts',
  'tests/test_phase16_e2e_integration.ts',
  'tests/test_phase17_live_sns_workbench.ts',
  'tests/test_phase18_verified_sourcing_integration.ts'
];

let passedCount = 0;
let failedCount = 0;

for (let i = 0; i < testFiles.length; i++) {
  const file = testFiles[i];
  console.log(`Running test file ${i + 1}/${testFiles.length}: ${file}`);
  try {
    const fullPath = path.resolve(__dirname, '..', file);
    execSync(`npx ts-node "${fullPath}"`, { stdio: 'inherit' });
    console.log('  -> SUCCESS\n');
    passedCount++;
  } catch (err: any) {
    console.error(`  -> FAILED (${file})\n`);
    failedCount++;
  }
}

console.log('==================================================');
console.log('   REGRESSION RESULTS SUMMARY');
console.log('==================================================');
console.log(`Total Test Suites: ${testFiles.length}`);
console.log(`Passed Suites: ${passedCount}`);
console.log(`Failed Suites: ${failedCount}`);

if (failedCount > 0) {
  console.error(`\n>>> ${failedCount} REGRESSION SUITE(S) FAILED <<<`);
  process.exit(1);
} else {
  console.log(`\n>>> ALL ${testFiles.length}/${testFiles.length} PHASE 4B-18 REGRESSION SUITES PASSED CLEANLY! <<<`);
}
