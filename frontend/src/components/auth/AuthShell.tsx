/**
 * AuthShell — split-screen auth layout.
 *
 * LEFT:  AuthVisualPanel — always dark navy, property image + gradient overlay,
 *        logo, headline, supporting copy, trust items row. Fixed; never scrolls.
 * RIGHT: auth-form-col — white (light) / deep navy (dark), vertically centred.
 *        Only this column scrolls when the viewport is too short.
 *
 * On mobile (<lg) the layout stacks: panel becomes a compact top hero,
 * form slides below it.
 */
import type { ReactNode } from 'react';
import './auth.css';

interface AuthShellProps {
  /** Left panel content (AuthVisualPanel) */
  panel: ReactNode;
  /** Right form content (AuthCard + form) */
  children: ReactNode;
}

export function AuthShell({ panel, children }: AuthShellProps) {
  return (
    <div data-auth-shell="">
      {/* LEFT — visual panel */}
      {panel}

      {/* RIGHT — form column */}
      <div className="auth-form-col">
        <div className="auth-card auth-card-animate">
          {children}
        </div>
      </div>
    </div>
  );
}
