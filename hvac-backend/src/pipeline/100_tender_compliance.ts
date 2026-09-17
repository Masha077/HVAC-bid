import {
  ComplianceItem,
  UnifiedProjectModel,
  HVACSizingResult,
  EquipmentItem,
  CommercialQuote,
} from '../domain/models';

export class TenderComplianceStage {
  public static generateMatrix(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    equipment?: EquipmentItem[],
    commercial?: CommercialQuote
  ): ComplianceItem[] {
    const matrix: ComplianceItem[] = [];
    let itemIdSeq = 1;

    const getNextId = () => `COMP-${String(itemIdSeq++).padStart(2, '0')}`;

    const defaultSourceDoc = project.documents_meta && project.documents_meta.length > 0
      ? project.documents_meta[0].file_name
      : 'USER_REQUIREMENT_INPUT';

    // Helper to find fact provenance by keyword
    const findFact = (keyword: string) => {
      if (!project.fact_provenance || project.fact_provenance.length === 0) return null;
      return project.fact_provenance.find((f) =>
        f.value.toLowerCase().includes(keyword.toLowerCase()) ||
        f.field_name.toLowerCase().includes(keyword.toLowerCase())
      ) || null;
    };

    // 1. BASE HVAC ENGINEERING COMPLIANCE CHECKPOINTS
    // COMP 1: Thermal Sizing & Performance
    const isCoolingValid = sizing.cooling_load_tr !== null && sizing.cooling_status !== 'NEEDS_REVIEW';
    matrix.push({
      item_id: getNextId(),
      category: 'TECHNICAL_SPECIFICATION',
      source_document: defaultSourceDoc,
      page_number: project.documents_meta[0] ? 1 : null,
      section: 'Engineering Sizing Section',
      requirement_type: 'MANDATORY',
      tender_requirement: 'Comfort Air Conditioning System Sizing & Thermal Performance',
      our_response: isCoolingValid
        ? `Designed system meets cooling demand (${sizing.cooling_load_tr} TR) based on building parameters.`
        : 'Cooling load calculation basis requires client confirmation.',
      status: isCoolingValid ? 'COMPLIANT' : 'NEEDS_REVIEW',
      evidence_text: `Airflow: ${sizing.airflow_cfm || 'N/A'} CFM, Sizing Basis: ${sizing.cooling_load_basis || 'N/A'}`,
      evidence_provenance: sizing.provenance,
      unresolved_reason: isCoolingValid ? null : 'Cooling load sizing status is NEEDS_REVIEW. Engineering load basis unapproved.',
    });

    // COMP 2: Fresh Air Ventilation ASHRAE 62.1
    const isFreshAirValid = sizing.fresh_air_cfm !== null;
    matrix.push({
      item_id: getNextId(),
      category: 'TECHNICAL_SPECIFICATION',
      source_document: defaultSourceDoc,
      page_number: project.documents_meta[0] ? 1 : null,
      section: 'Ventilation Specification',
      requirement_type: 'MANDATORY',
      tender_requirement: 'Fresh Air Ventilation Compliance as per ASHRAE 62.1 Standard',
      our_response: isFreshAirValid
        ? `Dedicated fresh air supply provision calculated deterministically at ${sizing.fresh_air_cfm} CFM.`
        : 'Fresh air requirement not specified.',
      status: isFreshAirValid ? 'COMPLIANT' : 'NEEDS_REVIEW',
      evidence_text: `Fresh Air CFM: ${sizing.fresh_air_cfm} CFM (${sizing.fresh_air_basis})`,
      evidence_provenance: sizing.fresh_air_status || 'DETERMINISTIC_CALCULATION',
      unresolved_reason: isFreshAirValid ? null : 'Fresh air ventilation requirements unresolved.',
    });

    // COMP 3: Equipment Make/Model & Verification
    const selectedEq = equipment && equipment.length > 0 ? equipment[0] : null;
    const isEqVerified = selectedEq && selectedEq.verification_status === 'VERIFIED';
    matrix.push({
      item_id: getNextId(),
      category: 'EQUIPMENT_MAKE_MODEL',
      source_document: defaultSourceDoc,
      page_number: project.documents_meta[0] ? 1 : null,
      section: 'Equipment Schedule',
      requirement_type: 'MANDATORY',
      tender_requirement: 'Equipment Selection from Verified OEM Manufacturers (Make/Model)',
      our_response: isEqVerified
        ? `Selected OEM Unit: ${selectedEq.manufacturer} (${selectedEq.model}), Capacity: ${selectedEq.capacity}.`
        : 'Equipment selection pending catalog match or engineering approval.',
      status: isEqVerified ? 'COMPLIANT' : selectedEq ? 'PARTIALLY_COMPLIANT' : 'NEEDS_REVIEW',
      evidence_text: isEqVerified ? `OEM: ${selectedEq.manufacturer} ${selectedEq.model}` : 'Unverified equipment container',
      evidence_provenance: selectedEq?.verification_status || 'REQUIRES_VERIFIED_CATALOG_DATA',
      unresolved_reason: isEqVerified ? null : 'Equipment make and model requires selection from verified catalog data.',
    });

    // 2. DOCUMENT / TENDER EXTRACTED REQUIREMENTS
    const combinedText = `${project.raw_input || ''}\n${project.documents_meta.map((d) => d.extracted_text || '').join('\n')}`;
    const normText = combinedText.toLowerCase();

    // COMP 4: Technical Datasheet Submission
    if (normText.includes('datasheet') || normText.includes('catalog') || normText.includes('technical data')) {
      const fact = findFact('datasheet') || findFact('catalog');
      const hasDatasheet = Boolean(selectedEq && selectedEq.datasheet_url);
      matrix.push({
        item_id: getNextId(),
        category: 'DATASHEET',
        source_document: fact?.file_name || defaultSourceDoc,
        page_number: fact?.page_number || (project.documents_meta[0] ? 1 : null),
        section: fact?.section || 'Technical Specifications',
        requirement_type: 'REQUIRED',
        tender_requirement: 'OEM Official Technical Datasheets Submission',
        our_response: hasDatasheet && selectedEq
          ? `Verified OEM technical datasheet attached: ${selectedEq.datasheet_url}`
          : 'OEM technical datasheets pending OEM selection confirmation.',
        status: hasDatasheet ? 'COMPLIANT' : 'NOT_PROVIDED',
        evidence_text: hasDatasheet && selectedEq ? selectedEq.datasheet_url : fact?.value || 'Tender specifies datasheet submission.',
        evidence_provenance: fact?.fact_id || 'DOCUMENT_EXTRACTION',
        unresolved_reason: hasDatasheet ? null : 'Official OEM datasheet document missing from bid package submission.',
      });
    }

    // COMP 5: Manufacturer Authorization Form (MAF)
    if (normText.includes('maf') || normText.includes('authorization') || normText.includes('oem letter')) {
      const fact = findFact('maf') || findFact('authorization') || findFact('oem');
      matrix.push({
        item_id: getNextId(),
        category: 'MAF_REQUIREMENT',
        source_document: fact?.file_name || defaultSourceDoc,
        page_number: fact?.page_number || 1,
        section: fact?.section || 'Tender Eligibility Criteria',
        requirement_type: 'MANDATORY',
        tender_requirement: 'Manufacturer Authorization Form (MAF) from OEM Brand',
        our_response: 'MAF letter from OEM distributor to be issued upon contract award.',
        status: 'NOT_PROVIDED',
        evidence_text: fact?.value || 'Tender specifies original MAF letter from manufacturer.',
        evidence_provenance: fact?.fact_id || 'DOCUMENT_EXTRACTION',
        unresolved_reason: 'Tender clause mandates original MAF letter from OEM; MAF document not attached in intake.',
      });
    }

    // COMP 6: Nitrogen Testing, Pressure Testing & TAB Commissioning
    if (normText.includes('testing') || normText.includes('commissioning') || normText.includes('pressure') || normText.includes('tab')) {
      const fact = findFact('testing') || findFact('commissioning');
      matrix.push({
        item_id: getNextId(),
        category: 'TESTING_COMMISSIONING',
        source_document: fact?.file_name || defaultSourceDoc,
        page_number: fact?.page_number || 1,
        section: fact?.section || 'Quality Assurance & TAB',
        requirement_type: 'MANDATORY',
        tender_requirement: 'Nitrogen Pressure Testing, Evacuation, Refrigerant Charging & TAB Air Balancing',
        our_response: 'Fully compliant. Testing, Adjusting & Air Balancing (TAB) and 24-hour nitrogen holding test included in scope.',
        status: 'COMPLIANT',
        evidence_text: fact?.value || 'Pressure testing and TAB commissioning required in tender scope.',
        evidence_provenance: 'STANDARD_HVAC_COMMISSIONING_SCOPE',
        unresolved_reason: null,
      });
    }

    // COMP 7: Past Experience & Completion Certificates
    if (normText.includes('experience') || normText.includes('completion') || normText.includes('past work')) {
      const fact = findFact('experience') || findFact('completion');
      matrix.push({
        item_id: getNextId(),
        category: 'PAST_EXPERIENCE',
        source_document: fact?.file_name || defaultSourceDoc,
        page_number: fact?.page_number || 1,
        section: fact?.section || 'Contractor Prequalification',
        requirement_type: 'REQUIRED',
        tender_requirement: 'Past Experience Certificates for Similar HVAC Installations',
        our_response: 'Contractor project reference list attached; past completion certificates pending formal client verification.',
        status: 'NOT_PROVIDED',
        evidence_text: fact?.value || 'Tender specifies minimum 3 completed similar HVAC projects.',
        evidence_provenance: fact?.fact_id || 'DOCUMENT_EXTRACTION',
        unresolved_reason: 'Past project completion certificates not yet uploaded to project document repository.',
      });
    }

    // COMP 8: EMD / Bid Security Bond
    if (normText.includes('emd') || normText.includes('bid bond') || normText.includes('security deposit')) {
      const fact = findFact('emd') || findFact('security');
      const emdVal = commercial?.resolution_report?.emd_amount;
      const hasEmd = emdVal !== null && emdVal !== undefined && commercial?.resolution_report?.emd_status === 'VERIFIED';
      matrix.push({
        item_id: getNextId(),
        category: 'EMD_BID_BOND',
        source_document: fact?.file_name || defaultSourceDoc,
        page_number: fact?.page_number || 1,
        section: fact?.section || 'Commercial Instructions to Bidders',
        requirement_type: 'MANDATORY',
        tender_requirement: 'Earnest Money Deposit (EMD) / Bid Security Bond Submission',
        our_response: hasEmd
          ? `EMD Bank Guarantee of ${emdVal} INR registered and attached.`
          : 'EMD Bank Guarantee / Demand Draft instrument details pending finance verification.',
        status: hasEmd ? 'COMPLIANT' : 'NOT_PROVIDED',
        evidence_text: hasEmd ? `EMD: ${emdVal} INR` : fact?.value || 'Tender clause specifies EMD requirement.',
        evidence_provenance: fact?.fact_id || 'COMMERCIAL_EXTRACTION',
        unresolved_reason: hasEmd ? null : 'EMD instrument proof missing from commercial submission package.',
      });
    }

    // 3. CROSS-DOCUMENT CONFLICT AUDIT (NON_COMPLIANT EVALUATION)
    if (project.conflicts && project.conflicts.length > 0) {
      project.conflicts.forEach((c) => {
        matrix.push({
          item_id: getNextId(),
          category: 'GENERAL',
          source_document: c.document_a || defaultSourceDoc,
          page_number: c.page_a || null,
          section: 'Cross-Document Reconciliation',
          requirement_type: 'MANDATORY',
          tender_requirement: `Reconcile contradictory specification for field '${c.field}'`,
          our_response: `Conflict detected between ${c.document_a} (${c.value_a}) and ${c.document_b} (${c.value_b}). Requires clarification.`,
          status: 'NON_COMPLIANT',
          evidence_text: `Conflict ID: ${c.conflict_id}, Field: ${c.field}, Value A: ${c.value_a}, Value B: ${c.value_b}`,
          evidence_provenance: c.conflict_id,
          deviation: `Specification conflict on ${c.field}: ${c.value_a} vs ${c.value_b}`,
          unresolved_reason: `Cross-document contradiction unresolved: ${c.required_action}`,
        });
      });
    }

    return matrix;
  }
}
