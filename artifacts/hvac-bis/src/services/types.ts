export type IntegrationPending<T = unknown> = { status: 'INTEGRATION_PENDING'; message: string; data?: T };
export type ServiceResult<T> = IntegrationPending<T> | { status: 'DEMO_DATA'; data: T };
export interface AuthService { getSession(): Promise<IntegrationPending>; beginLogin(): Promise<IntegrationPending>; logout(): Promise<IntegrationPending>; }
export interface ProjectService { list(): Promise<ServiceResult<unknown[]>>; get(projectId: string): Promise<ServiceResult<unknown>>; save(project: unknown): Promise<IntegrationPending>; }
export interface DocumentService {
  list(): Promise<ServiceResult<unknown[]>>;
  process(file: File): Promise<IntegrationPending>;
  analyze(files: File[]): Promise<IntegrationPending>;
}
export interface RequirementService { analyze(input: string): Promise<IntegrationPending>; save(projectId: string, input: string): Promise<IntegrationPending>; }
export interface SizingService { calculate(projectId: string): Promise<IntegrationPending>; }
export interface ValidationService { validate(projectId: string): Promise<IntegrationPending>; }
export interface EquipmentService { search(query: string): Promise<IntegrationPending>; }
export interface SupplierService { search(query: string): Promise<IntegrationPending>; }
export interface DeliverableService { list(projectId: string): Promise<ServiceResult<unknown[]>>; }
export interface AuditService { list(projectId: string): Promise<ServiceResult<unknown[]>>; }