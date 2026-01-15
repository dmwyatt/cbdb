import type { DownloadLinkResponse } from '@/types/api';

export async function downloadDatabase(libraryPath: string): Promise<Uint8Array> {
  const response = await fetch('/api/download-db', {
    headers: {
      'X-Library-Path': libraryPath,
    },
  });

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
}

export async function getDownloadLink(
  libraryPath: string,
  filePath: string
): Promise<string> {
  const response = await fetch(
    `/api/download-link?path=${encodeURIComponent(filePath)}`,
    {
      headers: {
        'X-Library-Path': libraryPath,
      },
    }
  );

  const data: DownloadLinkResponse = await response.json();

  if (!data.success || !data.link) {
    throw new Error(data.error || 'Failed to get download link');
  }

  return data.link;
}
