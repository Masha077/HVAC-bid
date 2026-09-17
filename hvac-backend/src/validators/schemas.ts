import { z } from 'zod';

export const DocumentTypeEnum = z.enum([
  'TENDER',
  'TENDER_SPECIFICATION',
  'HVAC_SPECIFICATION',
  'BOQ',
  'SPECIFICATION',
  'DRAWING',
  'ELECTRICAL',
  'GENERAL_CONDITIONS',
  'ADDENDUM',
  'MANUFACTURER_CATALOG',
  'OTHER',
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const RequestedOutputTypeEnum = z.enum([
  'TECHNICAL_ONLY',
  'COMMERCIAL_ONLY',
  'TECHNICAL_AND_COMMERCIAL',
  'COMPLETE_BID_PACKAGE',
  'BOQ',
  'COMPLIANCE_REPORT',
  'CALCULATION_REPORT',
  'QUOTATION',
  'CUSTOM_TENDER_PACKAGE',
]);

export type RequestedOutputType = z.infer<typeof RequestedOutputTypeEnum>;

export const DocumentInputSchema = z.object({
  document_id: z.string().optional().default(() => `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
  file_name: z.string(),
  document_type: DocumentTypeEnum.optional().default('OTHER'),
  revision_number: z.number().optional().default(1),
  parent_document_id: z.string().optional(),
  storage_path: z.string().optional(),
  file_url: z.string().optional(),
  content_base64: z.string().optional(),
  binary: z.string().optional(),
  raw_text: z.string().optional(),
  extracted_text: z.string().optional(),
  page_count: z.number().optional(),
  mime_type: z.string().optional(),
});

export const RequirementRequestSchema = z.object({
  user_id: z.string().optional().default('anon-user'),
  project_id: z.string().optional().default(() => `PROJ-${Date.now()}`),
  mode: z.literal('REQUIREMENT_DRIVEN'),
  text: z.string().min(5, 'Requirement text must be at least 5 characters long.'),
  documents: z.array(DocumentInputSchema).optional().default([]),
  requested_output_type: RequestedOutputTypeEnum.optional().default('COMPLETE_BID_PACKAGE'),
});

export const DocumentRequestSchema = z.object({
  user_id: z.string().optional().default('anon-user'),
  project_id: z.string().optional().default(() => `PROJ-${Date.now()}`),
  mode: z.literal('DOCUMENT_DRIVEN'),
  text: z.string().optional(),
  documents: z.array(DocumentInputSchema).min(1, 'At least one document must be provided in DOCUMENT_DRIVEN mode.'),
  requested_output_type: RequestedOutputTypeEnum.optional().default('COMPLETE_BID_PACKAGE'),
});

export const HybridRequestSchema = z.object({
  user_id: z.string().optional().default('anon-user'),
  project_id: z.string().optional().default(() => `PROJ-${Date.now()}`),
  mode: z.literal('HYBRID'),
  text: z.string().min(5, 'Requirement text is required for HYBRID mode.'),
  documents: z.array(DocumentInputSchema).min(1, 'At least one document is required for HYBRID mode.'),
  requested_output_type: RequestedOutputTypeEnum.optional().default('COMPLETE_BID_PACKAGE'),
});

export const UniversalRequestSchema = z.discriminatedUnion('mode', [
  RequirementRequestSchema,
  DocumentRequestSchema,
  HybridRequestSchema,
]);

export type UniversalRequest = z.infer<typeof UniversalRequestSchema>;
