# Feature Ideas

Potential new features for the Calibre Library Web App.

## 1. ~~Advanced Filtering & Sorting~~ ✓ DONE

Add a filter panel to narrow down books by:

- **Tags** - Dropdown/multi-select from available tags
- **Series** - Show only books in a series, or filter by specific series
- **Rating** - Filter by minimum rating (e.g., "4+ stars only")
- **Publisher** - Filter by publisher name
- **Format availability** - Filter by available formats (e.g., "has EPUB")

Plus sorting options:
- Title (A-Z, Z-A)
- Author (A-Z, Z-A)
- Publication date (newest/oldest first)
- Rating (highest/lowest first)
- Date added (if available)

**Technical notes:** The database already has all these fields via linked tables. All filtering/sorting runs client-side in WASM SQLite, so no backend changes needed.

---

## 2. Series Browser

A dedicated view showing all series in the library:

- Series name, book count, and cover thumbnails of first few books
- Click to see all books in that series, displayed in reading order (`series_index`)
- "Continue Series" indicator showing which book is next
- Progress tracking (how many books read in each series)

**Technical notes:** Series data already exists in `books_series_link`. Add a new route `/series` and `/series/:id` for the views.

---

## 3. Favorites & Reading Lists

Client-side bookmarking system:

- Heart/star button to mark books as favorites
- Create custom reading lists:
  - "To Read"
  - "Currently Reading"
  - "Finished"
- Persisted in browser storage (Zustand with localStorage)
- Filter view to show only favorited books or specific lists
- Drag-and-drop reordering within lists

**Technical notes:** Uses the existing Zustand persistence pattern. No server changes needed since it's all client-side.

---

## 4. Library Statistics Dashboard

A stats page showing library analytics:

- Total books, authors, publishers, and tags
- Rating distribution (histogram/bar chart)
- Format breakdown (pie chart: EPUB vs PDF vs MOBI vs others)
- Top tags (word cloud or horizontal bar chart)
- Top authors by book count
- Books added over time (if `timestamp` field is available)
- Average books per series

**Technical notes:** All data can be aggregated from the existing SQLite database with `COUNT`/`GROUP BY` queries. Consider using a charting library like Recharts or Chart.js.

---

## 5. In-Browser EPUB Reader

Read EPUB books directly in the browser without downloading:

- Use [epub.js](https://github.com/futurepress/epub.js) or similar library
- Stream book content via existing Dropbox download API
- Remember reading position (persisted locally per book)
- Reading controls:
  - Font size adjustment
  - Theme options (light/dark/sepia)
  - Page turn animations
  - Table of contents navigation
  - Search within book
- Progress indicator (percentage/pages remaining)

**Technical notes:** The download infrastructure already exists. This adds significant value for users who want to read without a separate app. May need to handle CORS for streaming book content.
