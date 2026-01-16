import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface LoadingOverlayProps {
  message: string;
  progress: number;
  onCancel?: () => void;
}

export function LoadingOverlay({ message, progress, onCancel }: LoadingOverlayProps) {
  const [showCancel, setShowCancel] = useState(false);

  // Show cancel button after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowCancel(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/90 flex flex-col items-center justify-center z-50">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 text-lg">{message}</p>
      <div className="w-72 mt-4">
        <Progress value={progress} className="h-1.5" />
      </div>
      {showCancel && onCancel && (
        <Button
          variant="outline"
          className="mt-6"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
