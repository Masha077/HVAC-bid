import { CommercialQuotationEngine } from '../src/commercial/quotation';
import { UnifiedProjectModel, BOQItem, CommercialConfigInput } from '../src/domain/models';

async function runPhase10Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 10 TENDER COMMERCIAL RULES & TAX TESTS');
  console.log('======================================================');

  const mockProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P10-01',
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

  // TEST CASE 1: Explicit GST Configured Input Case
  console.log('\n--- CASE 1: Explicit GST Configured Input Case ---');
  const explicitTaxConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_EXCLUSIVE',
    source_provenance: 'TENDER_SPECIFICATION_SECTION_4',
    verification_status: 'VERIFIED',
  };

  const quote1 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, explicitTaxConfig);
  console.log('Tax Percent:', quote1.tax_percent);
  console.log('Tax Status:', quote1.tax_status);
  console.log('Tax Amount:', quote1.tax_amount);
  console.log('Grand Total:', quote1.grand_total);
  console.log('Tax Provenance:', quote1.resolution_report?.tax_provenance);

  if (
    quote1.tax_percent === 18 &&
    quote1.tax_status === 'VERIFIED' &&
    quote1.tax_amount === 45000 &&
    quote1.grand_total === 295000 &&
    quote1.resolution_report?.tax_provenance === 'TENDER_SPECIFICATION_SECTION_4'
  ) {
    console.log('CASE 1 RESULT: PASS (Explicit GST resolved with verified provenance)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Missing GST Case (Must return null tax and NOT_PROVIDED status, no hardcoding!)
  console.log('\n--- CASE 2: Missing GST Case ---');
  const quote2 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ); // No tax config
  console.log('Tax Percent:', quote2.tax_percent);
  console.log('Tax Status:', quote2.tax_status);
  console.log('Tax Amount:', quote2.tax_amount);
  console.log('Grand Total:', quote2.grand_total);

  if (
    quote2.tax_percent === null &&
    quote2.tax_status === 'NOT_PROVIDED' &&
    quote2.tax_amount === null &&
    quote2.grand_total === null &&
    quote2.grand_total_status === 'NEEDS_REVIEW'
  ) {
    console.log('CASE 2 RESULT: PASS (Missing tax resolved to null/NOT_PROVIDED without hardcoding 18%)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Tax-Inclusive Pricing Basis Case
  console.log('\n--- CASE 3: Tax-Inclusive Pricing Basis Case ---');
  const inclusiveBOQ: BOQItem[] = [
    {
      ...pricedBOQ[0],
      quantity: 1,
      unit_rate: 118000,
      total_amount: 118000,
    },
  ];
  const inclusiveConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_INCLUSIVE',
    source_provenance: 'TENDER_TAX_INCLUSIVE_TERMS',
    verification_status: 'VERIFIED',
  };

  const quote3 = CommercialQuotationEngine.calculateQuote(mockProject, inclusiveBOQ, inclusiveConfig);
  console.log('Tax Basis:', quote3.tax_basis);
  console.log('Taxable Amount:', quote3.taxable_amount);
  console.log('Tax Amount:', quote3.tax_amount);
  console.log('Grand Total:', quote3.grand_total);

  if (
    quote3.tax_basis === 'TAX_INCLUSIVE' &&
    quote3.tax_exclusive_taxable_amount === 100000 &&
    quote3.tax_amount === 18000 &&
    quote3.grand_total === 118000
  ) {
    console.log('CASE 3 RESULT: PASS (Tax-inclusive pricing computed taxable and tax breakdown accurately)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Tax-Exclusive Pricing Basis Case
  console.log('\n--- CASE 4: Tax-Exclusive Pricing Basis Case ---');
  const exclusiveConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_EXCLUSIVE',
    source_provenance: 'TENDER_TAX_EXCLUSIVE_TERMS',
    verification_status: 'VERIFIED',
  };

  const quote4 = CommercialQuotationEngine.calculateQuote(mockProject, inclusiveBOQ, exclusiveConfig);
  console.log('Tax Basis:', quote4.tax_basis);
  console.log('Taxable Amount:', quote4.taxable_amount);
  console.log('Tax Amount:', quote4.tax_amount);
  console.log('Grand Total:', quote4.grand_total);

  if (
    quote4.tax_basis === 'TAX_EXCLUSIVE' &&
    quote4.taxable_amount === 118000 &&
    quote4.tax_amount === 21240 &&
    quote4.grand_total === 139240
  ) {
    console.log('CASE 4 RESULT: PASS (Tax-exclusive pricing computed taxable and tax addition accurately)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Unverified Commercial Input Case
  console.log('\n--- CASE 5: Unverified Commercial Input Case ---');
  const unverifiedConfig: CommercialConfigInput = {
    tax_percent: 18,
    source_provenance: 'UNVERIFIED_DRAFT_NOTES',
    verification_status: 'NEEDS_REVIEW',
  };

  const quote5 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, unverifiedConfig);
  console.log('Commercial Ready:', quote5.resolution_report?.commercial_ready);
  console.log('Pricing Verified:', quote5.pricing_verified);
  console.log('Tax Status:', quote5.tax_status);

  if (
    quote5.resolution_report?.commercial_ready === false &&
    quote5.pricing_verified === false &&
    quote5.tax_status === 'NEEDS_REVIEW'
  ) {
    console.log('CASE 5 RESULT: PASS (Unverified commercial input flagged NEEDS_REVIEW and pricing_verified: false)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 6: Mixed Priced / Unpriced BOQ Case
  console.log('\n--- CASE 6: Mixed Priced / Unpriced BOQ Case ---');
  const mixedBOQ: BOQItem[] = [
    pricedBOQ[0], // Priced line
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

  const quote6 = CommercialQuotationEngine.calculateQuote(mockProject, mixedBOQ, explicitTaxConfig);
  console.log('BOQ Subtotal:', quote6.boq_subtotal);
  console.log('Tax Amount:', quote6.tax_amount);
  console.log('Grand Total:', quote6.grand_total);
  console.log('Pricing Verified:', quote6.pricing_verified);
  console.log('Resolved Tax Percent:', quote6.resolution_report?.tax_percent);

  if (
    quote6.boq_subtotal === null &&
    quote6.tax_amount === null &&
    quote6.grand_total === null &&
    quote6.pricing_verified === false &&
    quote6.resolution_report?.tax_percent === 18
  ) {
    console.log('CASE 6 RESULT: PASS (Preserved null quotation amounts for unpriced BOQ while recording resolved commercial rules)');
  } else {
    console.error('CASE 6 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 10 TEST SUMMARY: ALL 6 COMMERCIAL RULE CASES PASSED!');
  console.log('======================================================');
}

runPhase10Tests();
