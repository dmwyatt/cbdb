import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/common/StarRating';
import { DownloadButton } from './DownloadButton';
import { useLibraryStore } from '@/store/libraryStore';
import { queryService } from '@/lib/queryService';
import { coverService } from '@/lib/coverService';
import type { BookDetail } from '@/types/book';

export function BookModal() {
  const { db, selectedBookId, setSelectedBookId, libraryPath } = useLibraryStore();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [queryTime, setQueryTime] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!db || selectedBookId === null) {
      setBook(null);
      setCoverUrl(null);
      return;
    }

    // Use queryService for book detail query - it handles timing
    const result = queryService.getBookDetail(selectedBookId);
    setQueryTime(result.queryTime);
    const detail = result.data;
    setBook(detail);

    // Fetch cover if available
    if (detail?.has_cover && libraryPath) {
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
  }, [db, selectedBookId, libraryPath]);

  const handleClose = () => {
    setSelectedBookId(null);
  };

  return (
    <Dialog open={selectedBookId !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {book && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{book.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Cover image */}
                <div className="w-32 h-44 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden mx-auto sm:mx-0">
                  {coverUrl ? (
                    <img
                      src={`data:image/jpeg;base64,${coverUrl}`}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-slate-400">
                      {book.has_cover ? '...' : '📚'}
                    </span>
                  )}
                </div>

                {/* Book info */}
                <div className="space-y-2 flex-1">
                  {book.authors.length > 0 && (
                    <p>
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
                      <StarRating rating={book.rating} className="text-lg" />
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

            {/* Mobile-friendly close button - visible on small screens where browser chrome may obscure the X button */}
            <DialogFooter className="sm:hidden mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
