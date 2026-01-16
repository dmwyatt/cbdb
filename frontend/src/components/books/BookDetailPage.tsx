import { useEffect, useState, useRef } from 'react';
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

interface StickyHeaderProps {
  visible: boolean;
  title: string;
  coverUrl: string | null;
  hasCover: boolean;
  onBack: () => void;
}

function StickyHeader({ visible, title, coverUrl, hasCover, onBack }: StickyHeaderProps) {
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all duration-300 ease-out ${
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 h-14">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 -ml-2 shrink-0"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          {/* Cover thumbnail */}
          <div className="w-8 h-11 bg-slate-100 rounded overflow-hidden shrink-0 flex items-center justify-center">
            {coverUrl ? (
              <img
                src={`data:image/jpeg;base64,${coverUrl}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm text-slate-400">
                {hasCover ? '...' : '📚'}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="font-semibold text-slate-900 truncate text-sm sm:text-base">
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, libraryPath } = useLibraryStore();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [queryTime, setQueryTime] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Intersection Observer to detect when title scrolls out of view
  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky header when title is not visible
        setShowStickyHeader(!entry.isIntersecting);
      },
      {
        // Trigger when title fully exits viewport at top
        threshold: 0,
        rootMargin: '-10px 0px 0px 0px',
      }
    );

    observer.observe(titleElement);

    return () => {
      observer.disconnect();
    };
  }, [book]); // Re-run when book loads

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
    <>
      {/* Sticky header that appears when scrolling */}
      <StickyHeader
        visible={showStickyHeader}
        title={book.title}
        coverUrl={coverUrl}
        hasCover={book.has_cover}
        onBack={handleBack}
      />

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
        <h1 ref={titleRef} className="text-3xl font-bold text-slate-900 mb-6">{book.title}</h1>

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
    </>
  );
}
