import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDownloadLink } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { useLibraryStore } from '@/store/libraryStore';
import { errorService } from '@/lib/errorService';
import type { BookFormat } from '@/types/book';

interface DownloadButtonProps {
  format: BookFormat;
  bookPath: string;
}

export function DownloadButton({ format, bookPath }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { libraryPath } = useLibraryStore();

  const handleDownload = async () => {
    if (!libraryPath) {
      errorService.handleUserError('Library path not configured');
      return;
    }

    setIsLoading(true);
    try {
      const filePath = `${bookPath}/${format.name}.${format.format.toLowerCase()}`;
      const link = await getDownloadLink(libraryPath, filePath);
      window.open(link, '_blank');
    } catch (error) {
      errorService.handleUserError(error, 'Download failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      className="bg-green-600 hover:bg-green-700"
      onClick={handleDownload}
      disabled={isLoading}
    >
      <span className="font-bold mr-1">{isLoading ? '...' : '↓'}</span>
      {format.format}
      <span className="text-xs opacity-85 ml-1">{formatBytes(format.size)}</span>
    </Button>
  );
}
