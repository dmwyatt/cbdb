/**
 * Global Error Service - displays errors to users via modal dialog
 *
 * Use this for user-actionable errors that need to be shown globally.
 * Automatically logs the error to console.
 *
 * For background/debug logging, use logger.ts instead.
 */

import { getErrorMessage } from './utils';
import { log, LogCategory } from './logger';

type ErrorSetter = ((error: string) => void) | null;

let setErrorFn: ErrorSetter = null;

/**
 * Initialize the global error service with the store's setError function.
 * Called once during app initialization.
 */
export function initGlobalErrorHandler(fn: (error: string) => void): void {
  setErrorFn = fn;
}

/**
 * Show a global error to the user via the error modal.
 * Also logs the error to console.
 */
export function showGlobalError(error: unknown): void {
  const message = getErrorMessage(error);

  log.error(LogCategory.NETWORK, message, error);

  if (setErrorFn) {
    setErrorFn(message);
  }
}
