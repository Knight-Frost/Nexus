import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { LogoMark } from '@/components/brand/Logo';
import { brand } from '@/config/brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { navForRole, mobileNavItems, roleLabel } from '@/routes/nav';
import type { NavItem } from '@/routes/nav';
import { notificationApi } from '@/lib/endpoints';

/* ============================================================================
   SIDE NAVIGATION — self-contained, boundary-locked.
   ----------------------------------------------------------------------------
   Rebuilt from scratch. All styling is co-located in the <style> below (it
   ships in the same module as the markup, so it can NEVER desync from a stale
   stylesheet — the failure mode that plagued earlier attempts). Brand-new
   `nvx-` class names avoid any collision with leftover rules. White-glass
   fallback colors avoid any dependency on design tokens loading.

   The hard boundary: `.nvx-side` is a fixed-width box with `overflow: hidden`.
   The active-route highlight (and everything else) is physically clipped to
   the sidebar — it cannot bleed across the page.
   ============================================================================ */

const COLLAPSE_KEY = 'nexus_nav_collapsed';
const RAIL = 76;   // icon-rail width (px)
const PANEL = 300; // rail + label panel (px)

/* Colors are CSS variables (defined per-theme in editorial.css) so the sidebar
   themes with the rest of the app. Literal fallbacks keep it correct if the
   skin stylesheet hasn't loaded yet. */
const NAV_CSS = `
.nvx-shell { display:flex; align-items:stretch; min-height:100vh; background:var(--nvx-shell-bg,#F6F8FB); }

/* ---- the boundary box ---- */
.nvx-side {
  flex:0 0 auto; width:${PANEL}px;
  position:sticky; top:0; height:100vh;
  overflow:hidden;                 /* HARD clip — nothing escapes the sidebar */
  display:flex; flex-direction:column;
  background:var(--nvx-side-bg,#FFFFFF); border-right:1px solid var(--nvx-border,#E2E8F0);
  transition:width .24s cubic-bezier(.16,1,.3,1);
}
.nvx-side[data-collapsed="true"]{ width:${RAIL}px; }

/* brand */
.nvx-brand { display:flex; align-items:center; height:72px; flex:0 0 auto; }
.nvx-brand-mark { width:${RAIL}px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; }
.nvx-brand-txt { display:flex; flex-direction:column; white-space:nowrap; overflow:hidden; }
.nvx-brand-name { font-family:'Fraunces',Georgia,serif; font-weight:700; font-size:19px; color:var(--nvx-text-strong,#111827); line-height:1; }
.nvx-brand-role { font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--nvx-muted,#64748B); margin-top:4px; }

/* scrolling nav body */
.nvx-scroll { flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:4px 0; }
.nvx-scroll::-webkit-scrollbar { width:0; }
.nvx-grouptitle { margin:0; padding:14px 0 4px ${RAIL + 20}px; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--nvx-muted,#64748B); white-space:nowrap; }

.nvx-link { display:flex; align-items:center; height:46px; text-decoration:none; color:var(--nvx-muted,#64748B); position:relative; }
.nvx-link-ico { width:${RAIL}px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; }
.nvx-link-body { flex:1 1 auto; min-width:0; display:flex; align-items:center; justify-content:space-between; gap:8px; padding-right:14px; }
.nvx-link-lab { min-width:0; font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nvx-link:hover { background:var(--nvx-hover-bg,#F4F7FA); color:var(--nvx-text-strong,#111827); }
.nvx-link.active { background:var(--nvx-active-bg,#E6F2F1); color:var(--nvx-active-text,#096058); }
.nvx-link.active .nvx-link-lab { font-weight:600; }
.nvx-link.active::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--nvx-accent,#0A7068); }
.nvx-link:focus-visible { outline:2px solid var(--nvx-accent,#0D8278); outline-offset:-2px; }
.nvx-badge { flex:0 0 auto; min-width:20px; height:18px; padding:0 6px; border-radius:999px; background:var(--nvx-accent,#0A7068); color:var(--nvx-on-accent,#FFFFFF); font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; }
.nvx-dot { position:absolute; top:12px; left:44px; width:7px; height:7px; border-radius:50%; background:var(--nvx-accent,#0A7068); border:2px solid var(--nvx-side-bg,#FFFFFF); }

/* footer pinned to the bottom */
.nvx-foot { margin-top:auto; flex:0 0 auto; border-top:1px solid var(--nvx-border,#E2E8F0); padding:10px; display:flex; flex-direction:column; gap:8px; }
.nvx-collapse { display:flex; align-items:center; height:38px; width:100%; border:none; background:none; cursor:pointer; color:var(--nvx-muted,#64748B); border-radius:9px; }
.nvx-collapse:hover { background:var(--nvx-hover-bg,#F4F7FA); color:var(--nvx-text-strong,#111827); }
.nvx-collapse-ico { width:${RAIL}px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; }
.nvx-collapse-lab { font-size:12px; font-weight:600; white-space:nowrap; }
.nvx-collapse:focus-visible { outline:2px solid var(--nvx-accent,#0D8278); outline-offset:-2px; }
.nvx-user { display:flex; align-items:center; }
.nvx-user-av { width:${RAIL}px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; }
.nvx-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--nvx-accent,#0A7068); color:var(--nvx-on-accent,#FFFFFF); font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; }
.nvx-user-info { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; white-space:nowrap; overflow:hidden; }
.nvx-user-name { font-size:14px; font-weight:600; color:var(--nvx-text-strong,#111827); overflow:hidden; text-overflow:ellipsis; }
.nvx-user-role { font-size:12px; color:var(--nvx-muted,#64748B); }
.nvx-iconbtn { width:34px; height:34px; flex:0 0 auto; border:none; background:none; cursor:pointer; color:var(--nvx-muted,#64748B); border-radius:8px; display:flex; align-items:center; justify-content:center; }
.nvx-iconbtn:hover { background:var(--nvx-iconbtn-hover,#EEF2F6); color:var(--nvx-text-strong,#111827); }
.nvx-footrail { display:flex; flex-direction:column; align-items:center; gap:6px; }

/* main content */
.nvx-main { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
.nvx-main-inner { flex:1 1 auto; min-width:0; padding:32px; }

/* mobile */
.nvx-mtop { display:none; position:sticky; top:0; z-index:10; height:56px; align-items:center; gap:12px; padding:0 16px; background:var(--nvx-mtop-bg,rgba(246,248,251,.92)); backdrop-filter:blur(12px); border-bottom:1px solid var(--nvx-border,#E2E8F0); }
.nvx-mtop-name { font-family:'Fraunces',Georgia,serif; font-weight:700; font-size:17px; color:var(--nvx-text-strong,#111827); }
.nvx-mbot { display:none; position:fixed; left:0; right:0; bottom:0; z-index:30; height:62px; background:var(--nvx-side-bg,#FFFFFF); border-top:1px solid var(--nvx-border,#E2E8F0); }
.nvx-mbot a { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; text-decoration:none; color:var(--nvx-muted,#64748B); }
.nvx-mbot a.active { color:var(--nvx-accent,#0A7068); }
.nvx-mbot-lab { font-size:9px; font-weight:600; }
@media (max-width:1023px){
  .nvx-side { display:none; }
  .nvx-mtop, .nvx-mbot { display:flex; }
  .nvx-main-inner { padding:20px 16px 84px; }
}
@media (prefers-reduced-motion:reduce){ .nvx-side { transition:none; } }
`;

const COLLAPSED_CLS = ({ isActive }: { isActive: boolean }) => cn('nvx-link', isActive && 'active');

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

function NavRow({ item, collapsed, badge }: { item: NavItem; collapsed: boolean; badge: number }) {
  return (
    <NavLink to={item.to} end={item.end} title={collapsed ? item.label : undefined} className={COLLAPSED_CLS}>
      <span className="nvx-link-ico">{item.icon}</span>
      <span className="nvx-link-body">
        <span className="nvx-link-lab">{item.label}</span>
        {badge > 0 && <span className="nvx-badge">{badge > 99 ? '99+' : badge}</span>}
      </span>
      {collapsed && badge > 0 && <span className="nvx-dot" aria-hidden="true" />}
    </NavLink>
  );
}

function Sidebar({ collapsed, toggle, unread }: { collapsed: boolean; toggle: () => void; unread: number }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const groups = navForRole(user.role);
  const name = 'full_name' in user ? user.full_name : user.name;
  const initials = name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  const handleLogout = () => { navigate('/'); void logout(); };
  const badgeFor = (item: NavItem) => (item.to === '/app/notifications' ? unread : item.badge ?? 0);

  return (
    <aside className="nvx-side" data-collapsed={collapsed} aria-label="Primary navigation">
      <div className="nvx-brand">
        <NavLink to="/app" className="nvx-brand-mark" aria-label={`${brand.appName} home`}><LogoMark size={36} /></NavLink>
        {!collapsed && (
          <div className="nvx-brand-txt">
            <span className="nvx-brand-name">{brand.appName}</span>
            <span className="nvx-brand-role">{roleLabel[user.role]}</span>
          </div>
        )}
      </div>

      <div className="nvx-scroll">
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed && <p className="nvx-grouptitle">{group.title}</p>}
            {collapsed && <div style={{ height: 14 }} aria-hidden="true" />}
            {group.items.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} badge={badgeFor(item)} />
            ))}
          </div>
        ))}
      </div>

      <div className="nvx-foot">
        <button className="nvx-collapse" onClick={toggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-pressed={collapsed}>
          <span className="nvx-collapse-ico">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</span>
          {!collapsed && <span className="nvx-collapse-lab">Collapse</span>}
        </button>

        {collapsed ? (
          <div className="nvx-footrail">
            <span className="nvx-avatar">{initials}</span>
            <ThemeToggle variant="minimal" className="nvx-iconbtn" />
            <button className="nvx-iconbtn" onClick={handleLogout} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </div>
        ) : (
          <>
            <ThemeToggle variant="segmented" className="w-full" />
            <div className="nvx-user">
              <span className="nvx-user-av"><span className="nvx-avatar">{initials}</span></span>
              <div className="nvx-user-info">
                <span className="nvx-user-name">{name}</span>
                <span className="nvx-user-role">{roleLabel[user.role]}</span>
              </div>
              <button className="nvx-iconbtn" onClick={handleLogout} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const { user } = useAuth();
  if (!user) return null;
  const items = mobileNavItems(user.role);
  return (
    <nav className="nvx-mbot" aria-label="Primary mobile navigation">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn(isActive && 'active')}>
          {item.icon}
          <span className="nvx-mbot-lab">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const { resolved } = useTheme();
  const { collapsed, toggle } = useCollapsed();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetch = () => {
      notificationApi.unreadCount().then((n) => { if (active) setUnread(n); }).catch(() => { /* silent */ });
    };
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => { active = false; clearInterval(id); };
  }, [user]);

  return (
    <div data-skin="editorial" data-theme={resolved} className="nvx-shell">
      <style>{NAV_CSS}</style>

      <Sidebar collapsed={collapsed} toggle={toggle} unread={unread} />

      <div className="nvx-main">
        <header className="nvx-mtop">
          <LogoMark size={28} />
          <span className="nvx-mtop-name">{brand.appName}</span>
          <div style={{ marginLeft: 'auto' }}><ThemeToggle variant="minimal" className="nvx-iconbtn" /></div>
        </header>
        <main key={location.pathname} className="nvx-main-inner">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
