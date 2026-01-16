import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  error: string | null;
  onDismiss: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  const isTokenError = error?.toLowerCase().includes('authentication') ||
                       error?.toLowerCase().includes('401') ||
                       error?.toLowerCase().includes('token');

  return (
    <Dialog open={!!error} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            {isTokenError ? 'Authentication Error' : 'Refresh Failed'}
          </DialogTitle>
          <DialogDescription className="text-left whitespace-pre-wrap">
            {error}
          </DialogDescription>
        </DialogHeader>
        {isTokenError && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
            Your Dropbox access token may have expired. You may need to generate a new token and update your server configuration.
          </div>
        )}
        <DialogFooter>
          <Button onClick={onDismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
