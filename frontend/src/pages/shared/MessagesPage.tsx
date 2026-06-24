/**
 * MessagesPage — two-pane messaging experience (conversation list + thread detail).
 *
 * Data is 100% real: fetched from tenantApi.conversations() and
 * tenantApi.conversation(id). No mock service, no MOCK_MODE flag.
 *
 * Left pane  — ConversationList: shows all conversations from the API.
 * Right pane — MessageDetailView: thread + composer for the selected conversation.
 *
 * Selecting a conversation calls tenantApi.conversation(id) which also marks
 * the other party's messages read server-side. After load the list refreshes
 * so unread counts update.
 *
 * Sending a message calls tenantApi.sendMessage(id, body) and appends only the
 * confirmed returned message — no optimistic faking.
 *
 * New conversation: the Gmail-style ComposeMessageWindow docks bottom-right.
 * It can be minimized to a bar, expanded to a centered panel, or closed.
 * The Messages list + thread stay visible/usable behind it at all times.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquareText, PenSquare, Search } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { tenantApi } from '@/lib/endpoints';
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
} from '@/lib/types';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageDetailView, DetailPlaceholder } from '@/components/messages/MessageDetail';
import { ComposeMessageWindow } from '@/components/messages/ComposeMessageWindow';
import './messages.css';

/* ----------------------------------------------------------------- helpers */

function isForbidden(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 403;
}

/* ================================================================== page == */

export function MessagesPage() {
  const { user } = useAuth();
  const meName = user && 'full_name' in user ? user.full_name : 'You';

  /* ---- list state ---- */
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<'forbidden' | 'error' | null>(null);

  /* ---- selected conversation state ---- */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailMessages, setDetailMessages] = useState<ConversationMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<'forbidden' | 'error' | null>(null);

  /* ---- composer state ---- */
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /* ---- search ---- */
  const [query, setQuery] = useState('');

  /* ---- compose window state (Gmail-style docked/minimized/maximized) ---- */
  const [composerState, setComposerState] = useState<'closed' | 'docked' | 'minimized' | 'maximized'>('closed');

  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  /* ---- load conversation list ---- */
  const loadList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ctrl = new AbortController();
    listAbortRef.current = ctrl;

    setListLoading(true);
    setListError(null);
    try {
      const data = await tenantApi.conversations();
      if (!ctrl.signal.aborted) setConversations(data);
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setListError(isForbidden(err) ? 'forbidden' : 'error');
      }
    } finally {
      if (!ctrl.signal.aborted) setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    return () => listAbortRef.current?.abort();
  }, [loadList]);

  /* ---- load conversation detail ---- */
  const loadDetail = useCallback(async (id: number) => {
    detailAbortRef.current?.abort();
    const ctrl = new AbortController();
    detailAbortRef.current = ctrl;

    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setDetailMessages([]);
    try {
      const data = await tenantApi.conversation(id);
      if (!ctrl.signal.aborted) {
        setDetail(data);
        setDetailMessages(data.messages);
        // Refresh list so unread count updates (the GET marks messages read).
        void loadList();
      }
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setDetailError(isForbidden(err) ? 'forbidden' : 'error');
      }
    } finally {
      if (!ctrl.signal.aborted) setDetailLoading(false);
    }
  }, [loadList]);

  /* ---- select a conversation ---- */
  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    setDraft('');
    void loadDetail(id);
  }, [loadDetail]);

  /* ---- send a message ---- */
  const handleSend = useCallback(async (body: string, files: File[]) => {
    if (!selectedId || sending) return;
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    try {
      const { message } = await tenantApi.sendMessage(selectedId, body, files);
      setDetailMessages((prev) => [...prev, message]);
      setDraft('');
      // Update the list preview: prefer body text; fall back to "📎 Attachment" when body empty.
      const preview = body.trim() || (files.length > 0 ? '📎 Attachment' : '');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, last_message_preview: preview, last_message_at: message.created_at }
            : c,
        ),
      );
    } catch {
      setNotice('Message not sent. Please try again.');
    } finally {
      setSending(false);
    }
  }, [selectedId, sending]);

  /* ---- compose: sent callback — close window, reload list, open conversation ---- */
  const handleComposeSent = useCallback(async (conversationId: number) => {
    setComposerState('closed');
    await loadList();
    if (conversationId > 0) {
      handleSelect(conversationId);
    }
  }, [loadList, handleSelect]);

  /* ---- toast ---- */
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(id);
  }, [notice]);

  /* ---- filtered list ---- */
  const visible = query.trim()
    ? conversations.filter((c) => {
        const q = query.trim().toLowerCase();
        const haystack = [
          c.title ?? '',
          c.other_participant?.name ?? '',
          c.last_message_preview ?? '',
          c.preview ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : conversations;

  /* ---- render ---- */
  return (
    <div className="mx-page">
      {/* page header */}
      <header className="mx-head">
        <div className="mx-head-title">
          <p className="mx-eyebrow">Communicate</p>
          <h1 className="mx-title">Messages</h1>
          <p className="mx-sub">Message landlords about homes you've saved, and reply to their replies.</p>
        </div>
        <div className="mx-head-actions">
          <div className="mx-head-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search conversations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search conversations"
            />
          </div>
          <button
            type="button"
            className="mx-btn mx-btn-primary"
            onClick={() => setComposerState('docked')}
          >
            <PenSquare size={16} /> New message
          </button>
        </div>
      </header>

      {/* error loading the list */}
      {listError === 'forbidden' ? (
        <div className="mx-hub-error">
          <span className="mx-error-ico"><MessageSquareText size={26} /></span>
          <p className="mx-empty-title">Access denied</p>
          <p className="mx-empty-text">You don't have permission to view messages.</p>
        </div>
      ) : listError === 'error' ? (
        <div className="mx-hub-error">
          <span className="mx-error-ico"><MessageSquareText size={26} /></span>
          <p className="mx-empty-title">We couldn't load your messages</p>
          <p className="mx-empty-text">Something went wrong fetching your conversations.</p>
          <button className="mx-btn mx-btn-ghost" onClick={() => void loadList()}>Try again</button>
        </div>
      ) : (
        /* two-pane hub */
        <div className="mx-hub mx-hub-2pane">
          {/* left pane — conversation list */}
          <section className="mx-col mx-list" aria-label="Conversations">
            <ConversationList
              items={visible}
              loading={listLoading}
              selectedId={selectedId}
              onSelect={handleSelect}
              onCompose={() => setComposerState('docked')}
            />
          </section>

          {/* right pane — thread or placeholder */}
          {detailError === 'forbidden' ? (
            <section className="mx-col mx-detail" aria-label="Conversation">
              <div className="mx-empty" style={{ flex: 1 }}>
                <span className="mx-error-ico"><MessageSquareText size={24} /></span>
                <p className="mx-empty-title">Access denied</p>
                <p className="mx-empty-text">You don't have permission to view this conversation.</p>
              </div>
            </section>
          ) : detailError === 'error' ? (
            <section className="mx-col mx-detail" aria-label="Conversation">
              <div className="mx-empty" style={{ flex: 1 }}>
                <span className="mx-error-ico"><MessageSquareText size={24} /></span>
                <p className="mx-empty-title">Couldn't load this conversation</p>
                <p className="mx-empty-text">Something went wrong. Please try again.</p>
                <button className="mx-btn mx-btn-ghost" onClick={() => selectedId && void loadDetail(selectedId)}>
                  Try again
                </button>
              </div>
            </section>
          ) : detail ? (
            <MessageDetailView
              detail={detail}
              messages={detailMessages}
              loading={detailLoading}
              sending={sending}
              draft={draft}
              meName={meName}
              onDraftChange={setDraft}
              onSend={(body, files) => void handleSend(body, files)}
            />
          ) : (
            <DetailPlaceholder />
          )}
        </div>
      )}

      {notice && <div role="alert" className="mx-toast">{notice}</div>}

      {/* Gmail-style compose window — docks bottom-right, stays behind the page */}
      {composerState !== 'closed' && (
        <ComposeMessageWindow
          state={composerState}
          onStateChange={setComposerState}
          onClose={() => setComposerState('closed')}
          onSent={(id) => void handleComposeSent(id)}
        />
      )}
    </div>
  );
}
