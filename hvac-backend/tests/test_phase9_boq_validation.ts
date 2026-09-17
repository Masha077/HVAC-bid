import { BOQValidator } from '../src/boq/validator';
import { CommercialQuotationEngine } from '../src/commercial/quotation';
import { BOQItem, UnifiedProjectModel } from '../src/domain/models';

async function runPhase9Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 9 BOQ VALIDATION & ARITHMETIC GATE TESTS');
  console.log('======================================================');

  const mockProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P9-01',
    user_id: 'test-user-001',
    mode: 'REQUIREMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Chennai',
    building_type: 'Office',
    spaces: [],
    total_spaces: 3,
    total_area_sqft: 300,
    total_volume_cuft: 2700,
    total_occupants: 15,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    raw_input: 'Test project',
    documents_meta: [],
    fact_provenance: [],
    conflicts: [],
  };

  // TEST CASE 1: Valid Arithmetic Case
  console.log('\n--- CASE 1: Valid Arithmetic Case ---');
  const validBOQ: BOQItem[] = [
    {
      item_code: '23-80-01',
      category: 'Primary HVAC Equipment',
      description: 'Daikin Commercial Split Unit 2.4 TR',
      quantity: 2,
      unit: 'nos',
      unit_rate: 125000,
      total_amount: 250000,
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'VERIFIED_PRICING_RECORD',
    },
  ];

  const res1 = BOQValidator.validateBOQ(validBOQ);
  console.log('Validation Is Valid:', res1.is_valid);
  console.log('Verified Subtotal:', res1.verified_subtotal, res1.currency);
  console.log('Unpriced Scope Status:', res1.unpriced_scope_status);

  if (
    res1.is_valid === true &&
    res1.verified_subtotal === 250000 &&
    res1.has_unpriced_items === false &&
    res1.unpriced_scope_status === 'FULLY_VERIFIED'
  ) {
    console.log('CASE 1 RESULT: PASS (Valid arithmetic correctly verified)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Quantity Mismatch / Null Quantity Case
  console.log('\n--- CASE 2: Quantity Mismatch Case ---');
  const qtyMismatchBOQ: BOQItem[] = [
    {
      item_code: '23-31-13',
      category: 'Ductwork',
      description: 'GI Sheet Metal Ducting',
      quantity: null, // Null quantity
      unit: 'sqft',
      unit_rate: 250,
      total_amount: 25000, // Fabricated line total for null quantity!
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'SOURCE_FACT',
    },
  ];

  const res2 = BOQValidator.validateBOQ(qtyMismatchBOQ);
  console.log('Issues Count:', res2.issues.length);
  if (res2.issues.length > 0) {
    console.log('Issue Type:', res2.issues[0].issue_type, '-', res2.issues[0].message);
  }
  console.log('Corrected Total Amount:', res2.validated_boq[0].total_amount);

  if (
    res2.is_valid === false &&
    res2.issues.some((i) => i.issue_type === 'QUANTITY_MISMATCH') &&
    res2.validated_boq[0].total_amount === null
  ) {
    console.log('CASE 2 RESULT: PASS (Invalidated line total for null quantity)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Rate / Line Total Mismatch Case
  console.log('\n--- CASE 3: Rate Mismatch Case ---');
  const rateMismatchBOQ: BOQItem[] = [
    {
      item_code: '23-80-01',
      category: 'Primary HVAC Equipment',
      description: 'VRF Outdoor Unit 5 TR',
      quantity: 2,
      unit: 'nos',
      unit_rate: 100000,
      total_amount: 250000, // Error: 2 * 100000 = 200000 != 250000
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'SOURCE_FACT',
    },
  ];

  const res3 = BOQValidator.validateBOQ(rateMismatchBOQ);
  console.log('Issues Count:', res3.issues.length);
  if (res3.issues.length > 0) {
    console.log('Issue Type:', res3.issues[0].issue_type, '-', res3.issues[0].message);
  }

  if (
    res3.is_valid === false &&
    res3.issues.some((i) => i.issue_type === 'RATE_MISMATCH') &&
    res3.validated_boq[0].total_amount === 200000
  ) {
    console.log('CASE 3 RESULT: PASS (Detected arithmetic rate mismatch and corrected total amount)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Null Pricing Case
  console.log('\n--- CASE 4: Null Pricing Case ---');
  const nullPricingBOQ: BOQItem[] = [
    {
      item_code: '23-37-13',
      category: 'Air Terminal Devices',
      description: '4-Way Supply Diffusers',
      quantity: 5,
      unit: 'nos',
      unit_rate: null,
      total_amount: null,
      currency: 'INR',
      verification_status: 'PRICE_DATA_NOT_YET_VERIFIED',
      provenance: 'NEEDS_REVIEW',
    },
  ];

  const res4 = BOQValidator.validateBOQ(nullPricingBOQ);
  console.log('Verified Subtotal:', res4.verified_subtotal);
  console.log('Has Unpriced Items:', res4.has_unpriced_items);
  console.log('Unpriced Scope Status:', res4.unpriced_scope_status);

  if (
    res4.verified_subtotal === null &&
    res4.has_unpriced_items === true &&
    res4.unpriced_scope_status === 'NOT_AVAILABLE' &&
    res4.validated_boq[0].total_amount === null
  ) {
    console.log('CASE 4 RESULT: PASS (Preserved null line total and reported NOT_AVAILABLE for unpriced item)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Mixed Priced / Unpriced BOQ Case & Commercial Integration
  console.log('\n--- CASE 5: Mixed Priced / Unpriced BOQ Case ---');
  const mixedBOQ: BOQItem[] = [
    {
      item_code: '23-80-01',
      category: 'Primary HVAC Equipment',
      description: 'Daikin Commercial Split Unit 2.4 TR',
      quantity: 1,
      unit: 'nos',
      unit_rate: 125000,
      total_amount: 125000,
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'VERIFIED_PRICING_RECORD',
    },
    {
      item_code: '23-31-13',
      category: 'Ductwork',
      description: 'GI Sheet Metal Ducting',
      quantity: null,
      unit: 'sqft',
      unit_rate: null,
      total_amount: null,
      currency: 'INR',
      verification_status: 'NEEDS_REVIEW',
      provenance: 'NEEDS_REVIEW',
    },
  ];

  const res5 = BOQValidator.validateBOQ(mixedBOQ);
  const quote5 = CommercialQuotationEngine.calculateQuote(mockProject, mixedBOQ);

  console.log('Validation Verified Subtotal:', res5.verified_subtotal);
  console.log('Validation Unpriced Scope Status:', res5.unpriced_scope_status);
  console.log('Commercial Quote Subtotal:', quote5.boq_subtotal);
  console.log('Commercial Quote Pricing Verified:', quote5.pricing_verified);

  if (
    res5.verified_subtotal === 125000 &&
    res5.has_unpriced_items === true &&
    res5.unpriced_scope_status === 'NOT_AVAILABLE' &&
    quote5.boq_subtotal === null &&
    quote5.pricing_verified === false
  ) {
    console.log('CASE 5 RESULT: PASS (Verified subtotal computed from verified lines, commercial quote boq_subtotal kept null due to unpriced items)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 6: Currency Mismatch Case
  console.log('\n--- CASE 6: Currency Mismatch Case ---');
  const currencyMismatchBOQ: BOQItem[] = [
    {
      item_code: '23-80-01',
      category: 'Primary Equipment',
      description: 'VRF Outdoor Unit',
      quantity: 1,
      unit: 'nos',
      unit_rate: 125000,
      total_amount: 125000,
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'VERIFIED_RECORD',
    },
    {
      item_code: '23-80-02',
      category: 'Primary Equipment',
      description: 'Imported AHU Unit',
      quantity: 1,
      unit: 'nos',
      unit_rate: 3000,
      total_amount: 3000,
      currency: 'USD',
      verification_status: 'VERIFIED',
      provenance: 'VERIFIED_RECORD',
    },
  ];

  const res6 = BOQValidator.validateBOQ(currencyMismatchBOQ);
  console.log('Issues Count:', res6.issues.length);
  if (res6.issues.length > 0) {
    console.log('Issue Type:', res6.issues[0].issue_type, '-', res6.issues[0].message);
  }

  if (
    res6.is_valid === false &&
    res6.issues.some((i) => i.issue_type === 'CURRENCY_MISMATCH')
  ) {
    console.log('CASE 7 RESULT: PASS (Detected currency mismatch across line items)');
  } else {
    console.error('CASE 6 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 7: Duplicate BOQ Lines Case
  console.log('\n--- CASE 7: Duplicate BOQ Lines Case ---');
  const duplicateBOQ: BOQItem[] = [
    {
      item_code: '23-80-01',
      category: 'Primary Equipment',
      description: 'Split Unit Unit 1',
      quantity: 1,
      unit: 'nos',
      unit_rate: 125000,
      total_amount: 125000,
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'VERIFIED_RECORD',
    },
    {
      item_code: '23-80-01', // Duplicate code!
      category: 'Primary Equipment',
      description: 'Split Unit Unit 2 (Duplicate Code)',
      quantity: 1,
      unit: 'nos',
      unit_rate: 125000,
      total_amount: 125000,
      currency: 'INR',
      verification_status: 'VERIFIED',
      provenance: 'VERIFIED_RECORD',
    },
  ];

  const res7 = BOQValidator.validateBOQ(duplicateBOQ);
  console.log('Issues Count:', res7.issues.length);
  if (res7.issues.length > 0) {
    console.log('Issue Type:', res7.issues[0].issue_type, '-', res7.issues[0].message);
  }

  if (
    res7.is_valid === false &&
    res7.issues.some((i) => i.issue_type === 'DUPLICATE_ITEM')
  ) {
    console.log('CASE 7 RESULT: PASS (Detected duplicate BOQ item codes)');
  } else {
    console.error('CASE 7 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 9 TEST SUMMARY: ALL 7 BOQ VALIDATION CASES PASSED!');
  console.log('======================================================');
}

runPhase9Tests();
