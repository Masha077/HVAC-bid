export type ProvenanceStatus =
  | 'SOURCE_FACT'
  | 'DETERMINISTIC_CALCULATION'
  | 'AI_RECOMMENDATION'
  | 'PRELIMINARY_ESTIMATE'
  | 'VERIFIED'
  | 'NEEDS_REVIEW'
  | 'CONFLICT'
  | 'USER_OVERRIDE'
  | 'PRICE_DATA_NOT_YET_VERIFIED'
  | 'REQUIRES_VERIFIED_CATALOG_DATA'
  | 'NOT_PROVIDED'
  | 'PENDING';

export type WorkflowMode = 'REQUIREMENT_DRIVEN' | 'DOCUMENT_DRIVEN' | 'HYBRID';

export type RequestedOutputType =
  | 'TECHNICAL_ONLY'
  | 'COMMERCIAL_ONLY'
  | 'TECHNICAL_AND_COMMERCIAL'
  | 'COMPLETE_BID_PACKAGE'
  | 'BOQ'
  | 'COMPLIANCE_REPORT'
  | 'CALCULATION_REPORT'
  | 'QUOTATION'
  | 'CUSTOM_TENDER_PACKAGE';

export type DocumentProcessingStatus =
  | 'DOCUMENT_RECEIVED'
  | 'PROCESSING'
  | 'TEXT_EXTRACTED'
  | 'TABLES_EXTRACTED'
  | 'OCR_REQUIRED'
  | 'OCR_COMPLETED'
  | 'AI_EXTRACTION_COMPLETED'
  | 'VALIDATION_COMPLETED'
  | 'FAILED'
  | 'NEEDS_REVIEW'
  | 'SUPERSEDED';

export interface DocumentMetaRecord {
  document_id: string;
  file_name: string;
  document_type: string;
  revision_number: number;
  parent_document_id?: string;
  is_superseded: boolean;
  storage_path?: string;
  file_url?: string;
  status: DocumentProcessingStatus;
  extracted_word_count?: number;
  extracted_text?: string;
  error?: string;
}

export interface FactProvenance {
  fact_id: string;
  project_id: string;
  document_id: string;
  file_name: string;
  document_type: string;
  page_number?: number;
  section?: string;
  source: string;
  field_name: string;
  value: string;
  status: ProvenanceStatus;
}

export interface ConflictRecord {
  conflict_id: string;
  project_id: string;
  document_a: string;
  document_b: string;
  page_a?: number;
  page_b?: number;
  field: string;
  value_a: string;
  value_b: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  possible_interpretation?: string;
  resolution_status: 'UNRESOLVED' | 'RESOLVED_BY_SOURCE_PRIORITY' | 'RESOLVED_BY_USER' | 'NEEDS_CLARIFICATION' | 'SUPERSEDED_BY_REVISION';
  required_action: string;
}

export type ComplianceCategory =
  | 'TECHNICAL_SPECIFICATION'
  | 'EQUIPMENT_MAKE_MODEL'
  | 'DATASHEET'
  | 'MAF_REQUIREMENT'
  | 'METHOD_STATEMENT'
  | 'TESTING_COMMISSIONING'
  | 'PROJECT_SCHEDULE'
  | 'PAST_EXPERIENCE'
  | 'CERTIFICATES'
  | 'COMMERCIAL_FORMS'
  | 'EMD_BID_BOND'
  | 'PAYMENT_TERMS'
  | 'EXCLUSIONS_INCLUSIONS'
  | 'SUBMISSION_ENVELOPE'
  | 'GENERAL';

export interface ComplianceItem {
  item_id: string;
  category?: ComplianceCategory | string;
  source_document: string;
  page_number?: number | null;
  section?: string | null;
  requirement_type?: 'MANDATORY' | 'REQUIRED' | 'OPTIONAL';
  tender_requirement: string;
  our_response: string;
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'NOT_PROVIDED' | 'NEEDS_REVIEW';
  evidence_text?: string | null;
  evidence_provenance?: string | null;
  deviation?: string | null;
  unresolved_reason?: string | null;
  remarks?: string | null;
}

export interface SpaceDetail {
  name: string;
  length_ft?: number;
  width_ft?: number;
  height_ft?: number;
  area_sqft?: number;
  volume_cuft?: number;
  occupants?: number;
  notes?: string;
}

export interface UnifiedProjectModel {
  project_id: string;
  user_id: string;
  mode: WorkflowMode;
  requested_output_type: RequestedOutputType;
  location: string | null;
  building_type: string | null;
  spaces: SpaceDetail[];
  total_spaces: number;
  total_area_sqft: number;
  total_volume_cuft: number;
  total_occupants: number;
  cooling_required: boolean;
  ventilation_required: boolean;
  missing_information: string[];
  raw_input?: string;
  tax_percent?: number | null;
  documents_meta: DocumentMetaRecord[];
  fact_provenance: FactProvenance[];
  conflicts: ConflictRecord[];
  takeoff_config?: TakeoffBasisConfig;
  commercial_config?: CommercialConfigInput;
}

export type TaxBasisType = 'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE';

export interface CommercialConfigInput {
  tax_percent?: number | null;
  tax_basis?: TaxBasisType;
  allow_tax_exclusive_bid?: boolean;
  freight_amount?: number | null;
  freight_basis?: string;
  installation_amount?: number | null;
  installation_basis?: string;
  discount_percent?: number | null;
  discount_amount?: number | null;
  payment_terms?: string;
  bid_validity_days?: number;
  emd_amount?: number | null;
  inclusions?: string[];
  exclusions?: string[];
  source_provenance?: string;
  verification_status?: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
}

export interface CommercialResolutionReport {
  tax_percent: number | null;
  tax_basis: TaxBasisType;
  allow_tax_exclusive_bid: boolean;
  tax_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  tax_provenance: string;
  freight_amount: number | null;
  freight_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  installation_amount: number | null;
  installation_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  discount_percent: number | null;
  discount_amount: number | null;
  discount_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  payment_terms: string | null;
  payment_terms_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  bid_validity_days: number | null;
  bid_validity_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  emd_amount: number | null;
  emd_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  inclusions: string[];
  exclusions: string[];
  terms_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  verified_subtotal: number | null;
  tax_inclusive_gross_amount: number | null;
  tax_exclusive_taxable_amount: number | null;
  grand_total_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'TAX_EXCLUSIVE_BID' | 'NOT_AVAILABLE';
  commercial_ready: boolean;
}

export interface TakeoffBasisConfig {
  ductwork_sqft_per_10_cfm?: number;
  diffuser_cfm_capacity?: number;
  copper_pipe_rft_per_tr?: number;
  drain_pipe_rft_per_room?: number;
  cabling_sets_per_equipment?: number;
  allow_lump_sum_commissioning?: boolean;
  source_provenance?: string;
}

export interface HVACSizingResult {
  cooling_load_tr: number | null;
  cooling_status: ProvenanceStatus;
  cooling_load_basis?: string;
  airflow_cfm: number | null;
  fresh_air_cfm: number | null;
  fresh_air_basis?: string;
  fresh_air_status?: ProvenanceStatus;
  formula_basis: string;
  provenance: ProvenanceStatus;
  breakdown: {
    area_cooling_tr?: number;
    occupant_cooling_tr?: number;
    volume_cooling_tr?: number;
    base_cfm?: number;
    fresh_air_occupant_cfm?: number;
    fresh_air_area_cfm?: number;
  };
}

export type AuditStatus = 'READY_FOR_EQUIPMENT_SELECTION' | 'NEEDS_REVIEW' | 'CONFLICT';

export interface AuditReport {
  audit_status: AuditStatus;
  conflicts: ConflictRecord[];
  missing_fields: string[];
  equipment_selection_allowed: boolean;
  audit_entries: {
    checkpoint: string;
    status: AuditStatus;
    details: string;
  }[];
}

export interface EquipmentMatchingConfig {
  max_oversize_percent?: number;
  max_undersize_percent?: number;
  allow_exact_match_only?: boolean;
}

export interface VerifiedCatalogRecord {
  catalog_id: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  capacity_tr: number;
  capacity_kw?: number;
  airflow_cfm: number;
  voltage?: string;
  refrigerant?: string;
  efficiency?: string;
  datasheet_url?: string;
  source_provenance: string;
  verification_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'REQUIRES_VERIFIED_CATALOG_DATA';
  is_test_data?: boolean;
}

export interface VerifiedSupplierRecord {
  supplier_id: string;
  name: string;
  category?: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  source_url?: string;
  supported_manufacturers?: string[];
  supported_equipment_types?: string[];
  verification_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NEEDS_VERIFIED_SUPPLIER_DATA';
  source_provenance?: string;
  is_test_data?: boolean;
}

export interface VerifiedPriceRecord {
  price_id: string;
  catalog_id?: string;
  equipment_type?: string;
  manufacturer?: string;
  model?: string;
  supplier_id?: string;
  supplier_name?: string;
  unit_price: number;
  currency: string;
  price_basis: string;
  effective_date: string;
  validity_expiry_date?: string;
  source_url?: string;
  verification_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'PRICE_DATA_NOT_YET_VERIFIED' | 'EXPIRED';
  source_provenance: string;
  is_test_data?: boolean;
}

export interface EquipmentItem {
  id: string;
  type: string;
  capacity: string;
  airflow: string;
  quantity: number;
  application: string;
  status: ProvenanceStatus;
  manufacturer: string | null;
  model: string | null;
  voltage: string | null;
  efficiency: string | null;
  unit_price: number | null;
  total_price: number | null;
  currency?: string | null;
  price_basis?: string | null;
  price_effective_date?: string | null;
  price_expiry_date?: string | null;
  price_source_url?: string | null;
  price_provenance?: string | null;
  price_verification_status?: string;
  supplier: string | null;
  supplier_address?: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_verification_status?: string;
  supplier_source_url?: string;
  supplier_provenance?: string;
  verification_status: string;
  datasheet_url?: string | null;
}

export interface BOQItem {
  item_code: string;
  category: string;
  description: string;
  specification?: string;
  quantity: number | null;
  unit: string;
  unit_rate: number | null;
  total_amount: number | null;
  currency?: string | null;
  catalog_id?: string | null;
  supplier_id?: string | null;
  price_id?: string | null;
  verification_status?: ProvenanceStatus | string;
  provenance: ProvenanceStatus | string;
  calculation_basis?: string;
  inputs_used?: Record<string, any>;
}

export interface BOQValidationIssue {
  item_code: string;
  issue_type: 'ARITHMETIC_MISMATCH' | 'RATE_MISMATCH' | 'QUANTITY_MISMATCH' | 'CURRENCY_MISMATCH' | 'DUPLICATE_ITEM' | 'UNVERIFIED_PRICE' | 'MISSING_QUANTITY';
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface BOQValidationResult {
  is_valid: boolean;
  has_unpriced_items: boolean;
  unpriced_scope_status: 'FULLY_VERIFIED' | 'NOT_AVAILABLE' | 'NEEDS_REVIEW';
  verified_subtotal: number | null;
  total_items_count: number;
  priced_items_count: number;
  unpriced_items_count: number;
  currency: string | null;
  issues: BOQValidationIssue[];
  validated_boq: BOQItem[];
}

export interface CommercialQuote {
  quotation_number: string;
  project_name: string;
  currency: string;
  boq_subtotal: number | null;
  verified_subtotal?: number | null;
  discount_percent: number;
  discount_amount: number;
  discount_status?: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  freight_amount?: number | null;
  freight_status?: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  installation_amount?: number | null;
  installation_status?: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  taxable_amount: number | null;
  tax_exclusive_taxable_amount?: number | null;
  tax_inclusive_gross_amount?: number | null;
  tax_percent: number | null;
  tax_amount: number | null;
  tax_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_PROVIDED';
  tax_basis?: TaxBasisType;
  grand_total: number | null;
  grand_total_status?: 'VERIFIED' | 'NEEDS_REVIEW' | 'TAX_EXCLUSIVE_BID' | 'NOT_AVAILABLE';
  resolution_report?: CommercialResolutionReport;
  pricing_verified: boolean;
  commercial_terms: {
    bid_validity: string;
    payment_terms: string;
    delivery_period: string;
    inclusions: string[];
    exclusions: string[];
  };
}

export interface OutputDocumentResult {
  document_type: RequestedOutputType;
  title: string;
  pdf_base64?: string;
  pdf_download_url?: string;
}

export interface BidPackageResult {
  bid_package: {
    status: 'READY_FOR_REVIEW' | 'NEEDS_REVISION' | 'INCOMPLETE';
    document_title: string;
    quotation_number: string;
    project_id: string;
    technical_envelope_status: string;
    commercial_envelope_status: string;
    review_items: string[];
  };
  technical_envelope?: TechnicalBidEnvelope;
  document_html: string;
  output_documents: OutputDocumentResult[];
  pdf_download_url?: string;
  pdf_base64?: string;
}

export interface TechnicalContentSection<T = any> {
  section_title: string;
  status: ProvenanceStatus | string;
  source_provenance: string;
  data: T;
  unresolved_reason?: string | null;
}

export interface TechnicalBidEnvelope {
  project_id: string;
  technical_envelope_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'NOT_AVAILABLE' | 'CONFLICT';
  design_basis: TechnicalContentSection<{
    building_type: string | null;
    location: string | null;
    total_area_sqft: number;
    total_volume_cuft: number;
    occupants: number;
  }>;
  hvac_calculations: TechnicalContentSection<{
    cooling_load_tr: number | null;
    cooling_load_basis?: string;
    airflow_cfm: number | null;
    breakdown: Record<string, any>;
  }>;
  ventilation_basis: TechnicalContentSection<{
    fresh_air_cfm: number | null;
    fresh_air_basis?: string;
    fresh_air_breakdown: Record<string, any>;
  }>;
  equipment_schedule: TechnicalContentSection<{
    equipment_items: EquipmentItem[];
    equipment_count: number;
  }>;
  datasheet_references: TechnicalContentSection<{
    datasheet_urls: string[];
    has_all_datasheets: boolean;
  }>;
  maf_requirements: TechnicalContentSection<{
    maf_letters_attached: boolean;
    maf_details: string[];
  }>;
  method_statements: TechnicalContentSection<{
    installation_methodology: string[];
    safety_procedures: string[];
  }>;
  testing_commissioning_tab: TechnicalContentSection<{
    tab_scope: string[];
    nitrogen_testing_procedure: string;
  }>;
  project_schedule: TechnicalContentSection<{
    timeline_days?: number | null;
    delivery_schedule?: string | null;
  }>;
  experience_and_certificates: TechnicalContentSection<{
    certificates_attached: string[];
    past_projects_count: number;
  }>;
  compliance_matrix: TechnicalContentSection<{
    items: ComplianceItem[];
    compliant_count: number;
    non_compliant_count: number;
    unresolved_count: number;
  }>;
  deviations_and_conflicts: TechnicalContentSection<{
    conflicts: ConflictRecord[];
    deviations: string[];
  }>;
}

export interface MasterWorkflowOutput {
  status: 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW';
  project_id: string;
  mode: WorkflowMode;
  requested_output_type: RequestedOutputType;
  unified_project: UnifiedProjectModel;
  sizing: HVACSizingResult;
  audit: AuditReport;
  compliance_matrix: ComplianceItem[];
  equipment: EquipmentItem[];
  boq: BOQItem[];
  commercial: CommercialQuote;
  bid_package: BidPackageResult;
  errors: string[];
}
