import { cn } from '@/lib/cn';
import { IconCheck } from './icons';

interface StepIndicatorProps {
  steps: string[];
  /** 0-based index of the active step. */
  current: number;
  /** Optional: jump to a completed/earlier step. */
  onStepClick?: (index: number) => void;
  className?: string;
}

/**
 * Accessible horizontal step indicator. State is conveyed by number/check AND
 * text label (never color alone): completed shows a check, current is filled
 * ink-teal with aria-current, future is a quiet neutral. The connector line is
 * subtle and fills as steps complete.
 */
export function StepIndicator({
  steps,
  current,
  onStepClick,
  className,
}: StepIndicatorProps) {
  return (
    <ol className={cn('flex items-start', className)} aria-label="Progress">
      {steps.map((label, i) => {
        const status: 'complete' | 'current' | 'upcoming' =
          i < current ? 'complete' : i === current ? 'current' : 'upcoming';
        const clickable = onStepClick && i < current;
        const isLast = i === steps.length - 1;

        return (
          <li
            key={label}
            className={cn('flex items-start', !isLast && 'flex-1')}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            <div className="flex flex-col items-center">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(i)}
                  className="rounded-full focus-visible:outline-2"
                  aria-label={`Go to step ${i + 1}: ${label}`}
                >
                  <StepDot status={status} index={i} />
                </button>
              ) : (
                <StepDot status={status} index={i} />
              )}
              <span
                className={cn(
                  'mt-2 max-w-[8rem] text-center text-xs font-medium',
                  status === 'current'
                    ? 'text-brand-700'
                    : status === 'complete'
                      ? 'text-ink-700'
                      : 'text-ink-400',
                )}
              >
                <span className="sr-only">
                  Step {i + 1} of {steps.length}
                  {status === 'current' ? ', current: ' : status === 'complete' ? ', completed: ' : ': '}
                </span>
                {label}
              </span>
            </div>

            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'mx-2 mt-[15px] h-px flex-1 rounded-full',
                  i < current ? 'bg-brand-600' : 'bg-ink-200',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({
  status,
  index,
}: {
  status: 'complete' | 'current' | 'upcoming';
  index: number;
}) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
        status === 'complete' && 'border-brand-600 bg-brand-600 text-on-brand',
        status === 'current' && 'border-brand-600 bg-brand-600 text-on-brand',
        status === 'upcoming' && 'border-ink-300 bg-surface text-ink-400',
      )}
      aria-hidden="true"
    >
      {status === 'complete' ? <IconCheck size={16} /> : index + 1}
    </span>
  );
}
