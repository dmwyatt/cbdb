/**
 * ErrorService - Unified error handling for the application
 *
 * Error categories:
 * - USER: User-actionable errors that should be displayed in the UI
 * - BACKGROUND: Non-critical errors (cover fetch, cache) - logged but don't interrupt user
 * - INTERNAL: Recoverable internal errors - logged for debugging
 *
 * Usage:
 *   errorService.handleUserError(error, 'Download failed');  // Shows to user
 *   errorService.logBackground(error, 'cover-fetch');        // Logs only
 *   errorService.log(error, 'operation-name');               // Debug logging
 */

type ErrorSetter = ((error: string) => void) | null;

class ErrorService {
  private setErrorFn: ErrorSetter = null;

  /**
   * Connect to the store's setError function
   * Called once during app initialization
   */
  setErrorHandler(fn: (error: string) => void): void {
    this.setErrorFn = fn;
  }

  /**
   * Extract a user-friendly message from an error
   */
  getMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return fallback;
  }

  /**
   * Handle user-actionable errors - displays in UI
   * Use for: download failures, validation errors, network issues
   */
  handleUserError(error: unknown, prefix?: string): void {
    const message = this.getMessage(error);
    const fullMessage = prefix ? `${prefix}: ${message}` : message;

    console.error('[USER ERROR]', fullMessage, error);

    if (this.setErrorFn) {
      this.setErrorFn(fullMessage);
    }
  }

  /**
   * Log background errors - does NOT display to user
   * Use for: cover fetch failures, cache issues, non-critical operations
   */
  logBackground(error: unknown, context: string): void {
    console.warn(`[BACKGROUND] ${context}:`, this.getMessage(error), error);
  }

  /**
   * Log internal/debug errors - for development only
   * Use for: recoverable errors, expected failures, debugging
   */
  log(error: unknown, context: string): void {
    console.error(`[ERROR] ${context}:`, error);
  }
}

export const errorService = new ErrorService();
