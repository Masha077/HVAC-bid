import {
  UnifiedProjectModel,
  HVACSizingResult,
  AuditReport,
  EquipmentItem,
  BOQItem,
  ComplianceItem,
  TechnicalBidEnvelope,
} from '../domain/models';

export class TechnicalBidContentEngine {
  public static assemble(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    audit: AuditReport,
    equipment: EquipmentItem[],
    boq: BOQItem[],
    complianceMatrix: ComplianceItem[]
  ): TechnicalBidEnvelope {
    const defaultSourceDoc = project.documents_meta && project.documents_meta.length > 0
      ? project.documents_meta[0].file_name
      : 'USER_REQUIREMENT_INPUT';

    // 1. DESIGN BASIS
    const designBasisStatus = (project.location && project.total_area_sqft > 0)
      ? 'SOURCE_FACT'
      : 'NEEDS_REVIEW';

    const designBasisSection = {
      section_title: '1. HVAC Design Basis & Facility Parameters',
      status: designBasisStatus,
      source_provenance: defaultSourceDoc,
      data: {
        building_type: project.building_type,
        location: project.location,
        total_area_sqft: project.total_area_sqft,
        total_volume_cuft: project.total_volume_cuft,
        occupants: project.total_occupants,
      },
      unresolved_reason: designBasisStatus === 'NEEDS_REVIEW' ? 'Facility dimensions or location missing from normalization.' : null,
    };

    // 2. HVAC CALCULATIONS
    const isCoolingValid = sizing.cooling_load_tr !== null && sizing.cooling_status !== 'NEEDS_REVIEW';
    const hvacCalculationsSection = {
      section_title: '2. HVAC Cooling Load Sizing & Calculations',
      status: sizing.cooling_status,
      source_provenance: sizing.provenance,
      data: {
        cooling_load_tr: sizing.cooling_load_tr,
        cooling_load_basis: sizing.cooling_load_basis,
        airflow_cfm: sizing.airflow_cfm,
        breakdown: sizing.breakdown || {},
      },
      unresolved_reason: isCoolingValid ? null : (sizing.cooling_load_basis || 'Cooling load sizing unapproved.'),
    };

    // 3. VENTILATION BASIS
    const ventilationSection = {
      section_title: '3. Indoor Fresh Air Ventilation Basis (ASHRAE 62.1)',
      status: sizing.fresh_air_status || 'DETERMINISTIC_CALCULATION',
      source_provenance: 'ASHRAE_62_1_STANDARD',
      data: {
        fresh_air_cfm: sizing.fresh_air_cfm,
        fresh_air_basis: sizing.fresh_air_basis,
        fresh_air_breakdown: {
          occupant_ventilation_cfm: sizing.breakdown?.fresh_air_occupant_cfm || 0,
          area_ventilation_cfm: sizing.breakdown?.fresh_air_area_cfm || 0,
        },
      },
      unresolved_reason: sizing.fresh_air_cfm !== null ? null : 'Ventilation airflow calculation unapproved.',
    };

    // 4. EQUIPMENT SCHEDULE
    const verifiedEqCount = equipment.filter((e) => e.verification_status === 'VERIFIED').length;
    const isEqComplete = equipment.length > 0 && verifiedEqCount === equipment.length;
    const eqStatus = isEqComplete ? 'VERIFIED' : equipment.length > 0 ? 'REQUIRES_VERIFIED_CATALOG_DATA' : 'NEEDS_REVIEW';

    const equipmentScheduleSection = {
      section_title: '4. Equipment Schedule & Specifications',
      status: eqStatus,
      source_provenance: equipment[0]?.price_provenance || equipment[0]?.status || 'VERIFIED_CATALOG',
      data: {
        equipment_items: equipment,
        equipment_count: equipment.length,
      },
      unresolved_reason: isEqComplete ? null : 'Equipment schedule contains unverified OEM catalog entries or pending selections.',
    };

    // 5. DATASHEET REFERENCES (No fabrication!)
    const datasheets = equipment
      .map((e) => e.datasheet_url)
      .filter((url): url is string => Boolean(url));
    const hasAllDatasheets = equipment.length > 0 && datasheets.length === equipment.length;
    const datasheetStatus = hasAllDatasheets ? 'VERIFIED' : 'NOT_PROVIDED';

    const datasheetSection = {
      section_title: '5. OEM Technical Datasheets',
      status: datasheetStatus,
      source_provenance: hasAllDatasheets ? 'OEM_OFFICIAL_CATALOG_DB' : 'NOT_PROVIDED',
      data: {
        datasheet_urls: datasheets,
        has_all_datasheets: hasAllDatasheets,
      },
      unresolved_reason: hasAllDatasheets ? null : 'OEM technical datasheets missing for one or more selected equipment items.',
    };

    // 6. MAF REQUIREMENTS (No fabrication!)
    const mafItem = complianceMatrix.find((c) => c.category === 'MAF_REQUIREMENT');
    const mafAttached = Boolean(mafItem && mafItem.status === 'COMPLIANT');

    const mafSection = {
      section_title: '6. Manufacturer Authorization Form (MAF)',
      status: mafAttached ? 'VERIFIED' : 'NOT_PROVIDED',
      source_provenance: mafItem?.source_document || defaultSourceDoc,
      data: {
        maf_letters_attached: mafAttached,
        maf_details: mafAttached ? ['MAF Letter Verified'] : [],
      },
      unresolved_reason: mafAttached ? null : 'Manufacturer Authorization Form (MAF) not provided in document intake.',
    };

    // 7. METHOD STATEMENTS
    const methodSection = {
      section_title: '7. Installation & Field Execution Methodology',
      status: 'SOURCE_FACT',
      source_provenance: 'STANDARD_HVAC_INSTALLATION_PRACTICE',
      data: {
        installation_methodology: [
          'Factory-fabricated GI sheet metal ducting installation per IS 655 / SMACNA.',
          'VRF refrigerant copper tubing hard-drawn brazing under dry nitrogen purge.',
          'Condensate drain piping uPVC 32mm insulation sleeve with 1:100 slope.',
        ],
        safety_procedures: [
          'PPE mandatory on site; hot work permits for refrigerant line brazing.',
          'Structural ceiling load check before rigging outdoor/indoor units.',
        ],
      },
      unresolved_reason: null,
    };

    // 8. TESTING & COMMISSIONING / TAB
    const tabSection = {
      section_title: '8. Testing, Evacuation, Refrigerant Charging & TAB Scope',
      status: 'SOURCE_FACT',
      source_provenance: 'STANDARD_COMMISSIONING_SCOPE',
      data: {
        tab_scope: [
          'Air balancing across all supply air diffusers using calibrated hot-wire anemometer.',
          'Refrigerant charging and subcooling/superheat verification.',
        ],
        nitrogen_testing_procedure: '24-hour nitrogen pressure holding test at 450 PSI prior to system evacuation down to 500 microns.',
      },
      unresolved_reason: null,
    };

    // 9. PROJECT SCHEDULE
    const scheduleSection = {
      section_title: '9. Project Timeline & Delivery Schedule',
      status: 'NOT_PROVIDED',
      source_provenance: 'NOT_PROVIDED',
      data: {
        timeline_days: null,
        delivery_schedule: null,
      },
      unresolved_reason: 'Explicit project execution bar-chart schedule missing from tender documents.',
    };

    // 10. EXPERIENCE & CERTIFICATES (No fabrication!)
    const pastExpItem = complianceMatrix.find((c) => c.category === 'PAST_EXPERIENCE');
    const expAttached = Boolean(pastExpItem && pastExpItem.status === 'COMPLIANT');

    const experienceSection = {
      section_title: '10. Past Performance & Completion Certificates',
      status: expAttached ? 'VERIFIED' : 'NOT_PROVIDED',
      source_provenance: pastExpItem?.source_document || 'NOT_PROVIDED',
      data: {
        certificates_attached: expAttached ? ['Past Experience Certificate #1'] : [],
        past_projects_count: expAttached ? 1 : 0,
      },
      unresolved_reason: expAttached ? null : 'Past project completion certificates missing from intake submission.',
    };

    // 11. COMPLIANCE MATRIX SUMMARY
    const compliantCount = complianceMatrix.filter((c) => c.status === 'COMPLIANT').length;
    const nonCompliantCount = complianceMatrix.filter((c) => c.status === 'NON_COMPLIANT').length;
    const unresolvedCount = complianceMatrix.filter((c) => c.status === 'NOT_PROVIDED' || c.status === 'NEEDS_REVIEW').length;

    const complianceMatrixSection = {
      section_title: '11. Tender Specification Compliance Matrix',
      status: nonCompliantCount > 0 ? 'CONFLICT' : unresolvedCount > 0 ? 'NEEDS_REVIEW' : 'VERIFIED',
      source_provenance: 'TENDER_COMPLIANCE_ENGINE',
      data: {
        items: complianceMatrix,
        compliant_count: compliantCount,
        non_compliant_count: nonCompliantCount,
        unresolved_count: unresolvedCount,
      },
      unresolved_reason: unresolvedCount > 0 ? `${unresolvedCount} compliance item(s) unresolved or missing evidence.` : null,
    };

    // 12. DEVIATIONS & CONFLICTS
    const conflicts = project.conflicts || [];
    const deviations = complianceMatrix
      .filter((c) => c.status === 'NON_COMPLIANT' || Boolean(c.deviation))
      .map((c) => c.deviation || c.tender_requirement);

    const deviationsSection = {
      section_title: '12. Technical Deviations & Specification Conflicts',
      status: conflicts.length > 0 ? 'CONFLICT' : deviations.length > 0 ? 'NEEDS_REVIEW' : 'VERIFIED',
      source_provenance: 'CROSS_DOCUMENT_RECONCILER',
      data: {
        conflicts,
        deviations,
      },
      unresolved_reason: conflicts.length > 0 ? `${conflicts.length} cross-document specification conflict(s) require clarification.` : null,
    };

    // OVERALL TECHNICAL ENVELOPE STATUS
    let overallTechnicalStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_AVAILABLE' | 'CONFLICT' = 'VERIFIED';
    if (conflicts.length > 0 || nonCompliantCount > 0) {
      overallTechnicalStatus = 'CONFLICT';
    } else if (sizing.cooling_load_tr === null || audit.audit_status === 'NEEDS_REVIEW' || unresolvedCount > 0) {
      overallTechnicalStatus = 'NEEDS_REVIEW';
    }

    return {
      project_id: project.project_id,
      technical_envelope_status: overallTechnicalStatus,
      design_basis: designBasisSection,
      hvac_calculations: hvacCalculationsSection,
      ventilation_basis: ventilationSection,
      equipment_schedule: equipmentScheduleSection,
      datasheet_references: datasheetSection,
      maf_requirements: mafSection,
      method_statements: methodSection,
      testing_commissioning_tab: tabSection,
      project_schedule: scheduleSection,
      experience_and_certificates: experienceSection,
      compliance_matrix: complianceMatrixSection,
      deviations_and_conflicts: deviationsSection,
    };
  }
}
