import { CommercialQuotationEngine } from '../src/commercial/quotation';
import { UnifiedProjectModel, BOQItem, CommercialConfigInput } from '../src/domain/models';

async function runPhase10ATests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 10A COMMERCIAL READINESS GATE TESTS');
  console.log('======================================================');

  const mockProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P10A-01',
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

  const pricedBOQ: BOQItem[] = [
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

  // TEST CASE 1: Missing Required Tax Case (Grand total MUST be null / NEEDS_REVIEW)
  console.log('\n--- CASE 1: Missing Required Tax Case ---');
  const quote1 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ); // No tax config, allow_tax_exclusive_bid false

  console.log('Verified Subtotal:', quote1.verified_subtotal);
  console.log('Taxable Amount:', quote1.taxable_amount);
  console.log('Grand Total:', quote1.grand_total);
  console.log('Grand Total Status:', quote1.grand_total_status);
  console.log('Pricing Verified:', quote1.pricing_verified);

  if (
    quote1.verified_subtotal === 250000 &&
    quote1.taxable_amount === 250000 &&
    quote1.grand_total === null &&
    quote1.grand_total_status === 'NEEDS_REVIEW' &&
    quote1.pricing_verified === false
  ) {
    console.log('CASE 1 RESULT: PASS (Grand total blocked as null/NEEDS_REVIEW when required tax is missing)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Explicit Tax-Exclusive Bid Case
  console.log('\n--- CASE 2: Explicit Tax-Exclusive Bid Case ---');
  const taxExclusiveBidConfig: CommercialConfigInput = {
    allow_tax_exclusive_bid: true,
    source_provenance: 'TENDER_ALLOWS_TAX_EXCLUSIVE_BID',
    verification_status: 'VERIFIED',
  };

  const quote2 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, taxExclusiveBidConfig);
  console.log('Grand Total:', quote2.grand_total);
  console.log('Grand Total Status:', quote2.grand_total_status);
  console.log('Tax Exclusive Taxable Amount:', quote2.tax_exclusive_taxable_amount);

  if (
    quote2.grand_total === 250000 &&
    quote2.grand_total_status === 'TAX_EXCLUSIVE_BID' &&
    quote2.tax_exclusive_taxable_amount === 250000
  ) {
    console.log('CASE 2 RESULT: PASS (Explicit tax-exclusive bid presented taxable total with status TAX_EXCLUSIVE_BID)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Explicit Tax-Inclusive Bid Case
  console.log('\n--- CASE 3: Explicit Tax-Inclusive Bid Case ---');
  const inclusiveBOQ: BOQItem[] = [
    {
      ...pricedBOQ[0],
      quantity: 1,
      unit_rate: 118000,
      total_amount: 118000,
    },
  ];
  const taxInclusiveConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_INCLUSIVE',
    source_provenance: 'TENDER_TAX_INCLUSIVE_CLAUSE',
    verification_status: 'VERIFIED',
  };

  const quote3 = CommercialQuotationEngine.calculateQuote(mockProject, inclusiveBOQ, taxInclusiveConfig);
  console.log('Tax Inclusive Gross Amount:', quote3.tax_inclusive_gross_amount);
  console.log('Tax Exclusive Taxable Amount:', quote3.tax_exclusive_taxable_amount);
  console.log('Grand Total:', quote3.grand_total);
  console.log('Grand Total Status:', quote3.grand_total_status);

  if (
    quote3.tax_inclusive_gross_amount === 118000 &&
    quote3.tax_exclusive_taxable_amount === 100000 &&
    quote3.grand_total === 118000 &&
    quote3.grand_total_status === 'VERIFIED'
  ) {
    console.log('CASE 3 RESULT: PASS (Explicit tax-inclusive bid distinguished gross and net taxable amounts)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Verified Tax Case
  console.log('\n--- CASE 4: Verified Tax Case ---');
  const verifiedTaxConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_EXCLUSIVE',
    source_provenance: 'TENDER_SECTION_4_TAX_CLAUSE',
    verification_status: 'VERIFIED',
  };

  const quote4 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, verifiedTaxConfig);
  console.log('Grand Total:', quote4.grand_total);
  console.log('Grand Total Status:', quote4.grand_total_status);
  console.log('Pricing Verified:', quote4.pricing_verified);

  if (
    quote4.grand_total === 295000 &&
    quote4.grand_total_status === 'VERIFIED' &&
    quote4.pricing_verified === true
  ) {
    console.log('CASE 4 RESULT: PASS (Verified tax rate allowed complete verified pricing and grand total)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Unverified Tax Case
  console.log('\n--- CASE 5: Unverified Tax Case ---');
  const unverifiedTaxConfig: CommercialConfigInput = {
    tax_percent: 18,
    source_provenance: 'UNVERIFIED_NOTES',
    verification_status: 'NEEDS_REVIEW',
  };

  const quote5 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, unverifiedTaxConfig);
  console.log('Grand Total:', quote5.grand_total);
  console.log('Grand Total Status:', quote5.grand_total_status);
  console.log('Pricing Verified:', quote5.pricing_verified);

  if (
    quote5.grand_total === null &&
    quote5.grand_total_status === 'NEEDS_REVIEW' &&
    quote5.pricing_verified === false
  ) {
    console.log('CASE 5 RESULT: PASS (Unverified tax input blocked grand total as null/NEEDS_REVIEW)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 6: Mixed Priced / Unpriced BOQ Case
  console.log('\n--- CASE 6: Mixed Priced / Unpriced BOQ Case ---');
  const mixedBOQ: BOQItem[] = [
    pricedBOQ[0],
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

  const quote6 = CommercialQuotationEngine.calculateQuote(mockProject, mixedBOQ, verifiedTaxConfig);
  console.log('BOQ Subtotal:', quote6.boq_subtotal);
  console.log('Grand Total:', quote6.grand_total);
  console.log('Grand Total Status:', quote6.grand_total_status);
  console.log('Pricing Verified:', quote6.pricing_verified);

  if (
    quote6.boq_subtotal === null &&
    quote6.grand_total === null &&
    quote6.grand_total_status === 'NOT_AVAILABLE' &&
    quote6.pricing_verified === false
  ) {
    console.log('CASE 6 RESULT: PASS (Mixed priced/unpriced BOQ returned null totals and NOT_AVAILABLE status)');
  } else {
    console.error('CASE 6 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 10A TEST SUMMARY: ALL 6 COMMERCIAL READINESS CASES PASSED!');
  console.log('======================================================');
}

runPhase10ATests();
