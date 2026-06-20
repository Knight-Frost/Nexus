import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { notificationApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconDollarSign,
  IconDoc,
  IconCheckCircle,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { AppNotification, NotificationType } from '@/lib/types';

type FilterTab = 'all' | 'unread';

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'payment_succeeded':
    case 'payment_failed':
    case 'rent_generated':
    case 'rent_due_soon':
    case 'rent_overdue':
    case 'late_fee_added':
      return <IconDollarSign size={16} />;
    case 'contract_signed':
    case 'contract_terminated':
      return <IconDoc size={16} />;
    default:
      return <IconBell size={16} />;
  }
}

function notificationIconTone(type: NotificationType): string {
  switch (type) {
    case 'payment_succeeded':
    case 'contract_signed':
      return 'bg-success-100 text-success-700';
    case 'payment_failed':
    case 'rent_overdue':
    case 'contract_terminated':
    case 'late_fee_added':
      return 'bg-danger-100 text-danger-700';
    case 'rent_due_soon':
      return 'bg-warning-100 text-warning-700';
    default:
      return 'bg-brand-100 text-brand-700';
  }
}

function NotificationRow({
  notification,
  onMarkRead,
  busy,
}: {
  notification: AppNotification;
  onMarkRead: (n: AppNotification) => void;
  busy: boolean;
}) {
  const unread = notification.read_at === null;

  return (
    <li
      className={cn(
        'flex items-start gap-3 px-5 py-4 border-l-[3px] transition-all',
        unread ? 'border-brand-500 bg-brand-50/40' : 'border-transparent',
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          notificationIconTone(notification.type),
        )}
      >
        {notificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-snug',
            unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-700',
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-sm text-ink-500 leading-relaxed">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-ink-400">
          {formatDateTime(notification.created_at)}
        </p>
      </div>

      {/* Mark read action */}
      {unread && (
        <button
          type="button"
          onClick={() => onMarkRead(notification)}
          disabled={busy}
          aria-label={`Mark "${notification.title}" as read`}
          className="ml-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-brand-700 disabled:opacity-50"
        >
          <IconCheck size={15} />
        </button>
      )}

      {/* Read checkmark */}
      {!unread && (
        <div className="ml-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-200">
          <IconCheckCircle size={15} />
        </div>
      )}
    </li>
  );
}

export function Notifications() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const { data, loading, error, reload } = useApi(() => notificationApi.list({ page }), [page]);

  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;

  const allNotifications = data?.data ?? [];
  const filtered =
    activeFilter === 'unread'
      ? allNotifications.filter((n) => n.read_at === null)
      : allNotifications;

  const unreadCount = allNotifications.filter((n) => n.read_at === null).length;

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      reload();
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  }

  async function markRead(notification: AppNotification) {
    if (notification.read_at) return;
    setBusyId(notification.id);
    try {
      await notificationApi.markRead(notification.id);
      reload();
    } catch {
      // silent
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description="Updates about your contracts, payments, and listings."
        action={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={markAllRead}
              loading={markingAll}
              leftIcon={<IconCheck className="h-4 w-4" />}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      {allNotifications.length > 0 && (
        <div className="flex gap-1 rounded-xl bg-ink-100 border border-ink-200 p-1 w-fit">
          {([
            { value: 'all' as FilterTab, label: 'All', count: allNotifications.length },
            { value: 'unread' as FilterTab, label: 'Unread', count: unreadCount },
          ] as const).map(({ value, label, count }) => {
            if (value === 'unread' && count === 0) return null;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setActiveFilter(value)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  activeFilter === value
                    ? 'bg-surface text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700',
                )}
              >
                {label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    activeFilter === value
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-ink-200 text-ink-500',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : allNotifications.length === 0 ? (
        <EmptyState
          icon={<IconBell />}
          title="You're all caught up"
          description="New notifications will show up here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconBell />}
          title="No unread notifications"
          description="Switch to 'All' to see your history."
        />
      ) : (
        <>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-ink-100">
                {filtered.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markRead}
                    busy={busyId === notification.id}
                  />
                ))}
              </ul>
            </CardBody>
          </Card>

          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-4">
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
