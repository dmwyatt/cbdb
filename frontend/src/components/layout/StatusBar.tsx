import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/store/libraryStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatBytes } from '@/lib/utils';

interface StatusBarProps {
  queryTime?: number;
}

function formatSyncTime(timestamp: number | null): string {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function StatusBar({ queryTime }: StatusBarProps) {
  const { loadedFromCache, dbSize, lastSyncTime, refreshDatabase } = useLibraryStore();
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
        {lastSyncTime && (
          <span className="text-gray-400 text-xs">Synced: {formatSyncTime(lastSyncTime)}</span>
        )}
        {queryTime !== undefined && (
          <span className="text-gray-400 text-xs">Query: {queryTime.toFixed(1)}ms</span>
        )}
        <Button
          variant="outline"
          size="sm"
          className="appearance-none bg-white/15 text-white border-white/30 hover:bg-white/10 hover:text-white"
          onClick={handleRefresh}
          disabled={isRefreshing || !isOnline}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
