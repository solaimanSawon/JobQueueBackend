import app from './app';
import { connectDB } from './config/db';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Connect to MongoDB before starting server
  await connectDB();
  
  app.listen(PORT, () => {
    logger.info(`API Server is running on port ${PORT}`);
  });
};

startServer();
