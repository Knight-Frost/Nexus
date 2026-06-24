/**
 * Shared landlord operational primitives.
 *
 * One source of truth for the command-bar / table / chip / pagination language
 * used across Properties, Listings, Applicants, Tenants, Rent Ledger and
 * Maintenance, so the six pages read as one cohesive console. All are themed
 * via CSS custom properties (light Warm-Paper-&-Oxblood / dark Petrol-Teal) and
 * are keyboard-accessible.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Badge, type Tone } from '@/components/ui/Badge';
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconMoreVertical,
  IconBuilding,
} from '@/components/ui/icons';
import type { PageSlice } from '@/lib/paginate';

/* ---- Command bar shell --------------------------------------------------- */
/** Spacious, wrapping toolbar that hosts search / tabs / sort. */
export function CommandBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200 bg-surface shadow-sm',
        'flex flex-wrap items-center gap-3 px-4 py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---- Search input -------------------------------------------------------- */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Accessible label (visually hidden). */
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('relative min-w-[12rem] flex-1', className)}>
      <label htmlFor={id} className="sr-only">
        {label ?? placeholder}
      </label>
      <IconSearch
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-xl border border-ink-200 bg-canvas/60 pl-9 pr-3 text-sm text-ink-900',
          'placeholder:text-ink-400 outline-none transition-colors',
          'focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20',
        )}
      />
    </div>
  );
}

/* ---- Filter tabs --------------------------------------------------------- */
export interface FilterTab<K extends string = string> {
  key: K;
  label: string;
  /** Real count for this filter (shown as a trailing number). */
  count?: number;
  /** Status dot color for inactive tabs. */
  tone?: Tone;
}

const dotByTone: Record<Tone, string> = {
  neutral: 'bg-ink-400',
  brand: 'bg-brand-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  money: 'bg-[var(--color-money)]',
};

export function FilterTabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: FilterTab<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Filter" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30',
              active
                ? 'bg-action-600 text-on-action shadow-sm'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )}
          >
            {!active && t.tone && (
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dotByTone[t.tone])} aria-hidden="true" />
            )}
            {t.label}
            {typeof t.count === 'number' && (
              <span className={cn('tabular-nums', active ? 'text-on-action/80' : 'text-ink-400')}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Sort / plain select ------------------------------------------------- */
export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

export function SortSelect<V extends string>({
  value,
  onChange,
  options,
  label = 'Sort',
  prefix = 'Sort: ',
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  options: SelectOption<V>[];
  label?: string;
  prefix?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        className={cn(
          'h-10 appearance-none rounded-xl border border-ink-200 bg-surface pl-3 pr-9 text-sm font-medium text-ink-800',
          'outline-none transition-colors hover:border-ink-300',
          'focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {prefix}
            {o.label}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

/* ---- Status chip --------------------------------------------------------- */
/** Thin wrapper over Badge so status pills are consistent everywhere. */
export function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <Badge tone={tone} size="sm">
      {children}
    </Badge>
  );
}

/* ---- Action (kebab) menu ------------------------------------------------- */
export interface ActionItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  /** Render in danger color (e.g. delete). */
  danger?: boolean;
  disabled?: boolean;
}

export function ActionMenu({ items, label = 'More actions' }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-600',
          'transition-colors hover:bg-ink-100 hover:text-ink-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30',
        )}
      >
        <IconMoreVertical size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-20 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-ink-200 bg-surface py-1 shadow-lg',
          )}
        >
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                it.danger
                  ? 'text-danger-600 hover:bg-danger-50'
                  : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
              )}
            >
              {it.icon && <span className="shrink-0">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Pagination ---------------------------------------------------------- */
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pageCount - 1, page + 1);
  if (lo > 2) out.push('gap');
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < pageCount - 1) out.push('gap');
  out.push(pageCount);
  return out;
}

export function Pagination({
  slice,
  onPage,
  className,
}: {
  slice: PageSlice<unknown>;
  onPage: (page: number) => void;
  className?: string;
}) {
  const { page, pageCount } = slice;
  if (pageCount <= 1) return null;
  const cells = pageWindow(page, pageCount);

  const navBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface px-2 text-sm ' +
    'text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30';

  return (
    <nav className={cn('flex items-center gap-1.5', className)} aria-label="Pagination">
      <button className={navBtn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <IconChevronLeft size={16} />
      </button>
      {cells.map((c, i) =>
        c === 'gap' ? (
          <span key={`gap-${i}`} className="px-1.5 text-ink-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={c}
            onClick={() => onPage(c)}
            aria-current={c === page ? 'page' : undefined}
            className={cn(
              navBtn,
              'tabular-nums',
              c === page && 'bg-action-600 text-on-action border-transparent hover:bg-action-600',
            )}
          >
            {c}
          </button>
        ),
      )}
      <button className={navBtn} onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <IconChevronRight size={16} />
      </button>
    </nav>
  );
}

/* ---- Thumbnail ----------------------------------------------------------- */
/**
 * Property/listing image, or a tasteful neutral placeholder when no real photo
 * exists. The placeholder is deliberately abstract (no fake property photo) and
 * gets a stable warm tint from the seed so rows stay visually distinguishable.
 */
export function Thumbnail({
  src,
  alt,
  seed = '',
  size = 56,
  className,
}: {
  src?: string | null;
  alt: string;
  seed?: string;
  size?: number;
  className?: string;
}) {
  const radius = 'rounded-xl';
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className={cn(radius, 'shrink-0 border border-ink-200 object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff;
  const hue = 18 + (hash % 28); // warm terracotta range for avatar backgrounds
  return (
    <div
      aria-hidden="true"
      className={cn(radius, 'flex shrink-0 items-center justify-center border border-ink-200 text-ink-400', className)}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 30% 92%), hsl(${hue} 24% 86%))`,
      }}
    >
      <IconBuilding size={Math.round(size * 0.42)} />
    </div>
  );
}
