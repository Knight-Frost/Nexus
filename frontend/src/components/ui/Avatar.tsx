import { useState } from 'react';

/**
 * Derive up-to-two-letter initials from a display name (e.g. "Elton Sakyi" → "ES").
 * Falls back to the first alphanumeric character, or "?" when nothing is usable.
 */
function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.slice(0, 2).map((p) => p[0]).join('');
  return (letters || name?.[0] || '?').toUpperCase();
}

interface AvatarProps {
  /** Display name — used for the alt text and to compute the initials fallback. */
  name: string;
  /** The profile image URL. When present and it loads, it replaces the initials. */
  src?: string | null;
  /** Pre-computed initials override (e.g. server-provided). Defaults to initialsFromName(name). */
  fallback?: string;
  /** Square size in px. Omit to inherit size from the wrapper class. */
  size?: number;
  /** Wrapper class — pass the surface's existing avatar class to keep its look. */
  className?: string;
  /** Native title tooltip. */
  title?: string;
}

/**
 * Avatar — shows the user's profile photo when available, otherwise their initials.
 *
 * The image is rendered INSIDE the surface's existing wrapper class, so each call
 * site keeps its own sizing/background/typography for the initials fallback. When a
 * photo is present it fills the circle (object-fit: cover); if it fails to load we
 * fall back to initials automatically (onError), so a broken URL never shows a
 * broken-image glyph.
 */
export function Avatar({ name, src, fallback, size, className, title }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  const dims = size ? { width: size, height: size } : undefined;

  return (
    <span className={className} title={title} style={dims}>
      {showImg ? (
        <img
          // key on src so a changed URL resets the error state
          key={src}
          src={src ?? undefined}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        />
      ) : (
        fallback ?? initialsFromName(name)
      )}
    </span>
  );
}
