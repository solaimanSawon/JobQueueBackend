import { connectDB, closeDB } from './config/db';
import { JobWorker } from './workers/job.worker';
import { logger } from './utils/logger';

const startWorker = async () => {
  await connectDB();
  
  const worker = new JobWorker();
  
  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down worker...`);
    await worker.stop();
    await closeDB();
    logger.info('Worker shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Start the worker loop
  worker.start();
};

startWorker();
