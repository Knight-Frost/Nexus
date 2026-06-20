/**
 * Admin mock data.
 * Extends legacy exports so existing component imports keep working.
 */

import home1 from '@/assets/dashboard/home-1.jpg';
import home2 from '@/assets/dashboard/home-2.jpg';
import home3 from '@/assets/dashboard/home-3.jpg';
import home4 from '@/assets/dashboard/home-4.jpg';
import home5 from '@/assets/dashboard/home-5.jpg';

/* ---- Legacy types (kept for existing component props) -------------------- */

export type Priority = 'high' | 'medium' | 'low';
export type AlertSeverity = 'danger' | 'warning' | 'info';
export type AuditSeverity = 'info' | 'warning' | 'success';
export type AuditCategory = 'auth' | 'contracts' | 'listings' | 'payments';

export interface MetricStat {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  context: string;
  tone: 'brand' | 'success' | 'warning' | 'info';
  sparkPoints: number[];
}

export interface ModQueueItem {
  priority: Priority;
  img: string;
  title: string;
  location: string;
  landlord: string;
  listings: string;
  initials: string;
  submitted: string;
  riskScore: number;
  riskLabel: 'High' | 'Medium' | 'Low';
}

export interface ComplianceCheck {
  label: string;
  detail: string;
  pct: string;
  done: boolean;
}

export interface SystemAlert {
  severity: AlertSeverity;
  title: string;
  detail: string;
  time: string;
}

export interface SlaItem {
  label: string;
  target: string;
  pct: number;
  value: string;
}

export interface AuditEvent {
  time: string;
  category: AuditCategory;
  title: string;
  detail: string;
  ip: string;
  severity: AuditSeverity;
}

export interface LedgerStat {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export interface ContractStage {
  label: string;
  count: string;
  pct: number;
}

/* ---- New admin dashboard data shape ------------------------------------- */

export interface PlatformAlert {
  severity: AlertSeverity;
  title: string;
  detail: string;
  time: string;
}

export interface RecentAuditItem {
  id: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
  action: string;
  subject: string;
  time: string;
}

export interface AdminDashboardData {
  review_queue_count: number;
  verification_queue_count: number;
  ledger_volume_week_cents: number;
  open_disputes_count: number;
  platform_alerts: PlatformAlert[];
  recent_audit: RecentAuditItem[];
  ledger_bars: number[];
  ledger_bar_labels: string[];
  ledger_settlements_cents: number;
  ledger_disputes_held_cents: number;
  ledger_fees_cents: number;
}

/* ---- Legacy array exports (unchanged) ----------------------------------- */

export const METRIC_STATS: MetricStat[] = [
  {
    label: 'Pending reviews',
    value: '24',
    trend: '+18%',
    trendUp: true,
    context: 'from last 7 days',
    tone: 'warning',
    sparkPoints: [8, 10, 9, 12, 11, 14, 13, 15, 14, 18],
  },
  {
    label: 'Active contracts',
    value: '1,248',
    trend: '+9%',
    trendUp: true,
    context: 'from last 7 days',
    tone: 'success',
    sparkPoints: [10, 12, 11, 13, 15, 14, 16, 15, 17, 19],
  },
  {
    label: 'Ledger volume',
    value: 'GH₵2.48M',
    trend: '+12%',
    trendUp: true,
    context: 'vs prior 7 days',
    tone: 'brand',
    sparkPoints: [12, 10, 14, 11, 15, 13, 17, 15, 18, 20],
  },
  {
    label: 'Audit events',
    value: '186',
    trend: '+22%',
    trendUp: true,
    context: 'from last 7 days',
    tone: 'info',
    sparkPoints: [9, 13, 11, 16, 12, 17, 14, 18, 16, 21],
  },
];

export const MOD_QUEUE: ModQueueItem[] = [
  {
    priority: 'high',
    img: home1,
    title: 'Cozy 1BR in East Legon',
    location: 'Accra, Greater Accra',
    landlord: 'Jane Doe',
    listings: '12 listings',
    initials: 'JD',
    submitted: '10 min ago',
    riskScore: 85,
    riskLabel: 'High',
  },
  {
    priority: 'medium',
    img: home2,
    title: 'Modern 2BR in Airport Residential',
    location: 'Accra, Greater Accra',
    landlord: 'Maria Santos',
    listings: '8 listings',
    initials: 'MS',
    submitted: '28 min ago',
    riskScore: 62,
    riskLabel: 'Medium',
  },
  {
    priority: 'low',
    img: home3,
    title: 'Sunny Studio in Labone',
    location: 'Accra, Greater Accra',
    landlord: 'Alex Lee',
    listings: '3 listings',
    initials: 'AL',
    submitted: '1 hr ago',
    riskScore: 25,
    riskLabel: 'Low',
  },
  {
    priority: 'low',
    img: home4,
    title: 'Spacious 3BR with Parking',
    location: 'Tema, Greater Accra',
    landlord: 'Robert Wang',
    listings: '5 listings',
    initials: 'RW',
    submitted: '2 hr ago',
    riskScore: 18,
    riskLabel: 'Low',
  },
  {
    priority: 'medium',
    img: home5,
    title: '1BR Downtown Loft',
    location: 'Kumasi, Ashanti',
    landlord: 'Nicole Garcia',
    listings: '7 listings',
    initials: 'NG',
    submitted: '3 hr ago',
    riskScore: 58,
    riskLabel: 'Medium',
  },
];

export const COMPLIANCE_CHECKS: ComplianceCheck[] = [
  { label: 'Identity verification', detail: 'All new landlords verified', pct: '100%', done: true },
  { label: 'Listing policy', detail: 'No active policy violations', pct: '100%', done: true },
  { label: 'Contract requirements', detail: 'Up to date', pct: '100%', done: true },
  { label: 'Payment reconciliation', detail: 'Minor discrepancies detected', pct: '82%', done: false },
];

export const SYSTEM_ALERTS: SystemAlert[] = [
  { severity: 'danger', title: '3 listings flagged high risk', detail: 'Require immediate review', time: '10m ago' },
  { severity: 'warning', title: 'Payment reconciliation delayed', detail: 'Ledger service latency', time: '28m ago' },
  { severity: 'info', title: 'Platform maintenance scheduled', detail: 'June 19, 2026 2:00 – 4:00 AM GMT', time: '2h ago' },
];

export const SLA_ITEMS: SlaItem[] = [
  { label: 'Review turnaround', target: '< 24h', pct: 78, value: '18.6h' },
  { label: 'Contract processing', target: '< 4h', pct: 52, value: '2.1h' },
  { label: 'Payment settlement', target: '< 48h', pct: 46, value: '22.3h' },
];

export const AUDIT_EVENTS: AuditEvent[] = [
  { time: '10:25 AM', category: 'auth', title: 'User logged in', detail: 'admin@nexus.com', ip: '196.200.1.24', severity: 'info' },
  { time: '10:12 AM', category: 'contracts', title: 'Contract updated', detail: 'CN-2026-7781', ip: '196.200.1.24', severity: 'info' },
  { time: '09:48 AM', category: 'listings', title: 'Listing flagged', detail: 'Cozy 1BR in East Legon', ip: '196.200.1.24', severity: 'warning' },
  { time: '09:32 AM', category: 'payments', title: 'Payment reconciled', detail: 'Batch #PAY-2026-0617-02', ip: '196.200.1.24', severity: 'success' },
  { time: '09:17 AM', category: 'auth', title: 'User role updated', detail: 'jane.doe@nexus.com', ip: '196.200.1.24', severity: 'info' },
  { time: '08:55 AM', category: 'listings', title: 'Listing approved', detail: 'Modern 2BR in Airport Residential', ip: '196.200.1.24', severity: 'success' },
];

export const LEDGER_BARS = [280, 340, 300, 380, 360, 440, 560];
export const LEDGER_BAR_LABELS = ['Jun 11', 'Jun 12', 'Jun 13', 'Jun 14', 'Jun 15', 'Jun 16', 'Jun 17'];

export const LEDGER_STATS: LedgerStat[] = [
  { label: 'Settlements', value: 'GH₵1.72M', change: '↑ 11%', positive: true },
  { label: 'Refunds', value: 'GH₵120K', change: '↑ 4%', positive: false },
  { label: 'Disputes', value: 'GH₵18K', change: '↓ 8%', positive: true },
  { label: 'Fees collected', value: 'GH₵196K', change: '↑ 9%', positive: true },
];

export const CONTRACT_STAGES: ContractStage[] = [
  { label: 'Draft', count: '342', pct: 14 },
  { label: 'Pending signature', count: '286', pct: 11 },
  { label: 'Active', count: '1,248', pct: 50 },
  { label: 'Expiring soon', count: '198', pct: 8 },
  { label: 'Completed', count: '412', pct: 17 },
];

export const CONTRACT_TOTAL = '2,486';

/* ---- New ADMIN_MOCK used by AdminDashboard ------------------------------ */

export const MOCK_ADMIN_DASHBOARD: AdminDashboardData = {
  review_queue_count: 24,
  verification_queue_count: 9,
  ledger_volume_week_cents: 248_000_00, // GH₵248,000
  open_disputes_count: 3,
  platform_alerts: [
    {
      severity: 'danger',
      title: '3 listings flagged high risk',
      detail: 'Require immediate review before going live',
      time: '10m ago',
    },
    {
      severity: 'warning',
      title: 'Payment reconciliation delayed',
      detail: 'Ledger service experiencing elevated latency',
      time: '28m ago',
    },
    {
      severity: 'info',
      title: 'Platform maintenance scheduled',
      detail: 'June 19, 2026 · 2:00 – 4:00 AM GMT',
      time: '2h ago',
    },
  ],
  recent_audit: [
    {
      id: 'a1',
      severity: 'info',
      action: 'User logged in',
      subject: 'admin@nexus.com',
      time: '10:25 AM',
    },
    {
      id: 'a2',
      severity: 'warning',
      action: 'Listing flagged',
      subject: 'Cozy 1BR in East Legon',
      time: '09:48 AM',
    },
    {
      id: 'a3',
      severity: 'success',
      action: 'Payment reconciled',
      subject: 'Batch #PAY-2026-0617-02',
      time: '09:32 AM',
    },
    {
      id: 'a4',
      severity: 'info',
      action: 'Contract updated',
      subject: 'CN-2026-7781',
      time: '09:12 AM',
    },
    {
      id: 'a5',
      severity: 'success',
      action: 'Listing approved',
      subject: 'Modern 2BR in Airport Residential',
      time: '08:55 AM',
    },
  ],
  ledger_bars: [280, 340, 300, 380, 360, 440, 560],
  ledger_bar_labels: ['Jun 11', 'Jun 12', 'Jun 13', 'Jun 14', 'Jun 15', 'Jun 16', 'Jun 17'],
  ledger_settlements_cents: 172_000_00,
  ledger_disputes_held_cents: 1_800_00,
  ledger_fees_cents: 19_600_00,
};
