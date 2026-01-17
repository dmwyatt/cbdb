import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { type Book, type Rendition, type NavItem } from 'epubjs';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  MenuIcon,
  SettingsIcon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { log, LogCategory } from '@/lib/logger';
import {
  saveReadingProgress,
  getReadingProgress,
  type ReadingProgress,
} from '@/lib/indexeddb';

interface EpubReaderProps {
  bookData: ArrayBuffer;
  bookId: number;
  bookTitle: string;
  onClose: () => void;
}

interface TocItem {
  href: string;
  label: string;
  subitems?: TocItem[];
}

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 32;
const DEFAULT_FONT_SIZE = 16;

export function EpubReader({ bookData, bookId, bookTitle, onClose }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [showControls, setShowControls] = useState(true);
  const [locationsReady, setLocationsReady] = useState(false);

  // Save progress debounced
  const saveProgress = useCallback(
    async (cfi: string, pct: number) => {
      const progress: ReadingProgress = {
        bookId,
        cfi,
        percentage: pct,
        lastRead: Date.now(),
      };
      await saveReadingProgress(progress);
      log.debug(LogCategory.READER, 'Saved reading progress', { bookId, percentage: pct });
    },
    [bookId]
  );

  // Initialize the book
  useEffect(() => {
    if (!viewerRef.current) return;

    let mounted = true;
    const book = ePub(bookData);
    bookRef.current = book;

    const initBook = async () => {
      try {
        await book.ready;

        if (!mounted || !viewerRef.current) return;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: true,
        });

        renditionRef.current = rendition;

        // Apply initial font size
        rendition.themes.fontSize(`${fontSize}px`);

        // Set up navigation from the spine
        const nav = await book.loaded.navigation;
        const tocItems = flattenToc(nav.toc);
        setToc(tocItems);

        // Check for saved progress
        const savedProgress = await getReadingProgress(bookId);
        if (savedProgress?.cfi) {
          log.info(LogCategory.READER, 'Restoring reading position', {
            bookId,
            percentage: savedProgress.percentage,
          });
          await rendition.display(savedProgress.cfi);
        } else {
          await rendition.display();
        }

        // Track location changes
        rendition.on('relocated', (location: { start: { cfi: string; percentage: number } }) => {
          if (!mounted) return;
          const cfi = location.start.cfi;
          const pct = Math.round((location.start.percentage || 0) * 100);
          setPercentage(pct);
          saveProgress(cfi, pct);
        });

        // Handle keyboard navigation inside iframe
        rendition.on('keyup', (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') {
            rendition.prev();
          } else if (e.key === 'ArrowRight') {
            rendition.next();
          }
        });

        // Handle tap/click navigation inside iframe (for mobile)
        rendition.on('click', (e: MouseEvent) => {
          // Get the iframe's dimensions
          const iframe = viewerRef.current?.querySelector('iframe');
          if (!iframe) return;

          const width = iframe.clientWidth;
          const clickX = e.clientX;
          const clickPosition = clickX / width;

          // Left 25% = previous, Right 25% = next, Middle = toggle controls
          if (clickPosition < 0.25) {
            rendition.prev();
          } else if (clickPosition > 0.75) {
            rendition.next();
          } else {
            setShowControls((prev) => !prev);
          }
        });

        // Handle swipe gestures for mobile
        let touchStartX = 0;
        let touchStartY = 0;

        rendition.on('touchstart', (e: TouchEvent) => {
          touchStartX = e.changedTouches[0].clientX;
          touchStartY = e.changedTouches[0].clientY;
        });

        rendition.on('touchend', (e: TouchEvent) => {
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;
          const deltaX = touchEndX - touchStartX;
          const deltaY = touchEndY - touchStartY;

          // Only trigger if horizontal swipe is greater than vertical (not scrolling)
          // and swipe distance is significant (> 50px)
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
              // Swipe right = previous page
              rendition.prev();
            } else {
              // Swipe left = next page
              rendition.next();
            }
          }
        });

        setIsLoading(false);

        // Generate locations for slider navigation (do this after initial render)
        book.locations.generate(1024).then(() => {
          if (mounted) {
            setLocationsReady(true);
            log.debug(LogCategory.READER, 'Locations generated for slider');
          }
        });
      } catch (err) {
        log.error(LogCategory.READER, 'Failed to load ePub', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load book');
          setIsLoading(false);
        }
      }
    };

    initBook();

    return () => {
      mounted = false;
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
      }
      renditionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookData, bookId]);

  // Update font size when changed
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}px`);
    }
  }, [fontSize]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        renditionRef.current?.prev();
      } else if (e.key === 'ArrowRight') {
        renditionRef.current?.next();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const flattenToc = (items: NavItem[]): TocItem[] => {
    return items.map((item) => ({
      href: item.href,
      label: item.label,
      subitems: item.subitems ? flattenToc(item.subitems) : undefined,
    }));
  };

  const goToChapter = (href: string) => {
    renditionRef.current?.display(href);
    setTocOpen(false);
  };

  const handlePrev = () => {
    renditionRef.current?.prev();
  };

  const handleNext = () => {
    renditionRef.current?.next();
  };

  const handleSliderChange = (value: number[]) => {
    const pct = value[0];
    if (bookRef.current && renditionRef.current && locationsReady) {
      const cfi = bookRef.current.locations.cfiFromPercentage(pct / 100);
      if (cfi) {
        renditionRef.current.display(cfi);
      }
    }
  };

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, MAX_FONT_SIZE));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, MIN_FONT_SIZE));
  };

  const handleReaderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const clickPosition = x / width;

    // Left 25% = previous page
    // Right 25% = next page
    // Middle 50% = toggle controls
    if (clickPosition < 0.25) {
      handlePrev();
    } else if (clickPosition > 0.75) {
      handleNext();
    } else {
      setShowControls((prev) => !prev);
    }
  };

  const renderTocItems = (items: TocItem[], depth = 0) => {
    return items.map((item, index) => (
      <div key={`${item.href}-${index}`}>
        <button
          className={`w-full text-left px-4 py-2 hover:bg-slate-100 text-sm ${
            depth > 0 ? 'pl-' + (4 + depth * 4) : ''
          }`}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={() => goToChapter(item.href)}
        >
          {item.label}
        </button>
        {item.subitems && renderTocItems(item.subitems, depth + 1)}
      </div>
    ));
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="text-red-600 mb-4">Error loading book: {error}</div>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Top bar */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b bg-white transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sheet open={tocOpen} onOpenChange={setTocOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" title="Table of Contents">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Table of Contents</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                {toc.length > 0 ? (
                  renderTocItems(toc)
                ) : (
                  <p className="p-4 text-slate-500 text-sm">No table of contents available</p>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="font-medium text-sm truncate max-w-[200px] sm:max-w-[400px]">
            {bookTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" title="Settings">
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Font Size</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={decreaseFontSize}
                      disabled={fontSize <= MIN_FONT_SIZE}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-8 text-center">{fontSize}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={increaseFontSize}
                      disabled={fontSize >= MAX_FONT_SIZE}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={onClose} title="Close Reader">
            <XIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Reader content with tap zones */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={handleReaderClick}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading book...</p>
            </div>
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full" />
      </div>

      {/* Bottom navigation */}
      <div
        className={`border-t bg-white px-4 py-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handlePrev} title="Previous Page">
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>

          <div className="flex-1 flex items-center gap-3">
            <Slider
              value={[percentage]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleSliderChange}
              className="flex-1"
            />
            <span className="text-sm text-slate-500 w-12 text-right">{percentage}%</span>
          </div>

          <Button variant="ghost" size="icon" onClick={handleNext} title="Next Page">
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
