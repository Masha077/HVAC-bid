import { MasterWorkflowPipeline } from '../src/services/pipeline';
import { RequirementExtractorStage } from '../src/pipeline/20_requirement_extractor';
import { SpecificationAuditor } from '../src/audit/auditor';

async function runPhase4CVerification() {
  console.log('======================================================');
  console.log('RUNNING PHASE 4C REQUIREMENT-DRIVEN NORMALIZATION VERIFICATION');
  console.log('======================================================');

  const requirementText = "I need HVAC for an office building in Chennai. There are 3 rooms. Each room is 10 ft long, 10 ft wide and has a 9 ft ceiling. Each room has 5 people. Air conditioning and ventilation are required. Prepare a complete HVAC contractor bid package.";

  console.log('--- INPUT REQUIREMENT TEXT ---');
  console.log(requirementText);

  // 1. RequirementExtractorStage raw output
  const extracted = RequirementExtractorStage.extract(requirementText);
  console.log('\n--- 1. REQUIREMENT EXTRACTOR STAGE OUTPUT ---');
  console.log(JSON.stringify(extracted, null, 2));

  // 2. Full MasterWorkflowPipeline execution
  const payload = {
    user_id: 'test-user-001',
    project_id: 'REQ-TEST-001',
    mode: 'REQUIREMENT_DRIVEN' as const,
    text: requirementText,
    documents: [],
    requested_output_type: 'COMPLETE_BID_PACKAGE' as const
  };

  const result = await MasterWorkflowPipeline.execute(payload);

  console.log('\n--- 2. UNIFIED PROJECT MODEL OUTPUT ---');
  console.log(JSON.stringify({
    project_id: result.unified_project.project_id,
    user_id: result.unified_project.user_id,
    mode: result.unified_project.mode,
    requested_output_type: result.unified_project.requested_output_type,
    location: result.unified_project.location,
    building_type: result.unified_project.building_type,
    spaces: result.unified_project.spaces,
    total_spaces: result.unified_project.total_spaces,
    total_area_sqft: result.unified_project.total_area_sqft,
    total_volume_cuft: result.unified_project.total_volume_cuft,
    total_occupants: result.unified_project.total_occupants,
    cooling_required: result.unified_project.cooling_required,
    ventilation_required: result.unified_project.ventilation_required,
    missing_information: result.unified_project.missing_information,
    conflicts: result.unified_project.conflicts,
    documents_meta: result.unified_project.documents_meta,
    fact_provenance: result.unified_project.fact_provenance
  }, null, 2));

  console.log('\n--- 3. DETERMINISTIC SIZING RESULT ---');
  console.log(JSON.stringify(result.sizing, null, 2));

  console.log('\n--- 4. AUDIT REPORT OUTPUT ---');
  console.log(JSON.stringify({
    audit_status: result.audit.audit_status,
    equipment_selection_allowed: result.audit.equipment_selection_allowed,
    missing_fields: result.audit.missing_fields,
    conflicts: result.audit.conflicts,
    audit_entries: result.audit.audit_entries
  }, null, 2));

  console.log('\n======================================================');
  console.log('PHASE 4C VERIFICATION COMPLETE');
  console.log('======================================================');
}

runPhase4CVerification().catch(err => {
  console.error('Phase 4C verification error:', err);
  process.exit(1);
});
