import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { notificationApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconBell, IconCheck, IconChevronRight } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { AppNotification } from '@/lib/types';

export function Notifications() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => notificationApi.list({ page }), [page]);

  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      toast('All notifications marked as read', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to mark all as read', 'error');
    } finally {
      setMarkingAll(false);
    }
  }

  async function open(notification: AppNotification) {
    if (notification.read_at) return;
    setBusyId(notification.id);
    try {
      await notificationApi.markRead(notification.id);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to mark as read', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your contracts, payments, and listings."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            loading={markingAll}
            leftIcon={<IconCheck className="h-4 w-4" />}
          >
            Mark all read
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={<IconBell />}
          title="You’re all caught up"
          description="New notifications will show up here."
        />
      ) : (
        <>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-ink-100">
                {data.data.map((notification) => {
                  const unread = notification.read_at === null;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => open(notification)}
                        disabled={!unread || busyId === notification.id}
                        aria-label={unread ? `Mark "${notification.title}" as read` : notification.title}
                        className={cn(
                          'flex w-full items-start gap-3 px-5 py-4 text-left transition',
                          unread ? 'bg-brand-50/40 hover:bg-brand-50/70' : 'hover:bg-ink-50/70',
                          unread ? 'cursor-pointer' : 'cursor-default',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            unread ? 'bg-brand-600' : 'bg-transparent',
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm',
                              unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-700',
                            )}
                          >
                            {notification.title}
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-600">
                            {notification.message}
                          </span>
                          <span className="mt-1 block text-xs text-ink-400">
                            {formatDateTime(notification.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
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
