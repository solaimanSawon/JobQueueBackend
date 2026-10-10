import mongoose, { Schema, Document } from 'mongoose';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface IJob extends Document {
  jobId: string;
  type: string;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: any;
  attempts: number;
  maxAttempts: number;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  lockedAt?: Date;
  availableAt?: Date;
  workerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
    payload: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
    error: { type: Schema.Types.Mixed },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    lockedAt: { type: Date },
    availableAt: { type: Date, default: Date.now },
    workerId: { type: String },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Create compound index to make queue lookup efficient
// We want to find jobs that are 'queued' and available to run (availableAt <= now), ordered by createdAt
JobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);
