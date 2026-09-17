import type {
  AuditEntry,
  BidDeliverable,
  Document,
  Equipment,
  HVACSizing,
  Project,
  ProjectOutput,
  Requirement,
  Supplier,
  User,
  ValidationResult,
  WorkflowMode,
} from '@/domain/models';

export type ServicePendingReason =
  | 'BACKEND_NOT_CONNECTED'
  | 'AUTH_PROVIDER_NOT_CONNECTED'
  | 'MAP_PROVIDER_NOT_CONNECTED'
  | 'DEMO_DATA_ONLY';

export interface IntegrationPending {
  ok: false;
  reason: ServicePendingReason;
  message: string;
}

export interface ServiceSuccess<T> {
  ok: true;
  data: T;
  source: 'DEMO_DATA' | 'SNS_AGENT_WORKBENCH';
}

export type ServiceResult<T> = ServiceSuccess<T> | IntegrationPending;

export interface AuthService {
  getCurrentUser(): Promise<ServiceResult<User | null>>;
  beginOAuth(provider: 'GOOGLE' | 'MICROSOFT' | 'GITHUB'): Promise<IntegrationPending>;
  beginEmailLogin(email: string): Promise<IntegrationPending>;
  logout(): Promise<IntegrationPending>;
}

export interface ProjectService {
  listProjects(): Promise<ServiceResult<Project[]>>;
  getProject(projectId: string): Promise<ServiceResult<Project>>;
  createProject(name: string, location: string): Promise<IntegrationPending>;
}

export interface DocumentService {
  listDocuments(projectId?: string): Promise<ServiceResult<Document[]>>;
  uploadDocuments(files: File[], projectId: string): Promise<IntegrationPending>;
  removeDocument(documentId: string): Promise<IntegrationPending>;
}

export interface RequirementService {
  analyzeRequirement(input: {
    userId: string;
    projectId: string;
    mode: Extract<WorkflowMode, 'REQUIREMENT_DRIVEN'>;
    text: string;
  }): Promise<ServiceResult<Requirement>>;
  saveRequirement(projectId: string, requirement: Requirement): Promise<IntegrationPending>;
}

export interface SizingService {
  calculatePreliminarySizing(requirement: Requirement): Promise<ServiceResult<HVACSizing>>;
}

export interface ValidationService {
  validateProject(projectId: string): Promise<ServiceResult<ValidationResult[]>>;
}

export interface EquipmentService {
  listRecommendations(projectId: string): Promise<ServiceResult<Equipment[]>>;
}

export interface SupplierService {
  searchSuppliers(input: {
    projectId: string;
    category?: string;
    distanceKm?: number;
  }): Promise<ServiceResult<Supplier[]>>;
}

export interface DeliverableService {
  listDeliverables(projectId: string): Promise<ServiceResult<BidDeliverable[]>>;
}

export interface AuditService {
  listEntries(projectId: string): Promise<ServiceResult<AuditEntry[]>>;
  listOutputs(projectId: string): Promise<ServiceResult<ProjectOutput[]>>;
}

export const integrationPending = (
  reason: ServicePendingReason = 'BACKEND_NOT_CONNECTED',
): IntegrationPending => ({
  ok: false,
  reason,
  message:
    reason === 'DEMO_DATA_ONLY'
      ? 'This view is using clearly labeled prototype data.'
      : 'This action will be available when the SNS Agent Workbench backend is connected.',
});