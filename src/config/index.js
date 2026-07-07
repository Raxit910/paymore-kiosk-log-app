import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { defaultConfig } from './defaults.js';
import { readEnvironmentOverrides } from './env.js';
import { appConfigSchema } from './schema.js';
import { deepMerge } from '../utils/object.js';

let currentConfig = null;
let currentWarnings = [];

export async function initConfig() {
  const defaultConfigPath = path.join(process.cwd(), 'config', 'config.json');
  const configPath = process.env.PAYMORE_AGENT_CONFIG ?? defaultConfigPath;
  const warnings = [];

  const fileConfig = await readConfigFile(configPath, warnings);
  const envOverrides = readEnvironmentOverrides();
  const merged = deepMerge(deepMerge(defaultConfig, fileConfig), envOverrides);

  const parsed = appConfigSchema.safeParse(merged);
  if (parsed.success) {
    currentConfig = parsed.data;
    currentWarnings = warnings;
    return { config: currentConfig, warnings: currentWarnings };
  }

  warnings.push(
    `Invalid configuration detected. Falling back to built-in defaults. ${formatZodError(parsed.error)}`
  );

  const defaultWithEnv = appConfigSchema.safeParse(deepMerge(defaultConfig, envOverrides));
  if (defaultWithEnv.success) {
    currentConfig = defaultWithEnv.data;
    currentWarnings = warnings;
    return { config: currentConfig, warnings: currentWarnings };
  }

  warnings.push('Environment overrides are invalid. Using built-in defaults without overrides.');
  currentConfig = defaultConfig;
  currentWarnings = warnings;
  return { config: currentConfig, warnings: currentWarnings };
}

export function getConfig() {
  if (!currentConfig) {
    throw new Error('Config has not been initialized. Call initConfig() first.');
  }
  return currentConfig;
}

export function getConfigWarnings() {
  return currentWarnings;
}

async function readConfigFile(configPath, warnings) {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      warnings.push(
        `Configuration file not found at ${configPath}. Built-in defaults will be used.`
      );
      return {};
    }
    warnings.push(
      `Configuration file at ${configPath} could not be loaded. Built-in defaults will be used.`
    );
    return {};
  }
}

function formatZodError(error) {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

function isNodeError(error) {
  return error instanceof Error && 'code' in error;
}
