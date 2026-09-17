import { UnifiedProjectModel, HVACSizingResult } from '../domain/models';
import { DeterministicCalculators } from '../pipeline/40_deterministic_calculators';

export class DeterministicSizingEngine {
  public static calculate(project: UnifiedProjectModel): HVACSizingResult {
    return DeterministicCalculators.calculateSizing(
      project.total_area_sqft,
      project.total_volume_cuft,
      project.total_occupants
    );
  }
}
