import { Queue } from "bullmq";
import IORedis from "ioredis";

// Singleton Redis connection for queues
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const zoomImportQueue = new Queue("zoom-import", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s → 10s → 20s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
