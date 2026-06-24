/**
 * AuditEventDetailRow — full-width inline accordion detail panel.
 *
 * Background/border uses --audit-* tokens (audit page identity, intentional).
 * SeverityBadge now uses SemanticBadge internally.
 * Section headers use the .eyebrow motif for editorial consistency.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { IconX } from '@/components/ui/icons';
import { SeverityBadge } from './SeverityBadge';
import type { AuditLogDetail } from '@/lib/types';

/** Number of columns in the audit table — keep in sync with AuditEventTable headers. */
const COL_SPAN = 7;

function DL({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-2 border-b border-ink-200 last:border-0">
      <dt className="text-xs font-mono uppercase tracking-wide text-ink-400 pt-0.5 shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-ink-800 break-words">{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 eyebrow text-ink-500">{children}</h3>
  );
}

interface AuditEventDetailRowProps {
  id: number;
  onClose: () => void;
}

/**
 * Full-width inline detail panel, rendered as a table row that spans every
 * column directly beneath the selected event row (accordion pattern).
 * Lays the detail out across three columns on desktop so the wide space is used.
 */
export function AuditEventDetailRow({ id, onClose }: AuditEventDetailRowProps) {
  const navigate = useNavigate();
  const [rawOpen, setRawOpen] = useState(false);

  const { data, loading, error, reload } = useApi<AuditLogDetail>(
    () => adminApi.auditLog(id),
    [id],
  );

  const hasRaw =
    !!data && (data.metadata !== null || data.old_values !== null || data.new_values !== null);

  return (
    <tr>
      <td colSpan={COL_SPAN} className="p-0">
        <div
          className="border-y border-[var(--audit-accent-border)] px-5 py-5 sm:px-6"
          style={{ background: 'var(--audit-accent-bg)' }}
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {data ? (
                <>
                  <p className="font-display text-lg font-semibold text-ink-950 leading-tight">
                    {data.action_label}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={data.severity} />
                    <span className="text-xs text-ink-500">{formatDateTime(data.created_at)}</span>
                  </div>
                </>
              ) : (
                <div className="h-6 w-44 skeleton rounded-md" />
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Collapse details"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-[var(--audit-accent-border)] hover:text-ink-900 focus-visible:outline-2"
            >
              <IconX size={16} />
            </button>
          </div>

          {loading && <LoadingState label="Loading event details…" />}
          {error && <ErrorState message={error.message} onRetry={reload} />}

          {data && !loading && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Column 1 — plain language */}
              <div className="space-y-4">
                <section>
                  <SectionTitle>What happened</SectionTitle>
                  <p className="text-sm text-ink-800 leading-relaxed">{data.summary}</p>
                </section>
                {data.why_it_matters && (
                  <section>
                    <SectionTitle>Why it matters</SectionTitle>
                    <p
                      className="rounded-xl border bg-surface/70 p-3 text-sm leading-relaxed"
                      style={{
                        borderColor: 'var(--audit-accent-border)',
                        color: 'var(--audit-ink)',
                      }}
                    >
                      {data.why_it_matters}
                    </p>
                  </section>
                )}
              </div>

              {/* Column 2 — technical details */}
              <section>
                <SectionTitle>Technical details</SectionTitle>
                <dl className="rounded-xl border border-ink-200 bg-surface/70 px-4">
                  {data.ip_address && (
                    <DL
                      label="IP address"
                      value={<span className="font-mono text-xs">{data.ip_address}</span>}
                    />
                  )}
                  {data.device && <DL label="Device" value={data.device} />}
                  {data.actor.id !== null && <DL label="Actor ID" value={`#${data.actor.id}`} />}
                  {data.actor_type && <DL label="Actor type" value={data.actor_type} />}
                  {data.subject && <DL label="Related entity" value={data.subject.label} />}
                  <DL label="Timestamp" value={formatDateTime(data.created_at)} />
                  <DL
                    label="Action key"
                    value={<span className="font-mono text-xs">{data.action}</span>}
                  />
                </dl>
                {hasRaw && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left text-xs font-mono uppercase tracking-wide text-ink-500 hover:text-[var(--audit-accent)] transition-colors focus-visible:outline-2"
                      onClick={() => setRawOpen((o) => !o)}
                      aria-expanded={rawOpen}
                      aria-controls="audit-raw-panel"
                    >
                      <span aria-hidden="true">{rawOpen ? '▾' : '▸'}</span>
                      View raw log (JSON)
                    </button>
                    {rawOpen && (
                      <pre
                        id="audit-raw-panel"
                        className="mt-2 max-h-64 overflow-auto rounded-xl border border-ink-200 bg-surface/80 p-4 text-xs text-ink-700 leading-relaxed"
                      >
                        {JSON.stringify(
                          {
                            ...(data.metadata !== null ? { metadata: data.metadata } : {}),
                            ...(data.old_values !== null ? { old_values: data.old_values } : {}),
                            ...(data.new_values !== null ? { new_values: data.new_values } : {}),
                          },
                          null,
                          2,
                        )}
                      </pre>
                    )}
                  </div>
                )}
              </section>

              {/* Column 3 — actor + next steps */}
              <div className="space-y-4">
                <section>
                  <SectionTitle>Actor</SectionTitle>
                  <p className="text-sm font-medium text-ink-900">{data.actor.name}</p>
                  {data.actor.email && (
                    <p className="text-xs text-ink-500">{data.actor.email}</p>
                  )}
                  <p className="mt-0.5 eyebrow text-ink-400">
                    {data.actor.role}
                  </p>
                </section>
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
                            onClick={() => navigate(step.to!)}
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
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
