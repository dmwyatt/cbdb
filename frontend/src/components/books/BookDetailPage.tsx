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
import { logWarn, LogCategory } from '@/lib/logger';
import type { BookDetail } from '@/types/book';

// Animation constants
const SCROLL_DISTANCE = 150; // pixels to scroll for full collapse
const HEADER_HEIGHT_EXPANDED = 300; // height when expanded (cover + title + padding)
const HEADER_HEIGHT_COLLAPSED = 56; // height when collapsed

// Cover dimensions
const COVER_EXPANDED = { width: 120, height: 168 };
const COVER_COLLAPSED = { width: 32, height: 44 };

// Title font sizes (in pixels)
const TITLE_SIZE_EXPANDED = 24;
const TITLE_SIZE_COLLAPSED = 14;

// Layout positions
const BACK_BUTTON_WIDTH = 40;

// Linear interpolation helper
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, libraryPath } = useLibraryStore();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [queryTime, setQueryTime] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate animation progress (0 = expanded, 1 = collapsed)
  const progress = Math.min(1, Math.max(0, scrollY / SCROLL_DISTANCE));
  const isCollapsed = progress >= 1;

  // Interpolated values
  const headerHeight = lerp(HEADER_HEIGHT_EXPANDED, HEADER_HEIGHT_COLLAPSED, progress);
  const coverWidth = lerp(COVER_EXPANDED.width, COVER_COLLAPSED.width, progress);
  const coverHeight = lerp(COVER_EXPANDED.height, COVER_COLLAPSED.height, progress);
  const titleSize = lerp(TITLE_SIZE_EXPANDED, TITLE_SIZE_COLLAPSED, progress);

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
        logWarn(LogCategory.COVER, 'Failed to fetch cover', e);
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
      {/* Morphing header - always sticky, elements animate inside */}
      <div
        ref={headerRef}
        className={`sticky top-0 bg-white/95 backdrop-blur-sm z-50 transition-shadow duration-200 ${
          isCollapsed ? 'shadow-sm border-b border-slate-200' : ''
        }`}
        style={{ height: headerHeight }}
      >
        <div className="container mx-auto px-4 h-full">
          <div className="relative h-full flex items-center">
            {/* Back button - positioned absolutely, moves up as we scroll */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-slate-600 hover:text-slate-900 -ml-2 shrink-0 z-10 absolute"
              style={{
                top: lerp(16, (HEADER_HEIGHT_COLLAPSED - 32) / 2, progress),
                left: 0,
              }}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span
                className="ml-2 overflow-hidden whitespace-nowrap"
                style={{
                  maxWidth: progress > 0.3 ? 0 : 40,
                  opacity: 1 - progress * 2,
                  transition: 'max-width 150ms ease-out',
                }}
              >
                Back
              </span>
            </Button>

            {/* Cover image - morphs from large centered to small in header */}
            <div
              className="bg-slate-100 rounded overflow-hidden flex items-center justify-center shrink-0 absolute"
              style={{
                width: coverWidth,
                height: coverHeight,
                left: lerp(0, BACK_BUTTON_WIDTH, progress),
                top: lerp(56, (HEADER_HEIGHT_COLLAPSED - coverHeight) / 2, progress),
              }}
            >
              {coverUrl ? (
                <img
                  src={`data:image/jpeg;base64,${coverUrl}`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-slate-400 transition-none"
                  style={{ fontSize: lerp(40, 14, progress) }}
                >
                  {book.has_cover ? '...' : '📚'}
                </span>
              )}
            </div>

            {/* Title - morphs from large below cover to small in header */}
            <h1
              className="font-bold text-slate-900 absolute"
              style={{
                fontSize: titleSize,
                left: lerp(0, BACK_BUTTON_WIDTH + COVER_COLLAPSED.width + 12, progress),
                top: lerp(56 + COVER_EXPANDED.height + 16, (HEADER_HEIGHT_COLLAPSED - titleSize * 1.2) / 2, progress),
                right: 16,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: progress > 0.8 ? 'nowrap' : 'normal',
                display: '-webkit-box',
                WebkitLineClamp: progress > 0.5 ? 1 : 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {book.title}
            </h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Book info - no cover here anymore, it's in the header */}
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
