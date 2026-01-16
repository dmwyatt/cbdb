import type { DownloadLinkResponse, CoversResponse } from '@/types/api';
import type { LibraryPath } from '@/types/libraryPath';

const AUTH_STORAGE_KEY = 'calibre-app-password';

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
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch {
        // Response wasn't JSON
      }
      throw new Error(errorMsg);
    }

    const arrayBuffer = await response.arrayBuffer();
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
      throw new Error(data.error || 'Failed to get download link');
    }

    return data.link;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
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
      throw new Error(data.error || 'Failed to fetch covers');
    }

    return data.covers || {};
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out while fetching covers.');
    }
    throw error;
  }
}
