import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EpubReader } from './EpubReader';
import { useLibraryStore } from '@/store/libraryStore';
import { queryService } from '@/lib/queryService';
import { fetchBookContent } from '@/lib/api';
import { log, LogCategory } from '@/lib/logger';
import { showGlobalError } from '@/lib/errorService';
import type { BookDetail } from '@/types/book';

export function EpubReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, libraryPath } = useLibraryStore();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading reader...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !id || !libraryPath) {
      return;
    }

    const bookId = parseInt(id, 10);
    if (isNaN(bookId)) {
      navigate('/', { replace: true });
      return;
    }

    const result = queryService.getBookDetail(bookId);
    const detail = result.data;

    if (!detail) {
      navigate('/', { replace: true });
      return;
    }

    // Check if book has EPUB format
    const epubFormat = detail.formats.find(
      (f) => f.format.toUpperCase() === 'EPUB'
    );

    if (!epubFormat) {
      showGlobalError('This book does not have an EPUB format available');
      navigate(`/book/${bookId}`, { replace: true });
      return;
    }

    setBook(detail);

    // Download the EPUB file
    const loadEpub = async () => {
      try {
        const filePath = `${detail.path}/${epubFormat.name}.epub`;
        log.info(LogCategory.READER, 'Downloading EPUB content', { filePath });
        setLoadingMessage('Downloading book...');

        const content = await fetchBookContent(libraryPath, filePath);
        log.info(LogCategory.READER, 'EPUB downloaded', { size: content.byteLength });

        setEpubData(content);
        setIsLoading(false);
      } catch (err) {
        log.error(LogCategory.READER, 'Failed to download EPUB', err);
        setError(err instanceof Error ? err.message : 'Failed to load book');
        setIsLoading(false);
      }
    };

    loadEpub();
  }, [db, id, libraryPath, navigate]);

  const handleClose = () => {
    if (book) {
      navigate(`/book/${book.id}`);
    } else {
      navigate('/');
    }
  };

  if (!libraryPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Library not loaded</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!book || !epubData) {
    return null;
  }

  return (
    <EpubReader
      bookData={epubData}
      bookId={book.id}
      bookTitle={book.title}
      onClose={handleClose}
    />
  );
}
