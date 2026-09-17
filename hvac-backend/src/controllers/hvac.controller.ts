import { Request, Response } from 'express';
import pdfParse from 'pdf-parse';
import path from 'path';
import { UniversalRequestSchema } from '../validators/schemas';
import { MasterWorkflowPipeline } from '../services/pipeline';
import { PersistenceService } from '../services/persistence_service';

export class HVACController {
  public static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      let documents: any[] = [];

      if (req.file) {
        if (!req.file.buffer || req.file.buffer.length === 0) {
          res.status(400).json({
            status: 'FAILED',
            message: 'Rejected: Uploaded PDF file buffer is empty.',
          });
          return;
        }

        const rawFilename = req.file.originalname || 'uploaded_document.pdf';
        const filename = path.basename(rawFilename);
        const mimetype = req.file.mimetype || 'application/pdf';
        if (mimetype && !mimetype.includes('pdf') && !filename.toLowerCase().endsWith('.pdf')) {
          res.status(400).json({
            status: 'FAILED',
            message: 'Rejected: Unsupported file type. Expected application/pdf.',
          });
          return;
        }

        const dataUri = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
        const base64Content = req.file.buffer.toString('base64');

        let extractedText = '';
        let pageCount = 1;
        try {
          const parsed = await pdfParse(new Uint8Array(req.file.buffer) as unknown as Buffer);
          extractedText = parsed.text || '';
          pageCount = parsed.numpages || 1;
        } catch (err: any) {
          console.error('[HVACController] Failed to parse PDF text:', err.message);
        }

        const docRecord = {
          document_id: req.body.document_id || `DOC-${Date.now()}`,
          file_name: filename,
          document_type: req.body.document_type || 'TENDER',
          revision_number: req.body.revision_number ? Number(req.body.revision_number) : 1,
          raw_text: extractedText,
          extracted_text: extractedText,
          page_count: pageCount,
          mime_type: mimetype,
          content_base64: base64Content,
          binary: dataUri,
        };
        documents.push(docRecord);
      }

      if (req.body && req.body.documents) {
        if (Array.isArray(req.body.documents)) {
          documents.push(...req.body.documents);
        } else if (typeof req.body.documents === 'string') {
          try {
            const parsed = JSON.parse(req.body.documents);
            if (Array.isArray(parsed)) documents.push(...parsed);
          } catch {}
        }
      }

      const textVal = (req.body?.text || req.body?.input || '').toString().trim();
      const hasText = textVal.length > 0;
      const hasDocs = documents.length > 0;

      let actualMode: 'REQUIREMENT_DRIVEN' | 'DOCUMENT_DRIVEN' | 'HYBRID' = 'REQUIREMENT_DRIVEN';
      if (hasText && !hasDocs) {
        actualMode = 'REQUIREMENT_DRIVEN';
      } else if (!hasText && hasDocs) {
        actualMode = 'DOCUMENT_DRIVEN';
      } else if (hasText && hasDocs) {
        actualMode = 'HYBRID';
      } else {
        actualMode = req.body?.mode || 'REQUIREMENT_DRIVEN';
      }

      const requestData = {
        user_id: (req.body?.user_id || req.body?.userId || 'test-user-001').toString(),
        project_id: (req.body?.project_id || req.body?.projectId || `PROJ-${Date.now()}`).toString(),
        mode: actualMode,
        text: actualMode === 'DOCUMENT_DRIVEN' ? (textVal || undefined) : textVal,
        documents: documents,
        requested_output_type: req.body?.requested_output_type || req.body?.requestedOutputType || 'COMPLETE_BID_PACKAGE',
      };

      const parseResult = UniversalRequestSchema.safeParse(requestData);
      if (!parseResult.success) {
        res.status(400).json({
          status: 'FAILED',
          message: 'Invalid request payload schema.',
          errors: parseResult.error.errors,
        });
        return;
      }

      const result = await MasterWorkflowPipeline.execute(parseResult.data);
      res.status(200).json(result);
    } catch (err: any) {
      console.error('[HVACController] Master webhook failure:', err);
      res.status(500).json({
        status: 'FAILED',
        message: 'Internal server error processing HVAC BIS workflow.',
        error: err.message,
      });
    }
  }

  public static async handleRequirement(req: Request, res: Response): Promise<void> {
    try {
      const payload = {
        user_id: (req.body.user_id || req.body.userId || 'test-user-001').toString(),
        project_id: (req.body.project_id || req.body.projectId || `PROJ-${Date.now()}`).toString(),
        mode: (req.body.mode || 'REQUIREMENT_DRIVEN') as 'REQUIREMENT_DRIVEN',
        text: (req.body.text || req.body.input || '').toString(),
        requested_output_type: req.body.requested_output_type || req.body.requestedOutputType || 'COMPLETE_BID_PACKAGE',
      };

      const parseResult = UniversalRequestSchema.safeParse(payload);
      if (!parseResult.success) {
        res.status(400).json({
          status: 'FAILED',
          message: 'Invalid requirement payload.',
          errors: parseResult.error.errors,
        });
        return;
      }

      const result = await MasterWorkflowPipeline.execute(parseResult.data);
      res.status(200).json({
        ok: true,
        data: result,
        source: 'SNS_AGENT_WORKBENCH',
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }

  public static async handleDocument(req: Request, res: Response): Promise<void> {
    try {
      let requestData = req.body;

      if (req.file) {
        if (!req.file.buffer || req.file.buffer.length === 0) {
          res.status(400).json({
            status: 'FAILED',
            message: 'Rejected: Uploaded PDF file buffer is empty.',
          });
          return;
        }

        const rawFilename = req.file.originalname || 'uploaded_document.pdf';
        const filename = path.basename(rawFilename);
        const mimetype = req.file.mimetype || 'application/pdf';
        if (mimetype && !mimetype.includes('pdf') && !filename.toLowerCase().endsWith('.pdf')) {
          res.status(400).json({
            status: 'FAILED',
            message: 'Rejected: Unsupported file type. Expected application/pdf.',
          });
          return;
        }

        const dataUri = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
        const base64Content = req.file.buffer.toString('base64');

        let extractedText = '';
        let pageCount = 1;
        try {
          const parsed = await pdfParse(new Uint8Array(req.file.buffer) as unknown as Buffer);
          extractedText = parsed.text || '';
          pageCount = parsed.numpages || 1;
        } catch (err: any) {
          console.error('[HVACController] Failed to parse PDF text:', err.message);
        }

        const docRecord = {
          document_id: req.body.document_id || `DOC-${Date.now()}`,
          file_name: filename,
          document_type: req.body.document_type || 'TENDER',
          revision_number: req.body.revision_number ? Number(req.body.revision_number) : 1,
          raw_text: extractedText,
          extracted_text: extractedText,
          page_count: pageCount,
          mime_type: mimetype,
          content_base64: base64Content,
          binary: dataUri,
        };

        let existingDocs: any[] = [];
        if (req.body.documents) {
          if (Array.isArray(req.body.documents)) {
            existingDocs = req.body.documents;
          } else if (typeof req.body.documents === 'string') {
            try { existingDocs = JSON.parse(req.body.documents); } catch {}
          }
        }

        requestData = {
          user_id: (req.body.user_id || req.body.userId || 'test-user-001').toString(),
          project_id: (req.body.project_id || req.body.projectId || `PROJ-${Date.now()}`).toString(),
          mode: req.body.mode || 'DOCUMENT_DRIVEN',
          text: req.body.text || '',
          documents: [docRecord, ...existingDocs],
          requested_output_type: req.body.requested_output_type || req.body.requestedOutputType || 'COMPLETE_BID_PACKAGE',
        };
      }

      const parseResult = UniversalRequestSchema.safeParse(requestData);
      if (!parseResult.success) {
        res.status(400).json({
          status: 'FAILED',
          message: 'Invalid document payload.',
          errors: parseResult.error.errors,
        });
        return;
      }

      const result = await MasterWorkflowPipeline.execute(parseResult.data);
      res.status(200).json({
        ok: true,
        data: result,
        source: 'SNS_AGENT_WORKBENCH',
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }

  public static async getProjectPDF(req: Request, res: Response): Promise<void> {
    try {
      const rawParam = req.params.projectId;
      const projectId = (Array.isArray(rawParam) ? rawParam[0] : rawParam) || `PROJ-${Date.now()}`;
      const type = (req.query.type as string) || 'COMPLETE_BID_PACKAGE';

      const dummyReq = {
        user_id: 'test-user-001',
        project_id: projectId,
        mode: 'REQUIREMENT_DRIVEN' as const,
        text: 'I need HVAC for an office building in Chennai. There are 3 rooms. Each room is 10 ft long, 10 ft wide and has a 9 ft ceiling. Each room has 5 people.',
        documents: [],
        requested_output_type: type as any,
      };

      const pipelineOutput = await MasterWorkflowPipeline.execute(dummyReq);
      if (pipelineOutput.bid_package.pdf_base64) {
        const buffer = Buffer.from(pipelineOutput.bid_package.pdf_base64, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="HVAC_${type}_${projectId}.pdf"`);
        res.send(buffer);
        return;
      }

      res.status(404).json({ message: 'PDF document not found' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  public static async getProject(req: Request, res: Response): Promise<void> {
    try {
      const rawParam = req.params.projectId;
      const projectId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      if (!projectId) {
        res.status(400).json({ status: 'FAILED', message: 'projectId is required' });
        return;
      }

      const projectOutput = await PersistenceService.getProjectOutput(projectId);
      if (!projectOutput) {
        res.status(404).json({
          status: 'FAILED',
          message: `Project ${projectId} not found in database or active session cache.`,
        });
        return;
      }

      res.status(200).json(projectOutput);
    } catch (err: any) {
      res.status(500).json({ status: 'FAILED', message: err.message });
    }
  }

  public static async listProjects(_req: Request, res: Response): Promise<void> {
    try {
      const projects = await PersistenceService.listProjects();
      res.status(200).json({ ok: true, data: projects });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }

  public static async listDocuments(_req: Request, res: Response): Promise<void> {
    try {
      const docs = await PersistenceService.listDocuments();
      res.status(200).json({ ok: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }

  public static async listAudit(_req: Request, res: Response): Promise<void> {
    try {
      const projects = await PersistenceService.listProjects();
      // Aggregate audit records from persisted projects
      const auditRecords: any[] = [];
      for (const proj of projects) {
        if (proj.audit) {
          auditRecords.push({
            project_id: proj.project_id,
            audit_status: proj.audit.audit_status,
            findings: proj.audit.findings || [],
            timestamp: proj.persisted_at || proj.updated_at,
          });
        }
      }
      res.status(200).json({ ok: true, data: auditRecords });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }

  public static healthCheck(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'healthy',
      service: 'HVAC BIS Backend',
      timestamp: new Date().toISOString(),
    });
  }
}
