/**
 * Small presentational atoms for the Messages hub.
 * Component-only file so Fast Refresh stays happy; helpers live in meta.ts.
 * Types come from lib/types — no mock service imports.
 */
import { useState } from 'react';
import { initials } from './meta';

/** Avatar for a message sender. `role` drives the colour ring. */
export type AvatarRole = 'tenant' | 'landlord' | 'admin' | 'me' | 'system';

interface AvatarProps {
  name: string;
  role: AvatarRole;
  /** Optional image URL (e.g. listing thumbnail). Falls back to initials on error. */
  src?: string | null;
  size?: number;
}

export function Avatar({ name, role, src, size }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const style = size ? { width: size, height: size, fontSize: size * 0.3 } : undefined;

  if (src && !imgError) {
    return (
      <span className={`mx-avatar role-${role}`} title={name} style={style}>
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      </span>
    );
  }

  return (
    <span className={`mx-avatar role-${role}`} title={name} style={style}>
      {initials(name)}
    </span>
  );
}
