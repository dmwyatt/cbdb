import sqlite3
from contextlib import contextmanager


class CalibreDB:
    """Interface for querying Calibre metadata database."""

    def __init__(self, db_path):
        """
        Initialize database connection.

        Args:
            db_path: Path to the metadata.db file
        """
        self.db_path = db_path

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def get_books(self, page=1, per_page=20):
        """
        Get paginated list of books.

        Args:
            page: Page number (1-indexed)
            per_page: Number of books per page

        Returns:
            Tuple of (books list, total count)
        """
        offset = (page - 1) * per_page

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Get total count
            cursor.execute("SELECT COUNT(*) as count FROM books")
            total = cursor.fetchone()['count']

            # Get books with authors
            query = """
                SELECT
                    b.id,
                    b.title,
                    b.path,
                    b.has_cover,
                    b.timestamp,
                    b.pubdate,
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
                LIMIT ? OFFSET ?
            """

            cursor.execute(query, (per_page, offset))
            books = [dict(row) for row in cursor.fetchall()]

            return books, total

    def search_books(self, search_term, page=1, per_page=20):
        """
        Search for books by title or author.

        Args:
            search_term: Search query
            page: Page number (1-indexed)
            per_page: Number of books per page

        Returns:
            Tuple of (books list, total count)
        """
        offset = (page - 1) * per_page
        search_pattern = f"%{search_term}%"

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Get total count
            count_query = """
                SELECT COUNT(DISTINCT b.id) as count
                FROM books b
                LEFT JOIN books_authors_link bal ON b.id = bal.book
                LEFT JOIN authors a ON bal.author = a.id
                WHERE b.title LIKE ? OR a.name LIKE ?
            """
            cursor.execute(count_query, (search_pattern, search_pattern))
            total = cursor.fetchone()['count']

            # Get books
            query = """
                SELECT DISTINCT
                    b.id,
                    b.title,
                    b.path,
                    b.has_cover,
                    b.timestamp,
                    b.pubdate,
                    b.series_index,
                    GROUP_CONCAT(DISTINCT a.name, ' & ') as authors,
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
            """

            cursor.execute(query, (search_pattern, search_pattern, per_page, offset))
            books = [dict(row) for row in cursor.fetchall()]

            return books, total

    def get_book_detail(self, book_id):
        """
        Get detailed information about a specific book.

        Args:
            book_id: The book ID

        Returns:
            Dictionary with book details or None if not found
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Get basic book info
            query = """
                SELECT
                    b.id,
                    b.title,
                    b.path,
                    b.has_cover,
                    b.timestamp,
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
            """

            cursor.execute(query, (book_id,))
            book = cursor.fetchone()

            if not book:
                return None

            book_dict = dict(book)

            # Get authors
            cursor.execute("""
                SELECT a.name
                FROM authors a
                JOIN books_authors_link bal ON a.id = bal.author
                WHERE bal.book = ?
            """, (book_id,))
            book_dict['authors'] = [row['name'] for row in cursor.fetchall()]

            # Get tags
            cursor.execute("""
                SELECT t.name
                FROM tags t
                JOIN books_tags_link btl ON t.id = btl.tag
                WHERE btl.book = ?
            """, (book_id,))
            book_dict['tags'] = [row['name'] for row in cursor.fetchall()]

            # Get languages
            cursor.execute("""
                SELECT l.lang_code
                FROM languages l
                JOIN books_languages_link bll ON l.id = bll.lang_code
                WHERE bll.book = ?
            """, (book_id,))
            book_dict['languages'] = [row['lang_code'] for row in cursor.fetchall()]

            # Get formats
            cursor.execute("""
                SELECT format, uncompressed_size, name
                FROM data
                WHERE book = ?
            """, (book_id,))
            book_dict['formats'] = [dict(row) for row in cursor.fetchall()]

            # Get identifiers
            cursor.execute("""
                SELECT type, val
                FROM identifiers
                WHERE book = ?
            """, (book_id,))
            book_dict['identifiers'] = {row['type']: row['val'] for row in cursor.fetchall()}

            return book_dict

    def get_authors(self):
        """Get list of all authors."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM authors ORDER BY sort")
            return [dict(row) for row in cursor.fetchall()]

    def get_tags(self):
        """Get list of all tags."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM tags ORDER BY name")
            return [dict(row) for row in cursor.fetchall()]

    def get_series(self):
        """Get list of all series."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM series ORDER BY sort")
            return [dict(row) for row in cursor.fetchall()]
