import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Field, Input, Select } from '@/components/ui/Field';
import { IconLedger, IconChevronLeft, IconChevronRight } from '@/components/ui/icons';
import type { Tone } from '@/components/ui/Badge';
import type { AuditLog } from '@/lib/types';

function severityTone(severity: AuditLog['severity']): Tone {
  switch (severity) {
    case 'critical': return 'danger';
    case 'warning': return 'warning';
    default: return 'info';
  }
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TR key={i}>
          <TD><Skeleton className="h-4 w-28" /></TD>
          <TD><Skeleton className="h-4 w-24" /></TD>
          <TD><Skeleton className="h-4 w-48" /></TD>
          <TD><Skeleton className="h-5 w-16 rounded-full" /></TD>
          <TD><Skeleton className="h-4 w-20" /></TD>
          <TD><Skeleton className="h-4 w-24" /></TD>
        </TR>
      ))}
    </>
  );
}

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditLog['severity']>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, loading, error, reload } = useApi(
    () => adminApi.auditLogs({ page }),
    [page],
  );

  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;

  // Client-side filtering (real implementation would pass params to API)
  const rows = (data?.data ?? []).filter((log) => {
    const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.description ?? '').toLowerCase().includes(search.toLowerCase());
    return matchSeverity && matchSearch;
  });

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Insight"
        title="Audit Logs"
        description="An immutable record of every consequential action on the platform."
      />

      {/* Filter row */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label="Severity">
            {(id) => (
              <Select
                id={id}
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value as typeof severityFilter);
                  setPage(1);
                }}
              >
                <option value="all">All severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Select>
            )}
          </Field>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-sm">
          <Field label="Search by action">
            {(id) => (
              <div className="flex gap-2">
                <Input
                  id={id}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="e.g. listing approved"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Search
                </Button>
              </div>
            )}
          </Field>
        </form>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !loading && rows.length === 0 ? (
        <EmptyState
          icon={<IconLedger />}
          title="No audit events"
          description="Activity across the platform will be recorded here."
        />
      ) : (
        <>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Time</TH>
                    <TH>Actor</TH>
                    <TH>Action</TH>
                    <TH>Subject</TH>
                    <TH>Severity</TH>
                    <TH>IP</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading ? (
                    <SkeletonRows />
                  ) : (
                    rows.map((log) => (
                      <TR key={log.id}>
                        <TD className="whitespace-nowrap text-ink-500 text-xs">
                          {formatDateTime(log.created_at)}
                        </TD>
                        <TD className="text-ink-500 text-xs whitespace-nowrap">
                          {log.actor_type
                            ? `${log.actor_type}${log.actor_id !== null ? ` #${log.actor_id}` : ''}`
                            : 'System'}
                        </TD>
                        <TD className="font-medium text-ink-900">{log.action}</TD>
                        <TD className="max-w-xs text-ink-600 text-xs">
                          {log.description ?? (
                            log.subject_type
                              ? `${log.subject_type} #${log.subject_id}`
                              : '—'
                          )}
                        </TD>
                        <TD>
                          <Badge tone={severityTone(log.severity)} dot={false}>
                            {log.severity}
                          </Badge>
                        </TD>
                        <TD className="whitespace-nowrap text-ink-500 text-xs font-mono">
                          {log.ip_address ?? '—'}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          {lastPage > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leftIcon={<IconChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page {currentPage} of {lastPage}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                leftIcon={<IconChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
