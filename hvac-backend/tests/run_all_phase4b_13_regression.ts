import { execSync } from 'child_process';

const testFiles = [
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
];

console.log('======================================================');
console.log('RUNNING PHASE 4B-13 ALL REGRESSION TEST SUITES');
console.log('======================================================\n');

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  console.log(`\n------------------------------------------------------`);
  console.log(`Running ${file}...`);
  console.log(`------------------------------------------------------`);
  try {
    const output = execSync(`npx ts-node ${file}`, { encoding: 'utf-8', cwd: process.cwd() });
    console.log(output);
    totalPassed++;
  } catch (err: any) {
    console.error(`FAILED: ${file}`);
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    totalFailed++;
  }
}

console.log(`\n======================================================`);
console.log(`ALL REGRESSION SUITES SUMMARY`);
console.log(`Passed Suites: ${totalPassed} / ${testFiles.length}`);
console.log(`Failed Suites: ${totalFailed} / ${testFiles.length}`);
console.log('======================================================');

if (totalFailed > 0) {
  process.exit(1);
}
