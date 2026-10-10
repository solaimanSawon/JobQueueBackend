import { Router } from 'express';
import { processJob, getJobStatus } from '../controllers/job.controller';
import { verifyToken } from '../middlewares/auth.middleware';
const router = Router();

router.post('/', verifyToken, processJob); // Note: path changed from /process to / to match POST /api/v1/jobs
router.get('/:id', verifyToken, getJobStatus); // Note: path changed from /status/:id to /:id to match GET /api/v1/jobs/:jobId

export default router;
