/**
 * RecipientSearch — autocomplete input that queries messageable recipients
 * (the tenant's saved homes' landlords). Shows a compact dropdown list.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { MessageableRecipient } from '../../lib/types';
import { tenantApi } from '../../lib/endpoints';
import { Avatar } from '../ui/Avatar';

interface RecipientSearchProps {
  onSelect: (r: MessageableRecipient) => void;
}

export function RecipientSearch({ onSelect }: RecipientSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageableRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = 'rs-listbox';

  const fetchRecipients = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantApi.messageableRecipients(q || undefined);
      setResults(data);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      setError('Could not load recipients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount/focus to show all options immediately
  const handleFocus = () => {
    if (results.length === 0 && !loading) {
      void fetchRecipients('');
    } else {
      setOpen(true);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchRecipients(query);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchRecipients]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = (r: MessageableRecipient) => {
    setOpen(false);
    setQuery('');
    onSelect(r);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) handleSelect(r);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  };

  // why: the API returns a raw storage path (e.g. "listings/x.jpg"); the SPA
  // builds the full URL itself, matching SavedListings/BrowseListings.
  const photoUrl = (path: string) =>
    `${import.meta.env.VITE_API_URL ?? ''}/storage/${path}`;

  return (
    <div className="mx-rs-wrap">
      <span className="mx-rs-icon" aria-hidden="true">
        <Search size={14} />
      </span>
      <input
        ref={inputRef}
        type="text"
        className="mx-rs-input"
        placeholder="Search landlords or properties…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        aria-label="Search recipients"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `rs-option-${activeIndex}` : undefined}
        autoComplete="off"
      />
      {open && (
        <ul
          id={listboxId}
          className="mx-rs-dropdown"
          role="listbox"
          aria-label="Messageable recipients"
        >
          {loading && (
            <li className="mx-rs-state">
              <span className="mx-rs-spinner" aria-label="Loading" />
              Loading…
            </li>
          )}
          {!loading && error && (
            <li className="mx-rs-state mx-rs-err">{error}</li>
          )}
          {!loading && !error && results.length === 0 && (
            <li className="mx-rs-state">
              No messageable saved homes yet.{' '}
              <a href="/app/browse" className="mx-rs-link">
                Browse listings
              </a>{' '}
              and save a home to message its landlord.
            </li>
          )}
          {!loading && !error &&
            results.map((r, i) => (
              <li
                key={r.listing_id}
                id={`rs-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`mx-rs-row${i === activeIndex ? ' mx-rs-row--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(r);
                }}
              >
                <span className="mx-rs-avatar">
                  <Avatar
                    name={r.landlord.name}
                    src={r.landlord.avatar_url ?? (r.thumbnail_url ? photoUrl(r.thumbnail_url) : null)}
                    className="mx-rs-initials"
                  />
                </span>
                <span className="mx-rs-info">
                  <span className="mx-rs-primary">{r.landlord.name}</span>
                  <span className="mx-rs-secondary">
                    {r.listing_title}
                    {r.location ? ` · ${r.location}` : ''}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
