import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useLibraryStore } from '@/store/libraryStore';
import { queryService } from '@/lib/queryService';
import type { SortField } from '@/types/filters';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

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
  { value: 'timestamp', label: 'Date Added' },
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
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Get filter options from the database
  const filterOptions = useMemo(() => {
    return queryService.getFilterOptions().data;
  }, [db]);

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
    const field = value as SortField;
    // Default to descending for date added (newest first)
    const order = field === 'timestamp' ? 'desc' : sort.order;
    setSort({ field, order });
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
                Tags
              </label>

              {/* Tag Combobox */}
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tagPopoverOpen}
                    className="w-full max-w-sm justify-between h-9 font-normal"
                  >
                    {filters.tags.length > 0
                      ? `${filters.tags.length} tag${filters.tags.length === 1 ? '' : 's'} selected`
                      : 'Select tags...'}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandList>
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        {filterOptions.tags.map((tag) => (
                          <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={() => handleTagToggle(tag)}
                          >
                            <CheckIcon
                              className={cn(
                                'mr-2 h-4 w-4',
                                filters.tags.includes(tag) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {tag}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected tags display */}
              {filters.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {filters.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 pr-1 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                      <span className="ml-0.5 text-slate-500 hover:text-slate-700">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
