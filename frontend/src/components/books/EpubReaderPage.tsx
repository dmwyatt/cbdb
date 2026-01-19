import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EpubReader } from './EpubReader';
import { useLibraryStore } from '@/store/libraryStore';
import { queryService } from '@/lib/queryService';
import { fetchBookContent } from '@/lib/api';
import { log, LogCategory } from '@/lib/logger';
import { showGlobalError } from '@/lib/errorService';

export function EpubReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, libraryPath } = useLibraryStore();

  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading reader...');
  const [error, setError] = useState<string | null>(null);

  // Parse book ID and get book detail synchronously via useMemo
  const bookId = id ? parseInt(id, 10) : NaN;
  const book = useMemo(() => {
    if (!db || isNaN(bookId)) {
      return null;
    }
    const result = queryService.getBookDetail(bookId);
    return result.data;
  }, [db, bookId]);

  // Get EPUB format info
  const epubFormat = useMemo(() => {
    if (!book) return null;
    return book.formats.find((f) => f.format.toUpperCase() === 'EPUB') ?? null;
  }, [book]);

  // Handle navigation for invalid states
  useEffect(() => {
    if (!db || !id || !libraryPath) return;

    if (isNaN(bookId) || !book) {
      navigate('/', { replace: true });
      return;
    }

    if (!epubFormat) {
      showGlobalError('This book does not have an EPUB format available');
      navigate(`/book/${bookId}`, { replace: true });
    }
  }, [db, id, libraryPath, bookId, book, epubFormat, navigate]);

  // Download the EPUB file
  useEffect(() => {
    if (!book || !epubFormat || !libraryPath) return;

    const loadEpub = async () => {
      try {
        const filePath = `${book.path}/${epubFormat.name}.epub`;
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
  }, [book, epubFormat, libraryPath]);

  const handleClose = () => {
    // Go back in history if possible, otherwise go to book detail page
    // This handles the case where user navigated directly to the reader URL
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(`/book/${id}`, { replace: true });
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
