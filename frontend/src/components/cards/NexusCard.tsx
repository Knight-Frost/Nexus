import { cn } from '@/lib/cn';
import { softSurface, type SemanticRole } from './variants';

interface NexusCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Level 1 = neutral paper surface; Level 2 = soft role tint. */
  role?: SemanticRole;
  /** Adds the editorial hover-lift (only where the card is actionable). */
  interactive?: boolean;
  /** Adds the specular top-rim highlight (printed-on-paper feel). */
  specular?: boolean;
  as?: React.ElementType;
}

/**
 * The base Homecrest surface. `role="neutral"` is the quiet Level-1 card for
 * ordinary information; any other role gives the Level-2 tinted status surface.
 * Deep "command/featured" cards are a separate primitive (CommandCard).
 */
export function NexusCard({
  role = 'neutral',
  interactive = false,
  specular = false,
  as: Tag = 'div',
  className,
  children,
  ...props
}: NexusCardProps) {
  return (
    <Tag
      className={cn(
        'relative rounded-2xl border shadow-sm',
        softSurface[role],
        specular && 'u-specular',
        interactive && 'u-card-hover cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
