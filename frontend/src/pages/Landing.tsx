import { useEffect, useState } from 'react';
import type { ReactElement, SVGProps } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/context/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import './landing.css';

import villa from '@/assets/landing/villa.jpg';
import cabin from '@/assets/landing/cabin.jpg';
import indigo from '@/assets/landing/indigo.jpg';
import entry from '@/assets/landing/entry.jpg';
import suburban from '@/assets/landing/suburban.jpg';
import spa from '@/assets/landing/spa.jpg';
import rolls from '@/assets/landing/rolls.jpg';

const IMG = { villa, cabin, indigo, entry, suburban, spa, rolls };

/* Reveal-on-scroll: fades elements in as they enter the viewport. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const S = (p: SVGProps<SVGSVGElement> = {}): SVGProps<SVGSVGElement> => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...p,
});

const Ic: Record<string, ReactElement> = {
  shield: <svg {...S()}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  lock: <svg {...S()}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  doc: <svg {...S()}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h6M10 16h6" /></svg>,
  coins: <svg {...S()}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>,
  building: <svg {...S()}><path d="M4 21V5l8-2v18M12 21V9l8 2v10M2 21h20" /><path d="M7 8h0M7 12h0M7 16h0M16 13h0M16 17h0" /></svg>,
  bell: <svg {...S()}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  chart: <svg {...S()}><path d="M3 21V10l5-5 5 5 5-8M21 21H3" /></svg>,
  layers: <svg {...S()}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5M3 17l9 5 9-5" opacity=".55" /></svg>,
  eye: <svg {...S()}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  search: <svg {...S()}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  pin: <svg {...S({ width: 14, height: 14 })}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>,
  arrow: <svg {...S({ width: 16, height: 16, strokeWidth: 1.8 })}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  check: <svg {...S()}><path d="M20 6 9 17l-5-5" /></svg>,
  chevDown: <svg {...S({ width: 16, height: 16 })}><path d="m6 9 6 6 6-6" /></svg>,
};

const Logo = () => (
  <svg className="nx-logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M5 27V5h4l14 17V5h4" stroke="#D6B45A" strokeWidth="3" strokeLinecap="square" />
  </svg>
);

interface Slide {
  img: string;
  nm: string;
  lo: string;
}

function Hero() {
  const slides: Slide[] = [
    { img: IMG.villa, nm: 'Casa del Mar', lo: 'Labadi, Accra' },
    { img: IMG.cabin, nm: 'Aburi Ridge Lodge', lo: 'Aburi, Eastern Region' },
    { img: IMG.suburban, nm: 'Maplewood House', lo: 'East Legon, Accra' },
    { img: IMG.rolls, nm: 'Phantom Court', lo: 'Cantonments, Accra' },
    { img: IMG.indigo, nm: 'The Indigo Loft', lo: 'Osu, Accra' },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  function scrollDown() {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  }

  return (
    <header className="nx-hero">
      {/* Background image carousel — uses .hero-slide named class */}
      <div className="nx-hero-bg" aria-hidden="true">
        {slides.map((s, k) => (
          <div
            key={k}
            className={'hero-slide' + (k === i ? ' on' : '')}
            style={{ backgroundImage: `url(${s.img})` }}
          />
        ))}
      </div>
      {/* .hero-scrim and .landing-grain named classes per spec */}
      <div className="hero-scrim" aria-hidden="true" />
      <div className="landing-grain" aria-hidden="true" />
      <div className="nx-hero-content">
        <div className="nx-hero-inner">
          <span className="nx-eyebrow">Verified rentals across Ghana</span>
          {/* Headline split across two lines per spec */}
          <h1>
            Find your perfect
            <br />
            <span className="it">home in Ghana.</span>
          </h1>
          <p className="nx-hero-sub">
            Verified rentals across Accra, Tema, Kumasi and beyond.
          </p>
          <div className="nx-hero-acts">
            <a className="nx-btn nx-btn-primary" href="#listings">
              Browse Homes {Ic.arrow}
            </a>
            <Link className="nx-btn nx-btn-ghost" to="/login">
              Sign In
            </Link>
          </div>
        </div>
      </div>
      {/* Slide caption + dots */}
      <div className="nx-hero-foot">
        <div className="nx-hero-foot-in">
          <div className="nx-caption">
            <div className="lab">Now viewing</div>
            <div className="nm">{slides[i].nm}</div>
            <div className="lo">{slides[i].lo}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="nx-dots">
              {slides.map((s, k) => (
                <button
                  key={k}
                  className={k === i ? 'on' : ''}
                  aria-label={'Show ' + s.nm}
                  onClick={() => setI(k)}
                />
              ))}
            </div>
            {/* Scroll indicator */}
            <button
              className="nx-scroll-ind"
              onClick={scrollDown}
              aria-label="Scroll down"
            >
              <span>Scroll</span>
              <span className="nx-scroll-arrow">{Ic.chevDown}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Landing() {
  useReveal();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', f, { passive: true });
    f();
    return () => window.removeEventListener('scroll', f);
  }, []);

  const ctaTo = user ? '/app' : '/register';
  const ctaLabel = user ? 'Go to dashboard' : 'Register now';

  /* Trust bar stats */
  const stats = [
    { value: '2,400+', label: 'Active listings' },
    { value: '8', label: 'Major cities' },
    { value: 'GH₵ 24M+', label: 'In rent processed' },
    { value: '98%', label: 'Verified properties' },
  ];

  /* Features section — 3 cards */
  const features = [
    {
      icon: Ic.shield,
      title: 'Verified Listings',
      desc: 'Every property is reviewed and approved before it goes live.',
    },
    {
      icon: Ic.doc,
      title: 'Digital Contracts',
      desc: 'Sign leases, track payments, and manage agreements online.',
    },
    {
      icon: Ic.chart,
      title: 'Complete Transparency',
      desc: 'Immutable rent ledger and payment history for landlords and tenants.',
    },
  ];

  /* Role cards — 3 roles */
  const roles = [
    {
      img: IMG.indigo,
      k: 'I am a tenant',
      title: 'Find a home',
      desc: 'Browse verified listings, apply, and pay rent — all in one secure place.',
      cta: 'Browse rentals',
    },
    {
      img: IMG.suburban,
      k: 'I am a landlord',
      title: 'Manage your portfolio',
      desc: 'List properties, review applicants, and collect rent from a single console.',
      cta: 'List a property',
    },
    {
      img: IMG.cabin,
      k: 'I am an admin',
      title: 'Keep it trustworthy',
      desc: 'Review listings, verify users, and monitor the platform from a trusted dashboard.',
      cta: 'Access admin panel',
    },
  ];

  /* Listings */
  const listings = [
    { img: IMG.villa, nm: 'Casa del Mar', lo: 'Labadi, Accra', price: 'GH₵ 12,500', meta: '4 Beds · 5 Baths · Ocean view', status: 'Available', tag: 'ok' },
    { img: IMG.cabin, nm: 'Aburi Ridge Lodge', lo: 'Aburi, Eastern Region', price: 'GH₵ 8,900', meta: '5 Beds · 4 Baths · Mountain view', status: 'Available', tag: 'ok' },
    { img: IMG.indigo, nm: 'The Indigo Loft', lo: 'Osu, Accra', price: 'GH₵ 4,200', meta: '2 Beds · 2 Baths · City loft', status: 'Occupied', tag: 'muted' },
    { img: IMG.suburban, nm: 'Maplewood House', lo: 'East Legon, Accra', price: 'GH₵ 5,600', meta: '4 Beds · 3 Baths · Family home', status: 'Available', tag: 'ok' },
    { img: IMG.entry, nm: 'Airport City Townhouse', lo: 'Airport Residential, Accra', price: 'GH₵ 3,800', meta: '3 Beds · 2 Baths · Townhouse', status: 'Available', tag: 'ok' },
    { img: IMG.spa, nm: 'Dune Spa Residence', lo: 'Ada Foah, Greater Accra', price: 'GH₵ 9,400', meta: '3 Beds · 4 Baths · Beachfront', status: 'Reserved', tag: 'warn' },
  ];

  /* How it works */
  const steps = [
    { n: '01', t: 'Find a home', p: 'Browse verified listings, save your favorites, and request a viewing in a few taps.' },
    { n: '02', t: 'Agree the terms', p: 'Review and sign the contract online. Every clause is laid out in plain language.' },
    { n: '03', t: 'Pay with clarity', p: 'Rent is logged in a shared ledger, so what is due and what is paid is never in question.' },
    { n: '04', t: 'Live with support', p: 'Track requests, notifications, and renewals from one calm dashboard.' },
  ];

  /* Trust / editorial points */
  const points = [
    { ic: Ic.shield, t: 'Verified before you see it', p: 'Every listing passes admin review, which keeps fraud and ghost listings off the platform.' },
    { ic: Ic.doc, t: 'Contracts in plain language', p: 'Agreements show state, dates, and terms clearly, with no buried clauses or surprises.' },
    { ic: Ic.coins, t: 'One honest ledger', p: 'Tenants and landlords read from the same record of rent due, paid, and upcoming.' },
  ];

  return (
    <div className="nx">
      {/* ── Navigation ────────────────────────────────────────────────────── */}
      {/* .nav-blur class is applied when scrolled — provides backdrop-blur */}
      <nav className={'nx-nav' + (scrolled ? ' scrolled nav-blur' : '')}>
        <div className="nx-nav-inner">
          <Link className="nx-brand" to="/">
            <Logo />
            NEXUS
          </Link>
          <div className="nx-navlinks">
            <a href="#listings">Browse</a>
            <ThemeToggle variant="minimal" />
            {!user && (
              <Link to="/login" className="nx-signin">
                Sign In
              </Link>
            )}
            <Link to={ctaTo} className="nx-req">
              {user ? 'Dashboard' : 'Register'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Hero />

      {/* ── Trust bar — stat numbers ────────────────────────────────────── */}
      <div className="nx-bar">
        <div className="nx-bar-in">
          {stats.map((s) => (
            <div className="nx-stat-item" key={s.label}>
              <div className="nx-stat-value">{s.value}</div>
              <div className="nx-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features — 3 columns ─────────────────────────────────────────── */}
      <section className="nx-section" id="features">
        <div className="nx-wrap">
          <div className="nx-sechead">
            <div data-reveal>
              <span className="nx-eyebrow">Why Nexus</span>
              <h2 className="nx-h2">
                The complete platform for
                <br />
                Ghana&rsquo;s rental market.
              </h2>
            </div>
          </div>
          <div className="nx-feat3" data-reveal>
            {features.map((f) => (
              <div className="nx-feat3-card" key={f.title}>
                <div className="nx-feat3-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Listings ─────────────────────────────────────────────────────── */}
      <section className="nx-section alt" id="listings">
        <div className="nx-wrap">
          <div className="nx-sechead">
            <div data-reveal>
              <span className="nx-eyebrow">Featured homes</span>
              <h2 className="nx-h2">A collection worth coming home to.</h2>
            </div>
            <p className="nx-lead" data-reveal>
              Hand-reviewed rentals across the country. Every one is verified before it reaches you.
            </p>
          </div>
          <div className="nx-grid3">
            {listings.map((l) => (
              <Link className="nx-listing" to={ctaTo} key={l.nm} data-reveal>
                <div className="nx-listing-img">
                  <img src={l.img} alt={l.nm} loading="lazy" />
                  <span className={'nx-listing-badge ' + l.tag}>
                    <i />
                    {l.status}
                  </span>
                </div>
                <div className="nx-listing-body">
                  <span className="nx-listing-loc">{Ic.pin}{l.lo}</span>
                  <span className="nx-listing-nm">{l.nm}</span>
                  <span className="nx-listing-meta">{l.meta}</span>
                  <div className="nx-listing-foot">
                    <span className="nx-listing-price">
                      {l.price}
                      <small> / mo</small>
                    </span>
                    <span className="nx-listing-view">View home {Ic.arrow}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="nx-section" id="how">
        <div className="nx-wrap">
          <span className="nx-eyebrow" data-reveal>How it works</span>
          <h2 className="nx-h2" data-reveal>From first viewing to final signature.</h2>
          <div className="nx-flow" data-reveal>
            {steps.map((s) => (
              <div className="nx-step" key={s.n}>
                <div className="num">{s.n}</div>
                <h4>{s.t}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial split — trust ───────────────────────────────────────── */}
      <section className="nx-section alt" id="trust">
        <div className="nx-wrap nx-split">
          <div className="nx-split-media" data-reveal>
            <img src={IMG.spa} alt="Calm, light-filled interior" />
            <span className="tagstrip">Built on trust</span>
          </div>
          <div data-reveal>
            <span className="nx-eyebrow">Trust and security</span>
            <h2 className="nx-h2">No one should have to take the other side&rsquo;s word for it.</h2>
            <p className="nx-lead">
              Every meaningful action on Nexus leaves a clear, reviewable record. That is what turns
              a rental from a leap of faith into a documented agreement.
            </p>
            <div className="nx-points">
              {points.map((p) => (
                <div className="nx-point" key={p.t}>
                  <span className="ic">{p.ic}</span>
                  <div>
                    <h4>{p.t}</h4>
                    <p>{p.p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Full-bleed band ───────────────────────────────────────────────── */}
      <section className="nx-band">
        <div className="nx-band-img" aria-hidden="true">
          <img src={IMG.rolls} alt="" />
        </div>
        <div className="nx-band-scrim" aria-hidden="true" />
        <div className="nx-band-in">
          <span className="nx-eyebrow" data-reveal>The Nexus standard</span>
          <h2 data-reveal>Renting, refined. Every detail handled, every signature secured.</h2>
          <p data-reveal>
            From the first listing to the final payment, Nexus keeps the whole relationship clear,
            calm, and on the record.
          </p>
        </div>
      </section>

      {/* ── Role cards — dark section, 3-col ──────────────────────────────── */}
      <section className="nx-roles-dark" id="roles">
        <div className="nx-wrap">
          <div className="nx-roles-head" data-reveal>
            <span className="nx-eyebrow">Built for everyone</span>
            <h2 className="nx-h2" style={{ margin: '16px auto 0' }}>One platform, three roles.</h2>
          </div>
          <div className="nx-roles-grid">
            {roles.map((r) => (
              <Link
                className="role-card-glow nx-role"
                to={ctaTo}
                key={r.title}
                data-reveal
              >
                <div className="nx-role-img">
                  <img src={r.img} alt={r.title} />
                </div>
                <div className="nx-role-body">
                  <span className="k">{r.k}</span>
                  <h3>{r.title}</h3>
                  <p>{r.desc}</p>
                  <span className="go">{r.cta} {Ic.arrow}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="nx-cta" id="access">
        <div className="nx-cta-img" aria-hidden="true">
          <img src={IMG.entry} alt="" />
        </div>
        <div className="nx-cta-scrim" aria-hidden="true" />
        <div className="nx-cta-in nx-wrap">
          <span className="nx-eyebrow" style={{ display: 'inline-flex' }} data-reveal>Get started</span>
          <h2 data-reveal>Your next home is on Nexus.</h2>
          <div className="acts" data-reveal>
            <Link className="nx-btn nx-btn-primary" to={ctaTo}>
              {ctaLabel} {Ic.arrow}
            </Link>
            <Link className="nx-btn nx-btn-ghost" to={user ? '/app' : '/login'}>
              {user ? 'Open dashboard' : 'Sign In'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer — simplified ───────────────────────────────────────────── */}
      <footer className="nx-foot">
        <div className="nx-wrap">
          <div className="nx-foot-simple">
            <div>
              <div className="nx-brand" style={{ fontSize: 20 }}>
                <Logo />
                NEXUS
              </div>
              <p className="nx-foot-tagline">
                The complete platform for Ghana&rsquo;s rental market.
              </p>
            </div>
            <nav className="nx-foot-links-row" aria-label="Footer navigation">
              <a href="#listings">Browse</a>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Register</Link>
            </nav>
          </div>
          <div className="nx-foot-bot">
            <div className="nx-foot-copy">&copy; {new Date().getFullYear()} Nexus. Secure rental infrastructure.</div>
            <div className="nx-foot-copy">Accra, Ghana</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
