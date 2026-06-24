/**
 * StarRating — interactive input + read-only display.
 *
 * Usage:
 *   <StarRating value={rating} onChange={setRating} />   ← interactive
 *   <StarRating value={4} readOnly />                    ← display only
 */

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
  className,
}: StarRatingProps) {
  const filled = 'var(--color-warning-500, #EAB308)';
  const empty  = 'var(--color-ink-200, #E5E7EB)';

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', gap: 2 }}
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            aria-label={readOnly ? undefined : `Rate ${starValue} star${starValue !== 1 ? 's' : ''}`}
            onClick={() => !readOnly && onChange?.(starValue)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: readOnly ? 'default' : 'pointer',
              lineHeight: 1,
            }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={starValue <= value ? filled : empty}
              stroke={starValue <= value ? filled : empty}
              strokeWidth={0}
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </span>
  );
}
