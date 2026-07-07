import os from 'node:os';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { z } from 'zod';
import { requestJson, requestPutFile } from '../http/http-client.js';
import { getConfig } from '../config/index.js';

const presignedUrlResponseSchema = z.object({
  presignedUrl: z.string().url(),
  batchId: z.string().optional()
});

export async function uploadZip(filePath, signal) {
  const config = getConfig();
  const headers = {};

  if (config.upload.staticToken !== undefined) {
    headers.authorization = `Bearer ${config.upload.staticToken}`;
  }

  // 1. Ask our backend for the AWS S3 Presigned URL
  const authResponse = await requestJson({
    method: 'POST',
    url: config.upload.authEndpoint,
    headers,
    body: {
      filename: path.basename(filePath),
      metadata: getMetadata(config)
    },
    ...(signal === undefined ? {} : { signal })
  });

  const parsed = presignedUrlResponseSchema.safeParse(authResponse);
  if (!parsed.success) {
    throw new Error('Upload API returned an invalid presigned URL response.');
  }

  // 2. Read the raw ZIP file into memory
  const buffer = await fsp.readFile(filePath);

  // 3. Blast the file directly to AWS S3 using the Presigned URL
  await requestPutFile({
    url: parsed.data.presignedUrl,
    buffer,
    ...(signal === undefined ? {} : { signal })
  });

  return {
    accepted: true,
    ...(parsed.data.batchId === undefined ? {} : { remoteBatchId: parsed.data.batchId })
  };
}

function getMetadata(config) {
  return {
    agent: {
      name: config.app.name,
      version: config.app.version,
      environment: config.app.environment,
      machineName: os.hostname()
    },
    uploadedAt: new Date().toISOString()
  };
}
