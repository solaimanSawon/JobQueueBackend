import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { JobService } from '../services/job.service';

export const processJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, payload } = req.body;
    
    if (!type || !payload) {
      res.status(400).json({ success: false, error: 'Missing required fields: type, payload' });
      return;
    }

    // Idempotency: Use provided key from headers or generate a new UUID
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    // Add job to the MongoDB queue
    const job = await JobService.createJob(type, payload, idempotencyKey);

    logger.info(`Job created with ID: ${job.jobId}`);

    // Return 202 Accepted instantly
    res.status(202).json({
      success: true,
      message: 'Job accepted and added to queue',
      data: {
        jobId: job.jobId,
        status: job.status
      }
    });
  } catch (error: any) {
    logger.error(`Error queuing job: ${error.message}`);
    if (error.message.includes('Unknown job type')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const job = await JobService.getJobStatus(id);

    if (!job) {
       res.status(404).json({ success: false, error: 'Job not found' });
       return;
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        createdAt: job.createdAt,
        startedAt: job.startedAt || null,
        completedAt: job.completedAt || null,
        failedAt: job.failedAt || null,
        result: job.status === 'completed' ? job.result : null,
        error: job.status === 'failed' ? job.error : null,
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching job status: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
