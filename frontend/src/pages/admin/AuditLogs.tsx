import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconChevronRight, IconLedger } from '@/components/ui/icons';
import type { Tone } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

function severityTone(severity: AuditLog['severity']): Tone {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => adminApi.auditLogs({ page }), [page]);

  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="An immutable record of every consequential action on the platform."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.data.length ? (
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
                  <TH>Time</TH>
                  <TH>Action</TH>
                  <TH>Description</TH>
                  <TH>Severity</TH>
                  <TH>Actor</TH>
                </THead>
                <TBody>
                  {data.data.map((log) => (
                    <TR key={log.id}>
                      <TD className="whitespace-nowrap text-ink-500">
                        {formatDateTime(log.created_at)}
                      </TD>
                      <TD className="font-medium text-ink-900">{log.action}</TD>
                      <TD className="max-w-md">{log.description ?? '—'}</TD>
                      <TD>
                        <Badge tone={severityTone(log.severity)}>{log.severity}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-ink-500">
                        {log.actor_type
                          ? `${log.actor_type}${log.actor_id !== null ? ` #${log.actor_id}` : ''}`
                          : 'System'}
                      </TD>
                    </TR>
                  ))}
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
