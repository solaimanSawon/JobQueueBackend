import express from 'express';
import dotenv from 'dotenv';
import jobRoutes from './routes/job.routes';

dotenv.config();

const app = express();
app.use(express.json());

// API Routes mounted under /api/v1
app.use('/api/v1/jobs', jobRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
