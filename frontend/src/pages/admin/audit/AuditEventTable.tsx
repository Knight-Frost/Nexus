/**
 * AuditEventTable — the paginated event list.
 *
 * Clicking a row fires onSelect(id), which opens the AuditDetailDrawer in the
 * parent. The selected row gets a highlight ring; no inline accordion here.
 *
 * Uses the shared Card surface (bg-surface / border-ink-200) so it sits on the
 * white glass canvas without needing its own background override.
 * Skeleton rows match final column dimensions to prevent layout shift.
 */
import { Card, CardBody } from '@/components/ui/Card';
import { Table, THead, TH, TBody } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/states';
import { AuditEventRow } from './AuditEventRow';
import { EmptyAuditState } from './EmptyAuditState';
import type { AuditLog } from '@/lib/types';

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-ink-200">
          <td className="py-3.5 px-4"><Skeleton className="h-3.5 w-28" /></td>
          <td className="py-3.5 px-4"><Skeleton className="h-3.5 w-16" /></td>
          <td className="py-3.5 px-4">
            <Skeleton className="h-3.5 w-28 mb-1" />
            <Skeleton className="h-3 w-36" />
          </td>
          <td className="py-3.5 px-4"><Skeleton className="h-3.5 w-40" /></td>
          <td className="py-3.5 px-4"><Skeleton className="h-3.5 w-56" /></td>
          <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="py-3.5 px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
        </tr>
      ))}
    </>
  );
}

interface AuditEventTableProps {
  logs: AuditLog[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClearFilters?: () => void;
}

export function AuditEventTable({
  logs,
  loading,
  selectedId,
  onSelect,
  onClearFilters,
}: AuditEventTableProps) {
  return (
    <Card>
      <CardBody className="p-0">
        {!loading && logs.length === 0 ? (
          <div className="p-6">
            <EmptyAuditState onClearFilters={onClearFilters} />
          </div>
        ) : (
          <Table>
            <THead>
              <tr className="border-b border-ink-200">
                <TH>Time</TH>
                <TH>Area</TH>
                <TH>Actor</TH>
                <TH>Action</TH>
                <TH>Summary</TH>
                <TH>Severity</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <SkeletonRows />
              ) : (
                logs.map((log) => (
                  <AuditEventRow
                    key={log.id}
                    log={log}
                    isSelected={selectedId === log.id}
                    onSelect={() => onSelect(log.id)}
                  />
                ))
              )}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
