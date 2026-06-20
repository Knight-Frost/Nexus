import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ContractStage } from '../adminMockData';

const STAGE_CONFIG: Record<string, { bar: string; dot: string; text: string }> = {
  Draft: {
    bar: 'bg-ink-300',
    dot: 'bg-ink-400',
    text: 'text-ink-600',
  },
  'Pending signature': {
    bar: 'bg-info-500',
    dot: 'bg-info-500',
    text: 'text-info-600',
  },
  Active: {
    bar: 'bg-success-500',
    dot: 'bg-success-500',
    text: 'text-success-600',
  },
  'Expiring soon': {
    bar: 'bg-warning-500',
    dot: 'bg-warning-500',
    text: 'text-warning-600',
  },
  Completed: {
    bar: 'bg-ink-200',
    dot: 'bg-ink-300',
    text: 'text-ink-400',
  },
  Terminated: {
    bar: 'bg-danger-400',
    dot: 'bg-danger-400',
    text: 'text-danger-600',
  },
};

function SegmentedBar({ stages }: { stages: ContractStage[] }) {
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
      {stages.map((stage) => {
        const cfg = STAGE_CONFIG[stage.label] ?? { bar: 'bg-ink-200' };
        return (
          <div
            key={stage.label}
            className={cn('h-full', cfg.bar)}
            style={{ width: `${stage.pct}%` }}
            title={`${stage.label}: ${stage.count}`}
          />
        );
      })}
    </div>
  );
}

export function ContractLifecycle({
  stages,
  total,
}: {
  stages: ContractStage[];
  total: string;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader
        title="Contract Lifecycle"
        description="Status distribution across all contracts"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/contracts')}
          >
            View all
          </Button>
        }
      />
      <CardBody>
        <SegmentedBar stages={stages} />

        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
          {stages.map((stage) => {
            const cfg = STAGE_CONFIG[stage.label] ?? { dot: 'bg-ink-300', text: 'text-ink-600' };
            return (
              <li key={stage.label} className="flex items-center justify-between py-2 border-b border-ink-100">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
                  <span className="text-xs font-medium text-ink-700">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs font-bold tabular-nums text-ink-900">{stage.count}</span>
                  <span className={cn('text-[11px] tabular-nums', cfg.text)}>{stage.pct}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-ink-500">Total contracts</span>
        <span className="text-lg font-bold tabular-nums text-ink-950">{total}</span>
      </CardFooter>
    </Card>
  );
}
