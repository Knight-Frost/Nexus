import { Badge, type Tone } from '@/components/ui/Badge';
import { humanize } from '@/lib/format';
import type { SemanticRole } from './variants';

const roleToTone: Record<SemanticRole, Tone> = {
  neutral: 'neutral',
  success: 'success',
  warning: 'warning',
  danger:  'danger',
  info:    'info',
};

interface SemanticBadgeProps {
  role: SemanticRole;
  /** Label text; if omitted and `status` is given, the status is humanized. */
  children?: React.ReactNode;
  status?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

/**
 * A status pill whose color comes from a SemanticRole (so it always matches the
 * card it sits with). Pair with a variants.ts mapping for status → role.
 * The text label is required for accessibility — color is never the only signal.
 */
export function SemanticBadge({
  role,
  children,
  status,
  size = 'sm',
  dot = true,
  className,
}: SemanticBadgeProps) {
  return (
    <Badge tone={roleToTone[role]} size={size} dot={dot} className={className}>
      {children ?? (status ? humanize(status) : null)}
    </Badge>
  );
}
