import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/common/StarRating';
import { DownloadButton } from './DownloadButton';
import { useLibraryStore } from '@/store/libraryStore';
import { queryService } from '@/lib/queryService';
import { coverService } from '@/lib/coverService';
import type { BookDetail } from '@/types/book';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, libraryPath } = useLibraryStore();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [queryTime, setQueryTime] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !id) {
      return;
    }

    const bookId = parseInt(id, 10);
    if (isNaN(bookId)) {
      navigate('/', { replace: true });
      return;
    }

    const result = queryService.getBookDetail(bookId);
    setQueryTime(result.queryTime);
    const detail = result.data;

    if (!detail) {
      navigate('/', { replace: true });
      return;
    }

    setBook(detail);

    // Fetch cover if available
    if (detail.has_cover && libraryPath) {
      coverService.setLibraryPath(libraryPath);
      coverService.getCover(detail.path).then((cover) => {
        if (cover) {
          setCoverUrl(cover);
        }
      }).catch((e) => {
        console.error('Failed to fetch cover:', e);
      });
    } else {
      setCoverUrl(null);
    }
  }, [db, id, libraryPath, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  if (!book) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4 -ml-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Title */}
      <h1 className="text-3xl font-bold text-slate-900 mb-6">{book.title}</h1>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Cover image */}
          <div className="w-40 h-56 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden mx-auto sm:mx-0">
            {coverUrl ? (
              <img
                src={`data:image/jpeg;base64,${coverUrl}`}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl text-slate-400">
                {book.has_cover ? '...' : '📚'}
              </span>
            )}
          </div>

          {/* Book info */}
          <div className="space-y-3 flex-1">
            {book.authors.length > 0 && (
              <p className="text-lg">
                <strong>Authors:</strong> {book.authors.join(', ')}
              </p>
            )}

            {book.series && (
              <p>
                <strong>Series:</strong> {book.series}
                {book.series_index ? ` #${book.series_index}` : ''}
              </p>
            )}

            {book.rating && (
              <div>
                <StarRating rating={book.rating} className="text-xl" />
              </div>
            )}

            {book.publisher && (
              <p>
                <strong>Publisher:</strong> {book.publisher}
              </p>
            )}

            {book.pubdate && (
              <p>
                <strong>Published:</strong>{' '}
                {new Date(book.pubdate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {book.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {book.formats.length > 0 && (
          <div>
            <strong>Formats:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              {book.formats.map((format) => (
                <DownloadButton
                  key={format.format}
                  format={format}
                  bookPath={book.path}
                />
              ))}
            </div>
          </div>
        )}

        {book.comments && (
          <div>
            <strong>Description:</strong>
            <div
              className="mt-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: book.comments }}
            />
          </div>
        )}

        {Object.keys(book.identifiers).length > 0 && (
          <div>
            <strong>Identifiers:</strong>{' '}
            {Object.entries(book.identifiers)
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
              .join(' | ')}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Query time: {queryTime.toFixed(1)}ms
        </p>
      </div>
    </main>
  );
}
