import { TenderComplianceStage } from '../src/pipeline/100_tender_compliance';
import { UnifiedProjectModel, HVACSizingResult, EquipmentItem, CommercialQuote } from '../src/domain/models';

async function runPhase12Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 12 TENDER COMPLIANCE ENGINE TESTS');
  console.log('======================================================');

  const sizingValid: HVACSizingResult = {
    cooling_load_tr: 2.4,
    cooling_status: 'DETERMINISTIC_CALCULATION',
    airflow_cfm: 960,
    fresh_air_cfm: 261,
    fresh_air_basis: 'ASHRAE 62.1',
    fresh_air_status: 'DETERMINISTIC_CALCULATION',
    formula_basis: 'ASHRAE 62.1',
    provenance: 'DETERMINISTIC_CALCULATION',
    breakdown: {},
  };

  const verifiedEquipment: EquipmentItem[] = [
    {
      id: 'EQ-01',
      type: 'Commercial Inverter Ductable Split Unit',
      capacity: '2.4 TR (8.4 kW)',
      airflow: '960 CFM',
      quantity: 1,
      application: 'Comfort Cooling',
      status: 'VERIFIED',
      manufacturer: 'Daikin Industries India',
      model: 'FDBHQ36BAV16',
      voltage: '415V / 3Ph / 50Hz',
      efficiency: 'ISEER 4.2',
      unit_price: 125000,
      total_price: 125000,
      currency: 'INR',
      supplier: 'Chennai HVAC Distributors Pvt Ltd',
      price_verification_status: 'VERIFIED',
      verification_status: 'VERIFIED',
      datasheet_url: 'https://catalog.hvac-backend.internal/datasheets/FDBHQ36BAV16.pdf',
    },
  ];

  // TEST CASE 1: Extracted Requirements from Tender Input
  console.log('\n--- CASE 1: Extracted Requirements from Tender Text/Document ---');
  const tenderProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P12-01',
    user_id: 'test-user-001',
    mode: 'DOCUMENT_DRIVEN',
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
    raw_input: 'Tender for HVAC System. Requirement includes OEM Datasheets, MAF authorization letter, 24-hr nitrogen pressure testing, EMD deposit of 50000 INR, and past experience certificates.',
    documents_meta: [
      {
        document_id: 'DOC-TENDER-01',
        file_name: 'Tender_Specification_Villivakkam.pdf',
        document_type: 'TENDER',
        revision_number: 1,
        is_superseded: false,
        status: 'VALIDATION_COMPLETED',
        extracted_text: 'Tender for HVAC System. Requirement includes OEM Datasheets, MAF authorization letter, 24-hr nitrogen pressure testing, EMD deposit of 50000 INR, and past experience certificates.',
      },
    ],
    fact_provenance: [
      {
        fact_id: 'FACT-MAF-01',
        project_id: 'REQ-TEST-P12-01',
        document_id: 'DOC-TENDER-01',
        file_name: 'Tender_Specification_Villivakkam.pdf',
        document_type: 'TENDER',
        page_number: 2,
        section: 'Section 4: Eligibility Criteria',
        source: 'Tender_Specification_Villivakkam.pdf (Rev 1)',
        field_name: 'maf_clause',
        value: 'Bidder must attach Manufacturer Authorization Form (MAF) from OEM.',
        status: 'SOURCE_FACT',
      },
      {
        fact_id: 'FACT-EMD-01',
        project_id: 'REQ-TEST-P12-01',
        document_id: 'DOC-TENDER-01',
        file_name: 'Tender_Specification_Villivakkam.pdf',
        document_type: 'TENDER',
        page_number: 3,
        section: 'Section 2: Commercial Terms',
        source: 'Tender_Specification_Villivakkam.pdf (Rev 1)',
        field_name: 'emd_clause',
        value: 'EMD deposit of 50000 INR required as Bank Guarantee.',
        status: 'SOURCE_FACT',
      },
    ],
    conflicts: [],
  };

  const matrix1 = TenderComplianceStage.generateMatrix(tenderProject, sizingValid, verifiedEquipment);
  console.log('Compliance Items Extracted Count:', matrix1.length);
  matrix1.forEach((item) => {
    console.log(`- ${item.item_id} [${item.category}]: ${item.tender_requirement} -> Status: ${item.status}`);
  });

  const categories = matrix1.map((i) => i.category);
  if (
    matrix1.length >= 5 &&
    categories.includes('TECHNICAL_SPECIFICATION') &&
    categories.includes('EQUIPMENT_MAKE_MODEL') &&
    categories.includes('DATASHEET') &&
    categories.includes('MAF_REQUIREMENT') &&
    categories.includes('EMD_BID_BOND')
  ) {
    console.log('CASE 1 RESULT: PASS (Extracted explicit tender requirements across technical, documentation, and commercial categories)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Source-Page Provenance Check
  console.log('\n--- CASE 2: Source-Page Provenance Check ---');
  const mafItem = matrix1.find((i) => i.category === 'MAF_REQUIREMENT');
  const emdItem = matrix1.find((i) => i.category === 'EMD_BID_BOND');

  console.log('MAF Item Source Doc:', mafItem?.source_document, 'Page:', mafItem?.page_number, 'Section:', mafItem?.section);
  console.log('EMD Item Source Doc:', emdItem?.source_document, 'Page:', emdItem?.page_number, 'Section:', emdItem?.section);

  if (
    mafItem?.source_document === 'Tender_Specification_Villivakkam.pdf' &&
    mafItem?.page_number === 2 &&
    mafItem?.section === 'Section 4: Eligibility Criteria' &&
    emdItem?.page_number === 3
  ) {
    console.log('CASE 2 RESULT: PASS (Preserved exact document name, page number, and section provenance)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Satisfied Requirement Case
  console.log('\n--- CASE 3: Satisfied Requirement Case ---');
  const datasheetItem = matrix1.find((i) => i.category === 'DATASHEET');
  const testingItem = matrix1.find((i) => i.category === 'TESTING_COMMISSIONING');

  console.log('Datasheet Status:', datasheetItem?.status, 'Evidence:', datasheetItem?.evidence_text);
  console.log('Testing Status:', testingItem?.status, 'Evidence:', testingItem?.evidence_text);

  if (
    datasheetItem?.status === 'COMPLIANT' &&
    datasheetItem?.evidence_text === 'https://catalog.hvac-backend.internal/datasheets/FDBHQ36BAV16.pdf' &&
    testingItem?.status === 'COMPLIANT'
  ) {
    console.log('CASE 3 RESULT: PASS (Verified requirement satisfied with empirical evidence)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Missing Evidence Case (NOT_PROVIDED / NEEDS_REVIEW with Unresolved Reason)
  console.log('\n--- CASE 4: Missing Evidence Case ---');
  console.log('MAF Status:', mafItem?.status, 'Unresolved Reason:', mafItem?.unresolved_reason);
  console.log('EMD Status:', emdItem?.status, 'Unresolved Reason:', emdItem?.unresolved_reason);

  if (
    mafItem?.status === 'NOT_PROVIDED' &&
    mafItem?.unresolved_reason !== null &&
    emdItem?.status === 'NOT_PROVIDED' &&
    emdItem?.unresolved_reason !== null
  ) {
    console.log('CASE 4 RESULT: PASS (Missing evidence evaluated as NOT_PROVIDED with explicit unresolved_reason)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Conflicting Requirements Case (NON_COMPLIANT)
  console.log('\n--- CASE 5: Conflicting Requirements Case ---');
  const conflictProject: UnifiedProjectModel = {
    ...tenderProject,
    conflicts: [
      {
        conflict_id: 'CONF-01',
        project_id: 'REQ-TEST-P12-01',
        document_a: 'Tender_Specification_Villivakkam.pdf',
        document_b: 'Electrical_Single_Line_Diagram.pdf',
        page_a: 4,
        page_b: 1,
        field: 'voltage_supply',
        value_a: '415V / 3Phase / 50Hz',
        value_b: '230V / 1Phase / 50Hz',
        severity: 'HIGH',
        possible_interpretation: 'Voltage mismatch between tender specs and site electrical single line diagram',
        resolution_status: 'UNRESOLVED',
        required_action: 'Clarify available electrical supply with site engineer before equipment procurement.',
      },
    ],
  };

  const matrix5 = TenderComplianceStage.generateMatrix(conflictProject, sizingValid, verifiedEquipment);
  const conflictItem = matrix5.find((i) => i.status === 'NON_COMPLIANT');

  console.log('Conflict Item Status:', conflictItem?.status);
  console.log('Conflict Deviation:', conflictItem?.deviation);
  console.log('Conflict Unresolved Reason:', conflictItem?.unresolved_reason);

  if (
    conflictItem?.status === 'NON_COMPLIANT' &&
    conflictItem?.deviation?.includes('voltage_supply') &&
    conflictItem?.unresolved_reason !== null
  ) {
    console.log('CASE 5 RESULT: PASS (Cross-document conflict evaluated as NON_COMPLIANT with detailed deviation and unresolved reason)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 6: No-Tender-Input Case (Simple Requirement-Driven Project)
  console.log('\n--- CASE 6: No-Tender-Input Case ---');
  const noTenderProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P12-02',
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
    raw_input: '300 sqft office in Chennai for 15 occupants',
    documents_meta: [],
    fact_provenance: [],
    conflicts: [],
  };

  const matrix6 = TenderComplianceStage.generateMatrix(noTenderProject, sizingValid, verifiedEquipment);
  console.log('No-Tender Matrix Item Count:', matrix6.length);
  matrix6.forEach((item) => {
    console.log(`- ${item.item_id}: ${item.tender_requirement} -> Source: ${item.source_document}`);
  });

  if (
    matrix6.length === 3 &&
    matrix6[0].source_document === 'USER_REQUIREMENT_INPUT' &&
    matrix6[0].page_number === null
  ) {
    console.log('CASE 6 RESULT: PASS (Requirement-driven project generated clean base engineering compliance matrix without fabricating tender clauses)');
  } else {
    console.error('CASE 6 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 12 TEST SUMMARY: ALL 6 TENDER COMPLIANCE ENGINE CASES PASSED!');
  console.log('======================================================');
}

runPhase12Tests();
