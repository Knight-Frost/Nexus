/**
 * ComposeMessageWindow — Gmail-style floating composer overlay.
 * Supports three visual states: docked (bottom-right card), minimized (small bar),
 * and maximized (centered panel with backdrop). The page behind stays mounted.
 */
import { useState, useEffect, useRef } from 'react';
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import type { MessageableRecipient } from '../../lib/types';
import { tenantApi } from '../../lib/endpoints';
import { RecipientSearch } from './RecipientSearch';
import { RecipientChip } from './RecipientChip';

interface ComposeMessageWindowProps {
  state: 'docked' | 'minimized' | 'maximized';
  onStateChange: (s: 'docked' | 'minimized' | 'maximized') => void;
  onClose: () => void;
  onSent: (conversationId: number) => void;
}

export function ComposeMessageWindow({
  state,
  onStateChange,
  onClose,
  onSent,
}: ComposeMessageWindowProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<MessageableRecipient | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDirty =
    selectedRecipient !== null || subject.trim() !== '' || body.trim() !== '';

  const canSend =
    selectedRecipient !== null && body.trim() !== '' && !sending;

  // Focus body when recipient is selected
  useEffect(() => {
    if (selectedRecipient && state !== 'minimized') {
      bodyRef.current?.focus();
    }
  }, [selectedRecipient, state]);

  // Focus management and Escape key for maximized state
  useEffect(() => {
    if (state !== 'maximized') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDirty) {
          setConfirmDiscard(true);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state, isDirty, onClose]);

  const handleSend = async () => {
    if (!canSend || !selectedRecipient) return;
    setSending(true);
    setError(null);

    // why: the backend has no subject column — we fold the subject into the
    // body as the first line so the intent is preserved in the message text.
    const composedBody =
      subject.trim()
        ? `${subject.trim()}\n\n${body.trim()}`
        : body.trim();

    try {
      const response = await tenantApi.startConversation(
        selectedRecipient.listing_id,
        composedBody,
      );
      const conversationId =
        (response as { conversation?: { id: number }; id?: number })
          ?.conversation?.id ??
        (response as { id?: number })?.id;
      if (typeof conversationId === 'number') {
        onSent(conversationId);
      } else {
        onSent(0);
      }
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? String((err.response as { data: { message: unknown } }).data.message)
          : 'Failed to send message. Please try again.';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDiscardRequest = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setConfirmDiscard(false);
    onClose();
  };

  const handleCancelDiscard = () => {
    setConfirmDiscard(false);
  };

  const handleHeaderClick = () => {
    if (state === 'minimized') {
      onStateChange('docked');
    }
  };

  const minimizedTitle =
    state === 'minimized' && selectedRecipient
      ? selectedRecipient.landlord.name
      : 'New message';

  if (state === 'minimized') {
    return (
      <div className="mx-cw-minimized">
        <button
          type="button"
          className="mx-cw-min-bar"
          onClick={handleHeaderClick}
          aria-label="Restore compose window"
        >
          <span className="mx-cw-title">{minimizedTitle}</span>
        </button>
        <div className="mx-cw-controls">
          <button
            type="button"
            className="mx-cw-ctrl"
            aria-label="Restore"
            onClick={(e) => {
              e.stopPropagation();
              onStateChange('docked');
            }}
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            className="mx-cw-ctrl"
            aria-label="Close compose"
            onClick={(e) => {
              e.stopPropagation();
              handleDiscardRequest();
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  const isMaximized = state === 'maximized';

  return (
    <>
      {isMaximized && (
        <div
          className="mx-cw-backdrop"
          onClick={handleDiscardRequest}
          aria-hidden="true"
        />
      )}
      <div
        ref={panelRef}
        className={isMaximized ? 'mx-cw-panel mx-cw-panel--max' : 'mx-cw-panel mx-cw-panel--docked'}
        role="dialog"
        aria-label="New message"
        aria-modal={isMaximized}
      >
        {/* Header */}
        <div className="mx-cw-header">
          <span className="mx-cw-title">New message</span>
          <div className="mx-cw-controls">
            <button
              type="button"
              className="mx-cw-ctrl"
              aria-label="Minimize"
              onClick={() => onStateChange('minimized')}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              className="mx-cw-ctrl"
              aria-label={isMaximized ? 'Restore to docked' : 'Maximize'}
              onClick={() => onStateChange(isMaximized ? 'docked' : 'maximized')}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              className="mx-cw-ctrl"
              aria-label="Close compose"
              onClick={handleDiscardRequest}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Discard confirm panel */}
        {confirmDiscard && (
          <div className="mx-cw-confirm">
            <span className="mx-cw-confirm-msg">Discard this draft?</span>
            <div className="mx-cw-confirm-actions">
              <button
                type="button"
                className="mx-cw-confirm-cancel"
                onClick={handleCancelDiscard}
              >
                Keep
              </button>
              <button
                type="button"
                className="mx-cw-confirm-ok"
                onClick={handleConfirmDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* To row */}
        <div className="mx-cw-row mx-cw-to-row">
          <span className="mx-cw-label">To</span>
          <div className="mx-cw-to-field">
            {selectedRecipient ? (
              <RecipientChip
                recipient={selectedRecipient}
                onRemove={() => setSelectedRecipient(null)}
              />
            ) : (
              <RecipientSearch onSelect={setSelectedRecipient} />
            )}
          </div>
        </div>

        {/* Subject row */}
        <div className="mx-cw-row">
          <span className="mx-cw-label">Subject</span>
          <input
            type="text"
            className="mx-cw-subject"
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="mx-cw-body-wrap">
          <textarea
            ref={bodyRef}
            className="mx-cw-body"
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && <p className="mx-cw-error">{error}</p>}

        {/* Footer */}
        <div className="mx-cw-footer">
          <button
            type="button"
            className="mx-cw-send"
            disabled={!canSend}
            onClick={() => void handleSend()}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
          <button
            type="button"
            className="mx-cw-discard"
            aria-label="Discard"
            onClick={handleDiscardRequest}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
