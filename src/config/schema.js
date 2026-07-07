import { z } from 'zod';
const positiveInteger = z.number().int().positive();
const nonNegativeInteger = z.number().int().nonnegative();
export const retrySchema = z.object({
  maxAttempts: positiveInteger,
  baseDelayMs: nonNegativeInteger,
  maxDelayMs: positiveInteger,
  backoffMultiplier: z.number().min(1),
  retryableStatusCodes: z.array(z.number().int().min(100).max(599)).default([])
});
export const logSourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/),
  enabled: z.boolean().default(true),
  patterns: z.array(z.string().trim().min(1)).min(1),
  excludePatterns: z.array(z.string().trim().min(1)).default([]),
  encoding: z.enum(['utf8', 'utf-8', 'utf16le', 'latin1', 'ascii']).default('utf8'),
  readFromBeginning: z.boolean().default(false)
});
export const appConfigSchema = z.object({
  app: z.object({
    name: z.string().trim().min(1),
    version: z.string().trim().min(1),
    environment: z.enum(['development', 'test', 'staging', 'production'])
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    directory: z.string().trim().min(1),
    maxFiles: z.string().trim().min(1),
    maxSize: z.string().trim().min(1)
  }),
  scheduler: z.object({
    dailyRunTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .default('02:00'),
    uploadRetryIntervalMs: positiveInteger.default(300000),
    housekeepingIntervalMs: positiveInteger,
    runScanOnStart: z.boolean(),
    gracefulShutdownTimeoutMs: positiveInteger
  }),
  upload: z.object({
    authEndpoint: z.string().url(),
    staticToken: z.string().trim().min(1).optional(),
    timeoutMs: positiveInteger,
    retry: retrySchema
  }),
  http: z.object({
    userAgent: z.string().trim().min(1),
    safeResponseBodyLogLimit: nonNegativeInteger
  }),
  queue: z.object({
    directory: z.string().trim().min(1)
  }),
  logSources: z.array(logSourceSchema),
  telemetry: z.object({
    enabled: z.boolean()
  })
});
