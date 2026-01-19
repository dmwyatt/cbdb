#!/usr/bin/env python3
"""
Generate test fixtures for the Calibre library viewer.

Creates a minimal but realistic Calibre library structure with:
- metadata.db SQLite database
- Directory structure matching Calibre layout
- Placeholder cover images (colored rectangles)
- Placeholder .epub files

Usage:
    uv run python test_data/generate_fixtures.py
"""

import os
import random
import sqlite3
import uuid
from datetime import datetime, timedelta

# Try to import Pillow for cover generation
try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False
    print("Warning: Pillow not installed. Cover images will not be generated.")
    print("Install with: uv add pillow")


# Sample data for generating realistic books
FIRST_NAMES = [
    "Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah",
    "Isaac", "Julia", "Kevin", "Laura", "Michael", "Nina", "Oliver", "Patricia"
]

LAST_NAMES = [
    "Anderson", "Brown", "Clark", "Davis", "Evans", "Foster", "Garcia", "Harris",
    "Irving", "Johnson", "King", "Lewis", "Miller", "Nelson", "O'Brien", "Parker"
]

BOOK_TITLE_WORDS = [
    "The", "A", "Secret", "Lost", "Hidden", "Dark", "Light", "Final", "First",
    "Last", "Eternal", "Silent", "Forgotten", "Ancient", "Modern", "Digital",
    "Garden", "City", "Mountain", "Ocean", "Forest", "Desert", "River", "Sky",
    "Journey", "Quest", "Mystery", "Legend", "Chronicle", "Tale", "Story",
    "Love", "War", "Peace", "Truth", "Dream", "Shadow", "Fire", "Ice", "Storm"
]

SERIES_NAMES = [
    "The Chronicles of Eldoria",
    "Dark Tower",
    "Quantum Files",
    "The Inheritance Cycle",
    "Starlight Saga"
]

TAG_NAMES = [
    "Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Mystery",
    "Thriller", "Romance", "Historical", "Biography", "Self-Help",
    "Technology", "Philosophy", "Adventure", "Horror", "Young Adult"
]

PUBLISHER_NAMES = [
    "Penguin Books", "Random House", "HarperCollins", "Simon & Schuster",
    "Macmillan Publishers", "Hachette Book Group"
]


def generate_title():
    """Generate a random book title."""
    num_words = random.randint(2, 5)
    words = random.sample(BOOK_TITLE_WORDS, num_words)
    return " ".join(words)


def generate_author():
    """Generate a random author name."""
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def generate_uuid():
    """Generate a UUID for a book."""
    return str(uuid.uuid4())


def generate_pubdate():
    """Generate a random publication date."""
    start_date = datetime(1990, 1, 1)
    end_date = datetime(2024, 12, 31)
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return (start_date + timedelta(days=random_days)).strftime("%Y-%m-%d %H:%M:%S")


def create_sort_name(title: str) -> str:
    """Create a sortable version of a title (removes leading 'The', 'A', 'An')."""
    lower_title = title.lower()
    for prefix in ["the ", "a ", "an "]:
        if lower_title.startswith(prefix):
            return title[len(prefix):] + ", " + title[:len(prefix) - 1]
    return title


def create_cover_image(path: str, color: tuple):
    """Create a placeholder cover image with the specified color."""
    if not HAS_PILLOW:
        return

    # Create a colored rectangle
    img = Image.new('RGB', (300, 400), color=color)
    img.save(path, 'JPEG', quality=85)


def create_placeholder_epub(path: str, title: str, author: str):
    """Create a minimal placeholder EPUB file."""
    # EPUB is a ZIP file with specific structure. Create a minimal valid one.
    import zipfile

    # Minimal EPUB content
    container_xml = '''<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>'''

    content_opf = f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uuid_id" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>{title}</dc:title>
        <dc:creator>{author}</dc:creator>
        <dc:identifier id="uuid_id">{generate_uuid()}</dc:identifier>
        <dc:language>en</dc:language>
    </metadata>
    <manifest>
        <item href="chapter1.xhtml" id="chapter1" media-type="application/xhtml+xml"/>
        <item href="toc.ncx" id="ncx" media-type="application/x-dtbncx+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="chapter1"/>
    </spine>
</package>'''

    chapter1_xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>{title}</title>
</head>
<body>
    <h1>{title}</h1>
    <p>By {author}</p>
    <p>This is a placeholder book for testing purposes.</p>
</body>
</html>'''

    toc_ncx = f'''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="{generate_uuid()}"/>
    </head>
    <docTitle>
        <text>{title}</text>
    </docTitle>
    <navMap>
        <navPoint id="chapter1" playOrder="1">
            <navLabel>
                <text>Chapter 1</text>
            </navLabel>
            <content src="chapter1.xhtml"/>
        </navPoint>
    </navMap>
</ncx>'''

    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # mimetype must be first and uncompressed
        zf.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        zf.writestr('META-INF/container.xml', container_xml)
        zf.writestr('content.opf', content_opf)
        zf.writestr('chapter1.xhtml', chapter1_xhtml)
        zf.writestr('toc.ncx', toc_ncx)


def create_database(db_path: str, books_data: list):
    """Create the Calibre metadata.db database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables matching Calibre's schema
    cursor.executescript('''
        -- Main books table
        CREATE TABLE books (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            sort TEXT,
            timestamp TEXT,
            pubdate TEXT,
            series_index REAL DEFAULT 1.0,
            path TEXT,
            has_cover INTEGER DEFAULT 0,
            uuid TEXT
        );

        -- Authors
        CREATE TABLE authors (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sort TEXT
        );

        CREATE TABLE books_authors_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            author INTEGER NOT NULL
        );

        -- Series
        CREATE TABLE series (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sort TEXT
        );

        CREATE TABLE books_series_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            series INTEGER NOT NULL
        );

        -- Ratings
        CREATE TABLE ratings (
            id INTEGER PRIMARY KEY,
            rating INTEGER
        );

        CREATE TABLE books_ratings_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            rating INTEGER NOT NULL
        );

        -- Publishers
        CREATE TABLE publishers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sort TEXT
        );

        CREATE TABLE books_publishers_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            publisher INTEGER NOT NULL
        );

        -- Tags
        CREATE TABLE tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE books_tags_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            tag INTEGER NOT NULL
        );

        -- Comments (book descriptions)
        CREATE TABLE comments (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            text TEXT
        );

        -- Data (file formats)
        CREATE TABLE data (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            format TEXT NOT NULL,
            uncompressed_size INTEGER,
            name TEXT
        );

        -- Identifiers (ISBN, etc.)
        CREATE TABLE identifiers (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            type TEXT NOT NULL,
            val TEXT NOT NULL
        );
    ''')

    # Insert ratings (Calibre uses 2, 4, 6, 8, 10 for 1-5 stars)
    for rating in [2, 4, 6, 8, 10]:
        cursor.execute('INSERT INTO ratings (rating) VALUES (?)', (rating,))

    # Insert tags
    tag_ids = {}
    for i, tag in enumerate(TAG_NAMES, 1):
        cursor.execute('INSERT INTO tags (id, name) VALUES (?, ?)', (i, tag))
        tag_ids[tag] = i

    # Insert publishers
    publisher_ids = {}
    for i, pub in enumerate(PUBLISHER_NAMES, 1):
        cursor.execute('INSERT INTO publishers (id, name, sort) VALUES (?, ?, ?)',
                       (i, pub, pub))
        publisher_ids[pub] = i

    # Insert series
    series_ids = {}
    for i, series in enumerate(SERIES_NAMES, 1):
        cursor.execute('INSERT INTO series (id, name, sort) VALUES (?, ?, ?)',
                       (i, series, series))
        series_ids[series] = i

    # Track author IDs
    author_ids = {}
    author_counter = 1

    # Insert books and related data
    for book in books_data:
        # Insert book
        cursor.execute('''
            INSERT INTO books (id, title, sort, timestamp, pubdate, series_index, path, has_cover, uuid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            book['id'], book['title'], book['sort'], book['timestamp'],
            book['pubdate'], book['series_index'], book['path'],
            1 if book['has_cover'] else 0, book['uuid']
        ))

        # Insert/link author
        author = book['author']
        if author not in author_ids:
            cursor.execute('INSERT INTO authors (id, name, sort) VALUES (?, ?, ?)',
                           (author_counter, author, author))
            author_ids[author] = author_counter
            author_counter += 1

        cursor.execute('INSERT INTO books_authors_link (book, author) VALUES (?, ?)',
                       (book['id'], author_ids[author]))

        # Link series (if applicable)
        if book.get('series'):
            cursor.execute('INSERT INTO books_series_link (book, series) VALUES (?, ?)',
                           (book['id'], series_ids[book['series']]))

        # Link rating
        if book.get('rating'):
            cursor.execute('INSERT INTO books_ratings_link (book, rating) VALUES (?, ?)',
                           (book['id'], book['rating']))

        # Link publisher
        if book.get('publisher'):
            cursor.execute('INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)',
                           (book['id'], publisher_ids[book['publisher']]))

        # Link tags
        for tag in book.get('tags', []):
            cursor.execute('INSERT INTO books_tags_link (book, tag) VALUES (?, ?)',
                           (book['id'], tag_ids[tag]))

        # Insert comment
        if book.get('comment'):
            cursor.execute('INSERT INTO comments (book, text) VALUES (?, ?)',
                           (book['id'], book['comment']))

        # Insert format data
        cursor.execute('''
            INSERT INTO data (book, format, uncompressed_size, name)
            VALUES (?, ?, ?, ?)
        ''', (book['id'], 'EPUB', book.get('epub_size', 50000), book['filename']))

        # Insert identifiers
        if book.get('isbn'):
            cursor.execute('INSERT INTO identifiers (book, type, val) VALUES (?, ?, ?)',
                           (book['id'], 'isbn', book['isbn']))

    conn.commit()
    conn.close()


def generate_fixtures(library_path: str, num_books: int = 25):
    """Generate the complete test fixture set."""
    # Create directories
    os.makedirs(library_path, exist_ok=True)

    books_data = []

    # Track which series books we've assigned
    series_books = {series: 0 for series in SERIES_NAMES}

    for i in range(1, num_books + 1):
        title = generate_title()
        author = generate_author()
        book_uuid = generate_uuid()
        pubdate = generate_pubdate()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Calibre path format: "Author Name/Title (id)"
        book_dir_name = f"{title} ({i})"
        book_path = f"{author}/{book_dir_name}"
        full_book_path = os.path.join(library_path, book_path)

        # Create book directory
        os.makedirs(full_book_path, exist_ok=True)

        # Decide if this book is in a series (30% chance)
        series = None
        series_index = 1.0
        if random.random() < 0.3 and SERIES_NAMES:
            series = random.choice(SERIES_NAMES)
            series_books[series] += 1
            series_index = float(series_books[series])

        # Random rating (1-5, stored as 2-10, or None)
        rating = random.choice([None, 1, 2, 3, 4, 5])
        rating_id = rating if rating is None else rating  # Use rating value as ID

        # Random publisher
        publisher = random.choice(PUBLISHER_NAMES) if random.random() < 0.7 else None

        # Random tags (1-3 tags)
        num_tags = random.randint(1, 3)
        tags = random.sample(TAG_NAMES, num_tags)

        # Generate comment
        comment = f"<p>This is a test book titled <em>{title}</em> by {author}.</p>"
        if series:
            comment += f"<p>Book {int(series_index)} in the {series} series.</p>"

        # Generate ISBN-like identifier
        isbn = f"978-{random.randint(0, 9)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(0, 9)}"

        # Create filename (Calibre uses title - author.epub)
        filename = f"{title} - {author}"

        # Create cover image (random color)
        cover_path = os.path.join(full_book_path, "cover.jpg")
        color = (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200))
        create_cover_image(cover_path, color)

        # Create placeholder EPUB
        epub_path = os.path.join(full_book_path, f"{filename}.epub")
        create_placeholder_epub(epub_path, title, author)
        epub_size = os.path.getsize(epub_path)

        books_data.append({
            'id': i,
            'title': title,
            'sort': create_sort_name(title),
            'author': author,
            'uuid': book_uuid,
            'pubdate': pubdate,
            'timestamp': timestamp,
            'path': book_path,
            'has_cover': HAS_PILLOW,  # Only true if we could create covers
            'series': series,
            'series_index': series_index,
            'rating': rating_id,
            'publisher': publisher,
            'tags': tags,
            'comment': comment,
            'isbn': isbn,
            'filename': filename,
            'epub_size': epub_size,
        })

    # Add a known "canary" book for testing (starts with "A" to sort first)
    canary_id = num_books + 1
    canary_title = "Alpha Test Book"
    canary_author = "Test Author"
    canary_path = f"{canary_author}/{canary_title} ({canary_id})"
    canary_full_path = os.path.join(library_path, canary_path)
    os.makedirs(canary_full_path, exist_ok=True)

    # Create cover and epub for canary book
    create_cover_image(os.path.join(canary_full_path, "cover.jpg"), (100, 150, 200))
    canary_filename = f"{canary_title} - {canary_author}"
    canary_epub_path = os.path.join(canary_full_path, f"{canary_filename}.epub")
    create_placeholder_epub(canary_epub_path, canary_title, canary_author)

    books_data.append({
        'id': canary_id,
        'title': canary_title,
        'sort': canary_title,
        'author': canary_author,
        'uuid': generate_uuid(),
        'pubdate': "2024-01-01 00:00:00",
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'path': canary_path,
        'has_cover': HAS_PILLOW,
        'series': None,
        'series_index': 1.0,
        'rating': 5,
        'publisher': "Penguin Books",
        'tags': ["Fiction"],
        'comment': "<p>A known test book for automated testing.</p>",
        'isbn': "978-0-0000-0000-0",
        'filename': canary_filename,
        'epub_size': os.path.getsize(canary_epub_path),
    })

    # Create database
    db_path = os.path.join(library_path, "metadata.db")
    create_database(db_path, books_data)

    return books_data


def main():
    # Determine output path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    library_path = os.path.join(script_dir, "Calibre Library")

    print(f"Generating test fixtures in: {library_path}")

    # Clean existing data
    if os.path.exists(library_path):
        import shutil
        shutil.rmtree(library_path)

    # Generate fixtures
    books = generate_fixtures(library_path, num_books=25)

    print(f"Created {len(books)} test books")
    print(f"Database: {os.path.join(library_path, 'metadata.db')}")

    # Print sample
    print("\nSample books:")
    for book in books[:5]:
        series_info = f" (Book {int(book['series_index'])} in {book['series']})" if book['series'] else ""
        print(f"  - {book['title']} by {book['author']}{series_info}")

    print("\nTo use with the app:")
    print("  STORAGE_BACKEND=local APP_PASSWORD=test uv run python app.py")
    print("  Then enter password 'test' and library path '/Calibre Library'")


if __name__ == '__main__':
    main()
