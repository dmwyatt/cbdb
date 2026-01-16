import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLibraryStore } from '@/store/libraryStore';
import { queryService } from '@/lib/queryService';
import type { SortField } from '@/types/filters';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_TAGS = 50;

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'rating', label: 'Rating' },
  { value: 'pubdate', label: 'Publication Date' },
  { value: 'series_index', label: 'Series Order' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '1', label: '1+ stars' },
  { value: '2', label: '2+ stars' },
  { value: '3', label: '3+ stars' },
  { value: '4', label: '4+ stars' },
  { value: '5', label: '5 stars' },
];

export function FilterPanel() {
  const { db, filters, sort, setFilters, setSort, resetFilters } = useLibraryStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Get filter options from the database
  const filterOptions = useMemo(() => {
    return queryService.getFilterOptions().data;
  }, [db]);

  // Filter and limit tags for display
  const { visibleTags, totalMatching, hasMore } = useMemo(() => {
    const searchLower = tagSearch.toLowerCase().trim();

    // Get unselected tags that match the search
    const matchingTags = filterOptions.tags.filter(
      (tag) => !filters.tags.includes(tag) &&
        (searchLower === '' || tag.toLowerCase().includes(searchLower))
    );

    return {
      visibleTags: matchingTags.slice(0, MAX_VISIBLE_TAGS),
      totalMatching: matchingTags.length,
      hasMore: matchingTags.length > MAX_VISIBLE_TAGS,
    };
  }, [filterOptions.tags, filters.tags, tagSearch]);

  const hasActiveFilters =
    filters.tags.length > 0 ||
    filters.series !== null ||
    filters.minRating !== null ||
    filters.publisher !== null ||
    filters.format !== null;

  const activeFilterCount =
    filters.tags.length +
    (filters.series ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.publisher ? 1 : 0) +
    (filters.format ? 1 : 0);

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    setFilters({ tags: newTags });
  };

  const handleSeriesChange = (value: string) => {
    setFilters({ series: value || null });
  };

  const handlePublisherChange = (value: string) => {
    setFilters({ publisher: value || null });
  };

  const handleFormatChange = (value: string) => {
    setFilters({ format: value || null });
  };

  const handleRatingChange = (value: string) => {
    setFilters({ minRating: value ? parseInt(value, 10) : null });
  };

  const handleSortFieldChange = (value: string) => {
    setSort({ field: value as SortField });
  };

  const handleSortOrderToggle = () => {
    setSort({ order: sort.order === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="mb-4">
      {/* Filter Toggle Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'gap-2',
            hasActiveFilters && 'border-blue-300 bg-blue-50 text-blue-700'
          )}
        >
          <FilterIcon />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDownIcon />
        </Button>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Sort:</span>
          <select
            value={sort.field}
            onChange={(e) => handleSortFieldChange(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortOrderToggle}
            className="h-8 w-8 p-0"
            title={sort.order === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sort.order === 'asc' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7-7 7 7" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7 7 7-7" />
              </svg>
            )}
          </Button>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.series && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Series: {filters.series}
                <button
                  onClick={() => setFilters({ series: null })}
                  className="ml-1 rounded-full p-0.5 hover:bg-slate-300"
                >
                  <XIcon />
                </button>
              </Badge>
            )}
            {filters.publisher && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Publisher: {filters.publisher}
                <button
                  onClick={() => setFilters({ publisher: null })}
                  className="ml-1 rounded-full p-0.5 hover:bg-slate-300"
                >
                  <XIcon />
                </button>
              </Badge>
            )}
            {filters.format && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Format: {filters.format}
                <button
                  onClick={() => setFilters({ format: null })}
                  className="ml-1 rounded-full p-0.5 hover:bg-slate-300"
                >
                  <XIcon />
                </button>
              </Badge>
            )}
            {filters.minRating && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {filters.minRating}+ stars
                <button
                  onClick={() => setFilters({ minRating: null })}
                  className="ml-1 rounded-full p-0.5 hover:bg-slate-300"
                >
                  <XIcon />
                </button>
              </Badge>
            )}
            {filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="ml-1 rounded-full p-0.5 hover:bg-slate-300"
                >
                  <XIcon />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="mt-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Series Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Series
              </label>
              <select
                value={filters.series || ''}
                onChange={(e) => handleSeriesChange(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All series</option>
                {filterOptions.series.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Publisher Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Publisher
              </label>
              <select
                value={filters.publisher || ''}
                onChange={(e) => handlePublisherChange(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All publishers</option>
                {filterOptions.publishers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Format
              </label>
              <select
                value={filters.format || ''}
                onChange={(e) => handleFormatChange(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All formats</option>
                {filterOptions.formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Minimum Rating
              </label>
              <select
                value={filters.minRating?.toString() || ''}
                onChange={(e) => handleRatingChange(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Section */}
          {filterOptions.tags.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags ({filterOptions.tags.length} total)
              </label>

              {/* Search input for tags */}
              <Input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="mb-3 max-w-xs h-8 text-sm"
              />

              {/* Selected tags - always visible at top */}
              {filters.tags.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-slate-500 mb-1 block">Selected:</span>
                  <div className="flex flex-wrap gap-2">
                    {filters.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className="px-2 py-1 text-xs rounded-full border transition-colors bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                      >
                        {tag} <span className="ml-1">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Available tags */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {visibleTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className="px-2 py-1 text-xs rounded-full border transition-colors bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Status text */}
              {tagSearch && (
                <p className="text-xs text-slate-500 mt-2">
                  {totalMatching === 0
                    ? 'No tags match your search'
                    : hasMore
                      ? `Showing ${MAX_VISIBLE_TAGS} of ${totalMatching} matching tags`
                      : `${totalMatching} matching tag${totalMatching === 1 ? '' : 's'}`}
                </p>
              )}
              {!tagSearch && hasMore && (
                <p className="text-xs text-slate-500 mt-2">
                  Showing {MAX_VISIBLE_TAGS} of {totalMatching} tags. Use search to find more.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
