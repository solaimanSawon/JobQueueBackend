# Background Job System (BE-06)

This is a professional background job system implemented using Node.js, Express, Redis, and BullMQ. 
It demonstrates moving slow operations (like AI API calls) out of the main request-response cycle and processing them asynchronously.

## Features
- **Instant Response**: API returns `202 Accepted` immediately, avoiding blocking the client.
- **Job Queue**: Uses BullMQ (backed by Redis) to manage the queue reliably.
- **Worker Execution**: Background worker processes jobs asynchronously with configurable concurrency.
- **Status Reporting**: An endpoint to query job status, progress, and result.
- **Idempotency**: Clients can pass an `x-idempotency-key` header to prevent duplicate job processing.
- **Retries & Backoff**: Failed jobs are retried up to 3 times with exponential backoff.
- **Alerts & Logging**: Structured logging via Winston records all lifecycle events. Critical alerts are logged upon exhausting retries.

## Prerequisites
- Docker & Docker Compose (for running Redis locally)
- Node.js (v18+)
- pnpm

## Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start Redis**
   ```bash
   docker-compose up -d
   ```

3. **Start the Development Server**
   ```bash
   pnpm run dev
   ```

## API Endpoints

### 1. Process Job
`POST /api/jobs/process`

Accepts any JSON payload and queues it. You can optionally include an idempotency key in the headers.

**Request:**
```bash
curl -X POST http://localhost:3000/api/jobs/process \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: my-unique-job-id" \
  -d '{"prompt": "Generate a story about a brave knight"}'
```

**Response (202 Accepted):**
```json
{
  "message": "Job accepted and queued for processing.",
  "jobId": "my-unique-job-id",
  "status": "queued"
}
```

### 2. Check Job Status
`GET /api/jobs/status/:id`

Retrieves the current state of a job using its ID.

**Request:**
```bash
curl http://localhost:3000/api/jobs/status/my-unique-job-id
```

**Response (Example - Running):**
```json
{
  "jobId": "my-unique-job-id",
  "state": "active",
  "progress": 0,
  "result": null,
  "error": null,
  "attemptsMade": 1
}
```

**Response (Example - Completed):**
```json
{
  "jobId": "my-unique-job-id",
  "state": "completed",
  "progress": 0,
  "result": {
    "success": true,
    "message": "AI Output successfully generated for data: {\"prompt\":\"Generate a story about a brave knight\"}",
    "generatedAt": "2023-10-25T12:00:00.000Z"
  },
  "error": null,
  "attemptsMade": 1
}
```
