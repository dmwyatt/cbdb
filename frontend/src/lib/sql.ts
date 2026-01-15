import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Book, BookDetail, BooksResult, BookFormat } from '@/types/book';

let SQL: SqlJsStatic | null = null;

export async function initializeSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;

  SQL = await initSqlJs({
    locateFile: (file) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
  });

  return SQL;
}

export function createDatabase(data: Uint8Array): Database {
  if (!SQL) throw new Error('sql.js not initialized');
  return new SQL.Database(data);
}

export function validateDatabase(db: Database): boolean {
  try {
    db.exec('SELECT COUNT(*) FROM books');
    return true;
  } catch {
    return false;
  }
}

function resultToObjects<T>(result: ReturnType<Database['exec']>): T[] {
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export function getBooks(
  db: Database,
  page: number,
  perPage: number
): BooksResult {
  const offset = (page - 1) * perPage;

  // Get total count
  const countResult = db.exec('SELECT COUNT(*) as count FROM books');
  const total = countResult[0].values[0][0] as number;

  // Get books with authors, series, ratings
  const query = `
    SELECT
      b.id,
      b.title,
      b.path,
      b.has_cover,
      b.series_index,
      GROUP_CONCAT(a.name, ' & ') as authors,
      s.name as series,
      r.rating
    FROM books b
    LEFT JOIN books_authors_link bal ON b.id = bal.book
    LEFT JOIN authors a ON bal.author = a.id
    LEFT JOIN books_series_link bsl ON b.id = bsl.book
    LEFT JOIN series s ON bsl.series = s.id
    LEFT JOIN books_ratings_link brl ON b.id = brl.book
    LEFT JOIN ratings r ON brl.rating = r.id
    GROUP BY b.id
    ORDER BY b.sort
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const result = db.exec(query);
  const books = resultToObjects<Book>(result);

  return { books, total };
}

export function searchBooks(
  db: Database,
  term: string,
  page: number,
  perPage: number
): BooksResult {
  const offset = (page - 1) * perPage;
  const searchPattern = `%${term}%`;

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT b.id) as count
    FROM books b
    LEFT JOIN books_authors_link bal ON b.id = bal.book
    LEFT JOIN authors a ON bal.author = a.id
    WHERE b.title LIKE ? OR a.name LIKE ?
  `;

  const countStmt = db.prepare(countQuery);
  countStmt.bind([searchPattern, searchPattern]);
  countStmt.step();
  const total = countStmt.get()[0] as number;
  countStmt.free();

  // Get books
  const query = `
    SELECT DISTINCT
      b.id,
      b.title,
      b.path,
      b.has_cover,
      b.series_index,
      GROUP_CONCAT(a.name, ' & ') as authors,
      s.name as series,
      r.rating
    FROM books b
    LEFT JOIN books_authors_link bal ON b.id = bal.book
    LEFT JOIN authors a ON bal.author = a.id
    LEFT JOIN books_series_link bsl ON b.id = bsl.book
    LEFT JOIN series s ON bsl.series = s.id
    LEFT JOIN books_ratings_link brl ON b.id = brl.book
    LEFT JOIN ratings r ON brl.rating = r.id
    WHERE b.title LIKE ? OR a.name LIKE ?
    GROUP BY b.id
    ORDER BY b.sort
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  stmt.bind([searchPattern, searchPattern, perPage, offset]);

  const books: Book[] = [];
  while (stmt.step()) {
    books.push(stmt.getAsObject() as unknown as Book);
  }
  stmt.free();

  return { books, total };
}

export function getBookDetail(db: Database, bookId: number): BookDetail | null {
  // Get basic book info
  const query = `
    SELECT
      b.id,
      b.title,
      b.path,
      b.has_cover,
      b.pubdate,
      b.series_index,
      b.uuid,
      s.name as series,
      r.rating,
      p.name as publisher,
      c.text as comments
    FROM books b
    LEFT JOIN books_series_link bsl ON b.id = bsl.book
    LEFT JOIN series s ON bsl.series = s.id
    LEFT JOIN books_ratings_link brl ON b.id = brl.book
    LEFT JOIN ratings r ON brl.rating = r.id
    LEFT JOIN books_publishers_link bpl ON b.id = bpl.book
    LEFT JOIN publishers p ON bpl.publisher = p.id
    LEFT JOIN comments c ON b.id = c.book
    WHERE b.id = ?
  `;

  const stmt = db.prepare(query);
  stmt.bind([bookId]);
  stmt.step();
  const bookRaw = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();

  if (!bookRaw.id) {
    return null;
  }

  // Get authors
  const authorsResult = db.exec(`
    SELECT a.name FROM authors a
    JOIN books_authors_link bal ON a.id = bal.author
    WHERE bal.book = ${bookId}
  `);
  const authors = authorsResult.length
    ? (authorsResult[0].values.map((r) => r[0]) as string[])
    : [];

  // Get tags
  const tagsResult = db.exec(`
    SELECT t.name FROM tags t
    JOIN books_tags_link btl ON t.id = btl.tag
    WHERE btl.book = ${bookId}
  `);
  const tags = tagsResult.length
    ? (tagsResult[0].values.map((r) => r[0]) as string[])
    : [];

  // Get formats
  const formatsResult = db.exec(`
    SELECT format, uncompressed_size, name FROM data
    WHERE book = ${bookId}
  `);
  const formats: BookFormat[] = formatsResult.length
    ? formatsResult[0].values.map((r) => ({
        format: r[0] as string,
        size: r[1] as number,
        name: r[2] as string,
      }))
    : [];

  // Get identifiers
  const identifiersResult = db.exec(`
    SELECT type, val FROM identifiers
    WHERE book = ${bookId}
  `);
  const identifiers: Record<string, string> = {};
  if (identifiersResult.length) {
    identifiersResult[0].values.forEach((r) => {
      identifiers[r[0] as string] = r[1] as string;
    });
  }

  return {
    id: bookRaw.id as number,
    title: bookRaw.title as string,
    path: bookRaw.path as string,
    has_cover: Boolean(bookRaw.has_cover),
    pubdate: bookRaw.pubdate as string | null,
    series_index: bookRaw.series_index as number | null,
    uuid: bookRaw.uuid as string,
    series: bookRaw.series as string | null,
    rating: bookRaw.rating as number | null,
    publisher: bookRaw.publisher as string | null,
    comments: bookRaw.comments as string | null,
    authors,
    tags,
    formats,
    identifiers,
  };
}
