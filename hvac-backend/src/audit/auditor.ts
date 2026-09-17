import { UnifiedProjectModel, HVACSizingResult, AuditReport, AuditStatus, ConflictRecord, BOQItem } from '../domain/models';
import { BOQValidator } from '../boq/validator';

export class SpecificationAuditor {
  public static audit(project: UnifiedProjectModel, sizing: HVACSizingResult, boq?: BOQItem[]): AuditReport {
    const missingFields: string[] = [];
    const conflicts: ConflictRecord[] = [...(project.conflicts || [])];
    const auditEntries: { checkpoint: string; status: AuditStatus; details: string }[] = [];

    // GATE 1: INPUT_VALIDATION_GATE
    auditEntries.push({
      checkpoint: 'INPUT_VALIDATION_GATE',
      status: project.project_id && project.mode ? 'READY_FOR_EQUIPMENT_SELECTION' : 'NEEDS_REVIEW',
      details: `Project ID ${project.project_id} validated under mode ${project.mode}.`,
    });

    // GATE 2: DOCUMENT_VALIDATION_GATE
    const failedDocs = project.documents_meta.filter((d) => d.status === 'FAILED');
    auditEntries.push({
      checkpoint: 'DOCUMENT_VALIDATION_GATE',
      status: failedDocs.length > 0 ? 'NEEDS_REVIEW' : 'READY_FOR_EQUIPMENT_SELECTION',
      details: `${project.documents_meta.length} document(s) registered; ${failedDocs.length} failed.`,
    });

    // GATE 3: EXTRACTION_VALIDATION_GATE
    auditEntries.push({
      checkpoint: 'EXTRACTION_VALIDATION_GATE',
      status: project.raw_input && project.raw_input.trim().length > 0 ? 'READY_FOR_EQUIPMENT_SELECTION' : 'NEEDS_REVIEW',
      details: `Extracted text length: ${project.raw_input?.length || 0} characters.`,
    });

    // GATE 4: NORMALIZATION_GATE
    if (!project.location) missingFields.push('location');
    if (!project.building_type) missingFields.push('building_type');
    if (project.total_spaces === 0 || project.total_area_sqft === 0) missingFields.push('spaces_dimensions');
    if (project.total_occupants === 0) missingFields.push('occupancy');

    auditEntries.push({
      checkpoint: 'NORMALIZATION_GATE',
      status: missingFields.length === 0 ? 'READY_FOR_EQUIPMENT_SELECTION' : 'NEEDS_REVIEW',
      details: `Normalized total area: ${project.total_area_sqft} sqft across ${project.total_spaces} space(s).`,
    });

    // GATE 5: ENGINEERING_READINESS_GATE
    const tr = sizing.cooling_load_tr;
    auditEntries.push({
      checkpoint: 'ENGINEERING_READINESS_GATE',
      status: tr !== null && tr > 0 && sizing.cooling_status !== 'NEEDS_REVIEW' ? 'READY_FOR_EQUIPMENT_SELECTION' : 'NEEDS_REVIEW',
      details: `Cooling load sizing status: ${sizing.cooling_status} (${tr !== null ? tr + ' TR' : 'NEEDS REVIEW'}).`,
    });

    // GATE 6: EQUIPMENT_SELECTION_GATE
    let equipmentSelectionAllowed = true;
    if (conflicts.length > 0) {
      equipmentSelectionAllowed = false;
    } else if (missingFields.includes('spaces_dimensions') || tr === null || tr <= 0 || sizing.cooling_status === 'NEEDS_REVIEW') {
      equipmentSelectionAllowed = false;
    }

    auditEntries.push({
      checkpoint: 'EQUIPMENT_SELECTION_GATE',
      status: equipmentSelectionAllowed ? 'READY_FOR_EQUIPMENT_SELECTION' : conflicts.length > 0 ? 'CONFLICT' : 'NEEDS_REVIEW',
      details: equipmentSelectionAllowed
        ? 'Equipment selection permitted based on approved cooling load.'
        : conflicts.length > 0
        ? 'Equipment selection blocked due to cross-document conflicts.'
        : 'Equipment selection blocked due to unapproved cooling load or missing space dimensions.',
    });

    // GATE 7: PRICING_VERIFICATION_GATE
    auditEntries.push({
      checkpoint: 'PRICING_VERIFICATION_GATE',
      status: 'NEEDS_REVIEW',
      details: 'Unverified OEM prices marked PRICE_DATA_NOT_YET_VERIFIED under strict no-fabrication policy.',
    });

    // GATE 8: BOQ_VALIDATION_GATE
    let boqStatus: AuditStatus = 'READY_FOR_EQUIPMENT_SELECTION';
    let boqDetails = 'CSI Division 23 BOQ takeoff items validated for traceability.';

    if (boq && boq.length > 0) {
      const validation = BOQValidator.validateBOQ(boq);
      if (!validation.is_valid) {
        boqStatus = 'NEEDS_REVIEW';
        boqDetails = `BOQ validation detected ${validation.issues.length} issue(s) (e.g. ${validation.issues[0].message}).`;
      } else if (validation.has_unpriced_items) {
        boqDetails = `BOQ takeoff validated (${validation.priced_items_count} verified priced line(s), ${validation.unpriced_items_count} unpriced line(s) with status NOT_AVAILABLE).`;
      } else {
        boqDetails = `BOQ takeoff fully verified (${validation.priced_items_count} priced line(s), subtotal: ${validation.verified_subtotal} ${validation.currency}).`;
      }
    }

    auditEntries.push({
      checkpoint: 'BOQ_VALIDATION_GATE',
      status: boqStatus,
      details: boqDetails,
    });

    // GATE 9: COMMERCIAL_VALIDATION_GATE
    let commStatus: AuditStatus = 'READY_FOR_EQUIPMENT_SELECTION';
    let commDetails = 'Commercial calculations prepared under strict verification rules.';

    if (boq && boq.length > 0) {
      const validation = BOQValidator.validateBOQ(boq);
      if (validation.has_unpriced_items || validation.verified_subtotal === null) {
        commStatus = 'NEEDS_REVIEW';
        commDetails = `Commercial quotation unpriced scope marked NOT_AVAILABLE. Verified subtotal: ${validation.verified_subtotal !== null ? validation.verified_subtotal + ' ' + validation.currency : 'null'}.`;
      } else {
        commDetails = `Commercial quotation fully verified. Subtotal: ${validation.verified_subtotal} ${validation.currency}.`;
      }
    }

    auditEntries.push({
      checkpoint: 'COMMERCIAL_VALIDATION_GATE',
      status: commStatus,
      details: commDetails,
    });

    // GATE 10: DOCUMENT_OUTPUT_GATE
    auditEntries.push({
      checkpoint: 'DOCUMENT_OUTPUT_GATE',
      status: 'READY_FOR_EQUIPMENT_SELECTION',
      details: `Output document requested: ${project.requested_output_type}.`,
    });

    // GATE 11: FINAL_BID_VALIDATION_GATE
    let overallStatus: AuditStatus = 'READY_FOR_EQUIPMENT_SELECTION';
    if (conflicts.length > 0) {
      overallStatus = 'CONFLICT';
    } else if (missingFields.length > 0 || tr === null || sizing.cooling_status === 'NEEDS_REVIEW') {
      overallStatus = 'NEEDS_REVIEW';
    }

    auditEntries.push({
      checkpoint: 'FINAL_BID_VALIDATION_GATE',
      status: overallStatus,
      details: `Overall audit status evaluated as ${overallStatus}.`,
    });

    return {
      audit_status: overallStatus,
      conflicts,
      missing_fields: missingFields,
      equipment_selection_allowed: equipmentSelectionAllowed,
      audit_entries: auditEntries,
    };
  }
}
