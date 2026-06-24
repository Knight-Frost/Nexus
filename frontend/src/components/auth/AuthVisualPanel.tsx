/* eslint-disable react-refresh/only-export-components -- shared panel parts module;
   trust-item arrays are intentionally co-located with the panel component. */
/**
 * AuthVisualPanel — the always-dark-navy left panel.
 *
 * Layers (bottom → top):
 *   1. Property image (login-hero.png) — covers the whole panel
 *   2. Deep navy gradient overlay — ensures text is readable over any image
 *   3. Content: brand lockup, rotating headline, body, trust items, slide dots
 *
 * The panel is self-contained dark; it never inherits the page theme.
 * Rotation: 6 s interval, paused while any auth-shell input has focus,
 * instant-swap under prefers-reduced-motion (animation off, rotation ON).
 */
import { useState, useEffect } from 'react';
import type { SVGProps } from 'react';
import { BrandLockup } from './BrandLockup';
import {
  LOGIN_HERO_SLIDES,
  REGISTER_HERO_SLIDES,
  useRotatingSlides,
  type HeroIconKey,
  type HeroSlide,
} from './heroSlides';
// login-hero.png is a dark/dusk property image — ideal panel mood.
// Drop an updated asset here without touching this file.
import loginHero from '@/assets/auth/login-hero.png';

/* ── Panel-local SVG icons ────────────────────────────────────────────────── */
function PanelIcon({ children, ...p }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

const PANEL_ICONS: Record<HeroIconKey, (p: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  shieldCheck: (p) => (
    <PanelIcon {...p}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </PanelIcon>
  ),
  ledger: (p) => (
    <PanelIcon {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </PanelIcon>
  ),
  lock: (p) => (
    <PanelIcon {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </PanelIcon>
  ),
  people: (p) => (
    <PanelIcon {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M16.5 19a5.5 5.5 0 0 0-2.6-4.7" />
    </PanelIcon>
  ),
  doc: (p) => (
    <PanelIcon {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </PanelIcon>
  ),
};

/* ── Trust item ──────────────────────────────────────────────────────────── */
function AuthTrustItem({
  iconKey,
  title,
  sub,
}: {
  iconKey: HeroIconKey;
  title: string;
  sub: string;
}) {
  const Icon = PANEL_ICONS[iconKey];
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: '0.5rem',
          background: 'var(--auth-panel-chip)',
          border: '1px solid var(--auth-panel-chip-border)',
          color: 'var(--auth-panel-accent)',
          flexShrink: 0,
        }}
      >
        <Icon />
      </span>
      <p
        style={{
          fontSize: '12.5px',
          fontWeight: 600,
          lineHeight: 1.3,
          color: 'var(--auth-panel-text)',
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: '11.5px',
          lineHeight: 1.5,
          color: 'var(--auth-panel-muted)',
          margin: 0,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

/* ── Accent headline ─────────────────────────────────────────────────────── */
/**
 * Finds `accent` inside `headline` and renders it in italic brand-accent colour.
 * Case-insensitive; degrades to plain text if not found.
 */
function AccentHeadline({
  headline,
  accent,
}: {
  headline: string;
  accent: string;
}) {
  if (!accent) return <>{headline}</>;
  const lower = headline.toLowerCase();
  const idx = lower.indexOf(accent.toLowerCase());
  if (idx === -1) return <>{headline}</>;
  return (
    <>
      {headline.slice(0, idx)}
      <em
        style={{
          fontStyle: 'italic',
          color: 'var(--auth-panel-accent)',
          paddingRight: '0.02em',
        }}
      >
        {headline.slice(idx, idx + accent.length)}
      </em>
      {headline.slice(idx + accent.length)}
    </>
  );
}

/* ── Slide dots ──────────────────────────────────────────────────────────── */
function SlideDots({
  total,
  active,
  onSelect,
}: {
  total: number;
  active: number;
  onSelect?: (i: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Slide indicators"
      style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Slide ${i + 1}`}
            onClick={() => onSelect?.(i)}
            style={{
              width: isActive ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: isActive
                ? 'var(--auth-panel-accent)'
                : 'rgba(255,255,255,0.28)',
              border: 'none',
              padding: 0,
              cursor: onSelect ? 'pointer' : 'default',
              transition:
                'width 0.35s cubic-bezier(0.22,1,0.36,1), background 0.25s ease',
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Rotating panel (login / register) ──────────────────────────────────── */
function RotatingPanel({ slides }: { slides: HeroSlide[] }) {
  const { index, pause, resume } = useRotatingSlides(slides, 6000);

  // Separate piece of state for the displayed index so dot-clicks can jump
  // directly while the auto-rotation still drives forward progress.
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Sync the hook-driven rotation into displayedIndex via an effect.
  // This avoids the forbidden "ref read during render" pattern.
  useEffect(() => {
    setActiveIndex(index);
  }, [index]);

  const slide = slides[activeIndex];

  return (
    <div className="auth-panel" onFocus={pause} onBlur={resume}>
      {/* Background image + gradient overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'linear-gradient(to bottom, rgba(7,21,47,0.62) 0%, rgba(11,37,82,0.78) 100%)',
            `url(${loginHero})`,
          ].join(', '),
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center 60%',
          backgroundRepeat: 'no-repeat, no-repeat',
          zIndex: 0,
        }}
      />

      {/* Content sits above the overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Top: brand lockup */}
        <BrandLockup variant="panel" />

        {/* Middle: rotating headline + body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: '2rem',
            paddingBottom: '1.5rem',
          }}
        >
          {/*
            Fixed min-height prevents layout shift when different-length copy
            renders. The key on activeIndex triggers the CSS slide-in animation
            each time the slide changes.
          */}
          <div
            key={activeIndex}
            className="auth-panel-slide"
            style={{ minHeight: '16rem' }}
          >
            <h1
              className="auth-panel-headline"
              style={
                {
                  fontFamily: 'var(--font-auth-display)',
                  fontSize: 'clamp(3rem, 5.2vw, 5.75rem)',
                  fontWeight: 600,
                  lineHeight: 0.98,
                  letterSpacing: '-0.035em',
                  color: 'var(--auth-panel-text)',
                  margin: 0,
                  textWrap: 'balance',
                } as React.CSSProperties
              }
            >
              <AccentHeadline headline={slide.headline} accent={slide.accent} />
            </h1>

            <p
              className="auth-panel-supporting"
              style={{
                marginTop: '1.125rem',
                fontSize: '1rem',
                lineHeight: 1.6,
                color: 'var(--auth-panel-muted)',
                maxWidth: '36ch',
              }}
            >
              {slide.body}
            </p>
          </div>
        </div>

        {/* Bottom: trust items + slide dots */}
        <div
          style={{
            borderTop: '1px solid var(--auth-panel-border)',
            paddingTop: '1.25rem',
          }}
        >
          <div
            className="auth-panel-trust"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.875rem',
            }}
          >
            {slide.items.map((item) => (
              <AuthTrustItem
                key={item.title}
                iconKey={item.iconKey}
                title={item.title}
                sub={item.sub}
              />
            ))}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <SlideDots
              total={slides.length}
              active={activeIndex}
              onSelect={(i) => {
                setActiveIndex(i);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Static panel (for forgot/reset/verify pages) ────────────────────────── */
function StaticAccentHeadline({
  text,
  words,
}: {
  text: string;
  words: string[];
}) {
  if (words.length === 0) return <>{text}</>;
  const lower = text.toLowerCase();
  for (const phrase of words) {
    const idx = lower.indexOf(phrase.toLowerCase());
    if (idx !== -1) {
      return (
        <>
          {text.slice(0, idx)}
          <em style={{ fontStyle: 'italic', color: 'var(--auth-panel-accent)' }}>
            {text.slice(idx, idx + phrase.length)}
          </em>
          {text.slice(idx + phrase.length)}
        </>
      );
    }
  }
  return <>{text}</>;
}

function StaticPanel({
  headline,
  accentWords = [],
  supporting,
  trustItems = DEFAULT_TRUST_ITEMS,
}: {
  headline: string;
  accentWords?: string[];
  supporting: string;
  trustItems?: Array<{ icon: React.ReactNode; title: string; sub: string }>;
}) {
  return (
    <div className="auth-panel">
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'linear-gradient(to bottom, rgba(7,21,47,0.62) 0%, rgba(11,37,82,0.78) 100%)',
            `url(${loginHero})`,
          ].join(', '),
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center 60%',
          backgroundRepeat: 'no-repeat, no-repeat',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <BrandLockup variant="panel" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: '2rem',
            paddingBottom: '2rem',
          }}
        >
          <h1
            className="auth-panel-headline"
            style={
              {
                fontFamily: 'var(--font-auth-display)',
                fontSize: 'clamp(2.75rem, 4.6vw, 5.25rem)',
                fontWeight: 600,
                lineHeight: 1.0,
                letterSpacing: '-0.035em',
                color: 'var(--auth-panel-text)',
                margin: 0,
                textWrap: 'balance',
              } as React.CSSProperties
            }
          >
            <StaticAccentHeadline text={headline} words={accentWords} />
          </h1>
          <p
            className="auth-panel-supporting"
            style={{
              marginTop: '1rem',
              fontSize: '1rem',
              lineHeight: 1.6,
              color: 'var(--auth-panel-muted)',
              maxWidth: '34ch',
            }}
          >
            {supporting}
          </p>
        </div>
        <div
          className="auth-panel-trust"
          style={{
            borderTop: '1px solid var(--auth-panel-border)',
            paddingTop: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.875rem',
          }}
        >
          {trustItems.map((item) => (
            <div key={item.title} className="flex flex-col gap-1.5">
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '0.5rem',
                  background: 'var(--auth-panel-chip)',
                  border: '1px solid var(--auth-panel-chip-border)',
                  color: 'var(--auth-panel-accent)',
                }}
              >
                {item.icon}
              </span>
              <p
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  lineHeight: 1.3,
                  color: 'var(--auth-panel-text)',
                  margin: 0,
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  fontSize: '11.5px',
                  lineHeight: 1.5,
                  color: 'var(--auth-panel-muted)',
                  margin: 0,
                }}
              >
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Legacy trust-item arrays kept for other auth pages ──────────────────── */
export const DEFAULT_TRUST_ITEMS: Array<{
  icon: React.ReactNode;
  title: string;
  sub: string;
}> = [
  {
    icon: PANEL_ICONS.shieldCheck({}),
    title: 'Verified accounts',
    sub: 'Trusted identities for every user.',
  },
  {
    icon: PANEL_ICONS.ledger({}),
    title: 'Lease records',
    sub: 'Organized leases and documents.',
  },
  {
    icon: PANEL_ICONS.lock({}),
    title: 'Protected payments',
    sub: 'Secure transactions you can count on.',
  },
];

export const REGISTER_TRUST_ITEMS: Array<{
  icon: React.ReactNode;
  title: string;
  sub: string;
}> = [
  {
    icon: PANEL_ICONS.shieldCheck({}),
    title: 'Role-based setup',
    sub: 'Tenant and landlord paths stay separated.',
  },
  {
    icon: PANEL_ICONS.shieldCheck({}),
    title: 'Verified workflows',
    sub: 'Sensitive actions stay protected.',
  },
  {
    icon: PANEL_ICONS.doc({}),
    title: 'Organized documents',
    sub: 'Keep rental records connected from day one.',
  },
];

/* ── Panel props ─────────────────────────────────────────────────────────── */
export type PanelMode = 'login' | 'register';

export interface VisualPanelProps {
  /**
   * Which rotating slide set to use.
   * Omit this and pass the legacy static props for non-login/register pages.
   */
  mode?: PanelMode;
  /**
   * Legacy static headline (for forgot-password / verify / reset pages).
   * Ignored when `mode` is set.
   */
  headline?: string;
  /**
   * Words inside the headline to render in accent colour.
   * Ignored when `mode` is set.
   */
  accentWords?: string[];
  /**
   * Supporting copy under the headline.
   * Ignored when `mode` is set.
   */
  supporting?: string;
  /**
   * Three trust items rendered in a row at the bottom.
   * Ignored when `mode` is set.
   */
  trustItems?: Array<{ icon: React.ReactNode; title: string; sub: string }>;
}

/* ── AuthVisualPanel (public API) ────────────────────────────────────────── */
export function AuthVisualPanel({
  mode,
  headline,
  accentWords = [],
  supporting,
  trustItems,
}: VisualPanelProps) {
  if (mode === 'login') {
    return <RotatingPanel slides={LOGIN_HERO_SLIDES} />;
  }
  if (mode === 'register') {
    return <RotatingPanel slides={REGISTER_HERO_SLIDES} />;
  }
  // Static fallback for forgot-password / reset-password / verify-email
  return (
    <StaticPanel
      headline={headline ?? ''}
      accentWords={accentWords}
      supporting={supporting ?? ''}
      trustItems={trustItems}
    />
  );
}
