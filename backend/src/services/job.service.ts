import { Job, IJob } from '../models/job.model';
import crypto from 'crypto';
import { getProcessor } from './processor.registry';

export class JobService {
  /**
   * Creates a new job in the queue
   */
  static async createJob(type: string, payload: any, idempotencyKey?: string): Promise<IJob> {
    // Validate job type
    if (!getProcessor(type)) {
      throw new Error(`Unknown job type: ${type}`);
    }

    const jobId = idempotencyKey || crypto.randomUUID();

    // Idempotency: if job with this jobId already exists, return it instead of creating duplicate
    if (idempotencyKey) {
      const existingJob = await Job.findOne({ jobId });
      if (existingJob) {
        return existingJob;
      }
    }

    const job = new Job({
      jobId,
      type,
      payload,
      status: 'queued',
      attempts: 0,
    });

    await job.save();
    return job;
  }

  /**
   * Retrieves the current status of a job
   */
  static async getJobStatus(jobId: string): Promise<IJob | null> {
    return Job.findOne({ jobId });
  }

  /**
   * Recovers stale jobs that have been processing for too long (likely due to worker crash)
   */
  static async recoverStaleJobs(): Promise<number> {
    const lockTimeoutMs = parseInt(process.env.JOB_LOCK_TIMEOUT || '300000', 10); // Default 5 mins
    const cutoffTime = new Date(Date.now() - lockTimeoutMs);

    const result = await Job.updateMany(
      {
        status: 'processing',
        lockedAt: { $lt: cutoffTime }
      },
      {
        $set: {
          status: 'queued',
          error: { message: 'Job recovered from stale state (worker crashed/timeout)' },
          lockedAt: null,
          startedAt: null
        }
      }
    );

    return result.modifiedCount;
  }
}
