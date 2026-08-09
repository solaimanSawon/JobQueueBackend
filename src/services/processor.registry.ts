import { logger } from '../utils/logger';

export type JobProcessor = (payload: any) => Promise<any>;

// Simulate a slow AI operation
export const processA6AI: JobProcessor = async (payload: any) => {
  logger.info(`[Processor] Executing a6-ai for payload: ${JSON.stringify(payload)}`);
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate random failure ~30% of the time to test retries
      if (Math.random() < 0.3) {
        return reject(new Error('Simulated AI generation failure'));
      }
      resolve({
        success: true,
        message: `AI Output successfully generated for data: ${JSON.stringify(payload)}`,
        generatedAt: new Date().toISOString()
      });
    }, 3000); // 3 seconds delay
  });
};

export const processorRegistry: Record<string, JobProcessor> = {
  'a6-ai': processA6AI,
};

export const getProcessor = (type: string): JobProcessor | undefined => {
  return processorRegistry[type];
};
