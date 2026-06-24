/**
 * RecipientChip — compact pill showing selected message recipient.
 * Renders landlord name + × remove in the To field of ComposeMessageWindow.
 */
import { X } from 'lucide-react';
import type { MessageableRecipient } from '../../lib/types';

interface RecipientChipProps {
  recipient: MessageableRecipient;
  onRemove: () => void;
}

export function RecipientChip({ recipient, onRemove }: RecipientChipProps) {
  const initials = recipient.landlord.name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <span className="mx-chip">
      {recipient.thumbnail_url ? (
        <img
          // why: API returns a raw storage path; the SPA builds the URL itself
          // (same convention as SavedListings/BrowseListings).
          src={`${import.meta.env.VITE_API_URL ?? ''}/storage/${recipient.thumbnail_url}`}
          alt=""
          className="mx-chip-avatar"
          aria-hidden="true"
        />
      ) : (
        <span className="mx-chip-initials" aria-hidden="true">
          {initials}
        </span>
      )}
      <span className="mx-chip-name">{recipient.landlord.name}</span>
      <button
        type="button"
        className="mx-chip-remove"
        aria-label="Remove recipient"
        onClick={onRemove}
      >
        <X size={12} />
      </button>
    </span>
  );
}
