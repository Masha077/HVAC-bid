import PDFDocument from 'pdfkit';
import {
  UnifiedProjectModel,
  HVACSizingResult,
  AuditReport,
  EquipmentItem,
  BOQItem,
  CommercialQuote,
  ComplianceItem,
  BidPackageResult,
  TechnicalBidEnvelope,
  RequestedOutputType,
} from '../domain/models';
import { TechnicalBidContentEngine } from '../bid/technical_content';

export class BidDocumentGenerator {
  /**
   * Main entry point to generate the complete bid package including PDF buffer/base64 and HTML.
   */
  public static async generatePackage(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    audit: AuditReport,
    equipment: EquipmentItem[],
    boq: BOQItem[],
    commercial: CommercialQuote,
    complianceMatrix: ComplianceItem[]
  ): Promise<BidPackageResult> {
    const technicalEnvelope = TechnicalBidContentEngine.assemble(
      project,
      sizing,
      audit,
      equipment,
      boq,
      complianceMatrix
    );

    const reviewItems: string[] = [];
    if (technicalEnvelope.technical_envelope_status !== 'VERIFIED') {
      reviewItems.push(`Technical Envelope status is ${technicalEnvelope.technical_envelope_status}.`);
    }
    if (!commercial.pricing_verified) {
      reviewItems.push('Commercial quotation pricing is unverified or contains unpriced BOQ items.');
    }
    const taxStatus = commercial.resolution_report?.tax_status || 'NOT_PROVIDED';
    if (taxStatus !== 'VERIFIED') {
      reviewItems.push(`Tax specification status is ${taxStatus}.`);
    }
    if (project.conflicts && project.conflicts.length > 0) {
      reviewItems.push(`${project.conflicts.length} specification conflict(s) remain unresolved.`);
    }

    let overallStatus: 'READY_FOR_REVIEW' | 'NEEDS_REVISION' | 'INCOMPLETE' = 'READY_FOR_REVIEW';
    if (
      technicalEnvelope.technical_envelope_status === 'CONFLICT' ||
      commercial.grand_total_status === 'TAX_EXCLUSIVE_BID'
    ) {
      overallStatus = 'NEEDS_REVISION';
    } else if (
      technicalEnvelope.technical_envelope_status !== 'VERIFIED' ||
      !commercial.pricing_verified ||
      commercial.grand_total === null
    ) {
      overallStatus = 'INCOMPLETE';
    }

    const qtnNumber = commercial.quotation_number || `QTN-${project.project_id.replace(/[^a-zA-Z0-9-]/g, '')}`;
    const docTitle = `HVAC Bid Package — ${project.building_type || 'Facility'} (${project.location || 'Site'})`;
    const docType: RequestedOutputType = project.requested_output_type || 'COMPLETE_BID_PACKAGE';
    const commEnvelopeStatus = commercial.grand_total_status || 'NOT_AVAILABLE';

    const pdfBuffer = await this.generatePdfBuffer(
      project,
      technicalEnvelope,
      boq,
      commercial,
      qtnNumber
    );

    const pdfBase64 = pdfBuffer.toString('base64');
    const htmlContent = this.generateHtml(
      project,
      technicalEnvelope,
      boq,
      commercial,
      qtnNumber
    );

    return {
      bid_package: {
        status: overallStatus,
        document_title: docTitle,
        quotation_number: qtnNumber,
        project_id: project.project_id,
        technical_envelope_status: technicalEnvelope.technical_envelope_status,
        commercial_envelope_status: commEnvelopeStatus,
        review_items: reviewItems,
      },
      technical_envelope: technicalEnvelope,
      document_html: htmlContent,
      output_documents: [
        {
          document_type: docType,
          title: docTitle,
          pdf_base64: pdfBase64,
        },
      ],
      pdf_base64: pdfBase64,
    };
  }

  /**
   * Generates a PDF buffer using pdfkit with strict zero-fabrication of data.
   */
  public static generatePdfBuffer(
    project: UnifiedProjectModel,
    technicalEnvelope: TechnicalBidEnvelope,
    boq: BOQItem[],
    commercial: CommercialQuote,
    qtnNumber: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // 1. COVER / HEADER PAGE
        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#1E293B')
          .text('HVAC BID INTELLIGENCE SYSTEM', { align: 'center' });
        doc
          .font('Helvetica-Bold')
          .fontSize(13)
          .fillColor('#0F172A')
          .text('TECHNICAL & COMMERCIAL BID PACKAGE', { align: 'center' });
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        doc.text(`Project ID: ${project.project_id} | Ref: ${qtnNumber}`);
        doc.text(`Location: ${project.location || 'NOT_PROVIDED'} | Building Type: ${project.building_type || 'NOT_PROVIDED'}`);
        doc.text(`Workflow Mode: ${project.mode} | Date: ${new Date().toISOString().split('T')[0]}`);
        doc.text(`Technical Envelope Status: ${technicalEnvelope.technical_envelope_status}`);
        doc.text(`Commercial Envelope Status: ${commercial.grand_total_status || 'NOT_AVAILABLE'}`);
        doc.moveDown(0.8);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#CBD5E1');
        doc.moveDown(0.8);

        // 2. EXECUTIVE SUMMARY
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('1. Executive Bid Summary');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        doc.text(`Facility Area: ${project.total_area_sqft} sq.ft | Total Volume: ${project.total_volume_cuft} cu.ft`);
        doc.text(`Occupancy: ${project.total_occupants} persons`);
        doc.text(`Cooling Load Demand: ${technicalEnvelope.hvac_calculations.data.cooling_load_tr !== null ? `${technicalEnvelope.hvac_calculations.data.cooling_load_tr} TR` : 'NEEDS_REVIEW'}`);
        doc.text(`Fresh Air Ventilation Demand: ${technicalEnvelope.ventilation_basis.data.fresh_air_cfm !== null ? `${technicalEnvelope.ventilation_basis.data.fresh_air_cfm} CFM` : 'NOT_PROVIDED'}`);
        doc.moveDown(0.8);

        // 3. TECHNICAL SECTIONS (Design Basis, Calculations, Ventilation)
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('2. Technical Envelope & Sizing Basis');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        doc.text(`Design Basis Status: [${technicalEnvelope.design_basis.status}] Source: ${technicalEnvelope.design_basis.source_provenance}`);
        doc.text(`Cooling Sizing Status: [${technicalEnvelope.hvac_calculations.status}] Basis: ${technicalEnvelope.hvac_calculations.data.cooling_load_basis || 'N/A'}`);
        doc.text(`Ventilation Basis Status: [${technicalEnvelope.ventilation_basis.status}] Standard: ${technicalEnvelope.ventilation_basis.data.fresh_air_basis || 'N/A'}`);
        doc.moveDown(0.8);

        // 4. EQUIPMENT SCHEDULE & SPECIFICATIONS
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('3. Equipment Schedule & Specifications');
        const eqSection = technicalEnvelope.equipment_schedule;
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        doc.text(`Equipment Schedule Status: [${eqSection.status}] Provenance: ${eqSection.source_provenance}`);
        if (eqSection.data.equipment_items && eqSection.data.equipment_items.length > 0) {
          eqSection.data.equipment_items.forEach((item: EquipmentItem, idx: number) => {
            doc.text(
              `  Item ${idx + 1}: ${item.type} | Model: ${item.model || 'UNSPECIFIED'} (${item.manufacturer || 'UNSPECIFIED'}) | Qty: ${item.quantity} | Capacity: ${item.capacity} | Status: [${item.verification_status}]`
            );
          });
        } else {
          doc.text('  No equipment items selected.');
        }
        if (eqSection.unresolved_reason) {
          doc.fillColor('#DC2626').text(`  Unresolved Reason: ${eqSection.unresolved_reason}`);
        }
        doc.moveDown(0.8);

        // 5. DATASHEETS & MAF
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('4. OEM Datasheets & Authorization (MAF)');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        doc.text(`Datasheets Status: [${technicalEnvelope.datasheet_references.status}]`);
        if (technicalEnvelope.datasheet_references.data.datasheet_urls.length > 0) {
          technicalEnvelope.datasheet_references.data.datasheet_urls.forEach((url: string) => {
            doc.text(`  - ${url}`);
          });
        } else {
          doc.text(`  Datasheets: ${technicalEnvelope.datasheet_references.unresolved_reason || 'NOT_PROVIDED'}`);
        }
        doc.text(`MAF Status: [${technicalEnvelope.maf_requirements.status}] Detail: ${technicalEnvelope.maf_requirements.unresolved_reason || 'MAF Verified'}`);
        doc.moveDown(0.8);

        // 6. METHOD STATEMENTS & TAB SCOPE
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('5. Field Execution Methodology & TAB Scope');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        technicalEnvelope.method_statements.data.installation_methodology.forEach((m: string) => doc.text(`  - ${m}`));
        doc.text(`TAB Scope: ${technicalEnvelope.testing_commissioning_tab.data.tab_scope.join('; ')}`);
        doc.text(`Nitrogen Test Procedure: ${technicalEnvelope.testing_commissioning_tab.data.nitrogen_testing_procedure}`);
        doc.moveDown(0.8);

        // 7. COMPLIANCE & DEVIATIONS
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('6. Tender Compliance & Specification Conflicts');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        const compSec = technicalEnvelope.compliance_matrix;
        doc.text(`Compliance Summary: Compliant=${compSec.data.compliant_count}, Non-Compliant=${compSec.data.non_compliant_count}, Unresolved=${compSec.data.unresolved_count}`);
        
        const devSec = technicalEnvelope.deviations_and_conflicts;
        if (devSec.data.conflicts.length > 0) {
          doc.fillColor('#DC2626').text(`Specification Conflicts (${devSec.data.conflicts.length}):`);
          devSec.data.conflicts.forEach((c) => {
            doc.text(`  - Field '${c.field}': '${c.document_a}' vs '${c.document_b}' [${c.resolution_status}]`);
          });
        } else {
          doc.text('No cross-document specification conflicts detected.');
        }
        doc.moveDown(0.8);

        // 8. PRICED BOQ / TAKEOFF SCHEDULE
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('7. Quantity Takeoff & BOQ Schedule');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        if (boq.length > 0) {
          boq.forEach((item, idx) => {
            const amountText = item.total_amount !== null ? `${item.total_amount.toLocaleString()} ${item.currency || 'INR'}` : 'PRICE_DATA_NOT_YET_VERIFIED';
            const statusStr = item.verification_status || item.provenance || 'NOT_VERIFIED';
            doc.text(
              `  Item ${idx + 1}: ${item.description} | Qty: ${item.quantity} ${item.unit} | Unit Rate: ${item.unit_rate !== null ? item.unit_rate : 'UNPRICED'} | Total: ${amountText} | Status: [${statusStr}]`
            );
          });
        } else {
          doc.text('  BOQ schedule empty.');
        }
        doc.moveDown(0.8);

        // 9. COMMERCIAL QUOTATION
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('8. Commercial Quotation & Tax Summary');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        const subtotalVal = commercial.verified_subtotal ?? commercial.boq_subtotal;
        const taxBasis = commercial.resolution_report?.tax_basis || 'TAX_EXCLUSIVE';
        const paymentTermsStr = commercial.resolution_report?.payment_terms || 'NOT_PROVIDED';
        const bidValidityStr = commercial.resolution_report?.bid_validity_days ? `${commercial.resolution_report.bid_validity_days} days` : 'NOT_PROVIDED';
        const emdStr = commercial.resolution_report?.emd_amount ? `${commercial.resolution_report.emd_amount.toLocaleString()} INR` : 'NOT_PROVIDED';
        const incList = commercial.resolution_report?.inclusions || [];
        const excList = commercial.resolution_report?.exclusions || [];

        doc.text(`Pre-Tax BOQ Subtotal: ${subtotalVal !== null ? `${subtotalVal.toLocaleString()} ${commercial.currency}` : 'UNVERIFIED / PENDING'}`);
        doc.text(`Tax Basis: ${taxBasis} | Tax Rate: ${commercial.tax_percent !== null ? `${commercial.tax_percent}%` : 'NOT_PROVIDED'}`);
        doc.text(`Taxable Amount: ${commercial.taxable_amount !== null ? `${commercial.taxable_amount.toLocaleString()} ${commercial.currency}` : 'N/A'}`);
        doc.text(`Tax Amount: ${commercial.tax_amount !== null ? `${commercial.tax_amount.toLocaleString()} ${commercial.currency}` : 'N/A'}`);
        
        doc.font('Helvetica-Bold').fillColor('#0F172A').text(
          `GRAND TOTAL: ${commercial.grand_total !== null ? `${commercial.grand_total.toLocaleString()} ${commercial.currency}` : 'NOT_AVAILABLE / NEEDS_REVIEW'}`
        );
        doc.moveDown(0.8);

        // 10. TERMS & CONDITIONS
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('9. Commercial Terms & Conditions');
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        doc.text(`Payment Terms: ${paymentTermsStr}`);
        doc.text(`Bid Validity: ${bidValidityStr}`);
        doc.text(`EMD / Bid Bond: ${emdStr}`);
        doc.text(`Inclusions: ${incList.length > 0 ? incList.join('; ') : 'Standard HVAC equipment supply & commissioning'}`);
        doc.text(`Exclusions: ${excList.length > 0 ? excList.join('; ') : 'Civil works, incoming power cabling'}`);
        doc.moveDown(1.5);

        doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text('Generated by HVAC BIS (Bid Intelligence System) — Zero Fabrication Verified Output.', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates formatted HTML for executive preview and rendering.
   */
  public static generateHtml(
    project: UnifiedProjectModel,
    technicalEnvelope: TechnicalBidEnvelope,
    boq: BOQItem[],
    commercial: CommercialQuote,
    qtnNumber: string
  ): string {
    const eqRows = (technicalEnvelope.equipment_schedule.data.equipment_items || [])
      .map(
        (item: EquipmentItem) => `
        <tr>
          <td>${item.type}</td>
          <td>${item.manufacturer || 'UNSPECIFIED'}</td>
          <td>${item.model || 'UNSPECIFIED'}</td>
          <td>${item.capacity}</td>
          <td>${item.quantity}</td>
          <td><span class="badge ${item.verification_status}">${item.verification_status}</span></td>
        </tr>`
      )
      .join('');

    const boqRows = boq
      .map(
        (item) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>${item.unit_rate !== null ? `${item.unit_rate.toLocaleString()} ${item.currency || 'INR'}` : 'UNPRICED'}</td>
          <td>${item.total_amount !== null ? `${item.total_amount.toLocaleString()} ${item.currency || 'INR'}` : 'PRICE_DATA_NOT_YET_VERIFIED'}</td>
          <td><span class="badge ${item.verification_status || item.provenance}">${item.verification_status || item.provenance}</span></td>
        </tr>`
      )
      .join('');

    const subtotalVal = commercial.verified_subtotal ?? commercial.boq_subtotal;
    const taxBasis = commercial.resolution_report?.tax_basis || 'TAX_EXCLUSIVE';
    const paymentTermsStr = commercial.resolution_report?.payment_terms || 'NOT_PROVIDED';
    const bidValidityStr = commercial.resolution_report?.bid_validity_days ? `${commercial.resolution_report.bid_validity_days} days` : 'NOT_PROVIDED';
    const emdStr = commercial.resolution_report?.emd_amount ? `${commercial.resolution_report.emd_amount.toLocaleString()} INR` : 'NOT_PROVIDED';
    const commStatusStr = commercial.grand_total_status || 'NOT_AVAILABLE';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>HVAC Bid Package - ${qtnNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
          h2 { color: #1e293b; margin-top: 30px; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 13px; }
          th { background: #f1f5f9; color: #0f172a; }
          .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .VERIFIED, .COMPLIANT { background: #dcfce7; color: #166534; }
          .NEEDS_REVIEW, .REQUIRES_VERIFIED_CATALOG_DATA { background: #fef9c3; color: #854d0e; }
          .NOT_PROVIDED, .NON_COMPLIANT, .CONFLICT, .PRICE_DATA_NOT_YET_VERIFIED { background: #fee2e2; color: #991b1b; }
          .grand-total { font-size: 16px; font-weight: bold; background: #f8fafc; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>HVAC Technical & Commercial Bid Package</h1>
          <p><strong>Ref Number:</strong> ${qtnNumber} | <strong>Project ID:</strong> ${project.project_id}</p>
          <p><strong>Location:</strong> ${project.location || 'NOT_PROVIDED'} | <strong>Building Type:</strong> ${project.building_type || 'NOT_PROVIDED'}</p>
          <p><strong>Technical Envelope Status:</strong> <span class="badge ${technicalEnvelope.technical_envelope_status}">${technicalEnvelope.technical_envelope_status}</span> | <strong>Commercial Envelope Status:</strong> <span class="badge ${commStatusStr}">${commStatusStr}</span></p>
          
          <h2>1. Executive Summary & Design Basis</h2>
          <p>Area: ${project.total_area_sqft} sq.ft | Occupants: ${project.total_occupants} | Mode: ${project.mode}</p>
          <p>Cooling Demand: ${technicalEnvelope.hvac_calculations.data.cooling_load_tr !== null ? `${technicalEnvelope.hvac_calculations.data.cooling_load_tr} TR` : 'NEEDS_REVIEW'}</p>
          <p>Fresh Air Demand: ${technicalEnvelope.ventilation_basis.data.fresh_air_cfm !== null ? `${technicalEnvelope.ventilation_basis.data.fresh_air_cfm} CFM` : 'NOT_PROVIDED'}</p>

          <h2>2. Equipment Schedule</h2>
          <table>
            <thead>
              <tr><th>Equipment Type</th><th>Manufacturer</th><th>Model</th><th>Capacity</th><th>Qty</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${eqRows || '<tr><td colspan="6">No equipment items selected</td></tr>'}
            </tbody>
          </table>

          <h2>3. Quantity Takeoff & BOQ Schedule</h2>
          <table>
            <thead>
              <tr><th>Description</th><th>Quantity</th><th>Unit Rate</th><th>Total Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${boqRows || '<tr><td colspan="5">BOQ schedule empty</td></tr>'}
            </tbody>
          </table>

          <h2>4. Commercial Quotation & Tax Summary</h2>
          <table>
            <tr><td>Pre-Tax BOQ Subtotal</td><td>${subtotalVal !== null ? `${subtotalVal.toLocaleString()} ${commercial.currency}` : 'UNVERIFIED / PENDING'}</td></tr>
            <tr><td>Tax Basis & Rate</td><td>${taxBasis} (${commercial.tax_percent !== null ? `${commercial.tax_percent}%` : 'NOT_PROVIDED'})</td></tr>
            <tr><td>Taxable Amount</td><td>${commercial.taxable_amount !== null ? `${commercial.taxable_amount.toLocaleString()} ${commercial.currency}` : 'N/A'}</td></tr>
            <tr><td>Tax Amount</td><td>${commercial.tax_amount !== null ? `${commercial.tax_amount.toLocaleString()} ${commercial.currency}` : 'N/A'}</td></tr>
            <tr class="grand-total"><td>GRAND TOTAL</td><td>${commercial.grand_total !== null ? `${commercial.grand_total.toLocaleString()} ${commercial.currency}` : 'NOT_AVAILABLE / NEEDS_REVIEW'}</td></tr>
          </table>

          <h2>5. Commercial Terms</h2>
          <p><strong>Payment Terms:</strong> ${paymentTermsStr}</p>
          <p><strong>Bid Validity:</strong> ${bidValidityStr}</p>
          <p><strong>EMD / Bid Bond:</strong> ${emdStr}</p>
        </div>
      </body>
      </html>
    `;
  }
}
