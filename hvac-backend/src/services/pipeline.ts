import { MasterWorkflowOutput, DocumentMetaRecord, ConflictRecord, FactProvenance } from '../domain/models';
import { UniversalRequest } from '../validators/schemas';
import { ModeRouterStage } from '../pipeline/02_mode_router';
import { DocumentIntakeStage } from '../pipeline/10_document_intake';
import { RequirementExtractorStage } from '../pipeline/20_requirement_extractor';
import { CrossDocumentReconciler } from '../pipeline/cross_document_reconciler';
import { DeterministicCalculators } from '../pipeline/40_deterministic_calculators';
import { SpecificationAuditor } from '../audit/auditor';
import { DynamicSourcingStage } from '../pipeline/70_dynamic_sourcing';
import { BOQTakeoffEngine } from '../boq/takeoff';
import { CommercialQuotationEngine } from '../commercial/quotation';
import { TenderComplianceStage } from '../pipeline/100_tender_compliance';
import { AIBidPackageComposer } from '../bid/composer';
import { PDFRenderer } from '../bid/pdf';
import { PersistenceService } from './persistence_service';

export class MasterWorkflowPipeline {
  public static async execute(request: UniversalRequest): Promise<MasterWorkflowOutput> {
    const errors: string[] = [];
    const projectId = request.project_id || `PROJ-${Date.now()}`;
    const userId = request.user_id || 'test-user-001';
    const requestedOutputType = request.requested_output_type || 'COMPLETE_BID_PACKAGE';

    // 1. REQUEST / API ENTRY & 2. INPUT VALIDATION & 3. MODE ROUTING
    const modeInfo = ModeRouterStage.route(request);
    const mode = modeInfo.mode;

    if (modeInfo.conflictWarning) {
      errors.push(modeInfo.conflictWarning);
    }

    // 4. MULTI-DOCUMENT INGESTION & 5. CLASSIFICATION & 6. DOCUMENT EXTRACTION & 8. EVIDENCE PROVENANCE
    let rawText = '';
    let documentsMeta: DocumentMetaRecord[] = [];
    let factProvenance: FactProvenance[] = [];

    if (mode === 'REQUIREMENT_DRIVEN') {
      rawText = request.text || '';
    } else if (mode === 'DOCUMENT_DRIVEN') {
      const intake = await DocumentIntakeStage.processDocuments(projectId, request.documents || []);
      rawText = intake.combinedText;
      documentsMeta = intake.documentsMeta;
      factProvenance = intake.factProvenance;
    } else if (mode === 'HYBRID') {
      const intake = await DocumentIntakeStage.processDocuments(projectId, request.documents || []);
      rawText = `User Requirement:\n${request.text || ''}\n\nDocument Extracted Content:\n${intake.combinedText}`;
      documentsMeta = intake.documentsMeta;
      factProvenance = intake.factProvenance;
    }

    // 7. REQUIREMENT EXTRACTION
    const extracted = RequirementExtractorStage.extract(rawText);

    // 12. CROSS-DOCUMENT RECONCILIATION
    const activeDocs = documentsMeta.filter((d) => !d.is_superseded);
    const conflicts: ConflictRecord[] = CrossDocumentReconciler.reconcile(projectId, request.text, activeDocs);

    // 9. PROJECT NORMALIZATION
    const unifiedProject = {
      project_id: projectId,
      user_id: userId,
      mode,
      requested_output_type: requestedOutputType,
      location: extracted.location,
      building_type: extracted.building_type,
      spaces: extracted.spaces,
      total_spaces: extracted.total_spaces,
      total_area_sqft: DeterministicCalculators.calculateArea(extracted.spaces),
      total_volume_cuft: DeterministicCalculators.calculateVolume(extracted.spaces),
      total_occupants: extracted.total_occupants,
      cooling_required: extracted.cooling_required,
      ventilation_required: extracted.ventilation_required,
      missing_information: extracted.missing_information,
      raw_input: rawText,
      documents_meta: documentsMeta,
      fact_provenance: factProvenance,
      conflicts,
    };

    // 10. ENGINEERING CALCULATIONS
    const coolingLoadBasis = extracted.sqft_per_tr ? { sqft_per_tr: extracted.sqft_per_tr } : undefined;
    const sizing = DeterministicCalculators.calculateSizing(
      unifiedProject.total_area_sqft,
      unifiedProject.total_volume_cuft,
      unifiedProject.total_occupants,
      coolingLoadBasis
    );

    // 11. ENGINEERING VALIDATION & 13. SPECIFICATION AUDIT & 14. EQUIPMENT REQUIREMENTS
    const audit = SpecificationAuditor.audit(unifiedProject, sizing);

    // 15. EQUIPMENT SELECTION & 16. CATALOG VALIDATION & 17. SUPPLIER SOURCING & 18. PRICE VALIDATION
    const equipment = await DynamicSourcingStage.queryRegionalSuppliers(unifiedProject, sizing, audit);

    // 19. BOQ GENERATION & 20. BOQ VALIDATION
    const boq = BOQTakeoffEngine.generateTakeoff(unifiedProject, sizing, equipment);

    // 21. TENDER COMPLIANCE
    const complianceMatrix = TenderComplianceStage.generateMatrix(unifiedProject, sizing, equipment);

    // 22. COMMERCIAL CALCULATION
    const commercial = CommercialQuotationEngine.calculateQuote(unifiedProject, boq);

    // 23. OUTPUT DOCUMENT ROUTER & 24. TECHNICAL ENVELOPE & 25. COMMERCIAL ENVELOPE & 26. BID PACKAGE COMPOSER & 27. HTML GENERATION
    const bidPackage = await AIBidPackageComposer.compose(
      unifiedProject,
      sizing,
      audit,
      equipment,
      boq,
      commercial,
      complianceMatrix
    );

    // 28. PDF GENERATION & 29. DOCUMENT VALIDATION
    try {
      const outputDocs = await PDFRenderer.generatePDFs(
        unifiedProject,
        sizing,
        boq,
        commercial,
        complianceMatrix,
        bidPackage
      );
      if (outputDocs && outputDocs.length > 0) {
        bidPackage.output_documents = outputDocs;
        if (outputDocs[0].pdf_base64) {
          bidPackage.pdf_base64 = outputDocs[0].pdf_base64;
          bidPackage.pdf_download_url = outputDocs[0].pdf_download_url;
        }
      }
    } catch (err: any) {
      errors.push(`PDF rendering warning: ${err.message}`);
    }

    const hasFatalErrors = errors.some(e => e.includes('Fatal') || e.includes('Error'));
    const finalStatus = hasFatalErrors ? 'FAILED' : (conflicts.length > 0 || audit.audit_status === 'NEEDS_REVIEW' || audit.audit_status === 'CONFLICT') ? 'NEEDS_REVIEW' : 'SUCCESS';

    const output: MasterWorkflowOutput = {
      status: finalStatus,
      project_id: projectId,
      mode,
      requested_output_type: requestedOutputType,
      unified_project: unifiedProject,
      sizing,
      audit,
      compliance_matrix: complianceMatrix,
      equipment,
      boq,
      commercial,
      bid_package: bidPackage,
      errors,
    };

    // 30. SUPABASE PERSISTENCE & 31. AUDIT LOGGING
    await PersistenceService.persistMasterOutput(output);

    return output;
  }
}
