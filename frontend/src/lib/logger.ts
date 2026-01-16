/**
 * Structured logging with typed categories
 *
 * All logs are prefixed with [cbdb] for easy filtering in devtools.
 * Categories are constrained to prevent arbitrary strings.
 */

export const LogCategory = {
  COVER: 'cover',
  CACHE: 'cache',
  QUERY: 'query',
  DATABASE: 'database',
  NETWORK: 'network',
} as const;

export type LogCategory = (typeof LogCategory)[keyof typeof LogCategory];

const APP_PREFIX = '[cbdb]';

export function logWarn(category: LogCategory, message: string, error?: unknown): void {
  if (error !== undefined) {
    console.warn(APP_PREFIX, `[${category}]`, message, error);
  } else {
    console.warn(APP_PREFIX, `[${category}]`, message);
  }
}

export function logError(category: LogCategory, message: string, error?: unknown): void {
  if (error !== undefined) {
    console.error(APP_PREFIX, `[${category}]`, message, error);
  } else {
    console.error(APP_PREFIX, `[${category}]`, message);
  }
}
