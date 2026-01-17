# Features

Calibre Library Web App - a browser-based viewer for your Calibre e-book library stored in Dropbox.

## Library Setup & Configuration

- **Setup Wizard**: Initial configuration to specify your Calibre library path in Dropbox
- **Library Path Validation**: Verifies the path exists and contains a valid metadata.db
- **Persistent Configuration**: Library path saved in browser localStorage for future sessions
- **Change Library**: Reconfigure library path from the header at any time
- **Reset Library**: Complete reset clearing all cached data

## Authentication

- **Optional Password Protection**: Server-side access control via APP_PASSWORD environment variable
- **Login Form**: Password authentication compatible with password managers
- **Session Management**: Authentication token stored locally
- **Logout**: Return to login screen when needed

## Book Browsing

- **Grid View**: Responsive card-based layout (1-4 columns based on screen size)
- **Table View**: Tabular display with columns for title, author, series, and rating
- **View Toggle**: Switch between grid and table views with persistent preference
- **Book Cards**: Display cover thumbnail, title, author, series info, and star rating
- **Pagination**: Previous/Next navigation with page indicator and configurable page size
- **Empty State**: Clear messaging when no books match current filters

## Search

- **Real-Time Search**: Search by title or author with 150ms debouncing
- **Instant Results**: Queries run client-side via WASM SQLite - no server latency
- **Result Count**: Displays total matching books with query execution time

## Filtering

- **Expandable Filter Panel**: Toggle-able controls with active filter badges
- **Tag Filter**: Searchable multi-select for tags
- **Series Filter**: Dropdown to filter by series
- **Publisher Filter**: Dropdown to filter by publisher
- **Format Filter**: Filter by file format (EPUB, PDF, MOBI, etc.)
- **Rating Filter**: Minimum star rating threshold
- **Active Filter Display**: Removable badges showing all active filters
- **Clear All**: Reset all filters at once

## Sorting

- **Sort by Title**: Alphabetical (A-Z or Z-A)
- **Sort by Author**: Author name sorting
- **Sort by Rating**: Highest or lowest first
- **Sort by Publication Date**: Newest or oldest first
- **Sort by Series Order**: Series index sorting
- **Sort by Date Added**: When books were added to library (newest first by default)
- **Sort Direction Toggle**: Ascending/descending with smart defaults

## Book Details

- **Dedicated Detail Page**: Full book information with animated collapsible header
- **Large Cover Image**: Scales down as you scroll
- **Complete Metadata**: Title, authors, series with position, rating, publisher, publication date
- **Description**: Full book comments rendered as HTML
- **Tags**: All associated tags displayed as badges
- **Identifiers**: ISBN, Amazon ID, and other metadata
- **Available Formats**: Lists all downloadable file formats with sizes
- **Back Navigation**: Return to library view

## Book Covers

- **Thumbnail Display**: Cover images in grid and table views
- **Placeholder Icons**: Book emoji for missing covers
- **Batch Loading**: Efficient fetching (up to 25 covers per request)
- **Cover Caching**: Covers cached in IndexedDB for offline access
- **Lazy Loading**: Images load as they come into view

## Downloads

- **Format-Specific Downloads**: Download any available format
- **File Size Display**: Human-readable sizes (MB, GB)
- **Direct Links**: Opens Dropbox temporary download link
- **Loading States**: Visual feedback during link generation

## Database & Caching

- **Browser-Side SQLite**: Uses sql.js (WASM) for all queries
- **IndexedDB Caching**: Database cached locally after first download
- **Database Validation**: Validates SQLite header to prevent corruption
- **Cache Timestamp**: Tracks when database was last synced
- **Refresh**: Re-download fresh data from Dropbox

## Offline Support

- **Offline Detection**: Real-time online/offline status monitoring
- **Offline Browsing**: Browse and search your library without network
- **Offline Badge**: Status indicator when disconnected
- **Smart Restrictions**: Downloads disabled while offline

## Status & Feedback

- **Status Bar**: Shows database status, cache state, and sync time
- **Status Badges**: Ready, Cached (blue), Fresh (green) indicators
- **Database Size**: Displays cached database size
- **Query Time**: Shows execution time for current query
- **Loading Overlay**: Full-screen spinner with progress bar and cancel option
- **Progress Tracking**: Visual progress during downloads

## Error Handling

- **Global Error Dialog**: Modal for general errors
- **Dropbox Error Banner**: Non-modal banner for auth errors (auto-dismisses on success)
- **Validation Errors**: Clear messages during setup
- **Connection Errors**: Helpful instructions when server unavailable
- **Timeout Handling**: User-friendly timeout messages

## User Experience

- **Responsive Design**: Works on mobile, tablet, and desktop
- **Hover Effects**: Interactive states on clickable elements
- **Smooth Animations**: Scroll animations on detail page
- **Loading States**: Visual feedback on all async operations
- **Keyboard Support**: Accessible navigation

## Performance

- **Client-Side Queries**: All SQL runs in browser - instant results
- **Debounced Search**: Reduces query frequency while typing
- **Efficient Batching**: Cover fetches grouped for performance
- **Lazy Loading**: Images load on demand
- **Timeout Protection**: Configurable timeouts on all operations

## State Persistence

- **Library Path**: Remembered between sessions
- **View Mode**: Grid/table preference saved
- **Sort Preferences**: Sort column and direction preserved
- **Authentication**: Login state persisted
