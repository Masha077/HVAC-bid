import {
  UnifiedProjectModel,
  BOQItem,
  CommercialQuote,
  CommercialConfigInput,
  CommercialResolutionReport,
  TaxBasisType,
} from '../domain/models';
import { BOQValidator } from '../boq/validator';

export class CommercialQuotationEngine {
  public static resolveCommercialConfig(
    project: UnifiedProjectModel,
    customConfig?: CommercialConfigInput
  ): CommercialResolutionReport {
    const config = customConfig || project.commercial_config;
    const allowTaxExclusiveBid = config?.allow_tax_exclusive_bid ?? false;

    // 1. TAX RESOLUTION: Never hardcode 18%. Must come from explicit tender/project/user input with provenance.
    let taxPercent: number | null = null;
    let taxBasis: TaxBasisType = 'TAX_EXCLUSIVE';
    let taxStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = 'NOT_PROVIDED';
    let taxProvenance = 'NOT_PROVIDED';

    if (config?.tax_percent !== undefined && config.tax_percent !== null) {
      taxPercent = config.tax_percent;
      taxBasis = config.tax_basis || 'TAX_EXCLUSIVE';
      taxStatus = config.verification_status || 'VERIFIED';
      taxProvenance = config.source_provenance || 'CONFIGURED_COMMERCIAL_INPUT';
    } else if (project.tax_percent !== undefined && project.tax_percent !== null) {
      taxPercent = project.tax_percent;
      taxStatus = 'VERIFIED';
      taxProvenance = 'PROJECT_SPECIFIED_TAX';
    }

    // 2. FREIGHT RESOLUTION
    let freightAmount: number | null = null;
    let freightStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = 'NOT_PROVIDED';
    if (config?.freight_amount !== undefined && config.freight_amount !== null) {
      freightAmount = config.freight_amount;
      freightStatus = config.verification_status || 'VERIFIED';
    }

    // 3. INSTALLATION RESOLUTION
    let installationAmount: number | null = null;
    let installationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = 'NOT_PROVIDED';
    if (config?.installation_amount !== undefined && config.installation_amount !== null) {
      installationAmount = config.installation_amount;
      installationStatus = config.verification_status || 'VERIFIED';
    }

    // 4. DISCOUNT RESOLUTION
    let discountPercent: number | null = null;
    let discountAmount: number | null = null;
    let discountStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = 'NOT_PROVIDED';
    if (config?.discount_amount !== undefined && config.discount_amount !== null) {
      discountAmount = config.discount_amount;
      discountStatus = config.verification_status || 'VERIFIED';
    } else if (config?.discount_percent !== undefined && config.discount_percent !== null) {
      discountPercent = config.discount_percent;
      discountStatus = config.verification_status || 'VERIFIED';
    }

    // 5. PAYMENT TERMS & VALIDITY & EMD
    let paymentTerms: string | null = config?.payment_terms || null;
    let paymentTermsStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = paymentTerms ? (config?.verification_status || 'VERIFIED') : 'NOT_PROVIDED';

    let bidValidityDays: number | null = config?.bid_validity_days || null;
    let bidValidityStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = bidValidityDays ? (config?.verification_status || 'VERIFIED') : 'NOT_PROVIDED';

    let emdAmount: number | null = config?.emd_amount !== undefined ? config.emd_amount : null;
    let emdStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = emdAmount !== null ? (config?.verification_status || 'VERIFIED') : 'NOT_PROVIDED';

    let inclusions = config?.inclusions || [
      'Supply and installation of primary HVAC equipment',
      'Ducting, thermal insulation, and air terminals as per BOQ',
    ];
    let exclusions = config?.exclusions || [
      'Main electrical supply breaker / DB in plant room',
      'Civil builder work, core cutting, structural steel gantries, and painting',
    ];
    let termsStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED' = config?.verification_status || 'VERIFIED';

    const commercialReady =
      taxStatus === 'VERIFIED' &&
      discountStatus !== 'NEEDS_REVIEW' &&
      freightStatus !== 'NEEDS_REVIEW' &&
      installationStatus !== 'NEEDS_REVIEW' &&
      config?.verification_status !== 'NEEDS_REVIEW';

    return {
      tax_percent: taxPercent,
      tax_basis: taxBasis,
      allow_tax_exclusive_bid: allowTaxExclusiveBid,
      tax_status: taxStatus,
      tax_provenance: taxProvenance,
      freight_amount: freightAmount,
      freight_status: freightStatus,
      installation_amount: installationAmount,
      installation_status: installationStatus,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      discount_status: discountStatus,
      payment_terms: paymentTerms,
      payment_terms_status: paymentTermsStatus,
      bid_validity_days: bidValidityDays,
      bid_validity_status: bidValidityStatus,
      emd_amount: emdAmount,
      emd_status: emdStatus,
      inclusions,
      exclusions,
      terms_status: termsStatus,
      verified_subtotal: null,
      tax_inclusive_gross_amount: null,
      tax_exclusive_taxable_amount: null,
      grand_total_status: 'NOT_AVAILABLE',
      commercial_ready: commercialReady,
    };
  }

  public static calculateQuote(
    project: UnifiedProjectModel,
    boq: BOQItem[],
    customConfig?: CommercialConfigInput
  ): CommercialQuote {
    const validation = BOQValidator.validateBOQ(boq);
    const commercialResolution = this.resolveCommercialConfig(project, customConfig);

    const quotationNumber = `QUO-HVAC-${Date.now().toString().slice(-6)}`;
    const currency = validation.currency || 'INR';

    const defaultInclusions = [
      'Supply and installation of primary HVAC equipment',
      'Ducting, thermal insulation, and air terminals as per BOQ',
      'Nitrogen pressure testing, evacuation, and refrigerant charging',
      'Testing, Adjusting, and Air Balancing (TAB)',
    ];

    const defaultExclusions = [
      'Main electrical supply breaker / DB in plant room',
      'Civil builder work, core cutting, structural steel gantries, and painting',
      'Water supply piping for drainage beyond 5 meters from unit',
      'Statutory municipal approvals or local body licensing fees',
    ];

    const termsInclusions = commercialResolution.inclusions.length > 0 ? commercialResolution.inclusions : defaultInclusions;
    const termsExclusions = commercialResolution.exclusions.length > 0 ? commercialResolution.exclusions : defaultExclusions;
    const paymentTerms = commercialResolution.payment_terms || '10% Advance against Order, 70% against Supply of Materials, 20% post Testing & Commissioning';
    const bidValidity = commercialResolution.bid_validity_days ? `${commercialResolution.bid_validity_days} Days from date of tender submission` : '30 Days from date of tender submission';

    // UNPRICED BOQ OR INVALID BOQ CASE: Keep subtotal, taxable, tax, and grand total null
    if (!validation.is_valid || validation.has_unpriced_items || validation.verified_subtotal === null) {
      commercialResolution.verified_subtotal = validation.verified_subtotal;
      commercialResolution.tax_exclusive_taxable_amount = null;
      commercialResolution.tax_inclusive_gross_amount = null;
      commercialResolution.grand_total_status = 'NOT_AVAILABLE';

      return {
        quotation_number: quotationNumber,
        project_name: `${project.building_type || 'HVAC'} Project (${project.location || 'Site'})`,
        currency,
        boq_subtotal: null,
        verified_subtotal: validation.verified_subtotal,
        discount_percent: commercialResolution.discount_percent || 0,
        discount_amount: commercialResolution.discount_amount || 0,
        discount_status: commercialResolution.discount_status,
        freight_amount: commercialResolution.freight_amount,
        freight_status: commercialResolution.freight_status,
        installation_amount: commercialResolution.installation_amount,
        installation_status: commercialResolution.installation_status,
        taxable_amount: null,
        tax_exclusive_taxable_amount: null,
        tax_inclusive_gross_amount: null,
        tax_percent: commercialResolution.tax_percent,
        tax_amount: null,
        tax_status: commercialResolution.tax_status,
        tax_basis: commercialResolution.tax_basis,
        resolution_report: commercialResolution,
        grand_total: null,
        grand_total_status: 'NOT_AVAILABLE',
        pricing_verified: false,
        commercial_terms: {
          bid_validity: bidValidity,
          payment_terms: paymentTerms,
          delivery_period: '4 to 6 Weeks from Mobilization Advance receipt',
          inclusions: termsInclusions,
          exclusions: termsExclusions,
        },
      };
    }

    // PRICED BOQ CASE
    const subtotal = validation.verified_subtotal;
    commercialResolution.verified_subtotal = subtotal;

    // 1. DISCOUNT EVALUATION: Apply ONLY if discount_status is VERIFIED
    let discountAmount = 0;
    let discountPercent = 0;
    let isDiscountValid = true;

    if (commercialResolution.discount_status === 'VERIFIED') {
      if (commercialResolution.discount_amount !== null && commercialResolution.discount_amount > 0) {
        discountAmount = commercialResolution.discount_amount;
      } else if (commercialResolution.discount_percent !== null && commercialResolution.discount_percent > 0) {
        discountPercent = commercialResolution.discount_percent;
        discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
      }
    } else if (commercialResolution.discount_status === 'NEEDS_REVIEW') {
      isDiscountValid = false;
    }

    // 2. FREIGHT & INSTALLATION EVALUATION: Include ONLY when VERIFIED
    let freightAmount: number | null = null;
    if (commercialResolution.freight_status === 'VERIFIED' && commercialResolution.freight_amount !== null) {
      freightAmount = commercialResolution.freight_amount;
    }

    let installationAmount: number | null = null;
    if (commercialResolution.installation_status === 'VERIFIED' && commercialResolution.installation_amount !== null) {
      installationAmount = commercialResolution.installation_amount;
    }

    // 3. TAXABLE SUBTOTAL COMPUTATION
    let taxableAmount = subtotal - discountAmount + (freightAmount || 0) + (installationAmount || 0);
    let taxAmount: number | null = null;
    let grandTotal: number | null = null;
    let taxInclusiveGross: number | null = null;
    let taxExclusiveTaxable: number | null = null;
    let grandTotalStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'TAX_EXCLUSIVE_BID' | 'NOT_AVAILABLE' = 'NEEDS_REVIEW';

    // 4. TAX COMPUTATION & GRAND TOTAL EVALUATION
    if (!isDiscountValid) {
      taxExclusiveTaxable = taxableAmount;
      taxInclusiveGross = null;
      taxAmount = null;
      grandTotal = null;
      grandTotalStatus = 'NEEDS_REVIEW';
    } else if (commercialResolution.tax_status === 'VERIFIED' && commercialResolution.tax_percent !== null) {
      const taxRate = commercialResolution.tax_percent;
      if (commercialResolution.tax_basis === 'TAX_INCLUSIVE') {
        taxInclusiveGross = taxableAmount;
        taxExclusiveTaxable = Math.round((taxInclusiveGross / (1 + taxRate / 100)) * 100) / 100;
        taxAmount = Math.round((taxInclusiveGross - taxExclusiveTaxable) * 100) / 100;
        grandTotal = taxInclusiveGross;
      } else {
        taxExclusiveTaxable = taxableAmount;
        taxAmount = Math.round((taxExclusiveTaxable * taxRate / 100) * 100) / 100;
        taxInclusiveGross = Math.round((taxExclusiveTaxable + taxAmount) * 100) / 100;
        grandTotal = taxInclusiveGross;
      }
      grandTotalStatus = 'VERIFIED';
    } else if (commercialResolution.allow_tax_exclusive_bid === true) {
      taxExclusiveTaxable = taxableAmount;
      taxInclusiveGross = null;
      taxAmount = null;
      grandTotal = taxExclusiveTaxable;
      grandTotalStatus = 'TAX_EXCLUSIVE_BID';
    } else {
      taxExclusiveTaxable = taxableAmount;
      taxInclusiveGross = null;
      taxAmount = null;
      grandTotal = null;
      grandTotalStatus = 'NEEDS_REVIEW';
    }

    commercialResolution.tax_exclusive_taxable_amount = taxExclusiveTaxable;
    commercialResolution.tax_inclusive_gross_amount = taxInclusiveGross;
    commercialResolution.grand_total_status = grandTotalStatus;

    const isPricingVerified =
      grandTotalStatus === 'VERIFIED' &&
      isDiscountValid &&
      commercialResolution.commercial_ready &&
      validation.is_valid &&
      !validation.has_unpriced_items;

    return {
      quotation_number: quotationNumber,
      project_name: `${project.building_type || 'HVAC'} Project (${project.location || 'Site'})`,
      currency,
      boq_subtotal: subtotal,
      verified_subtotal: subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      discount_status: commercialResolution.discount_status,
      freight_amount: freightAmount,
      freight_status: commercialResolution.freight_status,
      installation_amount: installationAmount,
      installation_status: commercialResolution.installation_status,
      taxable_amount: taxableAmount,
      tax_exclusive_taxable_amount: taxExclusiveTaxable,
      tax_inclusive_gross_amount: taxInclusiveGross,
      tax_percent: commercialResolution.tax_percent,
      tax_amount: taxAmount,
      tax_status: commercialResolution.tax_status,
      tax_basis: commercialResolution.tax_basis,
      resolution_report: commercialResolution,
      grand_total: grandTotal,
      grand_total_status: grandTotalStatus,
      pricing_verified: isPricingVerified,
      commercial_terms: {
        bid_validity: bidValidity,
        payment_terms: paymentTerms,
        delivery_period: '4 to 6 Weeks from Mobilization Advance receipt',
        inclusions: termsInclusions,
        exclusions: termsExclusions,
      },
    };
  }
}
