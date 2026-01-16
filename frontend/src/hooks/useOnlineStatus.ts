import { useState, useEffect } from 'react';
import { offlineService } from '@/lib/offlineService';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(offlineService.isOnline);

  useEffect(() => {
    return offlineService.subscribe(setIsOnline);
  }, []);

  return isOnline;
}
