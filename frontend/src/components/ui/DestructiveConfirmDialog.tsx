import { ConfirmDialog } from './ConfirmDialog';

/**
 * The shared confirm for irreversible actions — delete, reject, suspend,
 * terminate, discard. Now a thin `tone="danger"` wrapper over {@link ConfirmDialog},
 * which is the single implementation both neutral and destructive confirms share.
 * The public API is unchanged, so every existing caller keeps working; new code
 * that needs a neutral confirm (e.g. sign out) uses `ConfirmDialog` directly.
 *
 * Optionally collects a required reason (rejection / suspension / termination
 * reasons all funnel through `reasonField`). Keyboard accessible; the confirm
 * button is disabled until a required reason is provided.
 */
export function DestructiveConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  error,
  reasonField,
}: {
  open: boolean;
  onClose: () => void;
  /** Receives the reason when `reasonField` is configured, else called bare. */
  onConfirm: (reason?: string) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Inline error shown above the footer so a failure keeps the dialog open. */
  error?: React.ReactNode;
  /** When set, renders a reason textarea. `required` gates the confirm button. */
  reasonField?: {
    label: string;
    placeholder?: string;
    required?: boolean;
    hint?: string;
  };
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      loading={loading}
      tone="danger"
      error={error}
      reasonField={reasonField}
    />
  );
}
