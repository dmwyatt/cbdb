import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/common/StarRating';
import type { Book } from '@/types/book';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export function BookCard({ book, onClick }: BookCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-16 h-20 bg-slate-100 rounded flex items-center justify-center text-3xl flex-shrink-0">
            📚
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-slate-800 line-clamp-2 leading-tight">
              {book.title}
            </h3>
            {book.authors && (
              <p className="text-sm text-slate-500 mt-1 truncate">{book.authors}</p>
            )}
            {book.series && (
              <p className="text-sm text-blue-500 mt-1 truncate">
                {book.series}
                {book.series_index ? ` #${book.series_index}` : ''}
              </p>
            )}
            {book.rating && (
              <div className="mt-1">
                <StarRating rating={book.rating} className="text-sm" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
