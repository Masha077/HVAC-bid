import { UnifiedProjectModel, WorkflowMode, SpaceDetail, RequestedOutputType } from '../domain/models';

export class UnifiedProjectNormalizer {
  public static normalizeRequirement(
    projectId: string,
    userId: string,
    rawText: string,
    requestedOutputType: RequestedOutputType = 'COMPLETE_BID_PACKAGE'
  ): UnifiedProjectModel {
    const textLower = rawText.toLowerCase();

    // 1. Extract Location
    let location: string | null = null;
    if (textLower.includes('chennai')) {
      location = 'Chennai';
    } else if (textLower.includes('coimbatore')) {
      location = 'Coimbatore';
    } else if (textLower.includes('bangalore') || textLower.includes('bengaluru')) {
      location = 'Bangalore';
    } else if (textLower.includes('mumbai')) {
      location = 'Mumbai';
    } else if (textLower.includes('madurai')) {
      location = 'Madurai';
    }

    // 2. Extract Building Type
    let buildingType: string | null = null;
    if (textLower.includes('office')) buildingType = 'Office';
    else if (textLower.includes('hospital') || textLower.includes('clinic')) buildingType = 'Healthcare / Hospital';
    else if (textLower.includes('mall') || textLower.includes('retail')) buildingType = 'Commercial Retail';
    else if (textLower.includes('factory') || textLower.includes('industrial')) buildingType = 'Industrial Facility';
    else if (textLower.includes('hotel') || textLower.includes('restaurant')) buildingType = 'Hospitality';

    // 3. Extract Spaces & Dimensions
    let numSpaces = 0;
    const spacesMatch = textLower.match(/(\d+)\s*(?:rooms|spaces|zones|halls|areas)/);
    if (spacesMatch) {
      numSpaces = parseInt(spacesMatch[1], 10);
    }

    let lengthFt: number | undefined;
    let widthFt: number | undefined;
    let heightFt: number | undefined;

    const lengthMatch = textLower.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|m|meter)?\s*(?:long|length)/);
    const widthMatch = textLower.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|m|meter)?\s*(?:wide|width)/);
    const heightMatch = textLower.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|m|meter)?\s*(?:ceiling|height|high)/);

    if (lengthMatch) lengthFt = parseFloat(lengthMatch[1]);
    if (widthMatch) widthFt = parseFloat(widthMatch[1]);
    if (heightMatch) heightFt = parseFloat(heightMatch[1]);

    if (!lengthFt || !widthFt) {
      const dimXMatch = textLower.match(/(\d+(?:\.\d+)?)\s*(?:ft|m)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:ft|m)?(?:\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:ft|m)?)?/);
      if (dimXMatch) {
        lengthFt = parseFloat(dimXMatch[1]);
        widthFt = parseFloat(dimXMatch[2]);
        if (dimXMatch[3]) heightFt = parseFloat(dimXMatch[3]);
      }
    }

    // 4. Extract Occupants
    let occupantsPerRoom: number | undefined;
    const occupantsMatch = textLower.match(/(\d+)\s*(?:people|occupants|persons|staff)\s*(?:each|per room|per space)?/);
    if (occupantsMatch) {
      occupantsPerRoom = parseInt(occupantsMatch[1], 10);
    }

    if (numSpaces === 0 && (lengthFt || widthFt || occupantsPerRoom)) {
      numSpaces = 1;
    }

    const spaces: SpaceDetail[] = [];
    const missingFields: string[] = [];

    if (!location) missingFields.push('location');
    if (!buildingType) missingFields.push('building_type');
    if (numSpaces === 0) missingFields.push('total_spaces');
    if (!lengthFt || !widthFt) missingFields.push('dimensions');
    if (!occupantsPerRoom) missingFields.push('occupants');

    let totalAreaSqft = 0;
    let totalVolumeCuft = 0;
    let totalOccupants = 0;

    for (let i = 1; i <= numSpaces; i++) {
      const area = lengthFt && widthFt ? lengthFt * widthFt : undefined;
      const volume = area && heightFt ? area * heightFt : undefined;
      const occ = occupantsPerRoom || 0;

      if (area) totalAreaSqft += area;
      if (volume) totalVolumeCuft += volume;
      totalOccupants += occ;

      spaces.push({
        name: `Room ${i}`,
        length_ft: lengthFt,
        width_ft: widthFt,
        height_ft: heightFt,
        area_sqft: area,
        volume_cuft: volume,
        occupants: occ,
      });
    }

    const coolingRequired = textLower.includes('air conditioning') || textLower.includes('cooling') || textLower.includes('ac');
    const ventilationRequired = textLower.includes('ventilation') || textLower.includes('fresh air');

    return {
      project_id: projectId,
      user_id: userId,
      mode: 'REQUIREMENT_DRIVEN',
      requested_output_type: requestedOutputType,
      location,
      building_type: buildingType,
      spaces,
      total_spaces: numSpaces,
      total_area_sqft: totalAreaSqft,
      total_volume_cuft: totalVolumeCuft,
      total_occupants: totalOccupants,
      cooling_required: coolingRequired,
      ventilation_required: ventilationRequired,
      missing_information: missingFields,
      raw_input: rawText,
      documents_meta: [],
      fact_provenance: [],
      conflicts: [],
    };
  }
}
