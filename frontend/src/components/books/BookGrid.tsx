import { BookCard } from './BookCard';
import { useCovers } from '@/hooks/useCovers';
import type { Book } from '@/types/book';

interface BookGridProps {
  books: Book[];
  onBookClick: (bookId: number) => void;
}

export function BookGrid({ books, onBookClick }: BookGridProps) {
  const { covers } = useCovers(books);

  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No books found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          coverUrl={covers[book.path]}
          onClick={() => onBookClick(book.id)}
        />
      ))}
    </div>
  );
}
