import { Router } from 'express';
import multer from 'multer';
import { HVACController } from '../controllers/hvac.controller';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Master Webhook Gateway (Supports JSON and multipart/form-data PDF upload)
router.post('/v1/webhook', upload.single('file'), HVACController.handleWebhook);

// Frontend API Compatibility Endpoints
router.post('/hvac/requirement', HVACController.handleRequirement);
router.post('/hvac/document', upload.single('file'), HVACController.handleDocument);
router.get('/v1/hvac/projects/:projectId/pdf', HVACController.getProjectPDF);
router.get('/v1/hvac/projects/:projectId', HVACController.getProject);
router.get('/v1/projects/:projectId', HVACController.getProject);
router.get('/v1/hvac/projects', HVACController.listProjects);
router.get('/v1/hvac/documents', HVACController.listDocuments);
router.get('/v1/hvac/audit', HVACController.listAudit);
router.get('/healthz', HVACController.healthCheck);

export default router;
