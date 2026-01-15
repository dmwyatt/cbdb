import { Button } from '@/components/ui/button';
import { useLibraryStore, type ViewMode } from '@/store/libraryStore';
import { cn } from '@/lib/utils';

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const TableIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="4" width="18" height="2" rx="1" />
    <rect x="3" y="9" width="18" height="2" rx="1" />
    <rect x="3" y="14" width="18" height="2" rx="1" />
    <rect x="3" y="19" width="18" height="2" rx="1" />
  </svg>
);

export function ViewToggle() {
  const { currentView, setView } = useLibraryStore();

  const buttonClass = (view: ViewMode) =>
    cn(
      'p-2 rounded',
      currentView === view
        ? 'bg-white text-blue-500 shadow-sm'
        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
    );

  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
      <Button
        variant="ghost"
        size="sm"
        className={buttonClass('grid')}
        onClick={() => setView('grid')}
        title="Grid view"
      >
        <GridIcon />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={buttonClass('table')}
        onClick={() => setView('table')}
        title="Table view"
      >
        <TableIcon />
      </Button>
    </div>
  );
}
