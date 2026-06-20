/**
 * Simple SVG chart components — zero external dependencies.
 */

/* ---- Bars ---------------------------------------------------------------- */
interface BarsProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function Bars({
  data,
  color = 'var(--color-brand-600)',
  height = 56,
  className,
}: BarsProps) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const barW = 100 / data.length;
  const gap = barW * 0.2;
  const w = barW - gap;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      aria-hidden="true"
    >
      {data.map((val, i) => {
        const barH = (val / max) * height;
        const x = i * barW + gap / 2;
        const y = height - barH;
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={barH}
            rx={2}
            fill={color}
            opacity={isLast ? 1 : 0.6}
          />
        );
      })}
    </svg>
  );
}

/* ---- Donut --------------------------------------------------------------- */
interface DonutProps {
  pct: number;
  color?: string;
  size?: number;
  label?: string;
}

export function Donut({
  pct,
  color = 'var(--color-brand-600)',
  size = 80,
  label,
}: DonutProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 32;
  const cx = 40;
  const cy = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-ink-200)"
        strokeWidth={8}
      />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
      />
      {/* Center label */}
      <text
        x={cx}
        y={label ? cy - 4 : cy + 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="700"
        fontFamily="var(--font-display, system-ui)"
        fill="var(--color-ink-950)"
      >
        {Math.round(clamped)}%
      </text>
      {label && (
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="8"
          fill="var(--color-ink-500)"
          fontFamily="var(--font-sans, system-ui)"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/* ---- MiniLineChart ------------------------------------------------------- */
interface MiniLineChartProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function MiniLineChart({
  data,
  color = 'var(--color-brand-600)',
  height = 40,
  className,
}: MiniLineChartProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = 100 / (data.length - 1);

  const pts = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * height,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area =
    `M ${pts[0].x},${height} ` +
    pts.map((p) => `L ${p.x},${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${height} Z`;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#line-fill)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
