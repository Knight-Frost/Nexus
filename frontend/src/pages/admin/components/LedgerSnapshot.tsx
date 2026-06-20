import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { LedgerStat } from '../adminMockData';

/* ---- Mini bar chart ----------------------------------------------------- */

const BAR_COLOR = 'var(--color-brand, #1D4ED8)';

function MiniBarChart({ bars, labels }: { bars: number[]; labels: string[] }) {
  const max = Math.max(...bars);
  const chartH = 96;
  const barW = 14;
  const gap = 6;
  const totalW = bars.length * (barW + gap) - gap;
  const offsetX = 0;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW + offsetX + 2} ${chartH + 20}`}
      aria-hidden="true"
      className="overflow-visible"
      preserveAspectRatio="none"
    >
      {bars.map((val, i) => {
        const barH = Math.max(4, (val / max) * chartH);
        const x = offsetX + i * (barW + gap);
        const y = chartH - barH;
        return (
          <g key={i}>
            {/* Track */}
            <rect
              x={x}
              y={0}
              width={barW}
              height={chartH}
              rx="3"
              fill="var(--color-ink-100, #e2e8f0)"
              opacity="0.5"
            />
            {/* Value bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill={BAR_COLOR}
              opacity="0.85"
            />
            {/* X-axis label */}
            <text
              x={x + barW / 2}
              y={chartH + 14}
              fontSize="7"
              fill="currentColor"
              textAnchor="middle"
              className="text-ink-400"
              fontFamily="inherit"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---- Component ---------------------------------------------------------- */

export function LedgerSnapshot({
  bars,
  labels,
  stats,
}: {
  bars: number[];
  labels: string[];
  stats: LedgerStat[];
}) {
  const navigate = useNavigate();

  // Pull out key stats for chip row
  const settlements = stats.find((s) => s.label === 'Settlements');
  const disputes = stats.find((s) => s.label === 'Disputes');
  const fees = stats.find((s) => s.label.toLowerCase().includes('fee'));

  const chipStats = [
    { label: 'Settlements', value: settlements?.value ?? '—', positive: true },
    { label: 'Disputes held', value: disputes?.value ?? '—', positive: false },
    { label: 'Fees collected', value: fees?.value ?? '—', positive: true },
  ];

  return (
    <Card>
      <CardHeader
        title="Ledger Health"
        description="Settlement activity over the last 7 days"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/ledger')}
          >
            View ledger
          </Button>
        }
      />
      <CardBody>
        {/* Chip row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {chipStats.map((chip) => (
            <div
              key={chip.label}
              className="rounded-xl border border-ink-200 bg-ink-50/40 px-3 py-3"
            >
              <p className="text-[11px] text-ink-500 mb-1">{chip.label}</p>
              <p
                className={cn(
                  'text-base font-bold tabular-nums',
                  chip.positive ? 'text-[var(--color-money)]' : 'text-danger-600',
                )}
              >
                {chip.value}
              </p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <MiniBarChart bars={bars} labels={labels} />
      </CardBody>
    </Card>
  );
}
