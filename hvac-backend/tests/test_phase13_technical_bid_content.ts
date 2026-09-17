import { UnifiedProjectModel, EquipmentItem, BOQItem, ConflictRecord } from '../src/domain/models';
import { TechnicalBidContentEngine } from '../src/bid/technical_content';
import { TenderComplianceStage } from '../src/pipeline/100_tender_compliance';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';
import { SpecificationAuditor } from '../src/audit/auditor';

console.log('=== PHASE 13 TECHNICAL BID CONTENT ENGINE TESTS ===\n');

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

// -----------------------------------------------------------------------------
// Test Case 1: Complete Evidence Case
// -----------------------------------------------------------------------------
console.log('Test Case 1: Complete evidence case (All technical sections verified with provenance)');
{
  const project: UnifiedProjectModel = {
    project_id: 'PRJ-P13-001',
    user_id: 'user-p13-01',
    mode: 'DOCUMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Chennai',
    building_type: 'Office Park',
    spaces: [
      { name: 'Server Room', area_sqft: 1000, volume_cuft: 9000, occupants: 5 }
    ],
    total_spaces: 1,
    total_area_sqft: 1000,
    total_volume_cuft: 9000,
    total_occupants: 5,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    conflicts: [],
    documents_meta: [
      { document_id: 'DOC-01', file_name: 'Tender_Specs.pdf', document_type: 'pdf', revision_number: 1, is_superseded: false, status: 'VALIDATION_COMPLETED' }
    ],
    fact_provenance: [
      { fact_id: 'F-01', project_id: 'PRJ-P13-001', document_id: 'DOC-01', file_name: 'Tender_Specs.pdf', document_type: 'pdf', field_name: 'building_type', value: 'Office Park', source: 'EXTRACTOR', status: 'SOURCE_FACT' }
    ],
    raw_input: 'Requirements for VRF System and TAB Scope.'
  };

  // Provide explicitly configured engineering cooling load basis (125 sqft/TR)
  const sizing = DeterministicCalculators.calculateSizing(
    project.total_area_sqft,
    project.total_volume_cuft,
    project.total_occupants,
    { sqft_per_tr: 125 }
  );

  const verifiedEquipment: EquipmentItem[] = [
    {
      id: 'EQ-01',
      type: 'VRF Outdoor Unit',
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
      datasheet_url: 'https://daikin.example.com/datasheets/d-vrf-10hp.pdf',
    }
  ];

  const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, verifiedEquipment);
  // Mark MAF and Past Experience compliant for testing complete evidence case
  complianceMatrix.push({
    item_id: 'COMP-MAF',
    category: 'MAF_REQUIREMENT',
    source_document: 'Tender_Specs.pdf',
    page_number: 18,
    section: 'Commercial Requirements',
    requirement_type: 'MANDATORY',
    tender_requirement: 'Manufacturer Authorization Form (MAF) required from OEM',
    our_response: 'MAF letter provided by Daikin Industries India.',
    status: 'COMPLIANT',
    evidence_text: 'MAF Letter #DK-2026-88',
    evidence_provenance: 'Daikin_MAF_Letter.pdf'
  });
  complianceMatrix.push({
    item_id: 'COMP-EXP',
    category: 'PAST_EXPERIENCE',
    source_document: 'Tender_Specs.pdf',
    page_number: 20,
    section: 'Qualification Criteria',
    requirement_type: 'MANDATORY',
    tender_requirement: 'Completion certificate for similar HVAC installation',
    our_response: 'Completion certificate #CC-901 attached.',
    status: 'COMPLIANT',
    evidence_text: 'Completion Certificate #CC-901',
    evidence_provenance: 'Past_Performance_Cert.pdf'
  });

  const audit = SpecificationAuditor.audit(project, sizing);
  const boq: BOQItem[] = [];

  const envelope = TechnicalBidContentEngine.assemble(
    project,
    sizing,
    audit,
    verifiedEquipment,
    boq,
    complianceMatrix
  );

  assert(envelope.project_id === 'PRJ-P13-001', 'Envelope retains correct project_id');
  assert(envelope.technical_envelope_status === 'VERIFIED', 'Envelope status is VERIFIED for complete evidence');

  const eqSec = envelope.equipment_schedule;
  assert(eqSec.status === 'VERIFIED', 'Equipment schedule section status is VERIFIED');
  assert(eqSec.data.equipment_items.length === 1, 'Equipment schedule contains verified items');

  const dsSec = envelope.datasheet_references;
  assert(dsSec.status === 'VERIFIED', 'Datasheet section status is VERIFIED');
  assert(dsSec.data.datasheet_urls.includes('https://daikin.example.com/datasheets/d-vrf-10hp.pdf'), 'Datasheet URL is retained');

  const ventSec = envelope.ventilation_basis;
  assert(ventSec.status === 'DETERMINISTIC_CALCULATION', 'Ventilation basis status is valid');
  assert(ventSec.data.fresh_air_cfm === sizing.fresh_air_cfm, 'Ventilation basis contains fresh air CFM');

  const tabSec = envelope.testing_commissioning_tab;
  assert(tabSec.status === 'SOURCE_FACT', 'TAB scope section status is SOURCE_FACT');
  assert(envelope.experience_and_certificates.status === 'VERIFIED', 'Experience & certificates section status is VERIFIED when evidence attached');
  assert(envelope.maf_requirements.status === 'VERIFIED', 'MAF section status is VERIFIED when evidence attached');
}

// -----------------------------------------------------------------------------
// Test Case 2: Missing Evidence Case
// -----------------------------------------------------------------------------
console.log('\nTest Case 2: Missing evidence case (Unresolved MAF, missing certificates remain NOT_PROVIDED)');
{
  const project: UnifiedProjectModel = {
    project_id: 'PRJ-P13-002',
    user_id: 'user-p13-02',
    mode: 'DOCUMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Bangalore',
    building_type: 'Commercial Office',
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
    raw_input: 'Tender RFP text.'
  };

  const sizing = DeterministicCalculators.calculateSizing(
    project.total_area_sqft,
    project.total_volume_cuft,
    project.total_occupants
  );
  const equipmentWithoutDatasheet: EquipmentItem[] = [
    {
      id: 'EQ-02',
      type: 'Air Cooled Chiller',
      capacity: '50 TR',
      airflow: '15000 CFM',
      quantity: 1,
      application: 'Comfort Cooling',
      status: 'NEEDS_REVIEW',
      manufacturer: 'Carrier',
      model: 'CH-50TR',
      voltage: '415V',
      efficiency: 'COP 3.2',
      unit_price: null,
      total_price: null,
      currency: 'INR',
      supplier: 'Carrier Dealer',
      verification_status: 'REQUIRES_VERIFIED_CATALOG_DATA',
      price_verification_status: 'PRICE_DATA_NOT_YET_VERIFIED'
    }
  ];

  const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, equipmentWithoutDatasheet);
  const audit = SpecificationAuditor.audit(project, sizing);
  const boq: BOQItem[] = [];

  const envelope = TechnicalBidContentEngine.assemble(
    project,
    sizing,
    audit,
    equipmentWithoutDatasheet,
    boq,
    complianceMatrix
  );

  assert(envelope.technical_envelope_status === 'NEEDS_REVIEW', 'Envelope status reflects incomplete technical evidence');

  const expSec = envelope.experience_and_certificates;
  assert(expSec.status === 'NOT_PROVIDED', 'Experience & certificates section is marked NOT_PROVIDED');
  assert(expSec.unresolved_reason !== null, 'Experience section has explicit unresolved_reason');

  const dsSec = envelope.datasheet_references;
  assert(dsSec.status === 'NOT_PROVIDED', 'Datasheet section is NOT_PROVIDED when no URLs exist');
  assert(dsSec.unresolved_reason !== null, 'Datasheet section has explicit unresolved_reason');

  const mafSec = envelope.maf_requirements;
  assert(mafSec.status === 'NOT_PROVIDED', 'MAF section is NOT_PROVIDED when MAF not attached');
  assert(mafSec.unresolved_reason !== null, 'MAF section has explicit unresolved_reason');
}

// -----------------------------------------------------------------------------
// Test Case 3: Conflicting Requirements Case
// -----------------------------------------------------------------------------
console.log('\nTest Case 3: Conflicting requirements case (Preserves conflicts in Section 12)');
{
  const conflictRecord: ConflictRecord = {
    conflict_id: 'CONF-01',
    project_id: 'PRJ-P13-003',
    document_a: 'Tender Drawing P.8',
    document_b: 'BOQ Specs P.12',
    field: 'fresh_air_cfm',
    value_a: '600 CFM',
    value_b: '800 CFM',
    severity: 'HIGH',
    resolution_status: 'UNRESOLVED',
    required_action: 'Clarification required with consultant'
  };

  const project: UnifiedProjectModel = {
    project_id: 'PRJ-P13-003',
    user_id: 'user-p13-03',
    mode: 'HYBRID',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Mumbai',
    building_type: 'Hospital',
    spaces: [
      { name: 'Operating Theater', area_sqft: 600, volume_cuft: 5400, occupants: 6 }
    ],
    total_spaces: 1,
    total_area_sqft: 600,
    total_volume_cuft: 5400,
    total_occupants: 6,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    conflicts: [conflictRecord],
    documents_meta: [
      { document_id: 'DOC-03', file_name: 'Spec_Sheet.pdf', document_type: 'pdf', revision_number: 1, is_superseded: false, status: 'VALIDATION_COMPLETED' }
    ],
    fact_provenance: [],
    raw_input: 'Hospital operating room specification.'
  };

  const sizing = DeterministicCalculators.calculateSizing(
    project.total_area_sqft,
    project.total_volume_cuft,
    project.total_occupants
  );
  const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, []);
  const audit = SpecificationAuditor.audit(project, sizing);
  const boq: BOQItem[] = [];

  const envelope = TechnicalBidContentEngine.assemble(
    project,
    sizing,
    audit,
    [],
    boq,
    complianceMatrix
  );

  assert(envelope.technical_envelope_status === 'CONFLICT', 'Envelope status is CONFLICT when project has conflicts');
  
  const devSec = envelope.deviations_and_conflicts;
  assert(devSec.status === 'CONFLICT', 'Deviations & conflicts section status is CONFLICT');
  assert(devSec.data.conflicts.length === 1, 'Deviations section contains the conflict record');
  assert(devSec.data.conflicts[0].field === 'fresh_air_cfm', 'Conflict field is preserved');
  assert(devSec.data.conflicts[0].value_a === '600 CFM', 'Document A value is preserved');
}

// -----------------------------------------------------------------------------
// Test Case 4: Requirement-Driven Project Without Tender Documents
// -----------------------------------------------------------------------------
console.log('\nTest Case 4: Requirement-driven project without tender documents');
{
  const project: UnifiedProjectModel = {
    project_id: 'PRJ-P13-004',
    user_id: 'user-p13-04',
    mode: 'REQUIREMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Hyderabad',
    building_type: 'Boutique Office',
    spaces: [
      { name: 'Main Hall', area_sqft: 1500, volume_cuft: 13500, occupants: 20 }
    ],
    total_spaces: 1,
    total_area_sqft: 1500,
    total_volume_cuft: 13500,
    total_occupants: 20,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    conflicts: [],
    documents_meta: [],
    fact_provenance: [],
    raw_input: 'User input parameters only.'
  };

  const sizing = DeterministicCalculators.calculateSizing(
    project.total_area_sqft,
    project.total_volume_cuft,
    project.total_occupants
  );
  const complianceMatrix = TenderComplianceStage.generateMatrix(project, sizing, []);
  const audit = SpecificationAuditor.audit(project, sizing);
  const boq: BOQItem[] = [];

  const envelope = TechnicalBidContentEngine.assemble(
    project,
    sizing,
    audit,
    [],
    boq,
    complianceMatrix
  );

  const dbSec = envelope.design_basis;
  assert(dbSec.source_provenance === 'USER_REQUIREMENT_INPUT', 'Design basis retains USER_REQUIREMENT_INPUT as source_provenance');
  assert(envelope.project_schedule.status === 'NOT_PROVIDED', 'Project schedule remains NOT_PROVIDED when missing');
}

console.log(`\n=== TEST SUMMARY ===`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
