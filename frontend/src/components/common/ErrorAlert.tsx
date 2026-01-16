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
  return (
    <Dialog open={!!error} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Error</DialogTitle>
          <DialogDescription className="text-left whitespace-pre-wrap">
            {error}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
