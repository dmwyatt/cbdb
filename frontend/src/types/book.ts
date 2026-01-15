export interface Book {
  id: number;
  title: string;
  path: string;
  has_cover: boolean;
  series_index: number | null;
  authors: string | null;
  series: string | null;
  rating: number | null;
}

export interface BookFormat {
  format: string;
  size: number;
  name: string;
}

export interface BookDetail extends Omit<Book, 'authors'> {
  pubdate: string | null;
  uuid: string;
  publisher: string | null;
  comments: string | null;
  authors: string[];
  tags: string[];
  formats: BookFormat[];
  identifiers: Record<string, string>;
}

export interface BooksResult {
  books: Book[];
  total: number;
}
