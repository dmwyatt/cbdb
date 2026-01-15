interface StarRatingProps {
  rating: number | null;
  className?: string;
}

export function StarRating({ rating, className = '' }: StarRatingProps) {
  const stars = Math.floor((rating || 0) / 2);
  const filled = '★'.repeat(stars);
  const empty = '☆'.repeat(5 - stars);

  return (
    <span className={`text-amber-500 ${className}`}>
      {filled}
      <span className="text-gray-300">{empty}</span>
    </span>
  );
}
