import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <Button
        variant="outline"
        onClick={handlePrev}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-slate-600">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}
