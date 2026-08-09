import { Router } from 'express';
import { processJob, getJobStatus } from '../controllers/job.controller';

const router = Router();

router.post('/', processJob); // Note: path changed from /process to / to match POST /api/v1/jobs
router.get('/:id', getJobStatus); // Note: path changed from /status/:id to /:id to match GET /api/v1/jobs/:jobId

export default router;
