/**
 * AuditDetailDrawer — right-side investigation drawer for a single audit event.
 *
 * Replaces the inline accordion (AuditEventDetailRow) with a full Drawer so the
 * wide table stays fully visible while the investigator reads the detail.
 *
 * Surfaces ONLY what the backend actually returns:
 *   - summary, why_it_matters (plain-language columns)
 *   - ip_address, device, actor.id/email/role/name, actor_type (technical)
 *   - old_values / new_values diff WHEN present (before/after view)
 *   - metadata JSON WHEN present (collapsible raw panel)
 *   - recommended_steps (next-step buttons)
 * No fabricated fields; absent keys render nothing or a "not recorded" note.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { SeverityBadge } from './SeverityBadge';
import type { AuditLog, AuditLogDetail } from '@/lib/types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
      {children}
    </h3>
  );
}

function DL({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-2 gap-y-0.5 border-b border-ink-100 py-2 last:border-0">
      <dt className="pt-0.5 text-xs text-ink-400 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-ink-800 break-words">{value}</dd>
    </div>
  );
}

/**
 * Renders a before/after diff for old_values → new_values.
 * Shows only the keys that changed (union of both key sets).
 * If a key is only in one side, it shows as "—" on the other.
 */
function ValuesDiff({
  oldValues,
  newValues,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  if (!oldValues && !newValues) {
    return (
      <p className="rounded-lg border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-400">
        No field changes recorded for this event.
      </p>
    );
  }

  const allKeys = Array.from(
    new Set([
      ...Object.keys(oldValues ?? {}),
      ...Object.keys(newValues ?? {}),
    ]),
  );

  if (allKeys.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-400">
        No field changes recorded for this event.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50">
            <th className="py-2 pl-4 pr-2 text-left font-mono uppercase tracking-wider text-ink-400 w-1/3">
              Field
            </th>
            <th className="py-2 px-2 text-left font-mono uppercase tracking-wider text-danger-500 w-1/3">
              Before
            </th>
            <th className="py-2 pl-2 pr-4 text-left font-mono uppercase tracking-wider text-success-500 w-1/3">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key) => {
            const before = oldValues ? oldValues[key] : undefined;
            const after  = newValues ? newValues[key] : undefined;
            const changed = JSON.stringify(before) !== JSON.stringify(after);
            return (
              <tr
                key={key}
                className={[
                  'border-b border-ink-100 last:border-0',
                  changed ? 'bg-warning-50/40' : '',
                ].join(' ')}
              >
                <td className="py-2 pl-4 pr-2 font-mono text-ink-600 break-all">{key}</td>
                <td className="py-2 px-2 text-danger-600 break-all">
                  {before === undefined ? <span className="text-ink-300">—</span> : renderValue(before)}
                </td>
                <td className="py-2 pl-2 pr-4 text-success-600 break-all">
                  {after === undefined ? <span className="text-ink-300">—</span> : renderValue(after)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderValue(v: unknown): React.ReactNode {
  if (v === null) return <span className="text-ink-300 italic">null</span>;
  if (typeof v === 'boolean') return <span className="font-mono">{String(v)}</span>;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return <span className="font-mono text-ink-500">{JSON.stringify(v)}</span>;
}

/** Collapsible raw JSON panel for metadata. */
function RawJson({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-400 hover:text-ink-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        Raw metadata JSON
      </button>
      {open && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-700 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

interface AuditDetailDrawerProps {
  /** The summary row — used for drawer title before full detail loads. */
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}

export function AuditDetailDrawer({ log, open, onClose }: AuditDetailDrawerProps) {
  const navigate = useNavigate();

  const { data, loading, error, reload } = useApi<AuditLogDetail>(
    () => (log ? adminApi.auditLog(log.id) : Promise.reject(new Error('No log selected'))),
    // Re-fetch whenever the selected log id changes. When log is null the fetcher
    // rejects immediately; the drawer is closed before render in that case.
    [log?.id ?? -1],
  );

  // Determine whether there are any changed values to show
  const hasChanges = !!(data?.old_values || data?.new_values);
  const hasMetadata = !!(data?.metadata && Object.keys(data.metadata).length > 0);

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }} widthClass="sm:max-w-[700px]">
      <DrawerHeader
        title={data?.action_label ?? log?.action_label ?? 'Event detail'}
        description={
          data ? (
            <span className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={data.severity} />
              <span className="text-ink-400">{formatDateTime(data.created_at)}</span>
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-400">
                {data.area}
              </span>
            </span>
          ) : log ? (
            <span className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={log.severity} />
              <span className="text-ink-400">{formatDateTime(log.created_at)}</span>
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-400">
                {log.area}
              </span>
            </span>
          ) : undefined
        }
        onClose={onClose}
      />

      <DrawerBody>
        {loading && <LoadingState label="Loading event details…" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}

        {data && !loading && (
          <div className="flex flex-col gap-7">

            {/* ── Plain language ── */}
            <section>
              <SectionTitle>What happened</SectionTitle>
              <p className="text-sm leading-relaxed text-ink-700">{data.summary}</p>
              {data.why_it_matters && (
                <div
                  className="mt-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600"
                >
                  <span className="block font-semibold text-ink-800 mb-0.5">Why it matters</span>
                  {data.why_it_matters}
                </div>
              )}
            </section>

            {/* ── Actor identity ── */}
            <section>
              <SectionTitle>Actor</SectionTitle>
              <dl className="rounded-xl border border-ink-200 bg-surface/70 px-4">
                <DL label="Name" value={<span className="font-semibold">{data.actor.name}</span>} />
                {data.actor.email && <DL label="Email" value={data.actor.email} />}
                <DL
                  label="Role"
                  value={
                    <span className="inline-block rounded-md bg-ink-100 px-2 py-0.5 text-xs font-mono uppercase tracking-wide text-ink-600">
                      {data.actor.role}
                    </span>
                  }
                />
                {data.actor_type && (
                  <DL label="Actor type" value={<span className="font-mono text-xs">{data.actor_type}</span>} />
                )}
                {data.actor.id !== null && <DL label="Actor ID" value={`#${data.actor.id}`} />}
              </dl>
            </section>

            {/* ── Related entity ── */}
            {data.subject && (
              <section>
                <SectionTitle>Related entity</SectionTitle>
                <dl className="rounded-xl border border-ink-200 bg-surface/70 px-4">
                  <DL label="Type" value={<span className="font-mono text-xs">{data.subject.type}</span>} />
                  <DL label="Label" value={data.subject.label} />
                  <DL label="ID" value={`#${data.subject.id}`} />
                </dl>
              </section>
            )}

            {/* ── Field changes (before / after) ── */}
            <section>
              <SectionTitle>Field changes</SectionTitle>
              <ValuesDiff oldValues={data.old_values} newValues={data.new_values} />
            </section>

            {/* ── Technical details ── */}
            <section>
              <SectionTitle>Technical details</SectionTitle>
              <dl className="rounded-xl border border-ink-200 bg-surface/70 px-4">
                <DL
                  label="Timestamp"
                  value={<span className="font-mono text-xs">{formatDateTime(data.created_at)}</span>}
                />
                <DL
                  label="Action key"
                  value={<span className="font-mono text-xs">{data.action}</span>}
                />
                {data.ip_address ? (
                  <DL
                    label="IP address"
                    value={<span className="font-mono text-xs">{data.ip_address}</span>}
                  />
                ) : null}
                {data.device ? (
                  <DL label="Device / UA" value={<span className="text-xs">{data.device}</span>} />
                ) : data.user_agent ? (
                  <DL
                    label="User agent"
                    value={
                      <span className="text-xs break-all text-ink-500">{data.user_agent}</span>
                    }
                  />
                ) : null}
              </dl>
              {/* ip/device absent notes */}
              {!data.ip_address && !data.device && !data.user_agent && (
                <p className="mt-2 text-xs text-ink-400 italic">
                  IP address and device not recorded for this event type.
                </p>
              )}
            </section>

            {/* ── Raw metadata JSON (collapsible) ── */}
            {hasMetadata && (
              <section>
                <SectionTitle>Raw metadata</SectionTitle>
                <RawJson data={data.metadata!} />
              </section>
            )}

            {/* ── Recommended next steps ── */}
            {data.recommended_steps.length > 0 && (
              <section>
                <SectionTitle>Recommended next steps</SectionTitle>
                <div className="flex flex-col gap-2">
                  {data.recommended_steps.map((step, i) =>
                    step.to ? (
                      <Button
                        key={i}
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => { onClose(); navigate(step.to!); }}
                      >
                        {step.label}
                      </Button>
                    ) : (
                      <p
                        key={i}
                        className="rounded-xl border border-dashed border-ink-200 px-4 py-2.5 text-sm text-ink-400"
                      >
                        {step.label}
                      </p>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* Padding sentinel so content isn't flush with footer */}
            <div className="h-2" aria-hidden="true" />
          </div>
        )}

        {/* Show skeleton section titles while loading */}
        {loading && !data && (
          <div className="flex flex-col gap-6 pt-4">
            {['What happened', 'Actor', 'Field changes', 'Technical details'].map((s) => (
              <div key={s}>
                <div className="mb-2.5 h-2.5 w-24 skeleton rounded" />
                <div className="h-20 skeleton rounded-xl" />
              </div>
            ))}
          </div>
        )}
      </DrawerBody>

      {/* Footer — whether diff is shown, and only if there ARE changes */}
      {data && (
        <DrawerFooter>
          <span className="text-xs text-ink-400">
            {hasChanges ? 'Before/after diff available above.' : 'No field diff for this event.'}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      )}
    </Drawer>
  );
}
