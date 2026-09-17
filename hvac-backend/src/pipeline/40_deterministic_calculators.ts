import { SpaceDetail, HVACSizingResult, ProvenanceStatus } from '../domain/models';

export class DeterministicCalculators {
  public static calculateArea(spaces: SpaceDetail[]): number {
    let totalArea = 0;
    for (const space of spaces) {
      if (space.area_sqft && space.area_sqft > 0) {
        totalArea += space.area_sqft;
      } else if (space.length_ft && space.width_ft) {
        totalArea += space.length_ft * space.width_ft;
      }
    }
    return Math.round(totalArea * 100) / 100;
  }

  public static calculateVolume(spaces: SpaceDetail[]): number {
    let totalVolume = 0;
    for (const space of spaces) {
      if (space.volume_cuft && space.volume_cuft > 0) {
        totalVolume += space.volume_cuft;
      } else {
        const area = space.area_sqft || (space.length_ft && space.width_ft ? space.length_ft * space.width_ft : 0);
        if (area > 0 && space.height_ft) {
          totalVolume += area * space.height_ft;
        }
      }
    }
    return Math.round(totalVolume * 100) / 100;
  }

  public static calculateOccupancy(spaces: SpaceDetail[]): number {
    let totalOccupants = 0;
    for (const space of spaces) {
      if (space.occupants && space.occupants > 0) {
        totalOccupants += space.occupants;
      }
    }
    return totalOccupants;
  }

  /**
   * Sizing calculation method.
   * Cooling load formula is configurable. If coolingLoadBasis parameter is passed, evaluates accordingly;
   * otherwise sets cooling status to NEEDS_REVIEW to prevent unverified formula assumptions.
   */
  public static calculateSizing(
    totalAreaSqft: number,
    totalVolumeCuft: number,
    totalOccupants: number,
    coolingLoadBasis?: { sqft_per_tr?: number }
  ): HVACSizingResult {
    let coolingLoadTr: number | null = null;
    let coolingStatus: ProvenanceStatus = totalAreaSqft > 0 ? 'NEEDS_REVIEW' : 'NOT_PROVIDED';
    let coolingBasisText = 'Cooling load calculation basis not provided; requires explicit engineering basis (e.g. HAP/TRANE simulation or configured sqft/TR basis).';

    if (coolingLoadBasis && coolingLoadBasis.sqft_per_tr && coolingLoadBasis.sqft_per_tr > 0) {
      coolingLoadTr = Math.round((totalAreaSqft / coolingLoadBasis.sqft_per_tr) * 10) / 10;
      coolingStatus = 'DETERMINISTIC_CALCULATION';
      coolingBasisText = `Configured deterministic calculation at ${coolingLoadBasis.sqft_per_tr} sq.ft/TR basis`;
    }

    const airflowCfm = coolingLoadTr !== null ? Math.round(coolingLoadTr * 400) : null;

    // Fresh Air Ventilation (Auditable ASHRAE 62.1 Standard: 15 CFM/person + 0.12 CFM/sqft)
    const freshAirOccupantCfm = totalOccupants * 15;
    const freshAirAreaCfm = totalAreaSqft * 0.12;
    const hasVentilationInputs = totalOccupants > 0 || totalAreaSqft > 0;
    const freshAirCfm = hasVentilationInputs
      ? Math.round(freshAirOccupantCfm + freshAirAreaCfm)
      : null;

    const freshAirBasisText = 'ASHRAE Standard 62.1 Ventilation for Acceptable Indoor Air Quality (15 CFM/person + 0.12 CFM/sqft)';
    const freshAirStatus: ProvenanceStatus = freshAirCfm !== null ? 'DETERMINISTIC_CALCULATION' : 'NOT_PROVIDED';

    return {
      cooling_load_tr: coolingLoadTr,
      cooling_status: coolingStatus,
      cooling_load_basis: coolingBasisText,
      airflow_cfm: airflowCfm,
      fresh_air_cfm: freshAirCfm,
      fresh_air_basis: freshAirBasisText,
      fresh_air_status: freshAirStatus,
      formula_basis: freshAirBasisText,
      provenance: coolingStatus,
      breakdown: {
        base_cfm: airflowCfm || 0,
        fresh_air_occupant_cfm: freshAirOccupantCfm,
        fresh_air_area_cfm: freshAirAreaCfm,
      },
    };
  }
}
