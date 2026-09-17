import { CommercialQuotationEngine } from '../src/commercial/quotation';
import { UnifiedProjectModel, BOQItem, CommercialConfigInput } from '../src/domain/models';

async function runPhase11Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 11 COMMERCIAL QUOTATION ENGINE TESTS');
  console.log('======================================================');

  const mockProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P11-01',
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

  // TEST CASE 1: Fully Verified Quotation (BOQ + Tax + Discount + Freight)
  console.log('\n--- CASE 1: Fully Verified Quotation ---');
  const fullyVerifiedConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_EXCLUSIVE',
    discount_percent: 5, // 5% of 250,000 = 12,500
    freight_amount: 10000, // Freight = 10,000
    source_provenance: 'TENDER_COMMERCIAL_SCHEDULE_A',
    verification_status: 'VERIFIED',
  };

  const quote1 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, fullyVerifiedConfig);
  console.log('Subtotal:', quote1.boq_subtotal);
  console.log('Discount Amount:', quote1.discount_amount);
  console.log('Freight Amount:', quote1.freight_amount);
  console.log('Taxable Amount:', quote1.taxable_amount);
  console.log('Tax Amount:', quote1.tax_amount);
  console.log('Grand Total:', quote1.grand_total);
  console.log('Pricing Verified:', quote1.pricing_verified);

  // Expected: Subtotal 250,000 - 12,500 discount + 10,000 freight = 247,500 Taxable. Tax @ 18% = 44,550. Grand Total = 292,050.
  if (
    quote1.boq_subtotal === 250000 &&
    quote1.discount_amount === 12500 &&
    quote1.freight_amount === 10000 &&
    quote1.taxable_amount === 247500 &&
    quote1.tax_amount === 44550 &&
    quote1.grand_total === 292050 &&
    quote1.pricing_verified === true
  ) {
    console.log('CASE 1 RESULT: PASS (Fully verified quotation arithmetic computed with 100% accuracy)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Verified Tax-Exclusive Quotation Case
  console.log('\n--- CASE 2: Verified Tax-Exclusive Quotation Case ---');
  const taxExclusiveConfig: CommercialConfigInput = {
    tax_percent: 18,
    tax_basis: 'TAX_EXCLUSIVE',
    source_provenance: 'TENDER_TAX_CLAUSE_SEC_2',
    verification_status: 'VERIFIED',
  };

  const quote2 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, taxExclusiveConfig);
  console.log('Taxable Amount:', quote2.taxable_amount);
  console.log('Tax Amount:', quote2.tax_amount);
  console.log('Grand Total:', quote2.grand_total);

  if (
    quote2.taxable_amount === 250000 &&
    quote2.tax_amount === 45000 &&
    quote2.grand_total === 295000 &&
    quote2.pricing_verified === true
  ) {
    console.log('CASE 2 RESULT: PASS (Verified tax-exclusive quotation computed accurately)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Verified Tax-Inclusive Quotation Case
  console.log('\n--- CASE 3: Verified Tax-Inclusive Quotation Case ---');
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
    source_provenance: 'TENDER_TAX_INCLUSIVE_SCHEDULE',
    verification_status: 'VERIFIED',
  };

  const quote3 = CommercialQuotationEngine.calculateQuote(mockProject, inclusiveBOQ, taxInclusiveConfig);
  console.log('Tax Inclusive Gross:', quote3.tax_inclusive_gross_amount);
  console.log('Tax Exclusive Taxable:', quote3.tax_exclusive_taxable_amount);
  console.log('Tax Amount:', quote3.tax_amount);
  console.log('Grand Total:', quote3.grand_total);

  if (
    quote3.tax_inclusive_gross_amount === 118000 &&
    quote3.tax_exclusive_taxable_amount === 100000 &&
    quote3.tax_amount === 18000 &&
    quote3.grand_total === 118000 &&
    quote3.pricing_verified === true
  ) {
    console.log('CASE 3 RESULT: PASS (Verified tax-inclusive quotation breakdown computed accurately)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Missing Tax Case
  console.log('\n--- CASE 4: Missing Tax Case ---');
  const quote4 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ); // No tax
  console.log('Tax Amount:', quote4.tax_amount);
  console.log('Grand Total:', quote4.grand_total);
  console.log('Grand Total Status:', quote4.grand_total_status);
  console.log('Pricing Verified:', quote4.pricing_verified);

  if (
    quote4.tax_amount === null &&
    quote4.grand_total === null &&
    quote4.grand_total_status === 'NEEDS_REVIEW' &&
    quote4.pricing_verified === false
  ) {
    console.log('CASE 4 RESULT: PASS (Missing tax kept grand_total null and pricing_verified false)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Unpriced BOQ Case
  console.log('\n--- CASE 5: Unpriced BOQ Case ---');
  const unpricedBOQ: BOQItem[] = [
    pricedBOQ[0],
    {
      item_code: '23-31-13',
      category: 'Ductwork',
      description: 'GI Ductwork',
      quantity: null,
      unit: 'sqft',
      unit_rate: null,
      total_amount: null,
      currency: 'INR',
      verification_status: 'NEEDS_REVIEW',
      provenance: 'NEEDS_REVIEW',
    },
  ];

  const quote5 = CommercialQuotationEngine.calculateQuote(mockProject, unpricedBOQ, taxExclusiveConfig);
  console.log('BOQ Subtotal:', quote5.boq_subtotal);
  console.log('Grand Total:', quote5.grand_total);
  console.log('Grand Total Status:', quote5.grand_total_status);
  console.log('Pricing Verified:', quote5.pricing_verified);

  if (
    quote5.boq_subtotal === null &&
    quote5.grand_total === null &&
    quote5.grand_total_status === 'NOT_AVAILABLE' &&
    quote5.pricing_verified === false
  ) {
    console.log('CASE 5 RESULT: PASS (Unpriced BOQ returned null totals and NOT_AVAILABLE status)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 6: Verified Discount Case
  console.log('\n--- CASE 6: Verified Discount Case ---');
  const verifiedDiscountConfig: CommercialConfigInput = {
    tax_percent: 18,
    discount_percent: 5, // 5% of 250,000 = 12,500
    source_provenance: 'PROMOTION_DISCOUNT_COUPON',
    verification_status: 'VERIFIED',
  };

  const quote6 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, verifiedDiscountConfig);
  console.log('Subtotal:', quote6.boq_subtotal);
  console.log('Discount Amount:', quote6.discount_amount);
  console.log('Taxable Amount:', quote6.taxable_amount);

  if (
    quote6.boq_subtotal === 250000 &&
    quote6.discount_amount === 12500 &&
    quote6.taxable_amount === 237500
  ) {
    console.log('CASE 6 RESULT: PASS (Verified discount reduced taxable amount deterministically)');
  } else {
    console.error('CASE 6 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 7: Unverified Discount Case
  console.log('\n--- CASE 7: Unverified Discount Case ---');
  const unverifiedDiscountConfig: CommercialConfigInput = {
    tax_percent: 18,
    discount_percent: 5,
    source_provenance: 'UNVERIFIED_VERBAL_DISCOUNT',
    verification_status: 'NEEDS_REVIEW',
  };

  const quote7 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, unverifiedDiscountConfig);
  console.log('Discount Status:', quote7.resolution_report?.discount_status);
  console.log('Pricing Verified:', quote7.pricing_verified);
  console.log('Grand Total Status:', quote7.grand_total_status);

  if (
    quote7.resolution_report?.discount_status === 'NEEDS_REVIEW' &&
    quote7.pricing_verified === false &&
    quote7.grand_total_status === 'NEEDS_REVIEW'
  ) {
    console.log('CASE 7 RESULT: PASS (Unverified discount rejected and flagged pricing_verified: false)');
  } else {
    console.error('CASE 7 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 8: Missing Commercial Inputs Case (No Freight or Installation)
  console.log('\n--- CASE 8: Missing Commercial Inputs Case ---');
  const missingFreightConfig: CommercialConfigInput = {
    tax_percent: 18,
    source_provenance: 'TENDER_STANDARD_TAX',
    verification_status: 'VERIFIED',
  };

  const quote8 = CommercialQuotationEngine.calculateQuote(mockProject, pricedBOQ, missingFreightConfig);
  console.log('Freight Amount:', quote8.freight_amount);
  console.log('Freight Status:', quote8.resolution_report?.freight_status);
  console.log('Installation Amount:', quote8.installation_amount);
  console.log('Installation Status:', quote8.resolution_report?.installation_status);

  if (
    quote8.freight_amount === null &&
    quote8.resolution_report?.freight_status === 'NOT_PROVIDED' &&
    quote8.installation_amount === null &&
    quote8.resolution_report?.installation_status === 'NOT_PROVIDED'
  ) {
    console.log('CASE 8 RESULT: PASS (Missing freight/installation preserved as null/NOT_PROVIDED without fabricating values)');
  } else {
    console.error('CASE 8 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 11 TEST SUMMARY: ALL 8 COMMERCIAL QUOTATION ENGINE CASES PASSED!');
  console.log('======================================================');
}

runPhase11Tests();
