/**
 * AdminInsightCard — renders a backend-driven admin insight using NexusCard
 * with the appropriate semantic role tint.
 *
 * danger  → oxblood tint (via --audit-* tokens for the icon, NexusCard danger surface)
 * warning → clay tint
 * success → estate green tint
 * info    → ink teal tint
 *
 * Icons remain role-specific. The card surface tint comes from the shared
 * semantic ramp (NexusCard role prop) so it re-skins for free in dark mode.
 */
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import {
  IconAlertTriangle,
  IconAlertCircle,
  IconCheck,
  IconInfo,
} from '@/components/ui/icons';
import { NexusCard } from '@/components/cards';
import type { SemanticRole } from '@/components/cards/variants';
import type { AuditInsight } from '@/lib/types';

interface ToneConfig {
  Icon: React.ElementType;
  role: SemanticRole;
  /** Text color for the title and action link. */
  titleClass: string;
  /** Icon color inside the card. */
  iconClass: string;
}

const TONE_CONFIG: Record<AuditInsight['tone'], ToneConfig> = {
  danger: {
    Icon: IconAlertTriangle,
    role: 'danger',
    // Audit danger uses the --audit-accent token for the icon and title so it reads
    // as oxblood rather than the generic danger ramp (intentional audit identity).
    titleClass: 'text-[var(--audit-accent)]',
    iconClass:  'text-[var(--audit-accent)]',
  },
  warning: {
    Icon: IconAlertCircle,
    role: 'warning',
    titleClass: 'text-warning-700',
    iconClass:  'text-warning-600',
  },
  success: {
    Icon: IconCheck,
    role: 'success',
    titleClass: 'text-success-700',
    iconClass:  'text-success-600',
  },
  info: {
    Icon: IconInfo,
    role: 'info',
    titleClass: 'text-info-700',
    iconClass:  'text-info-600',
  },
};

export function AdminInsightCard({ insight }: { insight: AuditInsight }) {
  const navigate = useNavigate();
  const cfg = TONE_CONFIG[insight.tone] ?? TONE_CONFIG.info;
  const { Icon } = cfg;

  return (
    <NexusCard role={cfg.role} className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start gap-2.5">
        <Icon size={18} className={`mt-0.5 shrink-0 ${cfg.iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-tight ${cfg.titleClass}`}>
            {insight.title}
          </p>
          <p className="mt-1 text-xs text-ink-600 leading-relaxed">{insight.detail}</p>
        </div>
      </div>
      {insight.action && (
        <Button
          variant="ghost"
          size="sm"
          className={`self-start px-0 text-xs font-semibold ${cfg.titleClass} hover:underline`}
          onClick={() => insight.action?.to && navigate(insight.action.to)}
          disabled={!insight.action.to}
        >
          {insight.action.label} {insight.action.to && '→'}
        </Button>
      )}
    </NexusCard>
  );
}
