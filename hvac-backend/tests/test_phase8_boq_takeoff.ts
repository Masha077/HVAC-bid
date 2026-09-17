import { BOQTakeoffEngine } from '../src/boq/takeoff';
import { UnifiedProjectModel, HVACSizingResult, EquipmentItem, TakeoffBasisConfig } from '../src/domain/models';

async function runPhase8Tests() {
  console.log('======================================================');
  console.log('RUNNING PHASE 8 BOQ / TAKEOFF ENGINE TESTS (AUDITED)');
  console.log('======================================================');

  // Investigation & Explanation of 960 CFM vs 261 CFM:
  console.log('\n--- AIRFLOW ORIGIN AUDIT & INVESTIGATION ---');
  console.log('1. Fresh Air Ventilation Airflow (ASHRAE 62.1): 261 CFM');
  console.log('   Calculation: (15 occupants * 15 CFM/person) + (300 sqft * 0.12 CFM/sqft) = 225 + 36 = 261 CFM');
  console.log('2. Cooling Supply Airflow (derived when cooling load IS configured): 960 CFM');
  console.log('   Calculation: 2.4 TR * 400 CFM/TR = 960 CFM total supply airflow.');
  console.log('3. Policy: 960 CFM is total cooling supply airflow (when 2.4 TR cooling load basis is approved).');
  console.log('   It must NOT be substituted for Phase 4D 261 CFM fresh air ventilation.');

  const baseProject: UnifiedProjectModel = {
    project_id: 'REQ-TEST-P8-01',
    user_id: 'test-user-001',
    mode: 'REQUIREMENT_DRIVEN',
    requested_output_type: 'COMPLETE_BID_PACKAGE',
    location: 'Chennai',
    building_type: 'Office',
    spaces: [
      { name: 'Room 1', length_ft: 10, width_ft: 10, height_ft: 9, area_sqft: 100, volume_cuft: 900, occupants: 5 },
      { name: 'Room 2', length_ft: 10, width_ft: 10, height_ft: 9, area_sqft: 100, volume_cuft: 900, occupants: 5 },
      { name: 'Room 3', length_ft: 10, width_ft: 10, height_ft: 9, area_sqft: 100, volume_cuft: 900, occupants: 5 },
    ],
    total_spaces: 3,
    total_area_sqft: 300,
    total_volume_cuft: 2700,
    total_occupants: 15,
    cooling_required: true,
    ventilation_required: true,
    missing_information: [],
    raw_input: '300 sqft office in Chennai for 15 occupants',
    documents_meta: [],
    fact_provenance: [],
    conflicts: [],
  };

  const sizingValid: HVACSizingResult = {
    cooling_load_tr: 2.4,
    cooling_status: 'DETERMINISTIC_CALCULATION',
    airflow_cfm: 960,
    fresh_air_cfm: 261,
    formula_basis: 'ASHRAE 62.1 & Configured Cooling Basis',
    provenance: 'DETERMINISTIC_CALCULATION',
    breakdown: {},
  };

  // TEST CASE 1: Verified Priced Equipment Case
  console.log('\n--- CASE 1: Verified Priced Equipment Case ---');
  const pricedEquipment: EquipmentItem[] = [
    {
      id: 'EQ-01',
      type: 'Commercial Inverter Ductable Split Unit',
      capacity: '2.4 TR (8.4 kW)',
      airflow: '960 CFM',
      quantity: 1,
      application: 'Comfort Cooling & Dehumidification',
      status: 'VERIFIED',
      manufacturer: 'Daikin Industries India',
      model: 'FDBHQ36BAV16',
      voltage: '415V / 3Ph / 50Hz',
      efficiency: 'ISEER 4.2',
      unit_price: 125000,
      total_price: 125000,
      currency: 'INR',
      price_basis: 'Ex-Factory',
      price_verification_status: 'VERIFIED',
      supplier: 'Chennai HVAC Distributors Pvt Ltd',
      supplier_verification_status: 'VERIFIED',
      verification_status: 'VERIFIED',
    },
  ];

  const boq1 = BOQTakeoffEngine.generateTakeoff(baseProject, sizingValid, pricedEquipment);
  console.log('Priced Equipment BOQ Line 1:', boq1[0].item_code, boq1[0].unit_rate, boq1[0].total_amount, boq1[0].verification_status);

  if (boq1[0].unit_rate === 125000 && boq1[0].total_amount === 125000 && boq1[0].verification_status === 'VERIFIED') {
    console.log('CASE 1 RESULT: PASS (Verified unit price and line total generated for primary equipment)');
  } else {
    console.error('CASE 1 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 2: Unpriced Equipment Case
  console.log('\n--- CASE 2: Unpriced Equipment Case ---');
  const unpricedEquipment: EquipmentItem[] = [
    {
      ...pricedEquipment[0],
      unit_price: null,
      total_price: null,
      price_verification_status: 'PRICE_DATA_NOT_YET_VERIFIED',
    },
  ];

  const boq2 = BOQTakeoffEngine.generateTakeoff(baseProject, sizingValid, unpricedEquipment);
  console.log('Unpriced Equipment BOQ Line 1:', boq2[0].item_code, boq2[0].unit_rate, boq2[0].total_amount, boq2[0].verification_status);

  if (boq2[0].unit_rate === null && boq2[0].total_amount === null && boq2[0].verification_status === 'PRICE_DATA_NOT_YET_VERIFIED') {
    console.log('CASE 2 RESULT: PASS (Preserved null unit rate and line total for unpriced equipment)');
  } else {
    console.error('CASE 2 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 3: Unconfigured Auxiliary Quantities (Must remain null / NEEDS_REVIEW, no fabricated estimates)
  console.log('\n--- CASE 3: Unconfigured Auxiliary Quantities Gate ---');
  const boq3 = BOQTakeoffEngine.generateTakeoff(baseProject, sizingValid, pricedEquipment);
  const ductworkUnconf = boq3.find((i) => i.item_code === '23-31-13');
  const diffusersUnconf = boq3.find((i) => i.item_code === '23-37-13');
  const copperPipeUnconf = boq3.find((i) => i.item_code === '23-23-00');
  const drainPipeUnconf = boq3.find((i) => i.item_code === '23-21-13');

  console.log('Unconfigured Ductwork Quantity:', ductworkUnconf?.quantity, 'Status:', ductworkUnconf?.verification_status);
  console.log('Unconfigured Diffusers Quantity:', diffusersUnconf?.quantity, 'Status:', diffusersUnconf?.verification_status);
  console.log('Unconfigured Copper Pipe Quantity:', copperPipeUnconf?.quantity, 'Status:', copperPipeUnconf?.verification_status);
  console.log('Unconfigured Drain Pipe Quantity:', drainPipeUnconf?.quantity, 'Status:', drainPipeUnconf?.verification_status);

  if (
    ductworkUnconf?.quantity === null &&
    ductworkUnconf?.verification_status === 'NEEDS_REVIEW' &&
    diffusersUnconf?.quantity === null &&
    diffusersUnconf?.verification_status === 'NEEDS_REVIEW' &&
    copperPipeUnconf?.quantity === null &&
    copperPipeUnconf?.verification_status === 'NEEDS_REVIEW' &&
    drainPipeUnconf?.quantity === null &&
    drainPipeUnconf?.verification_status === 'NEEDS_REVIEW'
  ) {
    console.log('CASE 3 RESULT: PASS (Auxiliary quantities remain null and NEEDS_REVIEW when no approved basis is provided)');
  } else {
    console.error('CASE 3 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 4: Configured Takeoff Basis Calculation Case
  console.log('\n--- CASE 4: Configured Takeoff Basis Calculation Case ---');
  const approvedTakeoffConfig: TakeoffBasisConfig = {
    ductwork_sqft_per_10_cfm: 1.2,
    diffuser_cfm_capacity: 200,
    copper_pipe_rft_per_tr: 15,
    drain_pipe_rft_per_room: 15,
    cabling_sets_per_equipment: 1,
    allow_lump_sum_commissioning: true,
    source_provenance: 'PROJECT_SPECIFICATION_SECTION_15',
  };

  const boq4 = BOQTakeoffEngine.generateTakeoff(baseProject, sizingValid, pricedEquipment, approvedTakeoffConfig);
  const ductworkConf = boq4.find((i) => i.item_code === '23-31-13');
  const insulationConf = boq4.find((i) => i.item_code === '23-07-13');
  const diffusersConf = boq4.find((i) => i.item_code === '23-37-13');
  const copperPipeConf = boq4.find((i) => i.item_code === '23-23-00');
  const drainPipeConf = boq4.find((i) => i.item_code === '23-21-13');
  const cablingConf = boq4.find((i) => i.item_code === '23-09-00');

  console.log('Configured Ductwork:', ductworkConf?.quantity, 'sqft (Expected: 116), Basis:', ductworkConf?.calculation_basis);
  console.log('Configured Insulation:', insulationConf?.quantity, 'sqft (Expected: 116)');
  console.log('Configured Diffusers:', diffusersConf?.quantity, 'nos (Expected: 5)');
  console.log('Configured Copper Pipe:', copperPipeConf?.quantity, 'Rft (Expected: 36)');
  console.log('Configured Drain Pipe:', drainPipeConf?.quantity, 'Rft (Expected: 45)');
  console.log('Configured Cabling:', cablingConf?.quantity, 'set (Expected: 1)');

  if (
    ductworkConf?.quantity === 116 &&
    insulationConf?.quantity === 116 &&
    diffusersConf?.quantity === 5 &&
    copperPipeConf?.quantity === 36 &&
    drainPipeConf?.quantity === 45 &&
    cablingConf?.quantity === 1 &&
    ductworkConf?.provenance === 'PROJECT_SPECIFICATION_SECTION_15' &&
    ductworkConf?.calculation_basis !== undefined
  ) {
    console.log('CASE 4 RESULT: PASS (Deterministic quantities computed cleanly using explicit approved takeoff basis)');
  } else {
    console.error('CASE 4 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 5: Blocked Engineering Case
  console.log('\n--- CASE 5: Blocked Engineering Case ---');
  const sizingBlocked: HVACSizingResult = {
    cooling_load_tr: null,
    cooling_status: 'NEEDS_REVIEW',
    airflow_cfm: null,
    fresh_air_cfm: 261,
    formula_basis: 'ASHRAE 62.1',
    provenance: 'NEEDS_REVIEW',
    breakdown: {},
  };

  const boq5 = BOQTakeoffEngine.generateTakeoff(baseProject, sizingBlocked, [], approvedTakeoffConfig);
  const ductworkBlocked = boq5.find((i) => i.item_code === '23-31-13');
  const copperBlocked = boq5.find((i) => i.item_code === '23-23-00');

  console.log('Blocked Ductwork Quantity:', ductworkBlocked?.quantity, 'Status:', ductworkBlocked?.verification_status);
  console.log('Blocked Copper Pipe Quantity:', copperBlocked?.quantity, 'Status:', copperBlocked?.verification_status);

  if (
    ductworkBlocked?.quantity === null &&
    ductworkBlocked?.verification_status === 'NEEDS_REVIEW' &&
    copperBlocked?.quantity === null &&
    copperBlocked?.verification_status === 'NEEDS_REVIEW'
  ) {
    console.log('CASE 5 RESULT: PASS (Auxiliary BOQ quantities remain null and NEEDS_REVIEW when engineering is blocked)');
  } else {
    console.error('CASE 5 RESULT: FAIL');
    process.exit(1);
  }

  // TEST CASE 6: Mixed Priced / Unpriced BOQ Case
  console.log('\n--- CASE 6: Mixed Priced / Unpriced BOQ Case ---');
  const mixedEquipment: EquipmentItem[] = [
    pricedEquipment[0], // Priced Unit
    {
      id: 'EQ-02',
      type: 'Inline Centrifugal Fresh Air Supply Fan with HEPA/Pre-Filter',
      capacity: 'Ventilation Airflow',
      airflow: '261 CFM',
      quantity: 1,
      application: 'ASHRAE 62.1 Fresh Air Ventilation',
      status: 'REQUIRES_VERIFIED_CATALOG_DATA',
      manufacturer: null,
      model: null,
      voltage: null,
      efficiency: null,
      unit_price: null,
      total_price: null,
      price_verification_status: 'PRICE_DATA_NOT_YET_VERIFIED',
      supplier: null,
      supplier_verification_status: 'NEEDS_VERIFIED_SUPPLIER_DATA',
      verification_status: 'REQUIRES_VERIFIED_CATALOG_DATA',
    },
  ];

  const boq6 = BOQTakeoffEngine.generateTakeoff(baseProject, sizingValid, mixedEquipment);
  console.log('BOQ Item 1 (Priced Equipment):', boq6[0].item_code, 'Total:', boq6[0].total_amount, 'Status:', boq6[0].verification_status);
  console.log('BOQ Item 2 (Unpriced Equipment):', boq6[1].item_code, 'Total:', boq6[1].total_amount, 'Status:', boq6[1].verification_status);
  console.log('BOQ Item 3 (Unconfigured Ductwork):', boq6[2].item_code, 'Qty:', boq6[2].quantity, 'Status:', boq6[2].verification_status);

  if (
    boq6[0].total_amount === 125000 &&
    boq6[0].verification_status === 'VERIFIED' &&
    boq6[1].total_amount === null &&
    (boq6[1].verification_status === 'REQUIRES_VERIFIED_CATALOG_DATA' || boq6[1].verification_status === 'PRICE_DATA_NOT_YET_VERIFIED') &&
    boq6[2].quantity === null &&
    boq6[2].verification_status === 'NEEDS_REVIEW'
  ) {
    console.log('CASE 6 RESULT: PASS (Mixed priced/unpriced BOQ accurately segregates verified equipment pricing from unpriced lines)');
  } else {
    console.error('CASE 6 RESULT: FAIL');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('PHASE 8 TEST SUMMARY: ALL 6 AUDITED BOQ TAKEOFF CASES PASSED!');
  console.log('======================================================');
}

runPhase8Tests();
