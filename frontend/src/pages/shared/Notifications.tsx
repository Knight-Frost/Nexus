/**
 * Notifications — Homecrest activity feed.
 *
 * Fetches real notifications from notificationApi.list() and renders them
 * grouped by recency (Today / Earlier). Mark-read and mark-all-read are wired
 * to the live API with optimistic UI updates. No mock data, no MOCK_MODE.
 *
 * Tab breakdown:
 *   All      — every notification
 *   Unread   — where read_at === null
 *   Payments — rent_generated | rent_due_soon | rent_overdue |
 *              payment_succeeded | payment_failed | late_fee_added
 *   Contracts — contract_signed | contract_terminated
 *
 * NotificationType → visual category (for icon + badge colour):
 *   rent_*  / payment_*  / late_fee_added → "payments"
 *   contract_*                            → "lease"
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { notificationApi } from '@/lib/endpoints';
import type { AppNotification, NotificationType, Paginated } from '@/lib/types';
import {
  IconCheck,
  IconSettings,
  IconSearch,
  IconFilter,
  IconChevronRight,
  IconBell,
  IconCheckCircle,
  IconDoc,
} from '@/components/ui/icons';
import './notifications.css';

/* ── type → visual category (drives icon + CSS badge colour) ──────────────── */

type VisualCategory = 'payments' | 'lease';

const TYPE_CATEGORY: Record<NotificationType, VisualCategory> = {
  rent_generated:      'payments',
  rent_due_soon:       'payments',
  rent_overdue:        'payments',
  payment_succeeded:   'payments',
  payment_failed:      'payments',
  late_fee_added:      'payments',
  contract_signed:     'lease',
  contract_terminated: 'lease',
};

type CategoryIconComp = React.ComponentType<{ size?: number; className?: string }>;

const CATEGORY_ICON: Record<VisualCategory, CategoryIconComp> = {
  payments: IconCheckCircle,
  lease:    IconDoc,
};

const CATEGORY_LABEL: Record<VisualCategory, string> = {
  payments: 'Payments',
  lease:    'Lease & Rent',
};

/* ── tabs ─────────────────────────────────────────────────────────────────── */

type TabKey = 'all' | 'unread' | 'payments' | 'contracts';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'unread',    label: 'Unread' },
  { key: 'payments',  label: 'Payments' },
  { key: 'contracts', label: 'Contracts' },
];

const PAYMENT_TYPES = new Set<NotificationType>([
  'rent_generated', 'rent_due_soon', 'rent_overdue',
  'payment_succeeded', 'payment_failed', 'late_fee_added',
]);

const CONTRACT_TYPES = new Set<NotificationType>([
  'contract_signed', 'contract_terminated',
]);

/* ── date helpers ─────────────────────────────────────────────────────────── */

type Bucket = 'today' | 'earlier';

function daysAgo(iso: string, now: Date): number {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat  = new Date(d.getFullYear(),   d.getMonth(),   d.getDate()).getTime();
  return Math.round((startOfToday - startOfThat) / (24 * 60 * 60 * 1000));
}

function bucketOf(iso: string, now: Date): Bucket {
  return daysAgo(iso, now) <= 1 ? 'today' : 'earlier';
}

function formatTime(iso: string, now: Date): string {
  const d    = new Date(iso);
  const diff = daysAgo(iso, now);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff <= 0) return time;
  if (diff === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ================================================================== page ==== */

export function Notifications() {
  const [pageData, setPageData] = useState<Paginated<AppNotification> | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<null | { status?: number; message?: string }>(null);
  const [tab,      setTab]      = useState<TabKey>('all');
  const [query,    setQuery]    = useState('');
  const [notice,   setNotice]   = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  /* ── load ─────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await notificationApi.list();
      setPageData(result);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number }; message?: string };
      setError({ status: e?.response?.status, message: e?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  /* ── derived lists ────────────────────────────────────────────────────── */

  const items = useMemo<AppNotification[]>(() => pageData?.data ?? [], [pageData]);

  const unreadCount = useMemo(() => items.filter((n) => n.read_at === null).length, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      const tabOk = (() => {
        switch (tab) {
          case 'all':       return true;
          case 'unread':    return n.read_at === null;
          case 'payments':  return PAYMENT_TYPES.has(n.type);
          case 'contracts': return CONTRACT_TYPES.has(n.type);
        }
      })();
      const queryOk =
        q === '' ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q);
      return tabOk && queryOk;
    });
  }, [items, tab, query]);

  const groups = useMemo(() => {
    const now    = new Date();
    const sorted = [...visible].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    return {
      today:   sorted.filter((n) => bucketOf(n.created_at, now) === 'today'),
      earlier: sorted.filter((n) => bucketOf(n.created_at, now) === 'earlier'),
    };
  }, [visible]);

  /* ── actions ──────────────────────────────────────────────────────────── */

  const onMarkRead = useCallback(async (n: AppNotification) => {
    if (n.read_at !== null) return;
    setBusy(true);
    try {
      await notificationApi.markRead(n.id);
      /* optimistic update — stamp read_at so the UI reflects immediately */
      setPageData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((item) =>
            item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item,
          ),
        };
      });
    } catch {
      setNotice('Could not mark notification as read.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onMarkAll = useCallback(async () => {
    if (unreadCount === 0 || busy) return;
    setBusy(true);
    try {
      await notificationApi.markAllRead();
      setPageData((prev) => {
        if (!prev) return prev;
        const stamp = new Date().toISOString();
        return {
          ...prev,
          data: prev.data.map((item) => ({ ...item, read_at: item.read_at ?? stamp })),
        };
      });
      setNotice('All notifications marked as read.');
    } catch {
      setNotice('Could not mark all as read.');
    } finally {
      setBusy(false);
    }
  }, [unreadCount, busy]);

  /* ── render helpers ───────────────────────────────────────────────────── */

  const now = new Date();

  function renderGroup(label: string, list: AppNotification[]) {
    if (list.length === 0) return null;
    return (
      <div key={label}>
        <div className="nt-group-label">{label}</div>
        {list.map((n) => {
          const cat  = TYPE_CATEGORY[n.type];
          const Icon = CATEGORY_ICON[cat];
          const isUnread = n.read_at === null;
          return (
            <button
              type="button"
              className={`nt-row${isUnread ? ' unread' : ''}`}
              key={n.id}
              disabled={busy}
              onClick={() => void onMarkRead(n)}
            >
              <span className="nt-dot" aria-hidden="true" />
              <span className={`nt-ico ${cat}`}><Icon size={20} /></span>
              <span className="nt-body">
                <span className="nt-row-title">
                  {n.title}
                  {isUnread && <span className="nt-title-dot" aria-label="Unread" />}
                </span>
                <span className="nt-row-text">{n.message}</span>
                <span className={`nt-cat ${cat}`}>{CATEGORY_LABEL[cat]}</span>
              </span>
              <span className="nt-time">{formatTime(n.created_at, now)}</span>
              <IconChevronRight className="nt-chev" size={18} />
            </button>
          );
        })}
      </div>
    );
  }

  /* ── status states ────────────────────────────────────────────────────── */

  function renderFeed() {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <div className="nt-skel-row" key={i} aria-hidden="true">
          <span />
          <span className="nt-skel circle" />
          <span className="nt-skel" style={{ width: '55%' }} />
          <span className="nt-skel" style={{ width: 64 }} />
        </div>
      ));
    }

    if (error) {
      if (error.status === 403) {
        return (
          <div className="nt-empty">
            <span className="nt-empty-ico"><IconBell size={26} /></span>
            <p className="nt-empty-title">Access denied</p>
            <p className="nt-empty-text">You don't have permission to view notifications.</p>
          </div>
        );
      }
      return (
        <div className="nt-empty">
          <span className="nt-empty-ico"><IconBell size={26} /></span>
          <p className="nt-empty-title">We couldn't load your notifications</p>
          <p className="nt-empty-text">Something went wrong fetching your updates.</p>
          <button className="nt-btn nt-btn-ghost" onClick={() => void load()}>Try again</button>
        </div>
      );
    }

    if (visible.length === 0) {
      const isFiltered = query.trim() !== '' || tab !== 'all';
      return (
        <div className="nt-empty">
          <span className="nt-empty-ico"><IconBell size={26} /></span>
          <p className="nt-empty-title">
            {query.trim()
              ? 'Nothing here'
              : tab === 'unread'
                ? 'All caught up'
                : isFiltered
                  ? 'Nothing here'
                  : "You're all caught up"}
          </p>
          <p className="nt-empty-text">
            {query.trim()
              ? 'No notifications match your search.'
              : tab === 'unread'
                ? 'You have no unread notifications.'
                : isFiltered
                  ? 'No notifications in this category yet.'
                  : 'New notifications will show up here.'}
          </p>
        </div>
      );
    }

    return (
      <>
        {renderGroup('Today',   groups.today)}
        {renderGroup('Earlier', groups.earlier)}
      </>
    );
  }

  /* ── page ─────────────────────────────────────────────────────────────── */

  return (
    <div className="nt-page">
      {/* header */}
      <header className="nt-head">
        <div className="nt-head-title">
          <p className="nt-eyebrow">Account</p>
          <h1 className="nt-title">Notifications</h1>
          <p className="nt-sub">Updates about your contracts, payments, and listings.</p>
        </div>
        <div className="nt-actions">
          <button
            className="nt-btn nt-btn-ghost"
            onClick={() => void onMarkAll()}
            disabled={unreadCount === 0 || busy}
          >
            <IconCheck size={16} /> Mark all as read
          </button>
          <Link className="nt-btn nt-btn-ghost" to="/app/settings">
            <IconSettings size={16} /> Notification settings
          </Link>
        </div>
      </header>

      <section className="nt-panel">
        {/* toolbar */}
        <div className="nt-toolbar">
          <div className="nt-tabs" role="tablist" aria-label="Notification filters">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`nt-tab${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === 'unread' && unreadCount > 0 && (
                  <span className="nt-tab-badge">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
          <div className="nt-tools">
            <div className="nt-search">
              <IconSearch size={16} />
              <input
                type="text"
                placeholder="Search notifications…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search notifications"
              />
            </div>
            <button className="nt-filter" aria-label="Filter notifications">
              <IconFilter size={16} /> Filter
            </button>
          </div>
        </div>

        {/* feed */}
        {renderFeed()}
      </section>

      <p className="nt-foot">Notifications are kept for 90 days.</p>

      {notice && <div role="alert" className="nt-toast">{notice}</div>}
    </div>
  );
}
