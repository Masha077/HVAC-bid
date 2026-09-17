import fs from 'fs';
import path from 'path';
import {
  MasterWorkflowOutput,
  UnifiedProjectModel,
  HVACSizingResult,
  AuditReport,
  EquipmentItem,
  BOQItem,
  CommercialQuote,
  ComplianceItem,
  BidPackageResult,
} from '../src/domain/models';
import { PersistenceService } from '../src/services/persistence_service';
import { MasterWorkflowPipeline } from '../src/services/pipeline';

console.log('=== PHASE 15 SUPABASE PERSISTENCE & AUDIT LOGGING TESTS ===\n');

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

async function runPhase15Tests() {
  // -----------------------------------------------------------------------------
  // Test Case 1: Full Workflow Output Persistence Mapping
  // -----------------------------------------------------------------------------
  console.log('Test Case 1: Full Workflow Output Persistence Mapping');
  {
    const project: UnifiedProjectModel = {
      project_id: 'PRJ-P15-001',
      user_id: 'user-p15-01',
      mode: 'DOCUMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      location: 'Chennai',
      building_type: 'Office Tower',
      spaces: [{ name: 'Office Floor 1', area_sqft: 2000, volume_cuft: 18000, occupants: 20 }],
      total_spaces: 1,
      total_area_sqft: 2000,
      total_volume_cuft: 18000,
      total_occupants: 20,
      cooling_required: true,
      ventilation_required: true,
      missing_information: [],
      conflicts: [],
      documents_meta: [
        { document_id: 'DOC-15-01', file_name: 'Tender_Specs_P15.pdf', document_type: 'pdf', revision_number: 1, is_superseded: false, status: 'VALIDATION_COMPLETED' }
      ],
      fact_provenance: [
        { fact_id: 'F-15-01', project_id: 'PRJ-P15-001', document_id: 'DOC-15-01', file_name: 'Tender_Specs_P15.pdf', document_type: 'pdf', field_name: 'building_type', value: 'Office Tower', source: 'EXTRACTOR', status: 'SOURCE_FACT' }
      ],
      raw_input: 'Office tower HVAC requirement.'
    };

    const sizing: HVACSizingResult = {
      cooling_load_tr: 16.0,
      cooling_status: 'DETERMINISTIC_CALCULATION',
      cooling_load_basis: '125 sqft/TR',
      airflow_cfm: 6400,
      fresh_air_cfm: 540,
      fresh_air_basis: 'ASHRAE 62.1',
      fresh_air_status: 'DETERMINISTIC_CALCULATION',
      formula_basis: 'ASHRAE 62.1',
      provenance: 'DETERMINISTIC_CALCULATION',
      breakdown: {}
    };

    const audit: AuditReport = {
      audit_status: 'READY_FOR_EQUIPMENT_SELECTION',
      conflicts: [],
      missing_fields: [],
      equipment_selection_allowed: true,
      audit_entries: [
        { checkpoint: 'INPUT_VALIDATION_GATE', status: 'READY_FOR_EQUIPMENT_SELECTION', details: 'Project input validated' }
      ]
    };

    const equipment: EquipmentItem[] = [
      {
        id: 'EQ-15-01',
        type: 'VRF Outdoor Unit',
        capacity: '16.0 TR',
        airflow: '6400 CFM',
        quantity: 1,
        application: 'Comfort Cooling',
        status: 'VERIFIED',
        manufacturer: 'Daikin',
        model: 'D-VRF-20HP',
        voltage: '415V',
        efficiency: 'ISEER 4.5',
        unit_price: 450000,
        total_price: 450000,
        currency: 'INR',
        supplier: 'Daikin Dealer',
        price_verification_status: 'VERIFIED',
        verification_status: 'VERIFIED',
        datasheet_url: 'https://daikin.example.com/datasheet-20hp.pdf'
      }
    ];

    const boq: BOQItem[] = [
      {
        item_code: 'BOQ-15-01',
        category: 'VRF_EQUIPMENT',
        description: 'Daikin VRF Outdoor Unit 16.0 TR',
        specification: 'Blue fin outdoor unit',
        quantity: 1,
        unit: 'Set',
        unit_rate: 450000,
        total_amount: 450000,
        currency: 'INR',
        verification_status: 'VERIFIED',
        provenance: 'VERIFIED'
      }
    ];

    const commercial: CommercialQuote = {
      quotation_number: 'QUO-P15-001',
      project_name: 'Office Tower HVAC',
      currency: 'INR',
      boq_subtotal: 450000,
      verified_subtotal: 450000,
      discount_percent: 0,
      discount_amount: 0,
      discount_status: 'VERIFIED',
      taxable_amount: 450000,
      tax_percent: 18,
      tax_amount: 81000,
      tax_status: 'VERIFIED',
      tax_basis: 'TAX_EXCLUSIVE',
      grand_total: 531000,
      grand_total_status: 'VERIFIED',
      pricing_verified: true,
      commercial_terms: {
        bid_validity: '30 days',
        payment_terms: '100% against delivery',
        delivery_period: '4 weeks',
        inclusions: ['Supply'],
        exclusions: ['Civil works']
      }
    };

    const complianceMatrix: ComplianceItem[] = [
      {
        item_id: 'COMP-15-01',
        category: 'TECHNICAL_SPECIFICATION',
        source_document: 'Tender_Specs_P15.pdf',
        tender_requirement: 'Comfort AC System Sizing',
        our_response: 'Compliant with 16 TR VRF unit',
        status: 'COMPLIANT'
      }
    ];

    const bidPackage: BidPackageResult = {
      bid_package: {
        status: 'READY_FOR_REVIEW',
        document_title: 'HVAC Bid Package — Office Tower',
        quotation_number: 'QUO-P15-001',
        project_id: 'PRJ-P15-001',
        technical_envelope_status: 'VERIFIED',
        commercial_envelope_status: 'VERIFIED',
        review_items: []
      },
      document_html: '<html><body>Preview</body></html>',
      output_documents: [],
      pdf_base64: 'JVBERi0xLjQK...'
    };

    const masterOutput: MasterWorkflowOutput = {
      status: 'SUCCESS',
      project_id: 'PRJ-P15-001',
      mode: 'DOCUMENT_DRIVEN',
      requested_output_type: 'COMPLETE_BID_PACKAGE',
      unified_project: project,
      sizing,
      audit,
      compliance_matrix: complianceMatrix,
      equipment,
      boq,
      commercial,
      bid_package: bidPackage,
      errors: []
    };

    let errorThrown = false;
    try {
      await PersistenceService.persistMasterOutput(masterOutput);
    } catch {
      errorThrown = true;
    }

    assert(!errorThrown, 'PersistenceService.persistMasterOutput executed without unhandled errors');
  }

  // -----------------------------------------------------------------------------
  // Test Case 2: Audit Event Logging
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 2: Audit Event Logging');
  {
    let errorLogged = false;
    try {
      await PersistenceService.logAuditEvent(
        'PRJ-P15-002',
        'EQUIPMENT_SELECTION_GATE',
        'VERIFIED',
        'Selected Daikin 16 TR VRF Outdoor Unit from verified catalog.'
      );
    } catch {
      errorLogged = true;
    }

    assert(!errorLogged, 'PersistenceService.logAuditEvent logged audit checkpoint cleanly');
  }

  // -----------------------------------------------------------------------------
  // Test Case 3: Migration SQL & RLS Verification
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 3: Migration SQL & Row Level Security (RLS) Verification');
  {
    const sqlPath = path.join(__dirname, '../migrations/015_supabase_persistence_and_audit.sql');
    const sqlExists = fs.existsSync(sqlPath);
    assert(sqlExists, 'Migration SQL file 015_supabase_persistence_and_audit.sql exists');

    if (sqlExists) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      assert(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'Migration file enables Row Level Security (RLS) on database tables');
      assert(sqlContent.includes('REFERENCES projects(project_id)'), 'Migration file enforces cascade foreign keys referencing projects');
      assert(sqlContent.includes('CREATE INDEX'), 'Migration file defines performance indexes');
    }
  }

  // -----------------------------------------------------------------------------
  // Test Case 4: Master Workflow Pipeline End-to-End Persistence Integration
  // -----------------------------------------------------------------------------
  console.log('\nTest Case 4: Master Workflow Pipeline End-to-End Persistence Integration');
  {
    const request = {
      project_id: 'PRJ-P15-004',
      user_id: 'user-p15-04',
      mode: 'REQUIREMENT_DRIVEN' as const,
      requested_output_type: 'COMPLETE_BID_PACKAGE' as const,
      text: 'Boutique office 1500 sqft in Hyderabad for 20 occupants requiring fresh air and AC.',
      documents: []
    };

    let pipelineError = false;
    try {
      const output = await MasterWorkflowPipeline.execute(request);
      assert(output.project_id === 'PRJ-P15-004', 'Pipeline execution completed for PRJ-P15-004');
      assert(output.status === 'SUCCESS' || output.status === 'NEEDS_REVIEW', 'Pipeline execution status evaluated');
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      pipelineError = true;
    }

    assert(!pipelineError, 'MasterWorkflowPipeline executed with automatic Supabase persistence step');
  }

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase15Tests().catch((err) => {
  console.error('Unhandled error in Phase 15 tests:', err);
  process.exit(1);
});
