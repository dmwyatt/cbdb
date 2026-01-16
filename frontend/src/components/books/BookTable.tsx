import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StarRating } from '@/components/common/StarRating';
import { useCovers } from '@/hooks/useCovers';
import type { Book } from '@/types/book';

interface BookTableProps {
  books: Book[];
  onBookClick: (bookId: number) => void;
}

export function BookTable({ books, onBookClick }: BookTableProps) {
  const { covers } = useCovers(books);

  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No books found
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold w-12"></TableHead>
            <TableHead className="font-semibold">Title</TableHead>
            <TableHead className="font-semibold">Author</TableHead>
            <TableHead className="font-semibold">Series</TableHead>
            <TableHead className="font-semibold">Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => {
            const coverUrl = covers[book.path];
            return (
              <TableRow
                key={book.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => onBookClick(book.id)}
              >
                <TableCell className="p-2">
                  <div className="w-8 h-10 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                    {coverUrl ? (
                      <img
                        src={`data:image/jpeg;base64,${coverUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        {book.has_cover ? '...' : '📚'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-xs truncate">
                  {book.title}
                </TableCell>
                <TableCell className="text-slate-500 max-w-xs truncate">
                  {book.authors || '-'}
                </TableCell>
                <TableCell className="text-blue-500 whitespace-nowrap">
                  {book.series
                    ? `${book.series}${book.series_index ? ` #${book.series_index}` : ''}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {book.rating ? <StarRating rating={book.rating} /> : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
