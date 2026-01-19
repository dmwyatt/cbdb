/**
 * Structured logging with typed categories
 *
 * All logs are prefixed with [cbdb] for easy filtering in devtools.
 * Categories are constrained to prevent arbitrary strings.
 *
 * Usage:
 *   import { log, LogCategory } from '@/lib/logger';
 *   log.info(LogCategory.DATABASE, 'Database loaded');
 *   log.warn(LogCategory.CACHE, 'Cache miss', { key });
 *   log.error(LogCategory.NETWORK, 'Request failed', error);
 */

export const LogCategory = {
  COVER: 'cover',
  CACHE: 'cache',
  QUERY: 'query',
  DATABASE: 'database',
  NETWORK: 'network',
  READER: 'reader',
} as const;

export type LogCategory = (typeof LogCategory)[keyof typeof LogCategory];

const APP_PREFIX = '[cbdb]';

export const log = {
  debug(category: LogCategory, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.debug(APP_PREFIX, `[${category}]`, message, data);
    } else {
      console.debug(APP_PREFIX, `[${category}]`, message);
    }
  },

  info(category: LogCategory, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.info(APP_PREFIX, `[${category}]`, message, data);
    } else {
      console.info(APP_PREFIX, `[${category}]`, message);
    }
  },

  warn(category: LogCategory, message: string, error?: unknown): void {
    if (error !== undefined) {
      console.warn(APP_PREFIX, `[${category}]`, message, error);
    } else {
      console.warn(APP_PREFIX, `[${category}]`, message);
    }
  },

  error(category: LogCategory, message: string, error?: unknown): void {
    if (error !== undefined) {
      console.error(APP_PREFIX, `[${category}]`, message, error);
    } else {
      console.error(APP_PREFIX, `[${category}]`, message);
    }
  },
};
