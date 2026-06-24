/**
 * VerificationCenter — tenant identity verification status + document upload + submit.
 *
 * Truth contract:
 * - GET /tenant/verification → current status + latest_request
 * - POST /tenant/documents   → upload identity_document (multipart)
 * - POST /tenant/verification/submit → submit for review (requires ≥1 identity_document)
 * - GET /tenant/documents    → list uploaded docs (to show what's already there)
 *
 * No fake data, no dead buttons. Every action calls a real endpoint.
 */
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { SemanticBadge } from '@/components/cards';
import {
  IconCheckCircle,
  IconClock,
  IconShield,
  IconUpload,
  IconDoc,
  IconXCircle,
  IconFolder,
} from '@/components/ui/icons';
import type {
  VerificationStatus,
  VerificationStatusResponse,
  TenantDocument,
} from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const STATUS_COPY: Record<
  VerificationStatus,
  { label: string; role: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; headline: string; sub: string }
> = {
  unverified: {
    label: 'Not submitted',
    role: 'neutral',
    headline: 'Get verified to unlock the full platform',
    sub: 'Upload a government-issued identity document, then submit your request. Admin review usually takes 1–2 business days.',
  },
  pending: {
    label: 'Pending',
    role: 'info',
    headline: 'Your request is queued',
    sub: 'We\'ve received your submission. An admin will begin review shortly.',
  },
  under_review: {
    label: 'Under review',
    role: 'warning',
    headline: 'Your identity is being reviewed',
    sub: 'An admin is reviewing your documents. You\'ll be notified when a decision is made.',
  },
  verified: {
    label: 'Verified',
    role: 'success',
    headline: 'Your identity is verified',
    sub: 'You have full access to the Nexus platform.',
  },
  rejected: {
    label: 'Rejected',
    role: 'danger',
    headline: 'Verification was not approved',
    sub: 'Your request was rejected. Please review the reason below, upload updated documents, and resubmit.',
  },
  needs_more_information: {
    label: 'More info needed',
    role: 'warning',
    headline: 'Additional information required',
    sub: 'The review team needs more from you. Review the note below, upload updated documents, and resubmit.',
  },
};

function statusRole(s: VerificationStatus | null): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (!s) return 'neutral';
  return STATUS_COPY[s]?.role ?? 'neutral';
}

function canResubmit(s: VerificationStatus | null): boolean {
  return s === 'unverified' || s === 'rejected' || s === 'needs_more_information';
}

function isPending(s: VerificationStatus | null): boolean {
  return s === 'pending' || s === 'under_review';
}

/* ── Document uploader ───────────────────────────────────────────────────── */

function DocumentUploader({
  onUploaded,
}: {
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (uploading) return;
    // Accept images + pdf
    const ok = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!ok) {
      toast('Please upload a PDF or image file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Maximum file size is 10 MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      await tenantApi.uploadDocument(file, 'identity_document');
      toast(`Document uploaded: ${file.name}`, 'success');
      onUploaded();
    } catch {
      toast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div
      className={`vc-uploader${dragOver ? ' drag-over' : ''}${uploading ? ' uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload identity document"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        style={{ display: 'none' }}
        onChange={onInputChange}
        disabled={uploading}
      />
      <span className="vc-uploader-icon">
        {uploading
          ? <span className="vc-spinner" aria-label="Uploading…" />
          : <IconUpload size={22} />
        }
      </span>
      <span className="vc-uploader-label">
        {uploading ? 'Uploading…' : 'Upload identity document'}
      </span>
      <span className="vc-uploader-hint">PDF or image · max 10 MB · drag or click</span>
    </div>
  );
}

/* ── Uploaded documents list ─────────────────────────────────────────────── */

function UploadedDocsList({ docs }: { docs: TenantDocument[] }) {
  const idDocs = docs.filter((d) => d.document_type === 'identity_document');
  if (idDocs.length === 0) return null;

  return (
    <div className="vc-docs-list">
      <p className="vc-docs-label">Uploaded identity documents</p>
      {idDocs.map((doc) => (
        <div key={doc.id} className="vc-doc-row">
          <span className="vc-doc-icon"><IconDoc size={16} /></span>
          <div className="vc-doc-info">
            <span className="vc-doc-name">{doc.original_filename}</span>
            <span className="vc-doc-meta">{formatDate(doc.created_at)}</span>
          </div>
          <SemanticBadge role={doc.is_verified ? 'success' : 'neutral'} size="sm">
            {doc.is_verified ? 'Verified' : 'Uploaded'}
          </SemanticBadge>
        </div>
      ))}
    </div>
  );
}

/* ── Status hero ─────────────────────────────────────────────────────────── */

function StatusHero({ status }: { status: VerificationStatusResponse }) {
  const vs = (status.verification_status ?? 'unverified') as VerificationStatus;
  const copy = STATUS_COPY[vs];
  const role = statusRole(vs);

  const IconMap: Record<string, React.ReactNode> = {
    verified:              <IconCheckCircle size={28} />,
    pending:               <IconClock size={28} />,
    under_review:          <IconClock size={28} />,
    rejected:              <IconXCircle size={28} />,
    needs_more_information:<IconShield size={28} />,
    unverified:            <IconShield size={28} />,
  };

  return (
    <div className={`vc-hero vc-hero--${role}`}>
      <div className="vc-hero-icon">{IconMap[vs]}</div>
      <div className="vc-hero-body">
        <div className="vc-hero-top">
          <h2 className="vc-hero-title">{copy.headline}</h2>
          <SemanticBadge role={role}>{copy.label}</SemanticBadge>
        </div>
        <p className="vc-hero-sub">{copy.sub}</p>
        {status.latest_request?.decision_reason && (vs === 'rejected' || vs === 'needs_more_information') && (
          <div className="vc-reason">
            <span className="vc-reason-label">Reviewer note:</span>
            <span className="vc-reason-text">{status.latest_request.decision_reason}</span>
          </div>
        )}
        {status.latest_request?.submitted_at && (
          <p className="vc-hero-meta">
            Submitted {formatDate(status.latest_request.submitted_at)}
            {status.latest_request.reviewed_at && ` · Reviewed ${formatDate(status.latest_request.reviewed_at)}`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Submit section ──────────────────────────────────────────────────────── */

function SubmitSection({
  status,
  hasIdDoc,
  onSubmitted,
}: {
  status: VerificationStatusResponse;
  hasIdDoc: boolean;
  onSubmitted: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const vs = (status.verification_status ?? 'unverified') as VerificationStatus;

  if (!canResubmit(vs)) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !hasIdDoc) return;
    setSubmitting(true);
    try {
      await tenantApi.submitVerification(note || undefined);
      toast('Verification request submitted — pending review.', 'success');
      onSubmitted();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Could not submit. Please try again.';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="vc-submit-section" onSubmit={handleSubmit}>
      <h3 className="vc-section-title">Submit for review</h3>
      {!hasIdDoc && (
        <div className="vc-requirement-alert">
          You must upload at least one identity document above before submitting.
        </div>
      )}
      <label className="vc-field-label" htmlFor="vc-note">
        Optional note to reviewer
      </label>
      <textarea
        id="vc-note"
        className="vc-textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything the reviewer should know…"
        maxLength={1000}
        rows={3}
        disabled={submitting}
      />
      <button
        type="submit"
        className="vc-submit-btn"
        disabled={!hasIdDoc || submitting}
        aria-disabled={!hasIdDoc || submitting}
      >
        {submitting ? 'Submitting…' : 'Submit for verification'}
      </button>
    </form>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export function VerificationCenter() {
  const { data: status, loading: statusLoading, error: statusError, reload: reloadStatus } = useApi(
    () => tenantApi.verificationStatus(),
    [],
  );

  const [docsNonce, setDocsNonce] = useState(0);
  const reloadDocs = useCallback(() => setDocsNonce((n) => n + 1), []);

  const { data: docs, loading: docsLoading, error: docsError } = useApi(
    () => tenantApi.documents(),
    [docsNonce],
  );

  function handleUploaded() {
    reloadDocs();
  }

  function handleSubmitted() {
    reloadStatus();
    reloadDocs();
  }

  const hasIdDoc = (docs ?? []).some((d) => d.document_type === 'identity_document');
  const vs = status?.verification_status ?? 'unverified';
  const showUploader = canResubmit(vs as VerificationStatus);
  const showPendingNote = isPending(vs as VerificationStatus);

  return (
    <div className="vc-page">
      <style>{VC_CSS}</style>

      {/* Page header */}
      <div className="vc-page-header">
        <h1 className="vc-page-title">Identity Verification</h1>
        <p className="vc-page-desc">
          Verified tenants get priority access to listings and faster application decisions.
        </p>
      </div>

      {statusLoading && <LoadingState label="Loading verification status…" />}
      {statusError && <ErrorState message={statusError.message} onRetry={reloadStatus} />}

      {status && !statusLoading && (
        <>
          <StatusHero status={status} />

          {/* Documents section */}
          <div className="vc-section">
            <h3 className="vc-section-title">Identity documents</h3>
            <p className="vc-section-desc">
              Upload a government-issued ID (passport, national ID, or driver's licence).
              Supported formats: PDF, JPG, PNG.
            </p>

            {showUploader && <DocumentUploader onUploaded={handleUploaded} />}

            {docsLoading && <LoadingState label="Loading documents…" className="vc-docs-loading" />}
            {docsError && <ErrorState message={docsError.message} onRetry={reloadDocs} />}
            {docs && !docsLoading && (
              docs.filter((d) => d.document_type === 'identity_document').length === 0
                ? (
                  <EmptyState
                    icon={<IconFolder size={22} />}
                    title="No identity documents yet"
                    description="Upload a government ID to get started."
                    className="vc-empty"
                  />
                )
                : <UploadedDocsList docs={docs} />
            )}
          </div>

          {showPendingNote && (
            <div className="vc-pending-notice">
              Your request is in the queue — no action needed right now.
              We'll notify you when the review is complete.
            </div>
          )}

          <SubmitSection
            status={status}
            hasIdDoc={hasIdDoc}
            onSubmitted={handleSubmitted}
          />

          {vs === 'verified' && (
            <div className="vc-verified-cta">
              <IconCheckCircle size={20} />
              <span>Ready to find a home?</span>
              <Link to="/app/browse" className="vc-link">Browse listings</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Scoped styles ───────────────────────────────────────────────────────── */

const VC_CSS = `
.vc-page {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vc-page-header { display: flex; flex-direction: column; gap: 6px; }
.vc-page-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-ink-950, #0C0A09);
  line-height: 1.15;
}
.vc-page-desc { font-size: 0.9375rem; color: var(--color-ink-500, #6B7280); }

/* Hero */
.vc-hero {
  border-radius: 16px;
  border: 1.5px solid var(--color-ink-200, #E5E7EB);
  background: var(--color-surface, #FFFFFF);
  padding: 24px;
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.vc-hero--success { border-color: var(--color-success-200, #BBF7D0); background: var(--color-success-50, #F0FFF4); }
.vc-hero--danger  { border-color: var(--color-danger-200, #FCA5A5); background: var(--color-danger-50, #FFF5F5); }
.vc-hero--warning { border-color: var(--color-warning-200, #FDE68A); background: var(--color-warning-50, #FFFBEB); }
.vc-hero--info    { border-color: var(--color-brand-200, #A7D8D4); background: var(--color-brand-50, #F0F9FF); }

.vc-hero-icon {
  flex: 0 0 auto;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--color-ink-100, #F3F4F6);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-ink-600, #4B5563);
}
.vc-hero--success .vc-hero-icon { background: var(--color-success-100, #D1FAE5); color: var(--color-success-600, #059669); }
.vc-hero--danger  .vc-hero-icon { background: var(--color-danger-100, #FEE2E2); color: var(--color-danger-600, #DC2626); }
.vc-hero--warning .vc-hero-icon { background: var(--color-warning-100, #FEF3C7); color: var(--color-warning-600, #D97706); }
.vc-hero--info    .vc-hero-icon { background: var(--color-brand-100, #CFFAFE); color: var(--color-brand-600, #0E7490); }

.vc-hero-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.vc-hero-top  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vc-hero-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.1875rem;
  font-weight: 600;
  color: var(--color-ink-900, #111827);
  flex: 1;
}
.vc-hero-sub  { font-size: 0.9rem; color: var(--color-ink-600, #4B5563); line-height: 1.55; }
.vc-hero-meta { font-size: 0.8125rem; color: var(--color-ink-400, #9CA3AF); }
.vc-reason {
  background: var(--color-ink-50, #F9FAFB);
  border-left: 3px solid var(--color-danger-400, #F87171);
  border-radius: 4px 8px 8px 4px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vc-reason-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-ink-500, #6B7280); }
.vc-reason-text  { font-size: 0.9rem; color: var(--color-ink-800, #1F2937); }

/* Section */
.vc-section {
  border-radius: 16px;
  border: 1px solid var(--color-ink-200, #E5E7EB);
  background: var(--color-surface, #FFFFFF);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.vc-section-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-ink-900, #111827);
}
.vc-section-desc { font-size: 0.875rem; color: var(--color-ink-500, #6B7280); line-height: 1.5; margin-top: -8px; }

/* Uploader */
.vc-uploader {
  border: 2px dashed var(--color-ink-300, #D1D5DB);
  border-radius: 12px;
  background: var(--color-ink-50, #F9FAFB);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
  outline: none;
}
.vc-uploader:focus-visible { outline: 2px solid var(--color-brand-500, #0EA5E9); outline-offset: 2px; }
.vc-uploader:hover, .vc-uploader.drag-over {
  border-color: var(--color-brand-500, #0EA5E9);
  background: var(--color-brand-50, #F0F9FF);
}
.vc-uploader.uploading { opacity: 0.6; cursor: not-allowed; }
.vc-uploader-icon { color: var(--color-brand-600, #0284C7); }
.vc-uploader-label { font-size: 0.9375rem; font-weight: 600; color: var(--color-ink-800, #1F2937); }
.vc-uploader-hint { font-size: 0.8125rem; color: var(--color-ink-400, #9CA3AF); }

.vc-spinner {
  display: inline-block;
  width: 22px; height: 22px;
  border: 2.5px solid var(--color-brand-200, #BAE6FD);
  border-top-color: var(--color-brand-600, #0284C7);
  border-radius: 50%;
  animation: vc-spin 0.75s linear infinite;
}
@keyframes vc-spin { to { transform: rotate(360deg); } }

/* Docs list */
.vc-docs-label { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-ink-400, #9CA3AF); }
.vc-doc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--color-ink-50, #F9FAFB);
  border: 1px solid var(--color-ink-200, #E5E7EB);
}
.vc-doc-icon { color: var(--color-ink-400, #9CA3AF); flex: 0 0 auto; }
.vc-doc-info { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.vc-doc-name { font-size: 0.875rem; font-weight: 500; color: var(--color-ink-800, #1F2937); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vc-doc-meta { font-size: 0.75rem; color: var(--color-ink-400, #9CA3AF); }
.vc-docs-list { display: flex; flex-direction: column; gap: 8px; }
.vc-docs-loading { padding: 12px 0; }
.vc-empty { margin-top: 4px; }

/* Requirement alert */
.vc-requirement-alert {
  background: var(--color-warning-50, #FFFBEB);
  border: 1px solid var(--color-warning-200, #FDE68A);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--color-warning-800, #92400E);
}

/* Pending notice */
.vc-pending-notice {
  background: var(--color-brand-50, #F0F9FF);
  border: 1px solid var(--color-brand-200, #BAE6FD);
  border-radius: 12px;
  padding: 16px 20px;
  font-size: 0.9rem;
  color: var(--color-brand-800, #075985);
  line-height: 1.55;
}

/* Submit section */
.vc-submit-section {
  border-radius: 16px;
  border: 1px solid var(--color-ink-200, #E5E7EB);
  background: var(--color-surface, #FFFFFF);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vc-field-label { font-size: 0.875rem; font-weight: 500; color: var(--color-ink-700, #374151); }
.vc-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1.5px solid var(--color-ink-200, #E5E7EB);
  background: var(--color-ink-50, #F9FAFB);
  padding: 10px 14px;
  font-size: 0.9375rem;
  color: var(--color-ink-800, #1F2937);
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.vc-textarea:focus { outline: none; border-color: var(--color-brand-500, #0EA5E9); }
.vc-submit-btn {
  align-self: flex-start;
  padding: 11px 24px;
  border-radius: 10px;
  background: var(--color-brand-600, #0284C7);
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.vc-submit-btn:hover:not(:disabled) { background: var(--color-brand-700, #0369A1); }
.vc-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.vc-submit-btn:focus-visible { outline: 2px solid var(--color-brand-500, #0EA5E9); outline-offset: 2px; }

/* Verified CTA */
.vc-verified-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--color-success-50, #F0FFF4);
  border: 1px solid var(--color-success-200, #BBF7D0);
  font-size: 0.9rem;
  color: var(--color-success-800, #065F46);
}
.vc-link {
  margin-left: auto;
  font-weight: 600;
  color: var(--color-brand-600, #0284C7);
  text-decoration: none;
}
.vc-link:hover { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .vc-spinner { animation: none; }
}
`;
