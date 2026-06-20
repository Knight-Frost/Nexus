import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/states';
import {
  IconWrench,
  IconPlus,
  IconAlertTriangle,
  IconClock,
  IconCheckCircle,
  IconMapPin,
  IconCalendar,
} from '@/components/ui/icons';
import { formatDate } from '@/lib/format';
import type { Tone } from '@/components/ui/Badge';

/* ---- Mock data ----------------------------------------------------------- */
type Priority  = 'urgent' | 'normal' | 'low';
type ReqStatus = 'open' | 'in_progress' | 'resolved';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  unit: string;
  property: string;
  priority: Priority;
  status: ReqStatus;
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}

const MOCK_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'mr-001',
    title: 'Air conditioning not cooling',
    description: 'The AC unit in the master bedroom has stopped cooling. The fan runs but does not produce cold air.',
    unit: 'Unit 3A',
    property: 'Cantonments Residence',
    priority: 'urgent',
    status: 'in_progress',
    createdAt: '2026-06-10T08:30:00Z',
    assignedTo: 'KingTech HVAC Services',
  },
  {
    id: 'mr-002',
    title: 'Leaking kitchen tap',
    description: 'The kitchen sink tap is dripping constantly. The drip rate has increased over the past week.',
    unit: 'Unit 3A',
    property: 'Cantonments Residence',
    priority: 'normal',
    status: 'open',
    createdAt: '2026-06-15T14:00:00Z',
  },
  {
    id: 'mr-003',
    title: 'Broken bathroom light fixture',
    description: 'The ceiling light in the second bathroom flickers and sometimes goes out entirely.',
    unit: 'Unit 3A',
    property: 'Cantonments Residence',
    priority: 'low',
    status: 'resolved',
    createdAt: '2026-05-28T10:15:00Z',
    resolvedAt: '2026-06-02T16:30:00Z',
    assignedTo: 'Bright Electricals Ltd',
  },
];

/* ---- Helpers ------------------------------------------------------------- */
function priorityTone(priority: Priority): Tone {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'normal': return 'warning';
    case 'low':    return 'neutral';
  }
}

function priorityLabel(priority: Priority): string {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'normal': return 'Normal';
    case 'low':    return 'Low';
  }
}

function statusTone(status: ReqStatus): Tone {
  switch (status) {
    case 'resolved':    return 'success';
    case 'in_progress': return 'warning';
    case 'open':        return 'neutral';
  }
}

function statusLabel(status: ReqStatus): string {
  switch (status) {
    case 'resolved':    return 'Resolved';
    case 'in_progress': return 'In Progress';
    case 'open':        return 'Open';
  }
}

function statusIcon(status: ReqStatus) {
  switch (status) {
    case 'resolved':    return <IconCheckCircle size={15} />;
    case 'in_progress': return <IconClock size={15} />;
    case 'open':        return <IconAlertTriangle size={15} />;
  }
}

/* ---- New Request Form ---------------------------------------------------- */
interface NewRequestForm {
  title: string;
  description: string;
  priority: Priority;
  unit: string;
}

const EMPTY_FORM: NewRequestForm = {
  title: '',
  description: '',
  priority: 'normal',
  unit: '',
};

interface NewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: NewRequestForm) => void;
}

function NewRequestModal({ open, onClose, onSubmit }: NewRequestModalProps) {
  const [form, setForm] = useState<NewRequestForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof NewRequestForm>(key: K, value: NewRequestForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    // Simulate network call
    await new Promise((r) => setTimeout(r, 600));
    onSubmit(form);
    setForm(EMPTY_FORM);
    setSubmitting(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Maintenance Request"
      description="Describe the issue and we'll notify your landlord immediately."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="maintenance-form"
            loading={submitting}
            leftIcon={<IconPlus size={15} />}
          >
            Submit Request
          </Button>
        </>
      }
    >
      <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Issue title" required>
          {(id, invalid) => (
            <Input
              id={id}
              invalid={invalid}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Air conditioning not cooling"
              required
            />
          )}
        </Field>

        <Field label="Description" required>
          {(id, invalid) => (
            <Textarea
              id={id}
              invalid={invalid}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Please describe the issue in detail — when it started, how severe it is, and anything you've tried..."
              rows={4}
              required
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Unit / Location">
            {(id) => (
              <Input
                id={id}
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="e.g. Unit 3A, Kitchen"
              />
            )}
          </Field>

          <Field label="Priority" required>
            {(id) => (
              <Select
                id={id}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as Priority)}
              >
                <option value="urgent">Urgent — needs immediate attention</option>
                <option value="normal">Normal — please fix soon</option>
                <option value="low">Low — whenever convenient</option>
              </Select>
            )}
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ---- Request Card -------------------------------------------------------- */
function RequestCard({ request }: { request: MaintenanceRequest }) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-semibold text-ink-900">
                {request.title}
              </h3>
              <Badge tone={priorityTone(request.priority)}>
                {priorityLabel(request.priority)}
              </Badge>
            </div>

            <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">
              {request.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
              <span className="flex items-center gap-1">
                <IconMapPin size={12} />
                {request.unit} · {request.property}
              </span>
              <span className="flex items-center gap-1">
                <IconCalendar size={12} />
                Submitted {formatDate(request.createdAt)}
              </span>
              {request.resolvedAt && (
                <span className="flex items-center gap-1 text-success-600">
                  <IconCheckCircle size={12} />
                  Resolved {formatDate(request.resolvedAt)}
                </span>
              )}
              {request.assignedTo && (
                <span className="text-ink-400">Assigned to: {request.assignedTo}</span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge tone={statusTone(request.status)} dot={false}>
              <span className="flex items-center gap-1">
                {statusIcon(request.status)}
                {statusLabel(request.status)}
              </span>
            </Badge>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ---- Page ---------------------------------------------------------------- */
export function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(MOCK_REQUESTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const openCount      = requests.filter((r) => r.status === 'open').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const resolvedCount  = requests.filter((r) => r.status === 'resolved').length;

  function handleSubmit(form: NewRequestForm) {
    const newRequest: MaintenanceRequest = {
      id: `mr-${Date.now()}`,
      title: form.title,
      description: form.description,
      unit: form.unit || 'Unit 3A',
      property: 'Cantonments Residence',
      priority: form.priority,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    setModalOpen(false);
    setSuccessBanner(true);
    setTimeout(() => setSuccessBanner(false), 4000);
  }

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="My Rental"
        title="Maintenance"
        description="Report and track maintenance requests for your unit."
        action={
          <Button
            leftIcon={<IconPlus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            New Request
          </Button>
        }
      />

      {/* Success banner */}
      {successBanner && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-50 px-4 py-3 text-sm text-success-700"
        >
          <IconCheckCircle size={18} className="shrink-0 text-success-600" />
          <span>
            Your maintenance request has been submitted. Your landlord will be notified.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Open"
          value={openCount}
          icon={<IconAlertTriangle size={18} />}
          tone={openCount > 0 ? 'warning' : 'default'}
          subtext="awaiting action"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={<IconClock size={18} />}
          tone={inProgressCount > 0 ? 'info' : 'default'}
          subtext="being fixed"
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={<IconCheckCircle size={18} />}
          tone="success"
          subtext="completed"
        />
      </div>

      {/* Requests list */}
      {requests.length === 0 ? (
        <EmptyState
          icon={<IconWrench size={28} />}
          title="No maintenance requests"
          description="Report an issue with your unit and we'll get it sorted as quickly as possible."
          action={
            <Button
              leftIcon={<IconPlus size={16} />}
              onClick={() => setModalOpen(true)}
            >
              Report an issue
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Active requests */}
          {requests.filter((r) => r.status !== 'resolved').length > 0 && (
            <div className="space-y-3">
              <Card>
                <CardHeader
                  title="Active Requests"
                  description="Open and in-progress issues for your unit."
                />
              </Card>
              {requests
                .filter((r) => r.status !== 'resolved')
                .map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
            </div>
          )}

          {/* Resolved requests */}
          {requests.filter((r) => r.status === 'resolved').length > 0 && (
            <div className="space-y-3">
              <Card>
                <CardHeader
                  title="Resolved"
                  description="Previously completed maintenance work."
                />
              </Card>
              {requests
                .filter((r) => r.status === 'resolved')
                .map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
            </div>
          )}
        </div>
      )}

      <NewRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
