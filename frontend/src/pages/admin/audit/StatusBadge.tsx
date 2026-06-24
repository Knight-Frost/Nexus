/**
 * StatusBadge — maps audit event status key to SemanticBadge roles.
 *
 * needs_review     → danger  (requires immediate attention)
 * review_suggested → warning (worth looking at)
 * routine          → success (healthy, nothing to act on)
 * default          → neutral
 */
import { SemanticBadge } from '@/components/cards';
import type { SemanticRole } from '@/components/cards/variants';
import type { AuditStatus } from '@/lib/types';

function statusRole(key: string): { role: SemanticRole; dot: boolean } {
  switch (key) {
    case 'needs_review':     return { role: 'danger',  dot: true };
    case 'review_suggested': return { role: 'warning', dot: true };
    case 'routine':          return { role: 'success', dot: false };
    default:                 return { role: 'neutral', dot: false };
  }
}

export function StatusBadge({ status }: { status: AuditStatus }) {
  const { role, dot } = statusRole(status.key);
  return (
    <SemanticBadge role={role} dot={dot}>
      {status.label}
    </SemanticBadge>
  );
}
