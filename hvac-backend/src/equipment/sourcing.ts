import {
  UnifiedProjectModel,
  HVACSizingResult,
  AuditReport,
  EquipmentItem,
  VerifiedCatalogRecord,
  VerifiedSupplierRecord,
  VerifiedPriceRecord,
  EquipmentMatchingConfig,
} from '../domain/models';
import { supabaseAdmin } from '../config/supabase';

export interface CatalogLookupOptions {
  catalogRecords?: VerifiedCatalogRecord[];
  supplierRecords?: VerifiedSupplierRecord[];
  priceRecords?: VerifiedPriceRecord[];
  matchingConfig?: EquipmentMatchingConfig;
  allowTestData?: boolean;
}

export function isEquipmentTypeCompatible(reqType: string, catalogType: string): boolean {
  if (!reqType || !catalogType) return false;
  const normReq = reqType.toLowerCase().trim();
  const normCat = catalogType.toLowerCase().trim();

  if (normReq === normCat) return true;

  // Split / Ductable split unit compatibility
  if (
    (normReq.includes('split') || normReq.includes('ductable')) &&
    (normCat.includes('split') || normCat.includes('ductable'))
  ) {
    return true;
  }

  // VRF / VRV compatibility
  if (
    (normReq.includes('vrf') || normReq.includes('vrv')) &&
    (normCat.includes('vrf') || normCat.includes('vrv'))
  ) {
    return true;
  }

  // Chiller compatibility
  if (normReq.includes('chiller') && normCat.includes('chiller')) {
    return true;
  }

  // AHU / Air Handling Unit compatibility
  if (normReq.includes('ahu') && normCat.includes('ahu')) {
    return true;
  }

  // Fan / Ventilation fan compatibility
  if (
    (normReq.includes('fan') || normReq.includes('ventilation')) &&
    (normCat.includes('fan') || normCat.includes('ventilation'))
  ) {
    return true;
  }

  return false;
}

export class EquipmentSourcingEngine {
  public static async selectAndSource(
    project: UnifiedProjectModel,
    sizing: HVACSizingResult,
    audit: AuditReport,
    options?: CatalogLookupOptions
  ): Promise<EquipmentItem[]> {
    // 1. BLOCKED-ENGINEERING CASE: Equipment selection must be blocked when cooling_load_tr is null/NEEDS_REVIEW or conflicts exist
    if (
      !audit ||
      !audit.equipment_selection_allowed ||
      sizing.cooling_load_tr === null ||
      sizing.cooling_status === 'NEEDS_REVIEW' ||
      (project.conflicts && project.conflicts.length > 0)
    ) {
      return [];
    }

    const city = project.location || 'Chennai';
    const totalTr = sizing.cooling_load_tr;
    const totalCfm = sizing.airflow_cfm || 0;
    const freshAirCfm = sizing.fresh_air_cfm || 0;

    const reqSystemType =
      totalTr <= 5.0
        ? 'Commercial Inverter Ductable Split Unit'
        : 'Modular Commercial VRF Outdoor Unit (HP / Heat Recovery)';

    const matchingConfig = options?.matchingConfig || {};
    const maxOversizePercent = matchingConfig.allow_exact_match_only ? 0 : (matchingConfig.max_oversize_percent ?? 0);
    const maxUndersizePercent = matchingConfig.max_undersize_percent ?? 0;
    const allowTestData = options?.allowTestData ?? false;

    const minCapacity = totalTr * (1 - maxUndersizePercent / 100);
    const maxCapacity = totalTr * (1 + maxOversizePercent / 100);

    // 2. Query & Match Verified Equipment Catalog
    let verifiedCatalogItem: VerifiedCatalogRecord | null = null;
    let candidateRecords: VerifiedCatalogRecord[] = [];

    if (options && options.catalogRecords !== undefined) {
      candidateRecords = options.catalogRecords;
    } else {
      try {
        const { data: catalogData } = await supabaseAdmin
          .from('equipment_catalog')
          .select('*')
          .eq('verification_status', 'VERIFIED')
          .gte('capacity_tr', minCapacity)
          .lte('capacity_tr', maxCapacity)
          .order('capacity_tr', { ascending: true });

        if (catalogData && catalogData.length > 0) {
          candidateRecords = catalogData.map((d: any) => ({
            catalog_id: d.catalog_id || d.id,
            equipment_type: d.equipment_type || d.type || 'Commercial Inverter Ductable Split Unit',
            manufacturer: d.manufacturer,
            model: d.model,
            capacity_tr: d.capacity_tr,
            capacity_kw: d.capacity_kw,
            airflow_cfm: d.airflow_cfm,
            voltage: d.voltage,
            refrigerant: d.refrigerant,
            efficiency: d.efficiency,
            datasheet_url: d.datasheet_url,
            source_provenance: d.source_provenance || d.source || 'VERIFIED_CATALOG_DB',
            verification_status: d.verification_status || 'VERIFIED',
            is_test_data: d.is_test_data || d.source_provenance === 'TEST_DATA',
          }));
        }
      } catch {
        // Non-blocking catalog lookup fallback
      }
    }

    // Filter candidate catalog records strictly by verification, test data flag, equipment type, and capacity tolerance
    const compliantMatches = candidateRecords.filter((rec) => {
      if (rec.verification_status !== 'VERIFIED') return false;
      if (!allowTestData && (rec.is_test_data || rec.source_provenance === 'TEST_DATA')) return false;
      if (!isEquipmentTypeCompatible(reqSystemType, rec.equipment_type)) return false;
      if (rec.capacity_tr < minCapacity - 0.001 || rec.capacity_tr > maxCapacity + 0.001) return false;
      return true;
    });

    if (compliantMatches.length > 0) {
      compliantMatches.sort((a, b) => Math.abs(a.capacity_tr - totalTr) - Math.abs(b.capacity_tr - totalTr));
      verifiedCatalogItem = compliantMatches[0];
    }

    // 3. Query & Match Verified Supplier Records
    let matchedSupplier: VerifiedSupplierRecord | null = null;
    let candidateSuppliers: VerifiedSupplierRecord[] = [];

    if (options && options.supplierRecords !== undefined) {
      candidateSuppliers = options.supplierRecords;
    } else if (options && (options.catalogRecords !== undefined || options.priceRecords !== undefined)) {
      candidateSuppliers = [];
    } else {
      try {
        const { data: supplierData } = await supabaseAdmin
          .from('suppliers')
          .select('*')
          .eq('verification_status', 'VERIFIED')
          .ilike('city', `%${city}%`);

        if (supplierData && supplierData.length > 0) {
          candidateSuppliers = supplierData.map((d: any) => ({
            supplier_id: d.supplier_id || d.id,
            name: d.name,
            category: d.category,
            city: d.city,
            address: d.address,
            phone: d.phone,
            email: d.email,
            source_url: d.source_url,
            supported_manufacturers: d.supported_manufacturers || (d.category ? [d.category] : []),
            supported_equipment_types: d.supported_equipment_types || [],
            verification_status: d.verification_status || 'VERIFIED',
            source_provenance: d.source_provenance || 'VERIFIED_SUPPLIER_DB',
            is_test_data: d.is_test_data || d.source_provenance === 'TEST_DATA',
          }));
        }
      } catch {
        // Non-blocking supplier lookup
      }
    }

    const verifiedMfg = verifiedCatalogItem ? verifiedCatalogItem.manufacturer : null;

    const compliantSuppliers = candidateSuppliers.filter((sup) => {
      if (sup.verification_status !== 'VERIFIED') return false;
      if (!allowTestData && (sup.is_test_data || sup.source_provenance === 'TEST_DATA')) return false;

      if (city && sup.city) {
        const cityMatch =
          sup.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(sup.city.toLowerCase());
        if (!cityMatch) return false;
      }

      if (sup.supported_equipment_types && sup.supported_equipment_types.length > 0) {
        const typeMatch = sup.supported_equipment_types.some((t) => isEquipmentTypeCompatible(reqSystemType, t));
        if (!typeMatch) return false;
      }

      if (verifiedMfg && sup.supported_manufacturers && sup.supported_manufacturers.length > 0) {
        const mfgMatch = sup.supported_manufacturers.some(
          (m) => m.toLowerCase().includes(verifiedMfg.toLowerCase()) || verifiedMfg.toLowerCase().includes(m.toLowerCase())
        );
        if (!mfgMatch) return false;
      }

      return true;
    });

    if (compliantSuppliers.length > 0) {
      matchedSupplier = compliantSuppliers[0];
    }

    // 4. Query & Match Verified Price Records
    let matchedPrice: VerifiedPriceRecord | null = null;
    let priceRejectionReason: 'EXPIRED' | 'UNVERIFIED' | 'SUPPLIER_MISMATCH' | 'CATALOG_MISMATCH' | 'NO_PRICE' = 'NO_PRICE';
    let candidatePrices: VerifiedPriceRecord[] = [];

    if (options && options.priceRecords !== undefined) {
      candidatePrices = options.priceRecords;
    } else if (options && (options.catalogRecords !== undefined || options.supplierRecords !== undefined)) {
      candidatePrices = [];
    } else {
      try {
        const { data: priceData } = await supabaseAdmin
          .from('equipment_prices')
          .select('*')
          .eq('verification_status', 'VERIFIED');

        if (priceData && priceData.length > 0) {
          candidatePrices = priceData.map((d: any) => ({
            price_id: d.price_id || d.id,
            catalog_id: d.catalog_id,
            equipment_type: d.equipment_type || d.type,
            manufacturer: d.manufacturer,
            model: d.model,
            supplier_id: d.supplier_id,
            supplier_name: d.supplier_name,
            unit_price: d.unit_price,
            currency: d.currency || 'INR',
            price_basis: d.price_basis || 'Ex-Factory',
            effective_date: d.effective_date,
            validity_expiry_date: d.validity_expiry_date || d.expiry_date,
            source_url: d.source_url,
            verification_status: d.verification_status || 'VERIFIED',
            source_provenance: d.source_provenance || 'VERIFIED_PRICING_DB',
            is_test_data: d.is_test_data || d.source_provenance === 'TEST_DATA',
          }));
        }
      } catch {
        // Non-blocking price lookup
      }
    }

    const currentDate = new Date().toISOString().split('T')[0];

    for (const pr of candidatePrices) {
      // Must be VERIFIED
      if (pr.verification_status !== 'VERIFIED') {
        priceRejectionReason = 'UNVERIFIED';
        continue;
      }

      if (!allowTestData && (pr.is_test_data || pr.source_provenance === 'TEST_DATA')) {
        continue;
      }

      // Check Expiry Date
      if (pr.validity_expiry_date && pr.validity_expiry_date < currentDate) {
        priceRejectionReason = 'EXPIRED';
        continue;
      }

      // Catalog match check (if catalog_id or model is specified)
      if (pr.catalog_id && verifiedCatalogItem && pr.catalog_id !== verifiedCatalogItem.catalog_id) {
        priceRejectionReason = 'CATALOG_MISMATCH';
        continue;
      }

      if (pr.model && verifiedCatalogItem && pr.model.toLowerCase() !== verifiedCatalogItem.model.toLowerCase()) {
        priceRejectionReason = 'CATALOG_MISMATCH';
        continue;
      }

      // Supplier match check (if supplier_id or supplier_name is specified)
      if (pr.supplier_id || pr.supplier_name) {
        if (!matchedSupplier) {
          priceRejectionReason = 'SUPPLIER_MISMATCH';
          continue;
        }
        if (pr.supplier_id && matchedSupplier.supplier_id && pr.supplier_id !== matchedSupplier.supplier_id) {
          priceRejectionReason = 'SUPPLIER_MISMATCH';
          continue;
        }
        if (pr.supplier_name && matchedSupplier.name && pr.supplier_name.toLowerCase() !== matchedSupplier.name.toLowerCase()) {
          priceRejectionReason = 'SUPPLIER_MISMATCH';
          continue;
        }
      }

      // Compliant match found!
      matchedPrice = pr;
      break;
    }

    const equipmentList: EquipmentItem[] = [];

    const quantity1 = totalTr > 5.0 ? Math.ceil(totalTr / 10) : 1;
    const unitPrice1 = matchedPrice ? matchedPrice.unit_price : null;
    const totalPrice1 = matchedPrice && unitPrice1 !== null ? unitPrice1 * quantity1 : null;
    const priceVerificationStatus1 = matchedPrice
      ? 'VERIFIED'
      : priceRejectionReason === 'EXPIRED'
      ? 'EXPIRED'
      : 'PRICE_DATA_NOT_YET_VERIFIED';

    const overallStatus1 =
      verifiedCatalogItem && matchedPrice
        ? 'VERIFIED'
        : verifiedCatalogItem
        ? 'PRICE_DATA_NOT_YET_VERIFIED'
        : 'REQUIRES_VERIFIED_CATALOG_DATA';

    if (totalTr <= 5.0) {
      equipmentList.push({
        id: `EQ-01`,
        type: verifiedCatalogItem ? verifiedCatalogItem.equipment_type : reqSystemType,
        capacity: `${totalTr} TR (${Math.round(totalTr * 3.517 * 10) / 10} kW)`,
        airflow: `${totalCfm} CFM`,
        quantity: quantity1,
        application: 'Comfort Cooling & Dehumidification',
        status: overallStatus1,
        manufacturer: verifiedCatalogItem ? verifiedCatalogItem.manufacturer : null,
        model: verifiedCatalogItem ? verifiedCatalogItem.model : null,
        voltage: verifiedCatalogItem ? verifiedCatalogItem.voltage || null : null,
        efficiency: verifiedCatalogItem ? verifiedCatalogItem.efficiency || null : null,
        unit_price: unitPrice1,
        total_price: totalPrice1,
        currency: matchedPrice ? matchedPrice.currency : null,
        price_basis: matchedPrice ? matchedPrice.price_basis : null,
        price_effective_date: matchedPrice ? matchedPrice.effective_date : null,
        price_expiry_date: matchedPrice ? matchedPrice.validity_expiry_date || null : null,
        price_source_url: matchedPrice ? matchedPrice.source_url || null : null,
        price_provenance: matchedPrice ? matchedPrice.source_provenance : null,
        price_verification_status: priceVerificationStatus1,
        supplier: matchedSupplier ? matchedSupplier.name : null,
        supplier_address: matchedSupplier ? matchedSupplier.address : undefined,
        supplier_phone: matchedSupplier ? matchedSupplier.phone || undefined : undefined,
        supplier_email: matchedSupplier ? matchedSupplier.email || undefined : undefined,
        supplier_verification_status: matchedSupplier ? 'VERIFIED' : 'NEEDS_VERIFIED_SUPPLIER_DATA',
        supplier_source_url: matchedSupplier ? matchedSupplier.source_url || undefined : undefined,
        supplier_provenance: matchedSupplier ? matchedSupplier.source_provenance || 'VERIFIED_SUPPLIER_RECORD' : undefined,
        verification_status: verifiedCatalogItem ? 'VERIFIED' : 'REQUIRES_VERIFIED_CATALOG_DATA',
        datasheet_url: verifiedCatalogItem ? verifiedCatalogItem.datasheet_url || null : null,
      });

      if (project.ventilation_required && freshAirCfm > 0) {
        equipmentList.push({
          id: `EQ-02`,
          type: 'Inline Centrifugal Fresh Air Supply Fan with HEPA/Pre-Filter',
          capacity: 'Ventilation Airflow',
          airflow: `${freshAirCfm} CFM`,
          quantity: 1,
          application: 'ASHRAE 62.1 Fresh Air Ventilation',
          status: 'REQUIRES_VERIFIED_CATALOG_DATA',
          manufacturer: null,
          model: null,
          voltage: null,
          efficiency: null,
          unit_price: null,
          total_price: null,
          currency: null,
          price_basis: null,
          price_verification_status: 'PRICE_DATA_NOT_YET_VERIFIED',
          supplier: null,
          supplier_verification_status: 'NEEDS_VERIFIED_SUPPLIER_DATA',
          verification_status: 'REQUIRES_VERIFIED_CATALOG_DATA',
          datasheet_url: null,
        });
      }
    } else {
      const numOutdoorUnits = Math.ceil(totalTr / 10);
      equipmentList.push({
        id: `EQ-01`,
        type: verifiedCatalogItem ? verifiedCatalogItem.equipment_type : reqSystemType,
        capacity: `${totalTr} TR`,
        airflow: `${totalCfm} CFM`,
        quantity: numOutdoorUnits,
        application: 'Central VRF Air Conditioning',
        status: overallStatus1,
        manufacturer: verifiedCatalogItem ? verifiedCatalogItem.manufacturer : null,
        model: verifiedCatalogItem ? verifiedCatalogItem.model : null,
        voltage: verifiedCatalogItem ? verifiedCatalogItem.voltage || null : null,
        efficiency: verifiedCatalogItem ? verifiedCatalogItem.efficiency || null : null,
        unit_price: unitPrice1,
        total_price: matchedPrice && unitPrice1 !== null ? unitPrice1 * numOutdoorUnits : null,
        currency: matchedPrice ? matchedPrice.currency : null,
        price_basis: matchedPrice ? matchedPrice.price_basis : null,
        price_effective_date: matchedPrice ? matchedPrice.effective_date : null,
        price_expiry_date: matchedPrice ? matchedPrice.validity_expiry_date || null : null,
        price_source_url: matchedPrice ? matchedPrice.source_url || null : null,
        price_provenance: matchedPrice ? matchedPrice.source_provenance : null,
        price_verification_status: priceVerificationStatus1,
        supplier: matchedSupplier ? matchedSupplier.name : null,
        supplier_address: matchedSupplier ? matchedSupplier.address : undefined,
        supplier_phone: matchedSupplier ? matchedSupplier.phone || undefined : undefined,
        supplier_email: matchedSupplier ? matchedSupplier.email || undefined : undefined,
        supplier_verification_status: matchedSupplier ? 'VERIFIED' : 'NEEDS_VERIFIED_SUPPLIER_DATA',
        supplier_source_url: matchedSupplier ? matchedSupplier.source_url || undefined : undefined,
        supplier_provenance: matchedSupplier ? matchedSupplier.source_provenance || 'VERIFIED_SUPPLIER_RECORD' : undefined,
        verification_status: verifiedCatalogItem ? 'VERIFIED' : 'REQUIRES_VERIFIED_CATALOG_DATA',
        datasheet_url: verifiedCatalogItem ? verifiedCatalogItem.datasheet_url || null : null,
      });

      const numIndoorFcus = project.total_spaces || Math.ceil(totalTr / 2);
      equipmentList.push({
        id: `EQ-02`,
        type: 'VRF 4-Way Compact Ceiling Cassette Indoor Units',
        capacity: `${Math.round((totalTr / Math.max(1, numIndoorFcus)) * 10) / 10} TR each`,
        airflow: `${Math.round(totalCfm / Math.max(1, numIndoorFcus))} CFM each`,
        quantity: numIndoorFcus,
        application: 'Indoor Zoned Climate Control',
        status: 'REQUIRES_VERIFIED_CATALOG_DATA',
        manufacturer: null,
        model: null,
        voltage: null,
        efficiency: null,
        unit_price: null,
        total_price: null,
        currency: null,
        price_basis: null,
        price_verification_status: 'PRICE_DATA_NOT_YET_VERIFIED',
        supplier: null,
        supplier_verification_status: 'NEEDS_VERIFIED_SUPPLIER_DATA',
        verification_status: 'REQUIRES_VERIFIED_CATALOG_DATA',
        datasheet_url: null,
      });
    }

    return equipmentList;
  }
}
