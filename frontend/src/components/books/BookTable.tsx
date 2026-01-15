import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StarRating } from '@/components/common/StarRating';
import type { Book } from '@/types/book';

interface BookTableProps {
  books: Book[];
  onBookClick: (bookId: number) => void;
}

export function BookTable({ books, onBookClick }: BookTableProps) {
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
            <TableHead className="font-semibold">Title</TableHead>
            <TableHead className="font-semibold">Author</TableHead>
            <TableHead className="font-semibold">Series</TableHead>
            <TableHead className="font-semibold">Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => (
            <TableRow
              key={book.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => onBookClick(book.id)}
            >
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
