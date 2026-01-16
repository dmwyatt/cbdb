import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DropboxErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
}

export function DropboxErrorBanner({ error, onDismiss }: DropboxErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            Dropbox Connection Issue
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Your Dropbox access token may have expired. You can continue browsing with cached data,
            but covers and downloads won&apos;t work until the token is updated on the server.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 -mr-2"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
