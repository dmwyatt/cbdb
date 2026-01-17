import type { DownloadLinkResponse, CoversResponse } from '@/types/api';
import { ERROR_CODES } from '@/types/api';
import type { LibraryPath } from '@/types/libraryPath';

const AUTH_STORAGE_KEY = 'calibre-app-password';

// Callback for successful Dropbox API calls - used to auto-dismiss error banner
let onDropboxSuccess: (() => void) | null = null;

/**
 * Set the callback for successful Dropbox API calls.
 * This should be called once by the store to wire up auto-dismiss of error banner.
 */
export function setDropboxSuccessHandler(handler: () => void): void {
  onDropboxSuccess = handler;
}

/**
 * Custom error class for Dropbox authentication failures.
 * Thrown when the Dropbox token is expired or invalid.
 */
export class DropboxAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DropboxAuthError';
  }
}

/**
 * Check if an error is a Dropbox auth error
 */
export function isDropboxAuthError(error: unknown): error is DropboxAuthError {
  return error instanceof DropboxAuthError;
}

function getAuthHeaders(): HeadersInit {
  const password = localStorage.getItem(AUTH_STORAGE_KEY);
  if (password) {
    return { 'X-App-Password': password };
  }
  return {};
}

export async function downloadDatabase(libraryPath: LibraryPath): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch('/api/download-db', {
      headers: {
        ...getAuthHeaders(),
        'X-Library-Path': libraryPath,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = 'Failed to download database';
      let errorCode: string | undefined;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
        errorCode = error.error_code;
      } catch {
        // Response wasn't JSON
      }
      if (errorCode === ERROR_CODES.DROPBOX_AUTH_FAILED) {
        throw new DropboxAuthError(errorMsg);
      }
      throw new Error(errorMsg);
    }

    const arrayBuffer = await response.arrayBuffer();
    // Successful Dropbox API call - auto-dismiss any error banner
    onDropboxSuccess?.();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

export async function getDownloadLink(
  libraryPath: LibraryPath,
  filePath: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(
      `/api/download-link?path=${encodeURIComponent(filePath)}`,
      {
        headers: {
          ...getAuthHeaders(),
          'X-Library-Path': libraryPath,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const data: DownloadLinkResponse = await response.json();

    if (!data.success || !data.link) {
      if (data.error_code === ERROR_CODES.DROPBOX_AUTH_FAILED) {
        throw new DropboxAuthError(data.error || 'Dropbox authentication failed');
      }
      throw new Error(data.error || 'Failed to get download link');
    }

    // Successful Dropbox API call - auto-dismiss any error banner
    onDropboxSuccess?.();
    return data.link;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

export async function fetchBookContent(
  libraryPath: LibraryPath,
  filePath: string
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for large files

  try {
    const response = await fetch(
      `/api/book-content?path=${encodeURIComponent(filePath)}`,
      {
        headers: {
          ...getAuthHeaders(),
          'X-Library-Path': libraryPath,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = 'Failed to download book';
      let errorCode: string | undefined;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
        errorCode = error.error_code;
      } catch {
        // Response wasn't JSON
      }
      if (errorCode === ERROR_CODES.DROPBOX_AUTH_FAILED) {
        throw new DropboxAuthError(errorMsg);
      }
      throw new Error(errorMsg);
    }

    const arrayBuffer = await response.arrayBuffer();
    // Successful Dropbox API call - auto-dismiss any error banner
    onDropboxSuccess?.();
    return arrayBuffer;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. The book file may be too large or your connection is slow.');
    }
    throw error;
  }
}

export async function fetchCovers(
  libraryPath: LibraryPath,
  bookPaths: string[]
): Promise<Record<string, string>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch('/api/covers', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
        'X-Library-Path': libraryPath,
      },
      body: JSON.stringify({ paths: bookPaths }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: CoversResponse = await response.json();

    if (!data.success) {
      if (data.error_code === ERROR_CODES.DROPBOX_AUTH_FAILED) {
        throw new DropboxAuthError(data.error || 'Dropbox authentication failed');
      }
      throw new Error(data.error || 'Failed to fetch covers');
    }

    // Successful Dropbox API call - auto-dismiss any error banner
    onDropboxSuccess?.();
    return data.covers || {};
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out while fetching covers.');
    }
    throw error;
  }
}
