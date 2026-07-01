/**
 * RecipientChip — compact pill showing selected message recipient.
 * Renders landlord name + × remove in the To field of ComposeMessageWindow.
 */
import { X } from 'lucide-react';
import type { MessageableRecipient } from '../../lib/types';
import { Avatar } from '../ui/Avatar';

interface RecipientChipProps {
  recipient: MessageableRecipient;
  onRemove: () => void;
}

export function RecipientChip({ recipient, onRemove }: RecipientChipProps) {
  // Prefer the recipient's profile photo; fall back to the listing thumbnail, then initials.
  const avatarSrc = recipient.landlord.avatar_url
    ?? (recipient.thumbnail_url ? `${import.meta.env.VITE_API_URL ?? ''}/storage/${recipient.thumbnail_url}` : null);

  return (
    <span className="mx-chip">
      <Avatar name={recipient.landlord.name} src={avatarSrc} className="mx-chip-initials" />
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
