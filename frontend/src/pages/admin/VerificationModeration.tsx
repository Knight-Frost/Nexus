import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { normalizeError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@/components/ui/Drawer';
import { Field, Textarea } from '@/components/ui/Field';
import { Card, CardBody } from '@/components/ui/Card';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Spinner } from '@/components/ui/Spinner';
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconInfo,
  IconFileText,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/ui/icons';
import {
  SemanticBadge,
  NexusCard,
  CommandCard,
} from '@/components/cards';
import type {
  AdminVerificationRequest,
  AdminVerificationDetail,
  ApiError,
  VerificationStatus,
} from '@/lib/types';

/* ---- Helpers ---------------------------------------------------------------- */

type FilterKey = 'queue' | 'approved' | 'rejected' | 'needs_info' | 'all';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'queue',     label: 'Queue' },
  { key: 'approved',  label: 'Approved' },
  { key: 'rejected',  label: 'Rejected' },
  { key: 'needs_info', label: 'Needs Info' },
  { key: 'all',       label: 'All' },
];

function filterToApiStatus(key: FilterKey): VerificationStatus | undefined {
  switch (key) {
    case 'queue':     return undefined; // fetched as pending + under_review via no filter, we filter client-side
    case 'approved':  return 'verified';
    case 'rejected':  return 'rejected';
    case 'needs_info': return 'needs_more_information';
    case 'all':       return undefined;
  }
}

function verificationStatusBadgeRole(
  status: VerificationStatus,
): 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'pending':                 return 'warning';
    case 'under_review':            return 'info';
    case 'verified':                return 'success';
    case 'rejected':                return 'danger';
    case 'needs_more_information':  return 'warning';
    default:                        return 'neutral';
  }
}

function verificationStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case 'pending':                 return 'Pending';
    case 'under_review':            return 'Under review';
    case 'verified':                return 'Approved';
    case 'rejected':                return 'Rejected';
    case 'needs_more_information':  return 'Needs info';
    case 'unverified':              return 'Unverified';
    default:                        return status;
  }
}

function documentTypeLabel(type: string): string {
  switch (type) {
    case 'identity_document':       return 'Identity Document';
    case 'proof_of_income':         return 'Proof of Income';
    case 'lease_document':          return 'Lease Document';
    case 'application_attachment':  return 'Application Attachment';
    case 'maintenance_attachment':  return 'Maintenance Attachment';
    case 'other':                   return 'Other';
    default:                        return type;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isQueueStatus(status: VerificationStatus): boolean {
  return status === 'pending' || status === 'under_review';
}

/* ---- Action modal types ----------------------------------------------------- */

type ActionKind = 'approve' | 'reject' | 'request_info';

interface ActionModalState {
  kind: ActionKind;
  id: string;
  userName: string;
}

/* ---- Action modal ----------------------------------------------------------- */

function ActionModal({
  state,
  onClose,
  onDone,
}: {
  state: ActionModalState;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const { kind, id, userName } = state;
  const isApprove = kind === 'approve';
  const isReject = kind === 'reject';

  const title = isApprove
    ? 'Approve verification'
    : isReject
    ? 'Reject verification'
    : 'Request more information';

  const description = isApprove
    ? `Approve ${userName}'s identity verification request.`
    : isReject
    ? `Tell ${userName} why their request was rejected.`
    : `Ask ${userName} to provide additional information.`;

  const fieldLabel = isApprove
    ? 'Reason (optional)'
    : isReject
    ? 'Reason for rejection'
    : 'Note to applicant';

  const required = !isApprove;

  async function handleSubmit() {
    const trimmed = text.trim();
    if (required && trimmed.length < 5) {
      setFieldError('Please provide at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setFieldError(undefined);
    try {
      if (isApprove) {
        await adminApi.approveVerification(id, trimmed || undefined);
        toast(`${userName}'s verification approved.`, 'success');
      } else if (isReject) {
        await adminApi.rejectVerification(id, trimmed);
        toast(`${userName}'s verification rejected.`, 'success');
      } else {
        await adminApi.requestInfoVerification(id, trimmed);
        toast(`Information request sent to ${userName}.`, 'success');
      }
      onDone();
    } catch (err) {
      const e = normalizeError(err) as ApiError;
      toast(e.message || 'Action failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={isReject ? 'danger' : 'primary'}
            onClick={handleSubmit}
            loading={submitting}
          >
            {isApprove ? 'Approve' : isReject ? 'Reject' : 'Send request'}
          </Button>
        </>
      }
    >
      <Field label={fieldLabel} required={required} error={fieldError}>
        {(id, invalid) => (
          <Textarea
            id={id}
            invalid={invalid}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (fieldError) setFieldError(undefined);
            }}
            placeholder={
              isApprove
                ? 'Optionally note why this was approved…'
                : isReject
                ? 'Explain what was wrong with the submission…'
                : 'Describe what additional documents or information are needed…'
            }
            autoFocus
          />
        )}
      </Field>
    </Modal>
  );
}

/* ---- Detail drawer inner (child component so useApi runs conditionally) ----- */

function VerificationDetailDrawer({
  id,
  onClose,
  onAction,
}: {
  id: string;
  onClose: () => void;
  onAction: (kind: ActionKind) => void;
}) {
  const { data, loading, error, reload } = useApi<AdminVerificationDetail>(
    () => adminApi.verification(id),
    [id],
  );
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const vr = data;
  const user = vr?.user;
  const userName = user?.full_name ?? `User #${vr?.user_id ?? id}`;

  async function downloadDoc(docId: number, filename: string) {
    setDownloadingId(docId);
    try {
      await adminApi.downloadDocument(docId, filename);
    } catch (err) {
      const e = normalizeError(err) as ApiError;
      toast(e.message || 'Could not download this document.', 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <DrawerHeader
        title={loading ? 'Verification Request' : userName}
        description={
          vr
            ? `Submitted ${vr.submitted_at ? formatDate(vr.submitted_at) : formatDate(vr.created_at)}`
            : undefined
        }
        onClose={onClose}
      />
      <DrawerBody>
        {loading ? (
          <LoadingState label="Loading request…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : vr ? (
          <div className="space-y-6">
            {/* Applicant info */}
            <section>
              <h3 className="eyebrow text-ink-400 mb-3">Applicant</h3>
              <NexusCard role="neutral" className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-semibold text-ink-900">
                    {userName}
                  </span>
                  <SemanticBadge role={user?.user_type === 'landlord' ? 'info' : 'neutral'} dot={false}>
                    {user?.user_type === 'landlord' ? 'Landlord' : 'Tenant'}
                  </SemanticBadge>
                </div>
                {user?.email && (
                  <p className="text-sm text-ink-600">{user.email}</p>
                )}
                {user?.phone && (
                  <p className="text-sm text-ink-500">{user.phone}</p>
                )}
              </NexusCard>
            </section>

            {/* Status */}
            <section>
              <h3 className="eyebrow text-ink-400 mb-3">Status</h3>
              <div className="flex items-center gap-3">
                <SemanticBadge
                  role={verificationStatusBadgeRole(vr.status as VerificationStatus)}
                  dot={false}
                >
                  {verificationStatusLabel(vr.status as VerificationStatus)}
                </SemanticBadge>
                {vr.reviewed_at && (
                  <span className="text-xs text-ink-500">
                    Reviewed {formatDate(vr.reviewed_at)}
                    {vr.reviewer ? ` by ${vr.reviewer.name}` : ''}
                  </span>
                )}
              </div>
              {vr.decision_reason && (
                <p className="mt-2 text-sm text-ink-600 rounded-lg border border-ink-200 bg-ink-50/50 px-3 py-2">
                  <span className="font-medium text-ink-700">Decision note: </span>
                  {vr.decision_reason}
                </p>
              )}
            </section>

            {/* Applicant note */}
            {vr.note && (
              <section>
                <h3 className="eyebrow text-ink-400 mb-3">Note from applicant</h3>
                <p className="text-sm text-ink-700 rounded-lg border border-ink-200 bg-ink-50/50 px-3 py-2">
                  {vr.note}
                </p>
              </section>
            )}

            {/* Documents — streamed via the admin-gated, audited download route */}
            <section>
              <h3 className="eyebrow text-ink-400 mb-3">Documents</h3>
              {!vr.documents || vr.documents.length === 0 ? (
                <p className="text-sm text-ink-500 rounded-lg border border-dashed border-ink-200 px-4 py-4 text-center">
                  No documents attached to this request.
                </p>
              ) : (
                <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200">
                  {vr.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                      <IconFileText size={18} className="shrink-0 text-ink-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {doc.original_filename}
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          {documentTypeLabel(doc.document_type)}
                          {' · '}
                          {doc.mime_type}
                          {' · '}
                          {formatBytes(doc.size_bytes)}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={
                          downloadingId === doc.id ? (
                            <Spinner size={14} />
                          ) : (
                            <IconDownload size={14} />
                          )
                        }
                        disabled={downloadingId !== null}
                        onClick={() => downloadDoc(doc.id, doc.original_filename)}
                      >
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </DrawerBody>

      {/* Footer: action buttons (only for actionable statuses) */}
      {vr && isQueueStatus(vr.status as VerificationStatus) && (
        <DrawerFooter>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              leftIcon={<IconInfo size={14} />}
              onClick={() => onAction('request_info')}
            >
              Request Info
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              leftIcon={<IconX size={14} />}
              onClick={() => onAction('reject')}
            >
              Reject
            </Button>
            <Button
              leftIcon={<IconCheck size={14} />}
              onClick={() => onAction('approve')}
            >
              Approve
            </Button>
          </div>
        </DrawerFooter>
      )}
    </>
  );
}

/* ---- Main page -------------------------------------------------------------- */

export function VerificationModeration() {
  const [filter, setFilter] = useState<FilterKey>('queue');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionModalState | null>(null);

  // For 'queue' filter we pull the full pending list; for others we send the
  // matching status param. The API returns paginated results either way.
  const apiStatus = filter === 'queue' ? undefined : filterToApiStatus(filter);
  const apiParams = { status: apiStatus, page };

  const { data, loading, error, reload } = useApi(
    () => adminApi.verifications(apiParams),
    [filter, page],
  );

  const items = (data?.data ?? []).filter((v) => {
    if (filter === 'queue') return isQueueStatus(v.status as VerificationStatus);
    return true;
  });

  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  const queueCount = filter === 'queue' ? items.length : undefined;

  function openDrawer(id: string) {
    setSelectedId(id);
  }

  function closeDrawer() {
    setSelectedId(null);
    setPendingAction(null);
  }

  function handleAction(kind: ActionKind) {
    if (!selectedId) return;
    const vr = data?.data.find((v) => v.id === selectedId);
    const userName = vr?.user?.full_name ?? `User #${vr?.user_id ?? selectedId}`;
    setPendingAction({ kind, id: selectedId, userName });
  }

  function afterAction() {
    setPendingAction(null);
    setSelectedId(null);
    reload();
  }

  function changeFilter(key: FilterKey) {
    setFilter(key);
    setPage(1);
  }

  const drawerOpen = selectedId !== null && pendingAction === null;

  return (
    <div className="animate-rise space-y-8">
      <PageHeader
        eyebrow="Platform"
        title="Identity Verification"
        description="Review and action verification requests from tenants and landlords."
      />

      {/* Queue size callout */}
      {!loading && !error && filter === 'queue' && queueCount !== undefined && queueCount > 0 && (
        <CommandCard
          role="warning"
          label="Requests awaiting review"
          value={String(queueCount)}
          sub={
            queueCount === 1
              ? 'One request needs your decision'
              : `${queueCount} requests need your decision`
          }
          icon={<IconAlertTriangle size={20} />}
        />
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex gap-0 border-b border-ink-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => changeFilter(tab.key)}
            aria-selected={filter === tab.key}
            className={[
              'inline-flex items-center gap-2 mr-6 py-2.5 px-1 text-sm font-medium border-b-2 -mb-px transition-colors',
              filter === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState label="Loading verification requests…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconCircleCheck />}
          title="Nothing here"
          description={
            filter === 'queue'
              ? 'No verification requests awaiting review.'
              : 'No requests match this filter.'
          }
        />
      ) : (
        <>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Applicant</TH>
                    <TH>Role</TH>
                    <TH>Submitted</TH>
                    <TH>Status</TH>
                    <TH>{/* actions */}</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((vr: AdminVerificationRequest) => {
                    const userName = vr.user?.full_name ?? `User #${vr.user_id}`;
                    return (
                      <TR key={vr.id}>
                        <TD first>
                          <div>
                            <p className="font-medium text-ink-900">{userName}</p>
                            {vr.user?.email && (
                              <p className="text-xs text-ink-500">{vr.user.email}</p>
                            )}
                          </div>
                        </TD>
                        <TD>
                          <SemanticBadge
                            role={vr.user?.user_type === 'landlord' ? 'info' : 'neutral'}
                            dot={false}
                          >
                            {vr.user?.user_type === 'landlord' ? 'Landlord' : 'Tenant'}
                          </SemanticBadge>
                        </TD>
                        <TD className="whitespace-nowrap text-xs text-ink-500">
                          {vr.submitted_at ? formatDate(vr.submitted_at) : formatDate(vr.created_at)}
                        </TD>
                        <TD>
                          <SemanticBadge
                            role={verificationStatusBadgeRole(vr.status as VerificationStatus)}
                            dot={false}
                          >
                            {verificationStatusLabel(vr.status as VerificationStatus)}
                          </SemanticBadge>
                        </TD>
                        <TD>
                          <div className="flex justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openDrawer(vr.id)}
                            >
                              Review
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-ink-500">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size={14} /> Loading…
                </span>
              ) : (
                `${total} ${total === 1 ? 'request' : 'requests'} total`
              )}
            </p>
            {lastPage > 1 && (
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1 || loading}
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
                  disabled={currentPage >= lastPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                  leftIcon={<IconChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Drawer — mounted only when a row is selected and no modal is open */}
      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => { if (!open) closeDrawer(); }}
        widthClass="sm:max-w-[700px]"
        blockInteractions={pendingAction !== null}
      >
        {selectedId && (
          <VerificationDetailDrawer
            id={selectedId}
            onClose={closeDrawer}
            onAction={handleAction}
          />
        )}
      </Drawer>

      {/* Action modal */}
      {pendingAction && (
        <ActionModal
          state={pendingAction}
          onClose={() => setPendingAction(null)}
          onDone={afterAction}
        />
      )}
    </div>
  );
}
