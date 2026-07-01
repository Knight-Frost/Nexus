import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Field, Textarea } from './Field';

/**
 * The single, shared confirmation primitive for the app. It backs BOTH neutral
 * confirms (sign out, apply a benign change) and destructive confirms (delete,
 * reject, suspend, terminate) — the latter via `tone="danger"`, which tints the
 * dialog rail and turns the confirm button red.
 *
 * Supports every shape Phase 3 asked for:
 *   • confirm-only actions
 *   • confirm + optional/required reason (the confirm button is disabled until a
 *     required reason is supplied)
 *   • a `loading` submitting state
 *   • an inline `error` slot so a failed action surfaces *inside* the dialog
 *     instead of silently closing (callers keep the dialog open on failure)
 *   • keyboard accessibility (Escape to cancel; the reason field autofocuses)
 *
 * `DestructiveConfirmDialog` is a thin wrapper over this so existing callers are
 * untouched — this is the one implementation both funnel through.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'default',
  error,
  reasonField,
}: {
  open: boolean;
  onClose: () => void;
  /** Receives the trimmed reason when `reasonField` is configured, else bare. */
  onConfirm: (reason?: string) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** `danger` reads as irreversible (red rail + red confirm). Default is neutral. */
  tone?: 'default' | 'danger';
  /** Inline error shown above the footer so failures don't close the dialog. */
  error?: React.ReactNode;
  /** When set, renders a reason textarea. `required` gates the confirm button. */
  reasonField?: {
    label: string;
    placeholder?: string;
    required?: boolean;
    hint?: string;
  };
}) {
  const [reason, setReason] = useState('');
  // Reset the field whenever the dialog re-opens so a prior value never leaks.
  // Done during render via prev-prop tracking (the React-recommended pattern),
  // which avoids the cascading-render cost of a reset-in-effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason('');
  }

  const reasonMissing = Boolean(reasonField?.required) && reason.trim().length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      tone={tone}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            disabled={reasonMissing}
            onClick={() => onConfirm(reasonField ? reason.trim() : undefined)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {reasonField && (
        <Field
          label={reasonField.label}
          hint={reasonField.hint}
          required={reasonField.required}
        >
          {(id) => (
            <Textarea
              id={id}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonField.placeholder}
              rows={3}
              autoFocus
            />
          )}
        </Field>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}
