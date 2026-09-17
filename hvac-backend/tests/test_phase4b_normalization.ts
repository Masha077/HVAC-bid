import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { DocumentIntakeStage } from '../src/pipeline/10_document_intake';
import { RequirementExtractorStage } from '../src/pipeline/20_requirement_extractor';
import { CrossDocumentReconciler } from '../src/pipeline/cross_document_reconciler';
import { SpecificationAuditor } from '../src/audit/auditor';
import { DeterministicCalculators } from '../src/pipeline/40_deterministic_calculators';

async function runPhase4BVerification() {
  console.log('======================================================');
  console.log('RUNNING PHASE 4B HVAC NORMALIZATION PIPELINE VERIFICATION');
  console.log('======================================================');

  const pdfPath = path.join(__dirname, 'HVAC-villivakkam-br-air-conditioning-tender.pdf');
  console.log(`Loading tender PDF from: ${pdfPath}`);
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Extract actual text using pdfParse
  const parsedPdf = await pdfParse(new Uint8Array(pdfBuffer) as unknown as Buffer);
  const actualTenderText = parsedPdf.text || '';
  console.log('\n--- ACTUAL EXTRACTED TENDER TEXT ---');
  console.log(actualTenderText.trim());

  // --- TEST A: DOCUMENT_DRIVEN ---
  console.log('\n======================================================');
  console.log('TEST A: DOCUMENT_DRIVEN');
  console.log('======================================================');

  const docInputA = {
    document_id: 'DOC-VILLI-001',
    file_name: 'HVAC-villivakkam-br-air-conditioning-tender.pdf',
    document_type: 'TENDER' as const,
    revision_number: 1,
    raw_text: actualTenderText,
    extracted_text: actualTenderText,
    page_count: parsedPdf.numpages,
    mime_type: 'application/pdf'
  };

  const requestA = {
    user_id: 'test-user-doc-001',
    project_id: 'DOC-PROJ-VILLIVAKKAM',
    mode: 'DOCUMENT_DRIVEN' as const,
    text: '',
    documents: [docInputA],
    requested_output_type: 'COMPLETE_BID_PACKAGE' as const
  };

  const outputA = await MasterWorkflowPipeline.execute(requestA);

  console.log('\n--- TEST A UNIFIED PROJECT MODEL OUTPUT ---');
  console.log(JSON.stringify({
    project_id: outputA.unified_project.project_id,
    user_id: outputA.unified_project.user_id,
    mode: outputA.unified_project.mode,
    location: outputA.unified_project.location,
    building_type: outputA.unified_project.building_type,
    spaces: outputA.unified_project.spaces,
    total_spaces: outputA.unified_project.total_spaces,
    total_area_sqft: outputA.unified_project.total_area_sqft,
    total_volume_cuft: outputA.unified_project.total_volume_cuft,
    total_occupants: outputA.unified_project.total_occupants,
    cooling_required: outputA.unified_project.cooling_required,
    ventilation_required: outputA.unified_project.ventilation_required,
    missing_information: outputA.unified_project.missing_information,
    documents_meta_count: outputA.unified_project.documents_meta.length,
    documents_meta: outputA.unified_project.documents_meta,
    fact_provenance_count: outputA.unified_project.fact_provenance.length,
    fact_provenance_sample: outputA.unified_project.fact_provenance.slice(0, 5),
    conflicts: outputA.unified_project.conflicts,
    audit_status: outputA.audit.audit_status,
    equipment_selection_allowed: outputA.audit.equipment_selection_allowed
  }, null, 2));

  // --- TEST B: HYBRID ---
  console.log('\n======================================================');
  console.log('TEST B: HYBRID');
  console.log('======================================================');

  const requestB = {
    user_id: 'test-user-hybrid-001',
    project_id: 'HYBRID-PROJ-VILLIVAKKAM',
    mode: 'HYBRID' as const,
    text: 'Prepare HVAC requirements from the provided tender document.',
    documents: [docInputA],
    requested_output_type: 'COMPLETE_BID_PACKAGE' as const
  };

  const outputB = await MasterWorkflowPipeline.execute(requestB);

  console.log('\n--- TEST B UNIFIED PROJECT MODEL OUTPUT ---');
  console.log(JSON.stringify({
    project_id: outputB.unified_project.project_id,
    user_id: outputB.unified_project.user_id,
    mode: outputB.unified_project.mode,
    location: outputB.unified_project.location,
    building_type: outputB.unified_project.building_type,
    spaces: outputB.unified_project.spaces,
    total_spaces: outputB.unified_project.total_spaces,
    total_area_sqft: outputB.unified_project.total_area_sqft,
    total_volume_cuft: outputB.unified_project.total_volume_cuft,
    total_occupants: outputB.unified_project.total_occupants,
    cooling_required: outputB.unified_project.cooling_required,
    ventilation_required: outputB.unified_project.ventilation_required,
    missing_information: outputB.unified_project.missing_information,
    documents_meta_count: outputB.unified_project.documents_meta.length,
    documents_meta: outputB.unified_project.documents_meta,
    fact_provenance_count: outputB.unified_project.fact_provenance.length,
    fact_provenance_sample: outputB.unified_project.fact_provenance.slice(0, 5),
    conflicts: outputB.unified_project.conflicts,
    audit_status: outputB.audit.audit_status,
    equipment_selection_allowed: outputB.audit.equipment_selection_allowed
  }, null, 2));

  console.log('\n======================================================');
  console.log('PHASE 4B VERIFICATION COMPLETE');
  console.log('======================================================');
}

runPhase4BVerification().catch(err => {
  console.error('Phase 4B verification error:', err);
  process.exit(1);
});
