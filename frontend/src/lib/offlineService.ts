/**
 * OfflineService - Centralized network status tracking
 *
 * Provides:
 * - Current online/offline status
 * - Event subscription for status changes
 * - Consistent offline handling across the app
 */

type StatusChangeCallback = (isOnline: boolean) => void;

class OfflineService {
  private listeners: Set<StatusChangeCallback> = new Set();
  private _isOnline: boolean;

  constructor() {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = (): void => {
    this._isOnline = true;
    this.notifyListeners();
  };

  private handleOffline = (): void => {
    this._isOnline = false;
    this.notifyListeners();
  };

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this._isOnline));
  }

  /**
   * Check if the browser is currently online
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Subscribe to online/offline status changes
   * @param callback - Called with the new status when it changes
   * @returns Unsubscribe function
   */
  subscribe(callback: StatusChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if online and throw an error if offline
   * @param message - Custom error message for offline state
   * @throws Error if offline
   */
  requireOnline(message?: string): void {
    if (!this._isOnline) {
      throw new Error(
        message ?? 'You are offline. Please connect to the internet and try again.'
      );
    }
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
