# Implementation Plan: Background Job System (BE-06)

## 1. Tech Stack Selection
*   **Node.js & Express (TypeScript)**: To serve the REST API endpoints in a strictly typed environment.
*   **Redis**: In-memory data store used as the message broker for the job queue.
*   **BullMQ**: A robust, fast, and reliable queue system for Node.js based on Redis. It natively supports retries, exponential backoff, and job event listeners.
*   **Winston / Console**: For structured logging of job lifecycle events.
*   **pnpm**: Fast, disk space efficient package manager.

## 2. Architecture & File Structure (Modular MVP Pattern)
To ensure maintainability and separation of concerns, the project is structured modularly:

```text
.
├── src/
│   ├── config/
│   │   └── redis.ts          # Redis connection configuration
│   ├── controllers/
│   │   └── job.controller.ts # Request handlers for processing and status
│   ├── routes/
│   │   └── job.routes.ts     # Express route definitions (/api/jobs/*)
│   ├── jobs/
│   │   ├── queue.ts          # BullMQ queue initialization
│   │   └── worker.ts         # BullMQ worker setup and job processing logic
│   ├── utils/
│   │   └── logger.ts         # Centralized logging setup
│   └── index.ts              # Main Express server setup and application entry point
├── package.json
├── docker-compose.yml        # To easily spin up a Redis instance locally for development
├── tsconfig.json             # Type definitions for TypeScript
└── README.md                 # Documentation explaining workflow and usage
```

## 3. Step-by-Step Implementation

### Step 1: Project Initialization & Dependencies
*   Initialize pnpm project (`pnpm init`).
*   Install dependencies: `express`, `bullmq`, `ioredis`, `dotenv`.
*   Install dev dependencies: `typescript`, `@types/node`, `@types/express`, `ts-node`, `nodemon`.
*   Initialize TypeScript config (`npx tsc --init`) and update `tsconfig.json`.
*   Create a `docker-compose.yml` to run a local Redis container.

### Step 2: Configuration & Queue Setup (`src/config/`, `src/jobs/`)
*   **Redis Config**: Set up a shared `ioredis` connection instance in `redis.ts`.
*   **Queue**: Initialize a BullMQ `Queue` instance (`AI_Jobs`) in `queue.ts` using the shared Redis connection.

### Step 3: Worker & Job Processing (`src/jobs/worker.ts`, `src/utils/logger.ts`)
*   **Worker**: Initialize a BullMQ `Worker` in `worker.ts`.
    *   **The Job**: Simulate a slow operation (e.g., `setTimeout` wrapped in a Promise). Inject random failures to test retries.
    *   **Retries & Backoff**: Configure the worker to retry failed jobs up to 3 times with exponential backoff delay.
    *   **Idempotency**: Ensure the worker gracefully handles duplicate processing if the same custom `jobId` is processed.
*   **Event Listeners & Alerts**: Attach event listeners to the Worker for `completed`, `failed`, `active`.
    *   **Logging**: Use `logger.ts` to log state transitions.
    *   **Alerts**: Log an `ERROR` level alert if a job completely fails (exhausts all retries).

### Step 4: Controllers & Routes (`src/controllers/`, `src/routes/`)
*   **`job.controller.ts`**:
    *   `processJob`: Accepts payload, generates or uses a provided idempotency key, adds to queue, returns `202 Accepted` with `{ jobId, status: 'queued' }`.
    *   `getJobStatus`: Queries queue using `jobId`, returns state (`waiting`, `active`, `completed`, `failed`), progress, and results/errors.
*   **`job.routes.ts`**:
    *   Map `POST /process` to `processJob`.
    *   Map `GET /status/:id` to `getJobStatus`.
*   **`index.ts`**:
    *   Mount routes to Express app (e.g., `/api/jobs`) and start the server.

### Step 5: Documentation & Testing
*   Write `README.md` explaining how to start Redis, run the Node server, and test the endpoints via `curl` or Postman.
*   Manual verification of the happy path and failure path (retries and alerts).

## 4. Addressing Core Requirements
*   **Instant Response**: Controller adds job to Redis and instantly returns 202, avoiding blocking the client.
*   **Job Queue**: BullMQ manages the queueing system in Redis.
*   **Worker Execution**: BullMQ worker executes asynchronously, separated in `worker.ts`.
*   **Status Endpoint**: Controller uses `queue.getJob(id)` to retrieve state.
*   **Idempotency**: Passing deterministic `jobId` parameters to BullMQ prevents duplicate jobs in the queue.
*   **Retries**: Handled natively by BullMQ's `attempts` and `backoff` options.
*   **Alerts**: The worker's `failed` event triggers an alert log when attempts > max attempts.
