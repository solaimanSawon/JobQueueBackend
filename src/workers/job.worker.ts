import { Job, IJob } from '../models/job.model';
import { getProcessor } from '../services/processor.registry';
import { JobService } from '../services/job.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class JobWorker {
  private isRunning: boolean = false;
  private workerId: string;
  private pollInterval: number;
  private retryDelayBase: number;
  private currentJob: IJob | null = null;

  constructor() {
    this.workerId = crypto.randomUUID();
    this.pollInterval = parseInt(process.env.JOB_POLL_INTERVAL || '1000', 10);
    this.retryDelayBase = parseInt(process.env.JOB_RETRY_DELAY || '2000', 10);
  }

  /**
   * Starts the worker polling loop
   */
  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    logger.info(`[Worker ${this.workerId}] Started`);

    // Run recovery once on startup
    const recovered = await JobService.recoverStaleJobs();
    if (recovered > 0) {
      logger.info(`[Worker] Recovered ${recovered} stale jobs on startup`);
    }

    this.pollLoop();
  }

  /**
   * Stops the worker gracefully
   */
  public async stop() {
    logger.info(`[Worker ${this.workerId}] Stopping...`);
    this.isRunning = false;
    
    // If a job is currently processing, we wait for it to finish (or we could forcefully unlock it, but the requirements say "Finish the currently processing job if safe.")
    if (this.currentJob) {
       logger.info(`[Worker ${this.workerId}] Waiting for job ${this.currentJob.jobId} to finish before stopping`);
       // We can just let the ongoing promise resolve.
    }
  }

  private async pollLoop() {
    while (this.isRunning) {
      try {
        const job = await this.claimNextJob();

        if (job) {
          this.currentJob = job;
          await this.processJob(job);
          this.currentJob = null;
        } else {
          // No job found, wait before polling again
          await this.sleep(this.pollInterval);
        }
      } catch (error: any) {
        logger.error(`[Worker ${this.workerId}] Polling error: ${error.message}`);
        await this.sleep(this.pollInterval);
      }
    }
    
    logger.info(`[Worker ${this.workerId}] Stopped successfully.`);
  }

  /**
   * Atomically claims the next available queued job
   */
  private async claimNextJob(): Promise<IJob | null> {
    const now = new Date();
    
    // Find a job that is queued and available to run (availableAt <= now), ordered by createdAt (FIFO)
    const job = await Job.findOneAndUpdate(
      {
        status: 'queued',
        availableAt: { $lte: now }
      },
      {
        $set: {
          status: 'processing',
          startedAt: now,
          lockedAt: now,
          workerId: this.workerId
        },
        $inc: {
          attempts: 1
        }
      },
      {
        sort: { createdAt: 1 },
        new: true
      }
    );

    if (job) {
      logger.info(`[Worker] Job ${job.jobId} claimed (Attempt ${job.attempts}/${job.maxAttempts})`);
    }

    return job;
  }

  /**
   * Processes the claimed job
   */
  private async processJob(job: IJob) {
    logger.info(`[Worker] Job ${job.jobId} processing`);
    
    try {
      const processor = getProcessor(job.type);
      
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.type}`);
      }

      // Execute the job logic
      const result = await processor(job.payload);

      // Handle success
      await Job.findByIdAndUpdate(job._id, {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          result: result,
          lockedAt: null
        }
      });

      logger.info(`[Worker] Job ${job.jobId} completed`);
      
    } catch (error: any) {
      logger.error(`[Worker] Job ${job.jobId} processing error: ${error.message}`);
      
      const errorData = {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        attempt: job.attempts
      };

      // Check if we should retry
      if (job.attempts < job.maxAttempts) {
        // Calculate exponential backoff: base * (2 ^ (attempts - 1))
        const delayMs = this.retryDelayBase * Math.pow(2, job.attempts - 1);
        const nextAvailableAt = new Date(Date.now() + delayMs);
        
        await Job.findByIdAndUpdate(job._id, {
          $set: {
            status: 'queued',
            error: errorData,
            availableAt: nextAvailableAt,
            lockedAt: null,
            startedAt: null
          }
        });
        
        logger.info(`[Worker] Job ${job.jobId} retry scheduled at ${nextAvailableAt.toISOString()}`);
      } else {
        // Max attempts reached, mark as failed
        await Job.findByIdAndUpdate(job._id, {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            error: errorData,
            lockedAt: null
          }
        });
        
        logger.error(`[Worker] Job ${job.jobId} failed after ${job.attempts} attempts`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
