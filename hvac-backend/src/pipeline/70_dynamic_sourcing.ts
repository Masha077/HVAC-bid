import { UnifiedProjectModel, HVACSizingResult, AuditReport, EquipmentItem } from '../domain/models';
import { EquipmentSourcingEngine, CatalogLookupOptions } from '../equipment/sourcing';

export class DynamicSourcingStage {
  public static async queryRegionalSuppliers(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    audit: AuditReport,
    options?: CatalogLookupOptions
  ): Promise<EquipmentItem[]> {
    return EquipmentSourcingEngine.selectAndSource(project, sizing, audit, options);
  }
}
