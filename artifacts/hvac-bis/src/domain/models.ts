export type WorkflowMode = 'REQUIREMENT_DRIVEN' | 'DOCUMENT_DRIVEN';

export type RecordStatus =
  | 'SOURCE_FACT'
  | 'AI_RECOMMENDATION'
  | 'ESTIMATED'
  | 'PRELIMINARY_ESTIMATE'
  | 'NEEDS_REVIEW'
  | 'CONFLICT'
  | 'VERIFIED'
  | 'USER_OVERRIDE'
  | 'PROCESSING'
  | 'AVAILABLE'
  | 'PENDING'
  | 'PASS'
  | 'WARNING'
  | 'ACTION_REQUIRED';

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'CLOSED';
export type DocumentStatus =
  | 'ANALYZED'
  | 'NEEDS_REVIEW'
  | 'VALIDATED'
  | 'PROCESSING'
  | 'FAILED';
export type DocumentType =
  | 'TENDER'
  | 'BOQ'
  | 'SPECIFICATION'
  | 'DRAWING'
  | 'QUOTATION'
  | 'AUDIT_REPORT'
  | 'REQUIREMENT_INPUT';

export type UserRole =
  | 'HVAC_ESTIMATOR'
  | 'CONTRACTOR'
  | 'ENGINEER'
  | 'PROJECT_MANAGER'
  | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: UserRole;
  authenticationProvider: 'GOOGLE' | 'MICROSOFT' | 'GITHUB' | 'EMAIL' | 'PENDING';
}

export interface Project {
  id: string;
  name: string;
  location: string;
  buildingType: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  type: DocumentType;
  createdAt: string;
  status: DocumentStatus;
  sizeBytes?: number;
}

export interface Space {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number; unit: 'ft' };
  occupants: number;
}

export interface MissingInformation {
  label: string;
  value: string;
  status: Extract<RecordStatus, 'NEEDS_REVIEW' | 'CONFLICT'>;
}

export interface Requirement {
  location: string;
  buildingType: string;
  spaces: Space[];
  occupancy: number;
  coolingRequired: boolean;
  ventilationRequired: boolean;
  missingInformation: MissingInformation[];
  source: 'USER_INPUT' | 'DOCUMENT' | 'BACKEND_PENDING';
  confidence: number | null;
}

export interface HVACSizing {
  coolingLoad: string;
  airflow: string;
  freshAir: string;
  spaces: number;
  occupants: number;
  status: 'PRELIMINARY_ESTIMATE' | 'VERIFIED' | 'BACKEND_PENDING';
}

export interface Equipment {
  id: string;
  type: 'SPLIT' | 'VRF' | 'AHU' | 'EXHAUST' | 'FRESH_AIR_SYSTEM';
  capacity: string | null;
  airflow: string | null;
  quantity: number | null;
  application: string;
  status: 'AWAITING_VERIFIED_DATA' | 'AI_RECOMMENDATION' | 'VERIFIED';
  manufacturer: string | null;
  model: string | null;
  voltage: string | null;
  efficiency: string | null;
  price: number | null;
  supplier: string | null;
  datasheet: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  distanceKm: number | null;
  availability: 'UNKNOWN' | 'AVAILABLE' | 'PENDING';
  location: { latitude: number; longitude: number } | null;
}

export interface ValidationResult {
  id: string;
  label: string;
  status: 'PASS' | 'WARNING' | 'NEEDS_REVIEW' | 'CONFLICT';
  detail: string;
}

export interface AuditEntry {
  id: string;
  source: string;
  decision: string;
  calculation: string;
  recommendation: string;
  status: RecordStatus;
  createdAt: string;
}

export type DeliverableStatus =
  | 'AVAILABLE'
  | 'PENDING'
  | 'NEEDS_REVIEW'
  | 'REQUIRES_USER_INPUT'
  | 'REQUIRES_MANUFACTURER_AUTHORIZATION'
  | 'REQUIRES_CONTRACTOR_SIGNATURE'
  | 'REQUIRES_TENDER_OR_BANK_DATA';

export interface BidDeliverable {
  id: string;
  name: string;
  category: 'TECHNICAL_ENVELOPE' | 'COMMERCIAL_ENVELOPE' | 'CONTROL_AUDIT';
  status: DeliverableStatus;
  trustNote: string | null;
}

export interface ProjectOutput {
  id: string;
  projectId: string;
  name: string;
  category:
    | 'TECHNICAL'
    | 'COMMERCIAL'
    | 'VALIDATION'
    | 'AUDIT'
    | 'SUPPORTING_DOCUMENTS';
  status: DeliverableStatus;
}