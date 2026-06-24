import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { normalizeError } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/states';
import {
  IconShield,
  IconAlertTriangle,
  IconAlertCircle,
  IconActivity,
  IconFlag,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
} from '@/components/ui/icons';
import { Field, Select } from '@/components/ui/Field';
import { DashboardSection } from '@/components/cards';
import { AuditSummaryCard } from './audit/AuditSummaryCard';
import { AuditFilterBar } from './audit/AuditFilterBar';
import { AuditEventTable } from './audit/AuditEventTable';
import { AdminInsightCard } from './audit/AdminInsightCard';
import { AuditDetailDrawer } from './audit/AuditDetailDrawer';
import type { AuditFilters } from './audit/AuditFilterBar';
import type { ApiError, AuditLog } from '@/lib/types';

const DEFAULT_FILTERS: AuditFilters = {
  severity: '',
  area: '',
  actor_role: '',
  from_date: '',
  to_date: '',
  search: '',
  sort: 'newest',
};

function toApiParams(filters: AuditFilters, page: number, perPage: number) {
  return {
    severity:   filters.severity   || undefined,
    area:       filters.area       || undefined,
    actor_role: filters.actor_role || undefined,
    from_date:  filters.from_date  || undefined,
    to_date:    filters.to_date    || undefined,
    search:     filters.search     || undefined,
    sort:       filters.sort,
    page,
    per_page:   perPage,
  };
}

function toExportParams(filters: AuditFilters) {
  return {
    severity:   filters.severity   || undefined,
    area:       filters.area       || undefined,
    actor_role: filters.actor_role || undefined,
    from_date:  filters.from_date  || undefined,
    to_date:    filters.to_date    || undefined,
    search:     filters.search     || undefined,
    sort:       filters.sort,
  };
}

export function AuditLogs() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  function updateFilters(partial: Partial<AuditFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setPage(1);
  }

  // Main log list
  const { data, loading, error, reload } = useApi(
    () => adminApi.auditLogs(toApiParams(filters, page, perPage)),
    [filters.severity, filters.area, filters.actor_role, filters.from_date, filters.to_date, filters.search, filters.sort, page, perPage],
  );

  // Summary metrics
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useApi(() => adminApi.auditSummary(), []);

  // Log summary error without swallowing it
  useEffect(() => {
    if (summaryError) {
      console.error('[AuditLogs] Summary fetch failed:', summaryError);
    }
  }, [summaryError]);

  const logs = data?.data ?? [];
  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  async function handleExport() {
    setExporting(true);
    try {
      await adminApi.auditExport(toExportParams(filters));
      toast('Export downloaded.', 'success');
    } catch (err) {
      const e = normalizeError(err) as ApiError;
      toast(e.message || 'Export failed. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  }

  const summaryMetrics = summary?.metrics;

  return (
    <div className="audit-center animate-rise space-y-8">
      {/* Page header */}
      <PageHeader
        eyebrow="Insight"
        title="Audit & Activity Center"
        description="Your immutable record of platform activity, security events, operational actions, and policy changes. Every event is time-stamped and tamper-aware."
        action={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconDownload size={16} />}
            onClick={handleExport}
            loading={exporting}
            aria-label="Export audit logs as CSV"
          >
            Export logs
          </Button>
        }
      />

      {/* Summary cards — semantic roles driven by real metric values */}
      <section aria-label="Audit summary metrics">
        {summaryError && (
          <p className="mb-3 rounded-xl border border-warning-500/30 bg-warning-50 px-4 py-2.5 text-sm text-warning-600">
            Summary metrics unavailable — check console for details.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {/* Critical today: featured CommandCard because it's the most important signal */}
          <AuditSummaryCard
            metricKey="critical_today"
            featured
            label="Critical today"
            icon={<IconAlertTriangle size={18} />}
            metric={summaryMetrics?.critical_today ?? null}
            loading={summaryLoading}
          />
          <AuditSummaryCard
            metricKey="failed_signins"
            label="Failed sign-ins"
            icon={<IconShield size={18} />}
            metric={summaryMetrics?.failed_signins ?? null}
            loading={summaryLoading}
          />
          <AuditSummaryCard
            metricKey="policy_changes"
            label="Policy changes"
            icon={<IconAlertCircle size={18} />}
            metric={summaryMetrics?.policy_changes ?? null}
            loading={summaryLoading}
          />
          <AuditSummaryCard
            metricKey="user_activity"
            label="User activity"
            icon={<IconActivity size={18} />}
            metric={summaryMetrics?.user_activity ?? null}
            loading={summaryLoading}
          />
          <AuditSummaryCard
            metricKey="needs_review"
            label="Needs review"
            icon={<IconFlag size={18} />}
            metric={summaryMetrics?.needs_review ?? null}
            loading={summaryLoading}
          />
        </div>
      </section>

      {/* Filter bar */}
      <AuditFilterBar
        filters={filters}
        searchInput={searchInput}
        onSearchInputChange={(v) => {
          setSearchInput(v);
        }}
        onChange={updateFilters}
      />

      {/* Main content: table + details panel */}
      <section aria-label="Audit event log">
        {/* Header row: total + per-page */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={14} /> Loading…
              </span>
            ) : (
              <span>
                <strong className="text-ink-900">{total.toLocaleString()}</strong>{' '}
                {total === 1 ? 'event' : 'events'} found
              </span>
            )}
          </p>
          <div className="w-32">
            <Field label="">
              {(id) => (
                <Select
                  id={id}
                  value={String(perPage)}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  <option value="20">20 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </Select>
              )}
            </Field>
          </div>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            {/* Full-width table; clicking a row opens the investigation drawer */}
            <AuditEventTable
              logs={logs}
              loading={loading}
              selectedId={selectedLog?.id ?? null}
              onSelect={(id) => {
                const log = logs.find((l) => l.id === id) ?? null;
                if (log) {
                  setSelectedLog(log);
                  setDrawerOpen(true);
                }
              }}
              onClearFilters={clearFilters}
            />

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="mt-5 flex items-center justify-between gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<IconChevronLeft size={16} />}
                >
                  Previous
                </Button>
                <span className="text-sm text-ink-500">
                  Page {currentPage} of {lastPage}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= lastPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                  rightIcon={<IconChevronRight size={16} />}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Admin insights strip */}
      {!summaryLoading && summary && summary.insights.length > 0 && (
        <DashboardSection
          eyebrow="Admin insights"
          title="Today at a glance"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.insights.map((insight, i) => (
              <AdminInsightCard key={i} insight={insight} />
            ))}
          </div>
        </DashboardSection>
      )}

      {/* Investigation drawer — right-side panel for full event detail */}
      <AuditDetailDrawer
        log={selectedLog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
