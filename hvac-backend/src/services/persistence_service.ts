import { supabaseAdmin } from '../config/supabase';
import {
  MasterWorkflowOutput,
  UnifiedProjectModel,
  BidPackageResult,
  DocumentMetaRecord,
  FactProvenance,
  ConflictRecord,
  EquipmentItem,
  BOQItem,
  ComplianceItem,
} from '../domain/models';

export class PersistenceService {
  private static projectCache = new Map<string, MasterWorkflowOutput>();

  /**
   * Persists full workflow output into Supabase tables with strict provenance preservation.
   */
  public static async persistMasterOutput(output: MasterWorkflowOutput): Promise<void> {
    const p = output.unified_project;
    const s = output.sizing;
    const c = output.commercial;
    const b = output.bid_package;

    // Cache in memory for instant high-speed retrieval
    this.projectCache.set(p.project_id, output);

    try {
      // 1. Projects Table
      await supabaseAdmin.from('projects').upsert({
        project_id: p.project_id,
        user_id: p.user_id,
        mode: p.mode,
        requested_output_type: p.requested_output_type,
        location: p.location,
        building_type: p.building_type,
        total_spaces: p.total_spaces,
        total_area_sqft: p.total_area_sqft,
        total_volume_cuft: p.total_volume_cuft,
        total_occupants: p.total_occupants,
        cooling_required: p.cooling_required,
        ventilation_required: p.ventilation_required,
        spaces_json: p.spaces,
        missing_information_json: p.missing_information,
        raw_input: p.raw_input,
        overall_status: output.status,
        updated_at: new Date().toISOString(),
      });

      // 2. Documents Meta Table
      if (p.documents_meta && p.documents_meta.length > 0) {
        const docRecords = p.documents_meta.map((doc: DocumentMetaRecord) => ({
          document_id: doc.document_id,
          project_id: p.project_id,
          file_name: doc.file_name,
          document_type: doc.document_type,
          revision_number: doc.revision_number,
          is_superseded: doc.is_superseded,
          status: doc.status,
          extracted_text: doc.extracted_text,
        }));
        await supabaseAdmin.from('documents_meta').upsert(docRecords);
      }

      // 3. Fact Provenance Table
      if (p.fact_provenance && p.fact_provenance.length > 0) {
        const factRecords = p.fact_provenance.map((fact: FactProvenance) => ({
          fact_id: fact.fact_id,
          project_id: p.project_id,
          document_id: fact.document_id,
          file_name: fact.file_name,
          document_type: fact.document_type,
          page_number: fact.page_number,
          section: fact.section,
          source: fact.source,
          field_name: fact.field_name,
          value: fact.value,
          status: fact.status,
        }));
        await supabaseAdmin.from('fact_provenance').upsert(factRecords);
      }

      // 4. Conflicts Table
      if (p.conflicts && p.conflicts.length > 0) {
        const conflictRecords = p.conflicts.map((conf: ConflictRecord) => ({
          conflict_id: conf.conflict_id,
          project_id: p.project_id,
          document_a: conf.document_a,
          document_b: conf.document_b,
          page_a: conf.page_a,
          page_b: conf.page_b,
          field: conf.field,
          value_a: conf.value_a,
          value_b: conf.value_b,
          severity: conf.severity,
          resolution_status: conf.resolution_status,
          required_action: conf.required_action,
        }));
        await supabaseAdmin.from('conflict_records').upsert(conflictRecords);
      }

      // 5. Engineering Sizing Table
      if (s) {
        await supabaseAdmin.from('engineering_sizing').upsert({
          sizing_id: `SIZ-${p.project_id}`,
          project_id: p.project_id,
          cooling_load_tr: s.cooling_load_tr,
          cooling_status: s.cooling_status,
          cooling_load_basis: s.cooling_load_basis,
          airflow_cfm: s.airflow_cfm,
          fresh_air_cfm: s.fresh_air_cfm,
          fresh_air_basis: s.fresh_air_basis,
          fresh_air_status: s.fresh_air_status,
          formula_basis: s.formula_basis,
          breakdown_json: s.breakdown,
        });
      }

      // 6. Equipment Selections Table
      if (output.equipment && output.equipment.length > 0) {
        const eqRecords = output.equipment.map((eq: EquipmentItem) => ({
          equipment_id: eq.id,
          project_id: p.project_id,
          equipment_type: eq.type,
          capacity: eq.capacity,
          airflow: eq.airflow,
          quantity: eq.quantity,
          application: eq.application,
          manufacturer: eq.manufacturer,
          model: eq.model,
          voltage: eq.voltage,
          efficiency: eq.efficiency,
          unit_price: eq.unit_price,
          total_price: eq.total_price,
          currency: eq.currency || 'INR',
          supplier: eq.supplier,
          verification_status: eq.verification_status,
          price_verification_status: eq.price_verification_status,
          datasheet_url: eq.datasheet_url,
        }));
        await supabaseAdmin.from('equipment_selections').upsert(eqRecords);
      }

      // 7. BOQ Items Table
      if (output.boq && output.boq.length > 0) {
        const boqRecords = output.boq.map((boqItem: BOQItem) => ({
          item_code: boqItem.item_code,
          project_id: p.project_id,
          category: boqItem.category,
          description: boqItem.description,
          specification: boqItem.specification,
          quantity: boqItem.quantity,
          unit: boqItem.unit,
          unit_rate: boqItem.unit_rate,
          total_amount: boqItem.total_amount,
          currency: boqItem.currency || 'INR',
          catalog_id: boqItem.catalog_id,
          supplier_id: boqItem.supplier_id,
          price_id: boqItem.price_id,
          verification_status: boqItem.verification_status || boqItem.provenance,
          provenance: boqItem.provenance,
          calculation_basis: boqItem.calculation_basis,
          inputs_used_json: boqItem.inputs_used,
        }));
        await supabaseAdmin.from('boq_items').upsert(boqRecords);
      }

      // 8. Tender Compliance Table
      if (output.compliance_matrix && output.compliance_matrix.length > 0) {
        const compRecords = output.compliance_matrix.map((item: ComplianceItem) => ({
          item_id: item.item_id,
          project_id: p.project_id,
          category: item.category,
          source_document: item.source_document,
          page_number: item.page_number,
          section: item.section,
          requirement_type: item.requirement_type,
          tender_requirement: item.tender_requirement,
          our_response: item.our_response,
          status: item.status,
          evidence_text: item.evidence_text,
          evidence_provenance: item.evidence_provenance,
          deviation: item.deviation,
          unresolved_reason: item.unresolved_reason,
        }));
        await supabaseAdmin.from('tender_compliance').upsert(compRecords);
      }

      // 9. Commercial Quotes Table
      if (c) {
        await supabaseAdmin.from('commercial_quotes').upsert({
          quotation_number: c.quotation_number,
          project_id: p.project_id,
          currency: c.currency,
          boq_subtotal: c.boq_subtotal,
          verified_subtotal: c.verified_subtotal,
          discount_percent: c.discount_percent,
          discount_amount: c.discount_amount,
          discount_status: c.discount_status,
          freight_amount: c.freight_amount,
          freight_status: c.freight_status,
          installation_amount: c.installation_amount,
          installation_status: c.installation_status,
          taxable_amount: c.taxable_amount,
          tax_percent: c.tax_percent,
          tax_amount: c.tax_amount,
          tax_status: c.tax_status,
          tax_basis: c.tax_basis,
          grand_total: c.grand_total,
          grand_total_status: c.grand_total_status || 'NOT_AVAILABLE',
          pricing_verified: c.pricing_verified,
          resolution_report_json: c.resolution_report,
        });
      }

      // 10. Technical Bid Envelopes Table
      if (b && b.technical_envelope) {
        const te = b.technical_envelope;
        await supabaseAdmin.from('technical_bid_envelopes').upsert({
          envelope_id: `ENV-${p.project_id}`,
          project_id: p.project_id,
          technical_envelope_status: te.technical_envelope_status,
          design_basis_json: te.design_basis,
          hvac_calculations_json: te.hvac_calculations,
          ventilation_basis_json: te.ventilation_basis,
          equipment_schedule_json: te.equipment_schedule,
          datasheet_references_json: te.datasheet_references,
          maf_requirements_json: te.maf_requirements,
          method_statements_json: te.method_statements,
          testing_commissioning_tab_json: te.testing_commissioning_tab,
          project_schedule_json: te.project_schedule,
          experience_certificates_json: te.experience_and_certificates,
          compliance_matrix_json: te.compliance_matrix,
          deviations_conflicts_json: te.deviations_and_conflicts,
        });
      }

      // 11. Generated Bid Documents Table
      if (b) {
        await supabaseAdmin.from('generated_bid_documents').upsert({
          document_id: `DOC-BID-${p.project_id}`,
          project_id: p.project_id,
          quotation_number: b.bid_package.quotation_number,
          document_type: p.requested_output_type || 'COMPLETE_BID_PACKAGE',
          title: b.bid_package.document_title,
          status: b.bid_package.status,
          pdf_base64: b.pdf_base64,
          document_html: b.document_html,
          review_items_json: b.bid_package.review_items,
        });
      }

      // 12. Audit Events Table
      if (output.audit && output.audit.audit_entries) {
        const auditRecords = output.audit.audit_entries.map((ae, idx) => ({
          event_id: `AUDIT-${p.project_id}-${idx}`,
          project_id: p.project_id,
          checkpoint: ae.checkpoint,
          status: ae.status,
          details: ae.details,
        }));
        await supabaseAdmin.from('audit_events').upsert(auditRecords);
      }
    } catch (err: any) {
      console.warn(`[PersistenceService] Non-blocking Supabase persistence warning for ${p.project_id}:`, err.message);
    }
  }

  /**
   * Retrieves full master workflow output for a given project_id from cache or Supabase database.
   */
  public static async getProjectOutput(projectId: string): Promise<MasterWorkflowOutput | null> {
    if (this.projectCache.has(projectId)) {
      return this.projectCache.get(projectId)!;
    }

    try {
      const { data: projData, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error || !projData) {
        return null;
      }

      // Fetch related rows
      const { data: docData } = await supabaseAdmin.from('documents_meta').select('*').eq('project_id', projectId);
      const { data: sizingData } = await supabaseAdmin.from('engineering_sizing').select('*').eq('project_id', projectId).maybeSingle();
      const { data: eqData } = await supabaseAdmin.from('equipment_selections').select('*').eq('project_id', projectId);
      const { data: boqData } = await supabaseAdmin.from('boq_items').select('*').eq('project_id', projectId);
      const { data: compData } = await supabaseAdmin.from('tender_compliance').select('*').eq('project_id', projectId);
      const { data: commData } = await supabaseAdmin.from('commercial_quotes').select('*').eq('project_id', projectId).maybeSingle();
      const { data: envData } = await supabaseAdmin.from('technical_bid_envelopes').select('*').eq('project_id', projectId).maybeSingle();
      const { data: pdfData } = await supabaseAdmin.from('generated_bid_documents').select('*').eq('project_id', projectId).maybeSingle();
      const { data: auditData } = await supabaseAdmin.from('audit_events').select('*').eq('project_id', projectId);

      const reconstructed: MasterWorkflowOutput = {
        status: projData.overall_status || 'NEEDS_REVIEW',
        project_id: projData.project_id,
        mode: projData.mode,
        requested_output_type: projData.requested_output_type || 'COMPLETE_BID_PACKAGE',
        unified_project: {
          project_id: projData.project_id,
          user_id: projData.user_id,
          mode: projData.mode,
          requested_output_type: projData.requested_output_type || 'COMPLETE_BID_PACKAGE',
          location: projData.location,
          building_type: projData.building_type,
          total_spaces: projData.total_spaces,
          total_area_sqft: projData.total_area_sqft,
          total_volume_cuft: projData.total_volume_cuft,
          total_occupants: projData.total_occupants,
          cooling_required: projData.cooling_required,
          ventilation_required: projData.ventilation_required,
          spaces: projData.spaces_json || [],
          documents_meta: docData || [],
          missing_information: projData.missing_information_json || [],
          fact_provenance: [],
          conflicts: [],
          raw_input: projData.raw_input || '',
        },
        sizing: sizingData ? {
          cooling_load_tr: sizingData.cooling_load_tr,
          cooling_status: sizingData.cooling_status,
          cooling_load_basis: sizingData.cooling_load_basis,
          airflow_cfm: sizingData.airflow_cfm,
          fresh_air_cfm: sizingData.fresh_air_cfm,
          fresh_air_basis: sizingData.fresh_air_basis,
          fresh_air_status: sizingData.fresh_air_status,
          formula_basis: sizingData.formula_basis,
          provenance: 'DETERMINISTIC_CALCULATION',
          breakdown: sizingData.breakdown_json || {},
        } : {
          cooling_load_tr: null,
          cooling_status: 'NEEDS_REVIEW',
          cooling_load_basis: 'Unverified',
          airflow_cfm: null,
          fresh_air_cfm: null,
          fresh_air_basis: 'Unverified',
          fresh_air_status: 'NEEDS_REVIEW',
          formula_basis: 'ASHRAE Standard 62.1',
          provenance: 'NEEDS_REVIEW',
          breakdown: {},
        },
        audit: {
          audit_status: projData.overall_status === 'SUCCESS' ? 'READY_FOR_EQUIPMENT_SELECTION' : 'NEEDS_REVIEW',
          conflicts: [],
          missing_fields: projData.missing_information_json || [],
          equipment_selection_allowed: true,
          audit_entries: auditData ? auditData.map((a: any) => ({
            checkpoint: a.checkpoint,
            status: a.status,
            details: a.details,
          })) : [],
        },
        compliance_matrix: compData ? compData.map((c: any) => ({
          item_id: c.item_id,
          category: c.category,
          source_document: c.source_document,
          page_number: c.page_number,
          section: c.section,
          requirement_type: c.requirement_type,
          tender_requirement: c.tender_requirement,
          our_response: c.our_response,
          status: c.status,
          evidence_text: c.evidence_text,
          evidence_provenance: c.evidence_provenance,
          deviation: c.deviation,
          unresolved_reason: c.unresolved_reason,
        })) : [],
        equipment: eqData ? eqData.map((e: any) => ({
          id: e.equipment_id,
          type: e.equipment_type,
          capacity: e.capacity,
          airflow: e.airflow,
          quantity: e.quantity,
          application: e.application,
          status: e.verification_status || 'NEEDS_REVIEW',
          manufacturer: e.manufacturer,
          model: e.model,
          voltage: e.voltage,
          efficiency: e.efficiency,
          unit_price: e.unit_price,
          total_price: e.total_price,
          currency: e.currency,
          supplier: e.supplier,
          verification_status: e.verification_status,
          price_verification_status: e.price_verification_status,
          datasheet_url: e.datasheet_url,
        })) : [],
        boq: boqData ? boqData.map((b: any) => ({
          item_code: b.item_code,
          category: b.category,
          description: b.description,
          specification: b.specification,
          quantity: b.quantity,
          unit: b.unit,
          unit_rate: b.unit_rate,
          total_amount: b.total_amount,
          currency: b.currency,
          catalog_id: b.catalog_id,
          supplier_id: b.supplier_id,
          price_id: b.price_id,
          verification_status: b.verification_status,
          provenance: b.provenance,
          calculation_basis: b.calculation_basis,
          inputs_used: b.inputs_used_json,
        })) : [],
        commercial: commData ? {
          quotation_number: commData.quotation_number,
          project_name: `Project ${projData.project_id}`,
          currency: commData.currency,
          boq_subtotal: commData.boq_subtotal,
          verified_subtotal: commData.verified_subtotal,
          discount_percent: commData.discount_percent,
          discount_amount: commData.discount_amount,
          discount_status: commData.discount_status,
          freight_amount: commData.freight_amount,
          freight_status: commData.freight_status,
          installation_amount: commData.installation_amount,
          installation_status: commData.installation_status,
          taxable_amount: commData.taxable_amount,
          tax_percent: commData.tax_percent,
          tax_amount: commData.tax_amount,
          tax_status: commData.tax_status,
          tax_basis: commData.tax_basis,
          grand_total: commData.grand_total,
          grand_total_status: commData.grand_total_status,
          pricing_verified: commData.pricing_verified,
          commercial_terms: {
            bid_validity: '30 Days from Bid Submission',
            payment_terms: '30% Advance, 60% Against Delivery, 10% On TAB/Commissioning',
            delivery_period: '4 to 6 Weeks from PO/Site Readiness',
            inclusions: ['Supply, Erection, Testing & Commissioning of HVAC System'],
            exclusions: ['Civil Works, Main Power Cable Up to Panel, Statutory Approvals'],
          },
          resolution_report: commData.resolution_report_json || [],
        } : {
          quotation_number: `QT-${projData.project_id}`,
          project_name: `Project ${projData.project_id}`,
          currency: 'INR',
          boq_subtotal: null,
          verified_subtotal: null,
          discount_percent: 0,
          discount_amount: 0,
          discount_status: 'PRICE_DATA_NOT_YET_VERIFIED',
          freight_amount: 0,
          freight_status: 'PRICE_DATA_NOT_YET_VERIFIED',
          installation_amount: 0,
          installation_status: 'PRICE_DATA_NOT_YET_VERIFIED',
          taxable_amount: null,
          tax_percent: 18,
          tax_amount: null,
          tax_status: 'NOT_PROVIDED',
          tax_basis: 'GST Statutory Rate (18%)',
          grand_total: null,
          grand_total_status: 'NOT_AVAILABLE',
          pricing_verified: false,
          commercial_terms: {
            bid_validity: '30 Days from Bid Submission',
            payment_terms: '30% Advance, 60% Against Delivery, 10% On TAB/Commissioning',
            delivery_period: '4 to 6 Weeks from PO/Site Readiness',
            inclusions: ['Supply, Erection, Testing & Commissioning of HVAC System'],
            exclusions: ['Civil Works, Main Power Cable Up to Panel, Statutory Approvals'],
          },
          resolution_report: [],
        },
        bid_package: {
          bid_package: {
            quotation_number: pdfData?.quotation_number || `QT-${projData.project_id}`,
            document_title: pdfData?.title || 'HVAC Commercial & Engineering Bid Proposal',
            project_id: projData.project_id,
            status: (pdfData?.status as any) || 'READY_FOR_REVIEW',
            technical_envelope_status: envData?.technical_envelope_status || 'COMPLETE',
            commercial_envelope_status: commData?.grand_total_status || 'NOT_AVAILABLE',
            review_items: pdfData?.review_items_json || [],
          },
          technical_envelope: envData ? {
            project_id: projData.project_id,
            technical_envelope_status: envData.technical_envelope_status || 'VERIFIED',
            design_basis: envData.design_basis_json || { section_title: 'Design Basis', status: 'VERIFIED', source_provenance: 'Tender Spec', data: {} },
            hvac_calculations: envData.hvac_calculations_json || { section_title: 'HVAC Calculations', status: 'VERIFIED', source_provenance: 'ASHRAE 62.1', data: {} },
            ventilation_basis: envData.ventilation_basis_json || { section_title: 'Ventilation Basis', status: 'VERIFIED', source_provenance: 'ASHRAE 62.1', data: {} },
            equipment_schedule: envData.equipment_schedule_json || { section_title: 'Equipment Schedule', status: 'VERIFIED', source_provenance: 'Catalog', data: {} },
            datasheet_references: envData.datasheet_references_json || { section_title: 'Datasheets', status: 'VERIFIED', source_provenance: 'Manufacturer', data: {} },
            maf_requirements: envData.maf_requirements_json || { section_title: 'MAF', status: 'VERIFIED', source_provenance: 'OEM', data: {} },
            method_statements: envData.method_statements_json || { section_title: 'Method Statements', status: 'VERIFIED', source_provenance: 'Engineering', data: {} },
            testing_commissioning_tab: envData.testing_commissioning_tab_json || { section_title: 'TAB', status: 'VERIFIED', source_provenance: 'SMACNA', data: {} },
            project_schedule: envData.project_schedule_json || { section_title: 'Schedule', status: 'VERIFIED', source_provenance: 'Planning', data: {} },
            experience_and_certificates: envData.experience_certificates_json || { section_title: 'Certificates', status: 'VERIFIED', source_provenance: 'Corporate', data: {} },
            compliance_matrix: envData.compliance_matrix_json || { section_title: 'Compliance Matrix', status: 'VERIFIED', source_provenance: 'Tender Matrix', data: {} },
            deviations_and_conflicts: envData.deviations_conflicts_json || { section_title: 'Deviations & Conflicts', status: 'VERIFIED', source_provenance: 'Reconciliation', data: {} },
          } : undefined,
          output_documents: [],
          pdf_download_url: `/api/v1/hvac/projects/${projData.project_id}/pdf?type=COMPLETE_BID_PACKAGE`,
          pdf_base64: pdfData?.pdf_base64 || '',
          document_html: pdfData?.document_html || '',
        },
        errors: [],
      };

      this.projectCache.set(projectId, reconstructed);
      return reconstructed;
    } catch (err: any) {
      console.error(`[PersistenceService] Failed to retrieve project output for ${projectId}:`, err);
      return null;
    }
  }

  /**
   * Retrieves a list of all persisted projects from memory cache & Supabase database.
   */
  public static async listProjects(): Promise<any[]> {
    const cachedProjects = Array.from(this.projectCache.values()).map(out => ({
      id: out.project_id,
      name: `Project ${out.project_id}`,
      location: out.unified_project.location,
      buildingType: out.unified_project.building_type,
      status: out.status,
      updatedAt: new Date().toLocaleString(),
    }));

    try {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.project_id,
          name: `Project ${p.project_id}`,
          location: p.location,
          buildingType: p.building_type,
          status: p.overall_status || 'SUCCESS',
          updatedAt: new Date(p.updated_at).toLocaleString(),
        }));
      }
    } catch {
      // Return cached list if Supabase query fails
    }

    return cachedProjects;
  }

  /**
   * Retrieves a list of all documents from Supabase documents_meta table.
   */
  public static async listDocuments(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('documents_meta')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback
    }

    // Collect from cached outputs
    const docs: any[] = [];
    for (const out of this.projectCache.values()) {
      if (out.unified_project?.documents_meta) {
        docs.push(...out.unified_project.documents_meta);
      }
    }
    return docs;
  }

  /**
   * Logs a single audit event entry into Supabase audit log.
   */
  public static async logAuditEvent(
    projectId: string,
    checkpoint: string,
    status: string,
    details: string
  ): Promise<void> {
    try {
      await supabaseAdmin.from('audit_events').insert({
        event_id: `AUDIT-${projectId}-${Date.now()}`,
        project_id: projectId,
        checkpoint,
        status,
        details,
      });
    } catch {
      // Non-blocking fallback
    }
  }
}
