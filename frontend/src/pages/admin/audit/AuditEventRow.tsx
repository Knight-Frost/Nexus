/**
 * AuditEventRow — a single row in the audit event table.
 *
 * Selected-row highlight uses --audit-accent tokens (intentional audit identity).
 * The actor role pill uses SemanticBadge for consistency with the card system.
 * SeverityBadge and StatusBadge are already backed by SemanticBadge.
 */
import { formatDateTime } from '@/lib/format';
import { TD } from '@/components/ui/Table';
import { SemanticBadge } from '@/components/cards';
import type { SemanticRole } from '@/components/cards/variants';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { IconArrowRight } from '@/components/ui/icons';
import type { AuditLog } from '@/lib/types';

/** Maps actor role strings to SemanticRoles (color = meaning). */
const ROLE_SEMANTIC: Record<string, SemanticRole> = {
  admin:    'danger',   // admins have elevated power — oxblood ring conveys authority
  landlord: 'info',     // landlords are the primary business role — teal
  tenant:   'neutral',  // tenants are the most common actor — warm neutral
  user:     'neutral',
  system:   'warning',  // system events warrant attention
};

interface AuditEventRowProps {
  log: AuditLog;
  isSelected: boolean;
  onSelect: () => void;
}

export function AuditEventRow({ log, isSelected, onSelect }: AuditEventRowProps) {
  const roleRole: SemanticRole = ROLE_SEMANTIC[log.actor.role] ?? 'neutral';

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`Investigate: ${log.action_label}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        'border-b border-ink-200 transition-colors cursor-pointer relative',
        isSelected
          ? 'bg-[var(--audit-accent-bg)]'
          : 'hover:bg-ink-50',
      ].join(' ')}
      style={isSelected ? { boxShadow: 'inset 3px 0 0 var(--audit-accent)' } : undefined}
    >
      {/* Time */}
      <TD className="whitespace-nowrap text-ink-500 text-xs w-36">
        {formatDateTime(log.created_at)}
      </TD>

      {/* Area */}
      <TD className="whitespace-nowrap text-xs font-mono uppercase tracking-wide text-ink-500 w-28">
        {log.area}
      </TD>

      {/* Actor */}
      <TD className="w-44">
        <p className="text-sm font-medium text-ink-900 leading-tight">{log.actor.name}</p>
        {log.actor.email && (
          <p className="text-xs text-ink-400 truncate max-w-[160px]">{log.actor.email}</p>
        )}
        <SemanticBadge role={roleRole} dot={false} className="mt-1">
          {log.actor.role}
        </SemanticBadge>
      </TD>

      {/* Action */}
      <TD className="w-52">
        <p className="text-sm font-semibold text-ink-900 leading-tight">{log.action_label}</p>
        <p className="text-xs text-ink-400 font-mono mt-0.5">{log.action}</p>
      </TD>

      {/* Summary + subject */}
      <TD className="max-w-xs">
        <p className="text-sm text-ink-700 line-clamp-2 leading-snug">{log.summary}</p>
        {log.subject_label && (
          <p className="text-xs text-ink-400 mt-0.5 truncate">{log.subject_label}</p>
        )}
      </TD>

      {/* Severity */}
      <TD className="w-24">
        <SeverityBadge severity={log.severity} />
      </TD>

      {/* Status + investigate arrow */}
      <TD className="w-36">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={log.status} />
          <IconArrowRight
            size={15}
            className={[
              'shrink-0 transition-all duration-150',
              isSelected
                ? 'text-[var(--audit-accent)] translate-x-0.5'
                : 'text-ink-300',
            ].join(' ')}
            aria-hidden="true"
          />
        </div>
      </TD>
    </tr>
  );
}
