import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, LogOut, Home, Briefcase, Brain,
  GitBranch, Building2,
  Users, BarChart2, LayoutDashboard, FileText, Award,
  Sparkles, FileSearch, MapPin, Play, Settings2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notification-bell";
import { useLanguage } from "@/lib/language-context";

const SB = {
  sidebar: { background: 'var(--brand)', height: '100%' } as React.CSSProperties,
  link: (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
    borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500,
    color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
    background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
    textDecoration: 'none', transition: 'background 0.13s, color 0.13s', cursor: 'pointer',
  }),
  groupLabel: {
    fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.38)', padding: '14px 14px 4px', marginTop: 4,
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0' } as React.CSSProperties,
};

function NavLink({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) {
  const router = useRouterState();
  const active = router.location.pathname === to || (to !== '/' && router.location.pathname.startsWith(to));
  return (
    <Link to={to} style={SB.link(active)} onClick={onClick}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={15} /> {label}
    </Link>
  );
}

export function SiteHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }) => setRole(data?.role ?? "job_seeker"));
  }, [user]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = async () => {
    closeDrawer();
    await signOut();
    toast.success("Logged out");
    void navigate({ to: "/" });
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";

  const aiLinks = [
    { to: "/career-pathway",        icon: GitBranch, label: t("careerPathway") },
  ];

  const hiringLinks = [
    { to: "/employer/vacancy-builder",            icon: Briefcase,    label: t("postVacancy") },
    { to: "/employer/talent-discovery",           icon: Users,        label: t("talentDiscovery") },
    { to: "/employer/labour-market-intelligence", icon: BarChart2,    label: t("labourMarket") },
  ];

  const adminLinks = [
    { to: "/admin",                   icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/ai-rules",          icon: Settings2,       label: "AI Rules" },
    { to: "/admin/users",             icon: Users,           label: "Users" },
    { to: "/admin/candidates",        icon: Users,           label: "Candidates" },
    { to: "/admin/employers",         icon: Building2,       label: "Employers" },
    { to: "/admin/placements",        icon: Award,           label: "Placements" },
    { to: "/admin/audit-logs",        icon: FileText,        label: "Audit Logs" },
    { to: "/admin/system-monitoring", icon: BarChart2,       label: "Monitoring" },
    { to: "/admin/configuration",     icon: LayoutDashboard, label: "Configuration" },
    { to: "/admin/taxonomy",          icon: GitBranch,       label: "Taxonomy" },
  ];

  const pocLinks = [
    { to: "/poc/ai-matching",            icon: Sparkles,    label: "AI Matching" },
    { to: "/document-intelligence",      icon: FileSearch,  label: "Document Intelligence" },
    { to: "/taxonomy",                   icon: GitBranch,   label: "Taxonomy Intelligence" },
    { to: "/labour-insights",            icon: BarChart2,   label: "Labour Insights" },
    { to: "/poc/dashboard",              icon: MapPin,      label: "POC Dashboard" },
    { to: "/demo",                       icon: Play,        label: "Guided Demo" },
  ];

  const SidebarContents = ({ onNav }: { onNav?: () => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 16px' }}>
        <Link to="/" onClick={onNav} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Praxo<span style={{ color: 'var(--accent)' }}> AI</span></span>
        </Link>
      </div>

      <div style={SB.divider} />

      {/* Main group */}
      <div style={{ padding: '0 8px' }}>
        <div style={SB.groupLabel}>Main</div>
        <NavLink to="/" icon={Home} label={t("home")} onClick={onNav} />
        <NavLink to="/jobs" icon={Briefcase} label={t("jobs")} onClick={onNav} />
      </div>

      {/* POC group */}
      <>
        <div style={SB.divider} />
        <div style={{ padding: '0 8px' }}>
          <div style={SB.groupLabel}>POC</div>
          {pocLinks.map(l => <NavLink key={l.to} to={l.to} icon={l.icon} label={l.label} onClick={onNav} />)}
        </div>
      </>

      {/* Tools group — job seeker */}
      {(!user || role === "job_seeker") && (
        <>
          <div style={SB.divider} />
          <div style={{ padding: '0 8px' }}>
            <div style={SB.groupLabel}>Tools</div>
            {user && role === "job_seeker" && (
              <NavLink to="/dashboard" icon={LayoutDashboard} label={t("dashboard")} onClick={onNav} />
            )}
            {aiLinks.map(l => <NavLink key={l.to} to={l.to} icon={l.icon} label={l.label} onClick={onNav} />)}
          </div>
        </>
      )}

      {/* Employer group */}
      {user && role === "employer" && (
        <>
          <div style={SB.divider} />
          <div style={{ padding: '0 8px' }}>
            <div style={SB.groupLabel}>Employer</div>
            <NavLink to="/employer/dashboard" icon={LayoutDashboard} label={t("dashboard")} onClick={onNav} />
            {hiringLinks.map(l => <NavLink key={l.to} to={l.to} icon={l.icon} label={l.label} onClick={onNav} />)}
          </div>
        </>
      )}

      {/* Admin group */}
      {user && role === "admin" && (
        <>
          <div style={SB.divider} />
          <div style={{ padding: '0 8px' }}>
            <div style={SB.groupLabel}>Admin</div>
            {adminLinks.map(l => <NavLink key={l.to} to={l.to} icon={l.icon} label={l.label} onClick={onNav} />)}
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom section */}
      <div style={SB.divider} />
      <div style={{ padding: '8px 8px 6px' }}>
        {/* Language */}
        <div style={{ display: 'flex', gap: 4, padding: '4px 6px 8px' }}>
          {(['en', 'bm'] as const).map(code => (
            <button key={code} onClick={() => setLang(code)} style={{
              flex: 1, padding: '5px 0', borderRadius: 'var(--radius-xs)', border: 'none',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.13s',
              background: lang === code ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: lang === code ? '#ffffff' : 'rgba(255,255,255,0.45)',
            }}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        {user ? (
          <>
            {/* User row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{role ?? 'user'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <NotificationBell />
              <button onClick={handleLogout} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 0', border: 'none', borderRadius: 'var(--radius-xs)',
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.13s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              >
                <LogOut size={13} /> {t("logOut")}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0 6px' }}>
            <Link to="/login" onClick={onNav} style={{
              display: 'block', textAlign: 'center', padding: '8px 0',
              background: 'rgba(255,255,255,0.15)', color: '#ffffff',
              borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>{t("login")}</Link>
            <Link to="/employer/login" onClick={onNav} style={{
              display: 'block', textAlign: 'center', padding: '8px 0',
              background: 'var(--accent)', color: '#ffffff',
              borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>{t("employerLogin")}</Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (lg+) ─────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, width: 220, height: '100vh',
        background: 'var(--brand)', zIndex: 50, borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
      }} className="hidden lg:flex">
        <SidebarContents />
      </aside>

      {/* ── MOBILE TOP BAR (below lg) ─────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, height: 56, zIndex: 50,
        background: 'var(--brand)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }} className="lg:hidden">
        <button onClick={() => setDrawerOpen(true)} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Menu size={22} />
        </button>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Praxo<span style={{ color: 'var(--accent)' }}> AI</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && <NotificationBell />}
          {user ? (
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>{initials}</div>
          ) : (
            <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: '#fff', opacity: 0.85, textDecoration: 'none' }}>{t("login")}</Link>
          )}
        </div>
      </header>

      {/* ── MOBILE DRAWER ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          {/* backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={closeDrawer} />
          {/* drawer */}
          <div style={{
            position: 'absolute', left: 0, top: 0, width: 240, height: '100%',
            background: 'var(--brand)', boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 12px 0' }}>
              <button onClick={closeDrawer} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContents onNav={closeDrawer} />
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  const linkStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'color 0.13s' };
  const deadStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.3)', cursor: 'default' };

  return (
    <footer className="site-footer">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, paddingBottom: 32 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Praxo<span style={{ color: 'var(--accent)' }}> AI</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
              PERKESO Employment Intelligence — AI-powered job matching, candidate scoring, and labour market insights.
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>AI-Powered · PERKESO · SOCSO</p>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Job Seekers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/jobs" style={linkStyle}>Find Jobs</Link>
              <Link to="/career-pathway" style={linkStyle}>Career Pathway</Link>
              <Link to="/contact" style={linkStyle}>Contact</Link>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Employers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/employer/vacancy-builder" style={linkStyle}>Post a Job</Link>
              <Link to="/employer/talent-discovery" style={linkStyle}>Find Candidates</Link>
              <Link to="/employer/labour-market-intelligence" style={linkStyle}>Labour Market</Link>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Intelligence</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/poc/ai-matching" style={linkStyle}>AI Matching</Link>
              <Link to="/poc/dashboard" style={linkStyle}>POC Dashboard</Link>
              <Link to="/about" style={linkStyle}>About</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 18, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          © 2025 Praxo AI · PERKESO · SOCSO 🇲🇾
        </div>
      </div>
    </footer>
  );
}
