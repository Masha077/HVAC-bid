import {
  UnifiedProjectModel,
  HVACSizingResult,
  AuditReport,
  EquipmentItem,
  BOQItem,
  CommercialQuote,
  ComplianceItem,
  BidPackageResult,
} from '../domain/models';
import { BidDocumentGenerator } from '../document/bid_document_generator';
import { TenderComplianceStage } from '../pipeline/100_tender_compliance';

export class AIBidPackageComposer {
  public static async compose(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    audit: AuditReport,
    equipment: EquipmentItem[],
    boq: BOQItem[],
    commercial: CommercialQuote,
    complianceMatrix?: ComplianceItem[]
  ): Promise<BidPackageResult> {
    const compMatrix = complianceMatrix || TenderComplianceStage.generateMatrix(project, sizing, equipment, commercial);
    return await BidDocumentGenerator.generatePackage(
      project,
      sizing,
      audit,
      equipment,
      boq,
      commercial,
      compMatrix
    );
  }
}
