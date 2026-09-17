import { UnifiedProjectModel, HVACSizingResult, EquipmentItem, BOQItem, TakeoffBasisConfig } from '../domain/models';

export class BOQTakeoffEngine {
  public static generateTakeoff(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    equipment: EquipmentItem[],
    takeoffConfig?: TakeoffBasisConfig
  ): BOQItem[] {
    const config = takeoffConfig || project.takeoff_config;
    const isEngineeringBlocked = sizing.cooling_load_tr === null || sizing.cooling_status === 'NEEDS_REVIEW';
    const totalTr = isEngineeringBlocked ? null : sizing.cooling_load_tr;
    const totalCfm = isEngineeringBlocked ? null : (sizing.airflow_cfm || sizing.fresh_air_cfm || null);

    const boq: BOQItem[] = [];

    // 1. Primary Equipment (CSI Division 23 80 00)
    equipment.forEach((eq, idx) => {
      const isPriceVerified = eq.price_verification_status === 'VERIFIED' && eq.unit_price !== null;
      const unitRate = isPriceVerified ? eq.unit_price : null;
      const totalAmount = isPriceVerified && eq.total_price !== null ? eq.total_price : null;
      const itemVerificationStatus = isPriceVerified
        ? 'VERIFIED'
        : eq.verification_status === 'VERIFIED'
        ? 'PRICE_DATA_NOT_YET_VERIFIED'
        : eq.verification_status || 'REQUIRES_VERIFIED_CATALOG_DATA';

      const mfgModelText = eq.manufacturer && eq.model ? ` OEM: ${eq.manufacturer} (${eq.model}).` : '';
      const supplierText = eq.supplier ? ` Verified Supplier: ${eq.supplier}.` : '';

      boq.push({
        item_code: `23-80-0${idx + 1}`,
        category: 'Primary HVAC Equipment',
        description: `${eq.type} — ${eq.capacity}, Airflow: ${eq.airflow}.${mfgModelText}${supplierText}`,
        specification: `Application: ${eq.application}. Voltage: ${eq.voltage || 'Standard'}.`,
        quantity: eq.quantity,
        unit: 'nos',
        unit_rate: unitRate,
        total_amount: totalAmount,
        currency: isPriceVerified ? eq.currency || 'INR' : null,
        catalog_id: eq.id,
        supplier_id: eq.supplier ? 'SUP-VERIFIED' : null,
        verification_status: itemVerificationStatus,
        provenance: eq.price_provenance || eq.supplier_provenance || eq.status || 'SOURCE_FACT',
        calculation_basis: 'VERIFIED_EQUIPMENT_SELECTION',
        inputs_used: {
          equipment_id: eq.id,
          type: eq.type,
          capacity: eq.capacity,
          unit_price: eq.unit_price,
        },
      });
    });

    // 2. GI Ductwork Takeoff (CSI Division 23 31 13)
    let ductQuantity: number | null = null;
    let ductStatus: string = 'NEEDS_REVIEW';
    let ductProvenance: string = 'NEEDS_REVIEW';
    let ductSpec = 'Quantity requires approved duct design/drawing layout or explicit takeoff basis configuration. Hardcoded rules-of-thumb prohibited.';
    let ductBasis = 'NO_APPROVED_TAKEOFF_BASIS';

    if (!isEngineeringBlocked && totalCfm !== null && config?.ductwork_sqft_per_10_cfm !== undefined) {
      const ratio = config.ductwork_sqft_per_10_cfm;
      ductQuantity = Math.ceil((totalCfm / 10) * ratio);
      ductStatus = 'PRICE_DATA_NOT_YET_VERIFIED';
      ductProvenance = config.source_provenance || 'APPROVED_TAKEOFF_BASIS';
      ductSpec = `Calculated deterministically at ${ratio} sq.ft duct surface per 10 CFM airflow based on approved takeoff basis (${config.source_provenance || 'CONFIGURED_BASIS'}).`;
      ductBasis = `${totalCfm} CFM * (${ratio} sqft / 10 CFM)`;
    }

    boq.push({
      item_code: '23-31-13',
      category: 'Ductwork & Air Distribution',
      description: 'Factory-fabricated Galvanized Iron (GI) Sheet Metal Ducting (24G / 22G as per IS 655 / SMACNA standards)',
      specification: ductSpec,
      quantity: ductQuantity,
      unit: 'sqft',
      unit_rate: null,
      total_amount: null,
      verification_status: ductStatus,
      provenance: ductProvenance,
      calculation_basis: ductBasis,
      inputs_used: {
        total_cfm: totalCfm,
        sqft_per_10_cfm_ratio: config?.ductwork_sqft_per_10_cfm ?? null,
      },
    });

    // 3. Thermal Insulation (CSI Division 23 07 13)
    let insQuantity: number | null = ductQuantity;
    let insStatus: string = ductQuantity !== null ? 'PRICE_DATA_NOT_YET_VERIFIED' : 'NEEDS_REVIEW';
    let insProvenance: string = ductProvenance;
    let insSpec = ductQuantity !== null
      ? `Duct acoustic/thermal insulation covering sheet metal surface area (${ductQuantity} sqft) based on approved ductwork takeoff basis.`
      : 'Quantity requires approved duct design/drawing layout or explicit takeoff basis configuration. Hardcoded rules-of-thumb prohibited.';
    let insBasis = ductQuantity !== null ? `Match duct surface area: ${ductQuantity} sqft` : 'NO_APPROVED_TAKEOFF_BASIS';

    boq.push({
      item_code: '23-07-13',
      category: 'Duct & Pipe Insulation',
      description: 'Class O Closed Cell Nitrile Rubber Thermal Duct Insulation (19mm thickness with Aluminium Foil facing)',
      specification: insSpec,
      quantity: insQuantity,
      unit: 'sqft',
      unit_rate: null,
      total_amount: null,
      verification_status: insStatus,
      provenance: insProvenance,
      calculation_basis: insBasis,
      inputs_used: {
        duct_surface_area_sqft: ductQuantity,
      },
    });

    // 4. Air Terminal Devices - Diffusers & Grilles (CSI Division 23 37 13)
    let diffQuantity: number | null = null;
    let diffStatus: string = 'NEEDS_REVIEW';
    let diffProvenance: string = 'NEEDS_REVIEW';
    let diffSpec = 'Quantity requires approved air distribution layout or explicit diffuser CFM capacity basis. Hardcoded rules-of-thumb prohibited.';
    let diffBasis = 'NO_APPROVED_TAKEOFF_BASIS';

    if (!isEngineeringBlocked && totalCfm !== null && config?.diffuser_cfm_capacity !== undefined) {
      const cap = config.diffuser_cfm_capacity;
      diffQuantity = Math.ceil(totalCfm / cap);
      diffStatus = 'PRICE_DATA_NOT_YET_VERIFIED';
      diffProvenance = config.source_provenance || 'APPROVED_TAKEOFF_BASIS';
      diffSpec = `Calculated at ${cap} CFM nominal air handling capacity per diffuser based on approved takeoff basis (${config.source_provenance || 'CONFIGURED_BASIS'}).`;
      diffBasis = `Math.ceil(${totalCfm} CFM / ${cap} CFM per diffuser)`;
    }

    boq.push({
      item_code: '23-37-13',
      category: 'Air Outlets & Inlets',
      description: 'Extruded Aluminium 4-Way Supply / Return Air Diffusers with Volume Control Damper (VCD)',
      specification: diffSpec,
      quantity: diffQuantity,
      unit: 'nos',
      unit_rate: null,
      total_amount: null,
      verification_status: diffStatus,
      provenance: diffProvenance,
      calculation_basis: diffBasis,
      inputs_used: {
        total_cfm: totalCfm,
        diffuser_cfm_capacity: config?.diffuser_cfm_capacity ?? null,
      },
    });

    // 5. Refrigerant Copper Piping (CSI Division 23 23 00)
    let copperQuantity: number | null = null;
    let copperStatus: string = 'NEEDS_REVIEW';
    let copperProvenance: string = 'NEEDS_REVIEW';
    let copperSpec = 'Quantity requires approved piping routing layout or explicit Rft/TR takeoff basis. Hardcoded rules-of-thumb prohibited.';
    let copperBasis = 'NO_APPROVED_TAKEOFF_BASIS';

    if (!isEngineeringBlocked && totalTr !== null && totalTr > 0 && config?.copper_pipe_rft_per_tr !== undefined) {
      const rftPerTr = config.copper_pipe_rft_per_tr;
      copperQuantity = Math.ceil(totalTr * rftPerTr);
      copperStatus = 'PRICE_DATA_NOT_YET_VERIFIED';
      copperProvenance = config.source_provenance || 'APPROVED_TAKEOFF_BASIS';
      copperSpec = `Calculated at ${rftPerTr} Rft per TR total cooling capacity based on approved takeoff basis (${config.source_provenance || 'CONFIGURED_BASIS'}).`;
      copperBasis = `Math.ceil(${totalTr} TR * ${rftPerTr} Rft/TR)`;
    }

    boq.push({
      item_code: '23-23-00',
      category: 'Refrigerant Piping & Fittings',
      description: 'VRF/Split Hard-Drawn Copper Refrigerant Tubing (Liquid & Gas lines) with Nitrile Insulation sleeve',
      specification: copperSpec,
      quantity: copperQuantity,
      unit: 'Rft',
      unit_rate: null,
      total_amount: null,
      verification_status: copperStatus,
      provenance: copperProvenance,
      calculation_basis: copperBasis,
      inputs_used: {
        cooling_load_tr: totalTr,
        rft_per_tr: config?.copper_pipe_rft_per_tr ?? null,
      },
    });

    // 6. Condensate Drain Piping (CSI Division 23 21 13)
    let drainQuantity: number | null = null;
    let drainStatus: string = 'NEEDS_REVIEW';
    let drainProvenance: string = 'NEEDS_REVIEW';
    let drainSpec = 'Quantity requires approved drain line routing layout or explicit Rft/space takeoff basis. Hardcoded rules-of-thumb prohibited.';
    let drainBasis = 'NO_APPROVED_TAKEOFF_BASIS';

    if (!isEngineeringBlocked && project.total_spaces > 0 && config?.drain_pipe_rft_per_room !== undefined) {
      const rftPerRoom = config.drain_pipe_rft_per_room;
      drainQuantity = project.total_spaces * rftPerRoom;
      drainStatus = 'PRICE_DATA_NOT_YET_VERIFIED';
      drainProvenance = config.source_provenance || 'APPROVED_TAKEOFF_BASIS';
      drainSpec = `Calculated at ${rftPerRoom} Rft per indoor air-conditioned zone based on approved takeoff basis (${config.source_provenance || 'CONFIGURED_BASIS'}).`;
      drainBasis = `${project.total_spaces} spaces * ${rftPerRoom} Rft/space`;
    }

    boq.push({
      item_code: '23-21-13',
      category: 'Hydronic / Drain Piping',
      description: 'Heavy-Duty uPVC Condensate Drain Water Piping (32mm dia) with Thermal Insulation',
      specification: drainSpec,
      quantity: drainQuantity,
      unit: 'Rft',
      unit_rate: null,
      total_amount: null,
      verification_status: drainStatus,
      provenance: drainProvenance,
      calculation_basis: drainBasis,
      inputs_used: {
        total_spaces: project.total_spaces,
        rft_per_room: config?.drain_pipe_rft_per_room ?? null,
      },
    });

    // 7. Electrical Cabling & MCB Isolators (CSI Division 23 09 00)
    let cablingQuantity: number | null = null;
    let cablingStatus: string = 'NEEDS_REVIEW';
    let cablingProvenance: string = 'NEEDS_REVIEW';
    let cablingSpec = 'Quantity requires approved electrical single line diagram or explicit cabling set takeoff basis.';
    let cablingBasis = 'NO_APPROVED_TAKEOFF_BASIS';

    if (!isEngineeringBlocked && equipment.length > 0 && config?.cabling_sets_per_equipment !== undefined) {
      const setsPerEq = config.cabling_sets_per_equipment;
      cablingQuantity = Math.ceil(equipment.length * setsPerEq);
      cablingStatus = 'PRICE_DATA_NOT_YET_VERIFIED';
      cablingProvenance = config.source_provenance || 'APPROVED_TAKEOFF_BASIS';
      cablingSpec = `Calculated at ${setsPerEq} electrical set per equipment item based on approved takeoff basis.`;
      cablingBasis = `${equipment.length} equipment items * ${setsPerEq} sets`;
    }

    boq.push({
      item_code: '23-09-00',
      category: 'Controls & Electrical Wiring',
      description: 'FRLS Armoured Power & Communication Cabling from Isolator to Indoor/Outdoor Units with Rotary Disconnect Isolator',
      specification: cablingSpec,
      quantity: cablingQuantity,
      unit: 'set',
      unit_rate: null,
      total_amount: null,
      verification_status: cablingStatus,
      provenance: cablingProvenance,
      calculation_basis: cablingBasis,
      inputs_used: {
        equipment_count: equipment.length,
        sets_per_equipment: config?.cabling_sets_per_equipment ?? null,
      },
    });

    // 8. Erection, Testing & Commissioning (CSI Division 23 08 00)
    let servicesQuantity: number | null = null;
    let servicesStatus: string = 'NEEDS_REVIEW';
    let servicesProvenance: string = 'NEEDS_REVIEW';
    let servicesSpec = 'Commissioning lot quantity requires explicit project scope approval or tender specification.';
    let servicesBasis = 'NO_APPROVED_TAKEOFF_BASIS';

    if (!isEngineeringBlocked && config?.allow_lump_sum_commissioning === true) {
      servicesQuantity = 1;
      servicesStatus = 'PRICE_DATA_NOT_YET_VERIFIED';
      servicesProvenance = config.source_provenance || 'APPROVED_TAKEOFF_BASIS';
      servicesSpec = 'Site installation services lot based on approved project scope.';
      servicesBasis = 'LUMP_SUM_SERVICE_LOT';
    }

    boq.push({
      item_code: '23-08-00',
      category: 'Services & Commissioning',
      description: 'Erection, Vacuumization, Nitrogen Pressure Testing, Refrigerant Charging, Air Balancing & Commissioning (TAB)',
      specification: servicesSpec,
      quantity: servicesQuantity,
      unit: 'lot',
      unit_rate: null,
      total_amount: null,
      verification_status: servicesStatus,
      provenance: servicesProvenance,
      calculation_basis: servicesBasis,
      inputs_used: {
        allow_lump_sum_commissioning: config?.allow_lump_sum_commissioning ?? false,
      },
    });

    return boq;
  }
}
