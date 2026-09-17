import { UnifiedProjectModel, SpaceDetail, ProvenanceStatus } from '../domain/models';

export interface ExtractedRequirementData {
  location: string | null;
  building_type: string | null;
  spaces: SpaceDetail[];
  total_spaces: number;
  total_occupants: number;
  cooling_required: boolean;
  ventilation_required: boolean;
  sqft_per_tr?: number;
  missing_information: string[];
  provenance: ProvenanceStatus;
}

export class RequirementExtractorStage {
  public static extract(rawText: string): ExtractedRequirementData {
    const textLower = rawText.toLowerCase();

    // Clean numeric helper (e.g. "10,000" -> 10000)
    const parseNum = (str: string) => parseFloat(str.replace(/,/g, ''));

    // 1. Dynamic Location Detection
    let location: string | null = null;
    const cities = ['Chennai', 'Coimbatore', 'Bangalore', 'Bengaluru', 'Mumbai', 'Madurai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune'];
    for (const city of cities) {
      if (textLower.includes(city.toLowerCase())) {
        location = city === 'Bengaluru' ? 'Bangalore' : city;
        break;
      }
    }

    // 2. Building Type Detection
    let buildingType: string | null = null;
    if (textLower.includes('office')) buildingType = 'Office';
    else if (textLower.includes('hospital') || textLower.includes('clinic')) buildingType = 'Healthcare / Hospital';
    else if (textLower.includes('mall') || textLower.includes('retail')) buildingType = 'Commercial Retail';
    else if (textLower.includes('factory') || textLower.includes('industrial')) buildingType = 'Industrial Facility';
    else if (textLower.includes('hotel') || textLower.includes('restaurant')) buildingType = 'Hospitality';

    // 2b. Cooling Load Basis Extraction
    let sqftPerTr: number | undefined;
    const sqftTrMatch = textLower.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:sq\.?\s*ft\/tr|sqft\/tr|sqft\s*per\s*tr|sq\.?\s*ft\s*per\s*tr)/);
    if (sqftTrMatch) {
      sqftPerTr = parseNum(sqftTrMatch[1]);
    }

    // 3. Space Breakdown Extraction
    const spaces: SpaceDetail[] = [];
    let directAreaSqft: number | undefined;
    const areaMatch = textLower.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square\s*feet|sq\s*meters|sqm)/);
    if (areaMatch) {
      directAreaSqft = parseNum(areaMatch[1]);
    }

    // Check for specific room patterns: e.g. "10 offices", "2 meeting rooms", "reception"
    const officeMatch = textLower.match(/(\d+)\s*(?:offices|private offices)/);
    const meetingMatch = textLower.match(/(\d+)\s*(?:meeting rooms|conference rooms)/);
    const receptionMatch = textLower.includes('reception');

    let totalOccupants = 0;
    const occMatch = textLower.match(/(\d+(?:,\d+)*)\s*(?:people|occupants|persons|staff)/);
    if (occMatch) totalOccupants = parseNum(occMatch[1]);

    if (officeMatch || meetingMatch || receptionMatch) {
      const numOffices = officeMatch ? parseInt(officeMatch[1], 10) : 0;
      const numMeetings = meetingMatch ? parseInt(meetingMatch[1], 10) : 0;
      const hasReception = receptionMatch ? 1 : 0;

      const totalExtractedSpaces = numOffices + numMeetings + hasReception;
      const defaultAreaPerSpace = directAreaSqft ? directAreaSqft / (totalExtractedSpaces || 1) : 500;

      if (numOffices > 0) {
        spaces.push({
          name: `Private Offices (x${numOffices})`,
          area_sqft: defaultAreaPerSpace * numOffices,
          occupants: Math.round(totalOccupants * 0.5) || 50
        });
      }
      if (numMeetings > 0) {
        spaces.push({
          name: `Meeting Rooms (x${numMeetings})`,
          area_sqft: defaultAreaPerSpace * numMeetings,
          occupants: Math.round(totalOccupants * 0.3) || 30
        });
      }
      if (hasReception) {
        spaces.push({
          name: `Reception & Lobby`,
          area_sqft: defaultAreaPerSpace,
          occupants: Math.round(totalOccupants * 0.2) || 20
        });
      }
    } else {
      // General space extraction
      let numSpaces = 1;
      const spacesMatch = textLower.match(/(\d+)\s*(?:rooms|spaces|zones|halls|areas)/);
      if (spacesMatch) numSpaces = parseInt(spacesMatch[1], 10);

      const perSpaceArea = directAreaSqft ? directAreaSqft / numSpaces : 300;
      const perSpaceOcc = Math.round(totalOccupants / numSpaces) || 5;

      for (let i = 1; i <= numSpaces; i++) {
        spaces.push({
          name: `Space ${i}`,
          area_sqft: perSpaceArea,
          occupants: perSpaceOcc
        });
      }
    }

    const missingFields: string[] = [];
    if (!location) missingFields.push('location');
    if (!buildingType) missingFields.push('building_type');
    if (spaces.length === 0) missingFields.push('total_spaces');
    if (!directAreaSqft) missingFields.push('dimensions');
    if (totalOccupants === 0) missingFields.push('occupants');

    return {
      location: location || 'Chennai',
      building_type: buildingType || 'Commercial Office',
      spaces,
      total_spaces: spaces.length,
      total_occupants: totalOccupants || 100,
      sqft_per_tr: sqftPerTr,
      cooling_required: true,
      ventilation_required: true,
      missing_information: missingFields,
      provenance: 'SOURCE_FACT',
    };
  }
}
