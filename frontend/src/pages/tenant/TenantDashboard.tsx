import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Search, Bell, MessageSquare, MapPin, BedDouble, Bath, Heart,
  ArrowUpRight, ArrowRight, Check,
} from 'lucide-react';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { tenantApi, publicApi } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import type { Contract, LedgerEntry, Listing } from '@/lib/types';
import { Donut } from '@/components/ui/charts';
import { fadeRise, staggerContainer, staggerItem, DUR, EASE_OUT_SOFT } from '@/lib/motion';
import * as MOCK from '@/lib/mockData';
import './tenant-dashboard.css';

/* ── imagery ─────────────────────────────────────────────────────────────── */
import heroImg from '@/assets/dashboard/home-1.jpg';
import h8 from '@/assets/dashboard/home-8.png';
import h9 from '@/assets/dashboard/home-9.png';
import h10 from '@/assets/dashboard/home-10.png';
import h11 from '@/assets/dashboard/home-11.png';
import h12 from '@/assets/dashboard/home-12.png';
import h3 from '@/assets/dashboard/home-3.jpg';
import h4 from '@/assets/dashboard/home-4.jpg';
import h5 from '@/assets/dashboard/home-5.jpg';
import h6 from '@/assets/dashboard/home-6.jpg';
import h13 from '@/assets/dashboard/home-13.png';

const CARD_IMGS = [h8, h9, h10, h11, h12, h3, h4, h5, h6, h13];

/* Hero slides pair a photo with the property it depicts, so the masthead can
   caption the home you're looking at — like a magazine cover credit. */
const HERO_SLIDES: { img: string; name: string; loc: string }[] = [
  { img: heroImg, name: 'Casa del Mar', loc: 'Labadi, Accra' },
  { img: h9, name: 'The Indigo Loft', loc: 'Osu, Accra' },
  { img: h11, name: 'Aburi Ridge House', loc: 'Aburi, Eastern Region' },
  { img: h4, name: 'Maplewood Residence', loc: 'East Legon, Accra' },
  { img: h12, name: 'Phantom Court', loc: 'Cantonments, Accra' },
];

/* ── helpers (data layer unchanged) ──────────────────────────────────────── */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function calcHealth(entries: LedgerEntry[]): number {
  const rent = entries.filter(e => e.type === 'rent');
  if (!rent.length) return 88;
  const paid = rent.filter(e => e.status === 'paid').length;
  const overdue = rent.filter(e => e.status === 'overdue').length;
  return Math.min(100, Math.max(10, Math.round((paid / rent.length) * 100) - overdue * 8));
}

type DashState = 'no_lease_no_apps' | 'apps_in_progress' | 'active_lease';

function resolveDashState(contracts: Contract[]): DashState {
  const active = contracts.find(c => c.status === 'active');
  if (active) return 'active_lease';
  const pending = contracts.find(c => c.status === 'pending_tenant' || c.status === 'draft');
  if (pending) return 'apps_in_progress';
  return 'no_lease_no_apps';
}

/* ════════════════════════════════════════════════════════════════════════════
   HERO — full-bleed editorial masthead.
   • Interpolating home photos (cross-fade + slow ken-burns).
   • State-aware greeting + rotating "intelligence" lines.
   • Live location/date kicker, photo credit, contextual CTAs, slide dots.
   ════════════════════════════════════════════════════════════════════════ */
function useNow() {
  // Re-render once a minute so the greeting/date stay honest across a session.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function DashHero({
  firstName, state, contract, ledger, unread,
}: {
  firstName: string;
  state: DashState;
  contract: Contract | null;
  ledger: LedgerEntry[];
  unread: number;
}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const now = useNow();

  const [slide, setSlide] = useState(0);
  const [line, setLine] = useState(0);

  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const nextDue = contract
    ? [...ledger]
        .filter(e => e.type === 'rent' && (e.status === 'pending' || e.status === 'overdue') && e.due_date)
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0] ?? null
    : null;
  const daysLeft = nextDue?.due_date ? daysUntil(nextDue.due_date) : null;

  /* Context-aware micro-copy. The hero rotates through these, so it feels like
     the product is *telling you something*, not greeting you with one line. */
  const intel: Record<DashState, string[]> = {
    no_lease_no_apps: [
      'Let’s find your next home in Accra.',
      '128 verified homes match your budget right now.',
      'Save a home to start tracking it here.',
    ],
    apps_in_progress: [
      'Two applications are moving forward.',
      'A landlord reviewed your profile today.',
      'Keep your documents ready — decisions come fast.',
    ],
    active_lease: [
      daysLeft != null && daysLeft <= 7
        ? `Rent is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
        : 'You’re all settled in.',
      'Your tenancy is in good standing.',
      'Need a repair? Maintenance replies within a day.',
    ],
  };

  const chip = state === 'active_lease' ? 'Active lease'
    : state === 'apps_in_progress' ? '2 applications in progress'
    : null;

  const cta = state === 'active_lease'
    ? (daysLeft != null && daysLeft <= 7
        ? { a: 'Pay rent', ar: '/app/ledger', b: 'Payment history', br: '/app/ledger' }
        : { a: 'View lease', ar: '/app/contracts', b: 'Payment history', br: '/app/ledger' })
    : state === 'apps_in_progress'
      ? { a: 'View applications', ar: '/app/applications', b: 'Browse homes', br: '/app/browse' }
      : { a: 'Browse homes', ar: '/app/browse', b: 'View saved', br: '/app/saved' };

  const lines = intel[state];

  /* slideshow + subtitle rotation (disabled under reduced-motion) */
  useEffect(() => {
    if (reduce) return;
    const s = setInterval(() => setSlide(p => (p + 1) % HERO_SLIDES.length), 7000);
    return () => clearInterval(s);
  }, [reduce]);
  useEffect(() => {
    if (reduce) return;
    const l = setInterval(() => setLine(p => (p + 1) % lines.length), 4600);
    return () => clearInterval(l);
  }, [reduce, lines.length]);

  const kicker = useMemo(() => {
    const day = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    return `Accra · ${day}, ${date}`;
  }, [now]);

  const credit = HERO_SLIDES[slide];

  return (
    <header className="td-hero">
      {/* interpolating photography */}
      <div className="td-hero-stage" aria-hidden="true">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`td-hero-slide${i === slide ? ' on' : ''}`}
            style={{ backgroundImage: `url(${s.img})` }}
          />
        ))}
        <div className="td-hero-scrim" />
        <div className="td-hero-grain u-grain" />
      </div>

      {/* top utility line — subtle glass chips, nothing heavy over the greeting */}
      <div className="td-hero-top">
        <span className="td-kicker">{kicker}</span>
        <div className="td-hero-tools">
          <button className="td-tool" aria-label="Search" onClick={() => navigate('/app/browse')}>
            <Search size={15} strokeWidth={1.75} />
          </button>
          <button className="td-tool" aria-label="Notifications" onClick={() => navigate('/app/notifications')}>
            <Bell size={15} strokeWidth={1.75} />
            {unread > 0 && <span className="td-tool-dot" />}
          </button>
          <button className="td-tool" aria-label="Messages" onClick={() => navigate('/app/messages')}>
            <MessageSquare size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* bottom region: greeting (left, wide) + credit & dots (right) */}
      <div className="td-hero-bottom">
        <div className="td-hero-body">
          {chip && <span className="td-hero-chip">{chip}</span>}
          <h1 className="td-hero-greet">
            Good {timeOfDay}, <span className="td-hero-name">{firstName}.</span>
          </h1>
          <div className="td-hero-sub-wrap">
            <AnimatePresence mode="wait">
              <motion.p
                key={line}
                className="td-hero-sub"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: DUR.hover, ease: EASE_OUT_SOFT }}
              >
                {lines[line]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="td-hero-acts">
            <button className="td-btn-primary" onClick={() => navigate(cta.ar)}>
              {cta.a} <ArrowUpRight size={16} strokeWidth={2} />
            </button>
            <button className="td-btn-ghost" onClick={() => navigate(cta.br)}>
              {cta.b}
            </button>
          </div>
        </div>

        <div className="td-hero-aside">
          <div className="td-credit">
            <span className="td-credit-lab">Featured</span>
            <span className="td-credit-nm">{credit.name}</span>
            <span className="td-credit-lo">{credit.loc}</span>
          </div>
          <div className="td-dots">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                className={`td-dot${i === slide ? ' on' : ''}`}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   INDEX STRIP — editorial "figures" bar (replaces boxy stat cards).
   mono label + big serif numeral, separated by hairlines.
   ════════════════════════════════════════════════════════════════════════ */
function IndexStrip({
  appsCount, savedCount, readinessPct, pendingRent,
}: {
  appsCount: number; savedCount: number; readinessPct: number; pendingRent: string | null;
}) {
  const figures = [
    { lab: 'Applications', val: String(appsCount).padStart(2, '0'), to: '/app/applications' },
    { lab: 'Saved homes', val: String(savedCount).padStart(2, '0'), to: '/app/saved' },
    { lab: 'Tenant readiness', val: `${readinessPct}%`, to: '/app/profile' },
    pendingRent
      ? { lab: 'Rent due', val: pendingRent, to: '/app/ledger' }
      : { lab: 'Verified homes', val: '128', to: '/app/browse' },
  ];
  return (
    <motion.div
      className="td-index"
      variants={staggerContainer(0.07)}
      initial="hidden"
      animate="show"
    >
      {figures.map((f) => (
        <motion.div key={f.lab} variants={staggerItem}>
          <Link to={f.to} className="td-index-cell">
            <span className="td-index-lab">{f.lab}</span>
            <span className="td-index-val num-old">{f.val}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── section heading: mono label + hairline rule ─────────────────────────── */
function RuleHeading({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="td-sec-hd">
      <span className="eyebrow">{label}</span>
      <span className="td-sec-rule" />
      {action}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   APPLICATION PROGRESS — vertical editorial timeline (not a stepper grid).
   ════════════════════════════════════════════════════════════════════════ */
const STEP_LABELS = ['Submitted', 'In review', 'Landlord review', 'Decision'] as const;

const MOCK_APPS = [
  { id: 1, property: 'Executive 2BR Apartment', location: 'East Legon, Accra', appliedDate: '16 Jun 2026', status: 'In review', step: 2, img: CARD_IMGS[1] },
  { id: 2, property: 'Cozy 1BR Studio', location: 'Cantonments, Accra', appliedDate: '14 Jun 2026', status: 'Landlord review', step: 3, img: CARD_IMGS[3] },
] as const;

function VerticalSteps({ step }: { step: number }) {
  return (
    <ol className="td-steps">
      {STEP_LABELS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className={`td-step${done ? ' done' : ''}${current ? ' current' : ''}`}>
            <span className="td-step-mark">{done ? <Check size={11} strokeWidth={3} /> : null}</span>
            <span className="td-step-lab">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ApplicationProgress() {
  return (
    <section className="td-feature">
      <RuleHeading label="Applications" action={<Link to="/app/applications" className="td-link">All <ArrowRight size={13} /></Link>} />
      <div className="td-apps">
        {MOCK_APPS.map((app) => (
          <article key={app.id} className="td-app">
            <div className="u-zoom td-app-img"><img src={app.img} alt="" loading="lazy" /></div>
            <div className="td-app-main">
              <div className="td-app-top">
                <div>
                  <h3 className="td-app-name">{app.property}</h3>
                  <p className="td-app-meta"><MapPin size={12} /> {app.location} · Applied {app.appliedDate}</p>
                </div>
                <span className="td-tag">{app.status}</span>
              </div>
              <VerticalSteps step={app.step} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ACTIVE LEASE — feature panel shown when the tenant holds a lease.
   ════════════════════════════════════════════════════════════════════════ */
function ActiveLeaseSummary({ contract, ledger }: { contract: Contract; ledger: LedgerEntry[] }) {
  const navigate = useNavigate();
  const health = calcHealth(ledger);
  const unit = contract.listing?.unit;
  const prop = unit?.property;
  const location = prop ? `${prop.city}${prop.state ? `, ${prop.state}` : ''}` : 'Accra, Ghana';
  const beds = unit?.bedrooms ? parseInt(unit.bedrooms, 10) : null;
  const label = beds === 1 ? '1 Bed Studio' : beds ? `${beds} Bed Apartment` : (prop?.name ?? 'Your Property');
  const rentDisp = (contract.rent_amount / 100).toLocaleString('en-GH');

  const nextDue = [...ledger]
    .filter(e => e.type === 'rent' && (e.status === 'pending' || e.status === 'overdue') && e.due_date)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0] ?? null;
  const days = nextDue?.due_date ? daysUntil(nextDue.due_date) : null;
  const nextDate = nextDue?.due_date ? formatDate(nextDue.due_date) : null;

  return (
    <section className="td-feature">
      <RuleHeading label="Your lease" action={<Link to="/app/contracts" className="td-link">Lease <ArrowRight size={13} /></Link>} />
      <article className="td-lease">
        <div className="td-lease-main">
          <h3 className="td-lease-name">{label}</h3>
          <p className="td-app-meta"><MapPin size={12} /> {location}</p>
          <div className="td-lease-figs">
            <div>
              <span className="td-fig-lab">Monthly rent</span>
              <span className="td-fig-val num-old">GH₵ {rentDisp}</span>
            </div>
            <div>
              <span className="td-fig-lab">Next due</span>
              <span className="td-fig-val num-old">{nextDate ?? `${contract.payment_day}th`}</span>
              {days != null && <span className={`td-fig-hint${days <= 0 ? ' over' : ''}`}>{days <= 0 ? 'Overdue' : `in ${days} days`}</span>}
            </div>
          </div>
          <div className="td-hero-acts">
            <button className="td-btn-primary" onClick={() => navigate('/app/ledger')}>Pay rent <ArrowUpRight size={16} strokeWidth={2} /></button>
            <button className="td-btn-ghost td-ghost-ink" onClick={() => navigate('/app/contracts')}>View lease</button>
          </div>
        </div>
        <div className="td-lease-health">
          <Donut pct={health} size={104} label="Health" />
          <span className="td-health-lab">{health >= 85 ? 'Good standing' : health >= 65 ? 'Fair' : 'Attention'}</span>
        </div>
      </article>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TENANT READINESS (rail) — donut + checklist.
   ════════════════════════════════════════════════════════════════════════ */
const READINESS_ITEMS = [
  { label: 'ID verified', done: true },
  { label: 'Proof of income', done: true },
  { label: 'References', done: true },
  { label: 'Next of kin', done: false },
] as const;

function readinessPct() {
  const done = READINESS_ITEMS.filter(r => r.done).length;
  return Math.round((done / READINESS_ITEMS.length) * 100);
}

function ReadinessBand() {
  const navigate = useNavigate();
  const pct = readinessPct();
  return (
    <section>
      <RuleHeading label="Tenant readiness" action={<span className="td-link td-ok">{pct === 100 ? 'Complete' : `${pct}% ready`}</span>} />
      <div className="td-ready-bar">
        <div className="td-ready-gauge">
          <Donut pct={pct} size={96} label="Ready" />
        </div>
        <ul className="td-ready-items">
          {READINESS_ITEMS.map((item) => (
            <li key={item.label} className={item.done ? 'done' : ''}>
              <span className="td-ready-mark">{item.done ? <Check size={11} strokeWidth={3} /> : null}</span>
              <span className="td-ready-txt">{item.label}</span>
            </li>
          ))}
        </ul>
        {pct < 100 && (
          <button className="td-btn-primary td-ready-cta" onClick={() => navigate('/app/profile')}>
            Add next of kin <ArrowUpRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MESSAGES (rail).
   ════════════════════════════════════════════════════════════════════════ */
const MOCK_MESSAGES = [
  { id: 'm1', sender: 'Kojo Mensah', role: 'Property Manager', preview: 'Thanks for your application. We’ll be in touch shortly.', time: '2h', unread: true, initials: 'KM' },
  { id: 'm2', sender: 'Ama Owusu', role: 'Landlord', preview: 'Can we schedule a viewing this week?', time: '1d', unread: false, initials: 'AO' },
  { id: 'm3', sender: 'Maintenance Team', role: 'Support', preview: 'Your maintenance request has been updated.', time: '2d', unread: false, initials: 'MT' },
];

function MessagesRow() {
  const navigate = useNavigate();
  return (
    <section>
      <RuleHeading label="Messages" action={<Link to="/app/messages" className="td-link">All <ArrowRight size={13} /></Link>} />
      <div className="td-msg-grid">
        {MOCK_MESSAGES.map((m) => (
          <button key={m.id} className="td-msg-cell" onClick={() => navigate('/app/messages')}>
            <span className="td-msg-cell-top">
              <span className={`td-msg-av${m.unread ? ' unread' : ''}`}>{m.initials}</span>
              <span className="td-msg-tm">{m.time}</span>
            </span>
            <span className="td-msg-nm">{m.sender}</span>
            <span className="td-msg-role">{m.role}</span>
            <span className="td-msg-prev2">{m.preview}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   RECOMMENDED — full-width editorial property gallery.
   ════════════════════════════════════════════════════════════════════════ */
type RecCard = { id: number | string; listingId?: number; img: string; name: string; loc: string; price: number; beds: number; baths: number; badge: string };

function toRecCard(l: Listing, i: number): RecCard {
  const unit = l.unit; const prop = unit?.property;
  return {
    id: l.id, listingId: l.id,
    img: l.primary_photo?.path ? `${import.meta.env.VITE_API_URL ?? ''}/storage/${l.primary_photo.path}` : CARD_IMGS[i % CARD_IMGS.length],
    name: l.title,
    loc: prop ? `${prop.city}${prop.state ? `, ${prop.state}` : ''}` : 'Accra',
    price: unit?.rent_amount ? Math.round(parseFloat(unit.rent_amount)) : 0,
    beds: unit?.bedrooms ? parseInt(unit.bedrooms, 10) : 0,
    baths: unit?.bathrooms ? parseInt(unit.bathrooms, 10) : 0,
    badge: l.status === 'active' ? 'Verified' : 'New',
  };
}

const FALLBACK_REC: RecCard[] = [
  { id: 'f1', img: CARD_IMGS[0], name: 'Modern 2BR Apartment', loc: 'East Legon, Accra', price: 3500, beds: 2, baths: 2, badge: 'Verified' },
  { id: 'f2', img: CARD_IMGS[2], name: 'The Indigo Loft', loc: 'Labone, Accra', price: 2800, beds: 1, baths: 1, badge: 'Verified' },
  { id: 'f3', img: CARD_IMGS[3], name: 'Spacious 2BR Apartment', loc: 'Cantonments, Accra', price: 3800, beds: 2, baths: 2, badge: 'Verified' },
  { id: 'f4', img: CARD_IMGS[5], name: 'Garden View Studio', loc: 'Osu, Accra', price: 2400, beds: 1, baths: 1, badge: 'New' },
];

function RecommendedHomes({ listings, savedIds, onToggle }: {
  listings: Listing[] | null;
  savedIds: Set<number | string>;
  onToggle: (id: number | string) => void;
}) {
  const navigate = useNavigate();
  const cards = listings?.length ? listings.map(toRecCard) : FALLBACK_REC;

  return (
    <section className="td-gallery">
      <RuleHeading label="Curated for you" action={<Link to="/app/browse" className="td-link">Browse all <ArrowRight size={13} /></Link>} />
      <motion.div
        className="td-gal-row"
        variants={staggerContainer(0.06)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      >
        {cards.map((c) => (
          <motion.article
            key={c.id}
            variants={staggerItem}
            className="td-prop u-card-hover"
            onClick={() => c.listingId && navigate(`/app/listing/${c.listingId}`)}
          >
            <div className="u-zoom td-prop-img">
              <img src={c.img} alt={c.name} loading="lazy"
                onError={e => { (e.currentTarget as HTMLImageElement).src = CARD_IMGS[0]; }} />
              <span className="td-prop-badge">{c.badge}</span>
              <button
                className={`td-prop-heart${savedIds.has(c.id) ? ' on' : ''}`}
                onClick={e => { e.stopPropagation(); onToggle(c.id); }}
                aria-label="Save listing"
              >
                <Heart size={14} strokeWidth={2} fill={savedIds.has(c.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className="td-prop-body">
              <p className="td-prop-loc"><MapPin size={11} /> {c.loc}</p>
              <h3 className="td-prop-name">{c.name}</h3>
              <div className="td-prop-foot">
                <span className="td-prop-price num-old">GH₵ {c.price.toLocaleString('en-GH')}<small> /mo</small></span>
                <span className="td-prop-meta">
                  {c.beds > 0 && <span><BedDouble size={13} /> {c.beds}</span>}
                  {c.baths > 0 && <span><Bath size={13} /> {c.baths}</span>}
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SAVED — clean hairline list panel (sits in the lead column).
   ════════════════════════════════════════════════════════════════════════ */
function SavedRow({ listings, savedIds }: { listings: Listing[] | null; savedIds: Set<number | string> }) {
  const navigate = useNavigate();
  const savedList = listings?.filter(l => savedIds.has(l.id)) ?? [];
  const display = savedList.length > 0 ? savedList.slice(0, 3) : MOCK.MOCK_LISTINGS.slice(0, 3);
  const isEmpty = savedList.length === 0 && !listings?.length;

  return (
    <section>
      <RuleHeading label="Saved homes" action={<Link to="/app/saved" className="td-link">All <ArrowRight size={13} /></Link>} />
      {isEmpty ? (
        <div className="td-saved-empty">
          <Heart size={22} strokeWidth={1.5} />
          <p>Nothing saved yet — tap the heart on a home to keep it here.</p>
          <button className="td-btn-ghost td-ghost-ink" onClick={() => navigate('/app/browse')}>Browse homes</button>
        </div>
      ) : (
        <div className="td-saved-grid">
          {display.map((l, i) => {
            const unit = l.unit;
            const price = unit?.rent_amount ? parseFloat(unit.rent_amount) : 0;
            const img = l.primary_photo?.path ? `${import.meta.env.VITE_API_URL ?? ''}/storage/${l.primary_photo.path}` : CARD_IMGS[i % CARD_IMGS.length];
            return (
              <button key={l.id} className="td-saved-card u-card-hover" onClick={() => navigate(`/app/listing/${l.id}`)}>
                <span className="u-zoom td-saved-cimg"><img src={img} alt="" onError={e => { (e.currentTarget as HTMLImageElement).src = CARD_IMGS[0]; }} /></span>
                <span className="td-saved-cbody">
                  <span className="td-saved-nm">{l.title}</span>
                  <span className="td-saved-lo"><MapPin size={11} /> {unit?.property?.city ?? 'Accra'}</span>
                  <span className="td-saved-pr num-old">GH₵ {price.toLocaleString('en-GH')}<small> /mo</small></span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── states ──────────────────────────────────────────────────────────────── */
function DashSkeleton() {
  return (
    <div className="td-root">
      <div className="td-sk" style={{ height: 420, borderRadius: 16 }} />
      <div className="td-sk" style={{ height: 88, borderRadius: 12 }} />
      <div className="td-split">
        <div className="td-sk" style={{ height: 320, borderRadius: 16 }} />
        <div className="td-sk" style={{ height: 320, borderRadius: 16 }} />
      </div>
    </div>
  );
}

function DashError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="td-root">
      <div className="td-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h3 className="td-app-name" style={{ marginBottom: '0.5rem' }}>Could not load your dashboard</h3>
        <p style={{ color: 'var(--color-ink-500)', marginBottom: '1.5rem' }}>Your data is safe — please try again.</p>
        <button className="td-btn-primary" onClick={onRetry} style={{ margin: '0 auto' }}>Try again <ArrowUpRight size={16} strokeWidth={2} /></button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════════════════ */
export function TenantDashboard() {
  const { user } = useAuth();
  const firstName = user && 'first_name' in user ? user.first_name : 'there';

  const contractsQ = useApi(() => tenantApi.contracts(), []);
  const ledgerQ = useApi(() => tenantApi.ledger(), []);
  const featuredQ = useApi(() => publicApi.featured(), []);
  const savedQ = useApi(() => tenantApi.savedListings(), []);

  const [localSaved, setLocalSaved] = useState<Set<number | string>>(new Set());
  const savedIds = new Set([...(savedQ.data?.map(l => l.id) ?? []), ...localSaved]);
  const onToggle = (id: number | string) =>
    setLocalSaved(p => {
      const n = new Set(p);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });

  if (contractsQ.loading) return <DashSkeleton />;
  if (contractsQ.error && !contractsQ.data) return <DashError onRetry={contractsQ.reload} />;

  const contracts = contractsQ.data ?? [];
  const ledger = ledgerQ.data ?? [];
  const dashState = resolveDashState(contracts);
  const activeC = contracts.find(c => c.status === 'active') ?? null;
  const pendingC = contracts.find(c => c.status === 'pending_tenant') ?? null;
  const displayC = activeC ?? pendingC ?? null;

  const pendingRent = (() => {
    const due = ledger.filter(e => e.type === 'rent' && (e.status === 'pending' || e.status === 'overdue'));
    if (!due.length) return null;
    const total = due.reduce((s, e) => s + (e.amount_cents ?? 0), 0) / 100;
    return total > 0 ? `GH₵ ${total.toLocaleString('en-GH')}` : null;
  })();

  return (
    <div className="td-root">
      <DashHero
        firstName={firstName}
        state={dashState}
        contract={displayC}
        ledger={ledger}
        unread={0}
      />

      <IndexStrip
        appsCount={dashState === 'active_lease' ? 0 : MOCK_APPS.length}
        savedCount={savedIds.size}
        readinessPct={readinessPct()}
        pendingRent={pendingRent}
      />

      <motion.div variants={fadeRise} initial="hidden" animate="show">
        {dashState === 'active_lease' && activeC
          ? <ActiveLeaseSummary contract={activeC} ledger={ledger} />
          : <ApplicationProgress />}
      </motion.div>

      <ReadinessBand />

      <RecommendedHomes listings={featuredQ.data} savedIds={savedIds} onToggle={onToggle} />

      <MessagesRow />

      <SavedRow listings={savedQ.data} savedIds={savedIds} />
    </div>
  );
}
