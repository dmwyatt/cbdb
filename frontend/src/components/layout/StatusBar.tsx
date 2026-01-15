import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/store/libraryStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatBytes } from '@/lib/utils';

interface StatusBarProps {
  queryTime?: number;
}

export function StatusBar({ queryTime }: StatusBarProps) {
  const { loadedFromCache, dbSize, refreshDatabase } = useLibraryStore();
  const isOnline = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDatabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSourceBadge = () => {
    if (!isOnline) {
      return <Badge variant="secondary" className="bg-purple-500 text-white">Offline</Badge>;
    }
    if (loadedFromCache) {
      return <Badge variant="secondary" className="bg-blue-500 text-white">Cached</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-500 text-white">Fresh</Badge>;
  };

  return (
    <div className="bg-slate-700 text-white px-4 py-2 text-sm flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Badge className="bg-green-600">Ready</Badge>
        {getSourceBadge()}
        <span>Database loaded ({formatBytes(dbSize)})</span>
      </div>
      <div className="flex items-center gap-4">
        {queryTime !== undefined && (
          <span className="text-gray-400 text-xs">Query: {queryTime.toFixed(1)}ms</span>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-white border-white/30 hover:bg-white/10 hover:text-white"
          onClick={handleRefresh}
          disabled={isRefreshing || !isOnline}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
