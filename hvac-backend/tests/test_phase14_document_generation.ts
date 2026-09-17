import {
  UnifiedProjectModel,
  EquipmentItem,
  BOQItem,
  CommercialConfigInput,
  ConflictRecord,
} from '../src/domain/models';
import { BidDocumentGenerator } from '../src/document/bid_document_generator';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { SpecificationAuditor } from '../src/audit/auditor';
import { CommercialQuotationEngine } from '../src/commercial/quotation';
import { TenderComplianceStage } from '../src/pipeline/100_tender_compliance';

console.log('=== PHASE 14 BID DOCUMENT GENERATION ENGINE TESTS ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
  }
}

async function runPhase14Tests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: Fully Verified Complete Bid Package
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: Fully Verified Complete Bid Package Generation');
  {
    const project: UnifiedProjectModel = {
      project_id: 'PRJ-P14-001',
      user_id: 'user-p14-01',
      mode: 'DOCUMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      location: 'Chennai',
      building_type: 'Tech Park',
      spaces: [{ name: 'Main Hall', area_sqft: 1000, volume_cuft: 9000, occupants: 10 }],
      total_spaces: 1,
      total_area_sqft: 1000,
      total_volume_cuft: 9000,
      total_occupants: 10,
      cooling_required: true,
      ventilation_required: true,
      missing_information: [],
      conflicts: [],
      documents_meta: [
        { document_id: 'DOC-01', file_name: 'Tender_Specs.pdf', document_type: 'pdf', revision_number: 1, is_superseded: false, status: 'VALIDATION_COMPLETED' }
      ],
      fact_provenance: [],
      raw_input: 'Requirements for VRF System and TAB Scope.'
    };

    const sizing = DeterministicCalculators.calculateSizing(
      project.total_area_sqft,
      project.total_volume_cuft,
      project.total_occupants,
      { sqft_per_tr: 125 }
    );

    const verifiedEquipment: EquipmentItem[] = [
      {
        id: 'EQ-01',
        type: 'Commercial Inverter VRF Outdoor Unit',
        capacity: '8.0 TR',
        airflow: '3200 CFM',
        quantity: 1,
        application: 'Comfort Cooling',
        status: 'VERIFIED',
        manufacturer: 'Daikin Industries India',
        model: 'D-VRF-10HP',
        voltage: '415V / 3Ph / 50Hz',
        efficiency: 'ISEER 4.5',
        unit_price: 250000,
        total_price: 250000,
        currency: 'INR',
        supplier: 'Daikin Authorized Dealer',
        price_verification_status: 'VERIFIED',
        verification_status: 'VERIFIED',
        datasheet_url: 'https://daikin.example.com/datasheets/d-vrf-10hp.pdf'
      }
    ];

    const boq: BOQItem[] = [
      {
        item_code: 'BOQ-01',
        category: 'VRF_EQUIPMENT',
        description: 'Daikin VRF Outdoor Unit 8.0 TR',
        specification: 'Blue fin coating outdoor unit',
        quantity: 1,
        unit: 'Set',
        unit_rate: 250000,
        total_amount: 250000,
        currency: 'INR',
        catalog_id: 'EQ-01',
        supplier_id: 'SUP-01',
        price_id: 'PRC-01',
        verification_status: 'VERIFIED',
        provenance: 'VERIFIED'
      }
    ];

    const commercialConfig: CommercialConfigInput = {
      tax_percent: 18,
      tax_basis: 'TAX_EXCLUSIVE',
      freight_amount: 10000,
      installation_amount: 15000,
      payment_terms: '30% advance, 70% upon delivery',
      bid_validity_days: 60,
      emd_amount: 50000,
      inclusions: ['Equipment supply', 'Erection', 'Testing & Commissioning'],
      exclusions: ['Civil foundation', 'Main incoming cable'],
      source_provenance: 'TENDER_COMMERCIAL_SCHEDULE',
      verification_status: 'VERIFIED'
    };

    const commercial = CommercialQuotationEngine.calculateQuote(project, boq, commercialConfig);
    const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, verifiedEquipment, commercial);
    
    // Attach MAF & Past Experience evidence
    complianceMatrix.push({
      item_id: 'COMP-MAF',
      category: 'MAF_REQUIREMENT',
      source_document: 'Tender_Specs.pdf',
      page_number: 18,
      section: 'Commercial',
      requirement_type: 'MANDATORY',
      tender_requirement: 'OEM MAF Letter',
      our_response: 'MAF Attached',
      status: 'COMPLIANT',
      evidence_text: 'MAF Letter #DK-2026-88',
      evidence_provenance: 'Daikin_MAF.pdf'
    });
    complianceMatrix.push({
      item_id: 'COMP-EXP',
      category: 'PAST_EXPERIENCE',
      source_document: 'Tender_Specs.pdf',
      page_number: 20,
      section: 'Qualification',
      requirement_type: 'MANDATORY',
      tender_requirement: 'Completion Certificate',
      our_response: 'Certificate Attached',
      status: 'COMPLIANT',
      evidence_text: 'Certificate #CC-901',
      evidence_provenance: 'Past_Performance.pdf'
    });

    const audit = SpecificationAuditor.audit(project, sizing, boq);

    const result = await BidDocumentGenerator.generatePackage(
      project,
      sizing,
      audit,
      verifiedEquipment,
      boq,
      commercial,
      complianceMatrix
    );

    assert(result.bid_package.status === 'READY_FOR_REVIEW', 'Fully verified bid package status is READY_FOR_REVIEW');
    assert(result.bid_package.project_id === 'PRJ-P14-001', 'Package retains correct project_id');
    assert(result.pdf_base64 !== undefined && result.pdf_base64.length > 500, 'Generated PDF base64 string is populated');
    assert(result.output_documents.length === 1, 'Output document result populated');
    assert(result.document_html.includes('D-VRF-10HP'), 'HTML includes verified equipment model');
    const hasPricingInHtml =
      result.document_html.includes('250,000') ||
      result.document_html.includes('2,50,000') ||
      result.document_html.includes('250000');
    assert(hasPricingInHtml, 'HTML includes BOQ pricing');
    assert(result.document_html.includes('GRAND TOTAL'), 'HTML includes Grand Total section');
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: Incomplete Bid Package (Missing MAF & Unpriced BOQ)
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: Incomplete Bid Package (Missing MAF, unpriced BOQ)');
  {
    const project: UnifiedProjectModel = {
      project_id: 'PRJ-P14-002',
      user_id: 'user-p14-02',
      mode: 'DOCUMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      location: 'Bangalore',
      building_type: 'Office Building',
      spaces: [],
      total_spaces: 0,
      total_area_sqft: 0,
      total_volume_cuft: 0,
      total_occupants: 0,
      cooling_required: true,
      ventilation_required: true,
      missing_information: ['total_area_sqft'],
      conflicts: [],
      documents_meta: [
        { document_id: 'DOC-02', file_name: 'Tender_RFP.pdf', document_type: 'pdf', revision_number: 1, is_superseded: false, status: 'VALIDATION_COMPLETED' }
      ],
      fact_provenance: [],
      raw_input: 'Tender text.'
    };

    const sizing = DeterministicCalculators.calculateSizing(
      project.total_area_sqft,
      project.total_volume_cuft,
      project.total_occupants
    );

    const unpricedBoq: BOQItem[] = [
      {
        item_code: 'BOQ-02',
        category: 'CHILLER',
        description: 'Air Cooled Chiller 50 TR',
        specification: '50 TR Unit',
        quantity: 1,
        unit: 'Set',
        unit_rate: null,
        total_amount: null,
        currency: 'INR',
        verification_status: 'PRICE_DATA_NOT_YET_VERIFIED',
        provenance: 'UNVERIFIED_PRICING'
      }
    ];

    const commercialConfig: CommercialConfigInput = {
      tax_percent: null,
      verification_status: 'NOT_PROVIDED'
    };

    const commercial = CommercialQuotationEngine.calculateQuote(project, unpricedBoq, commercialConfig);
    const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, []);
    const audit = SpecificationAuditor.audit(project, sizing, unpricedBoq);

    const result = await BidDocumentGenerator.generatePackage(
      project,
      sizing,
      audit,
      [],
      unpricedBoq,
      commercial,
      complianceMatrix
    );

    assert(result.bid_package.status === 'INCOMPLETE', 'Incomplete package status is INCOMPLETE');
    assert(result.bid_package.review_items.length > 0, 'Review items list unresolved technical & commercial items');
    assert(result.document_html.includes('PRICE_DATA_NOT_YET_VERIFIED'), 'HTML renders unpriced BOQ status badge');
    assert(result.document_html.includes('NOT_AVAILABLE / NEEDS_REVIEW'), 'HTML renders unpriced grand total status');
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: Conflicting Specification Bid Package
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: Conflicting Specification Bid Package');
  {
    const conflictRecord: ConflictRecord = {
      conflict_id: 'CONF-14',
      project_id: 'PRJ-P14-003',
      document_a: 'Tender Drawing P.4',
      document_b: 'BOQ Spec P.10',
      field: 'voltage_supply',
      value_a: '415V / 3Ph / 50Hz',
      value_b: '230V / 1Ph / 50Hz',
      severity: 'HIGH',
      resolution_status: 'UNRESOLVED',
      required_action: 'Clarification required with electrical consultant'
    };

    const project: UnifiedProjectModel = {
      project_id: 'PRJ-P14-003',
      user_id: 'user-p14-03',
      mode: 'HYBRID',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      location: 'Mumbai',
      building_type: 'Hospital',
      spaces: [{ name: 'Lab', area_sqft: 500, volume_cuft: 4500, occupants: 4 }],
      total_spaces: 1,
      total_area_sqft: 500,
      total_volume_cuft: 4500,
      total_occupants: 4,
      cooling_required: true,
      ventilation_required: true,
      missing_information: [],
      conflicts: [conflictRecord],
      documents_meta: [
        { document_id: 'DOC-03', file_name: 'Spec.pdf', document_type: 'pdf', revision_number: 1, is_superseded: false, status: 'VALIDATION_COMPLETED' }
      ],
      fact_provenance: [],
      raw_input: 'Hospital lab spec.'
    };

    const sizing = DeterministicCalculators.calculateSizing(
      project.total_area_sqft,
      project.total_volume_cuft,
      project.total_occupants
    );
    const commercialConfig: CommercialConfigInput = { tax_percent: 18, tax_basis: 'TAX_EXCLUSIVE' };
    const commercial = CommercialQuotationEngine.calculateQuote(project, [], commercialConfig);
    const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, []);
    const audit = SpecificationAuditor.audit(project, sizing);

    const result = await BidDocumentGenerator.generatePackage(
      project,
      sizing,
      audit,
      [],
      [],
      commercial,
      complianceMatrix
    );

    assert(result.bid_package.status === 'NEEDS_REVISION', 'Conflicting project package status is NEEDS_REVISION');
    assert(result.technical_envelope?.technical_envelope_status === 'CONFLICT', 'Technical envelope status is CONFLICT');
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Requirement-Driven Project Without Tender Documents
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Requirement-Driven Project Without Tender Documents');
  {
    const project: UnifiedProjectModel = {
      project_id: 'PRJ-P14-004',
      user_id: 'user-p14-04',
      mode: 'REQUIREMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      location: 'Hyderabad',
      building_type: 'Showroom',
      spaces: [{ name: 'Showroom Floor', area_sqft: 1200, volume_cuft: 10800, occupants: 15 }],
      total_spaces: 1,
      total_area_sqft: 1200,
      total_volume_cuft: 10800,
      total_occupants: 15,
      cooling_required: true,
      ventilation_required: true,
      missing_information: [],
      conflicts: [],
      documents_meta: [],
      fact_provenance: [],
      raw_input: 'Showroom cooling parameters.'
    };

    const sizing = DeterministicCalculators.calculateSizing(
      project.total_area_sqft,
      project.total_volume_cuft,
      project.total_occupants,
      { sqft_per_tr: 150 }
    );
    const commercialConfig: CommercialConfigInput = { tax_percent: 18, tax_basis: 'TAX_EXCLUSIVE' };
    const commercial = CommercialQuotationEngine.calculateQuote(project, [], commercialConfig);
    const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, []);
    const audit = SpecificationAuditor.audit(project, sizing);

    const result = await BidDocumentGenerator.generatePackage(
      project,
      sizing,
      audit,
      [],
      [],
      commercial,
      complianceMatrix
    );

    assert(result.technical_envelope?.design_basis.source_provenance === 'USER_REQUIREMENT_INPUT', 'Requirement-driven project uses USER_REQUIREMENT_INPUT provenance');
    assert(result.document_html.includes('USER_REQUIREMENT_INPUT') || result.document_html.includes('Showroom'), 'HTML reflects requirement-driven inputs cleanly');
  }

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase14Tests().catch((err) => {
  console.error('Unhandled error in Phase 14 tests:', err);
  process.exit(1);
});
