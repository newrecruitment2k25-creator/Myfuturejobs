import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const NAV_LINKS = [
  { label: "Jobs",           href: "/jobs" },
  { label: "AI Matching",   href: "/poc/ai-matching" },
  { label: "Career Pathway",href: "/career-pathway" },
  { label: "About",         href: "/about" },
];

const FOOTER_COLS = [
  {
    heading: "Platform",
    links: [
      { label: "Job Search",          href: "/jobs" },
      { label: "AI Matching",         href: "/poc/ai-matching" },
      { label: "Career Pathway",      href: "/career-pathway" },
      { label: "Employer Portal",     href: "/employer/login" },
    ],
  },
  {
    heading: "Intelligence",
    links: [
      { label: "Labour Market Insights", href: "/employer/labour-market-intelligence" },
      { label: "POC Dashboard",         href: "/poc/dashboard" },
      { label: "Talent Discovery",      href: "/employer/talent-discovery" },
      { label: "Contact",               href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy",   href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

function LoginButtons() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="public-nav-cta">
      {/* MyDigital ID button */}
      <Link
        to="/login"
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "7px 13px",
          background: "#003d99",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#002d77"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#003d99"; }}
      >
        {/* MyDigital ID logo badge */}
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: 4,
          background: "rgba(255,255,255,0.2)",
          fontSize: 10, fontWeight: 800, lineHeight: 1,
          flexShrink: 0,
        }}>MY</span>
        MyDigital ID
      </Link>

      {/* Standard login button */}
      <Link
        to="/login"
        style={{
          display: "inline-flex", alignItems: "center",
          padding: "7px 16px",
          background: "var(--brand)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        Login / Sign Up
      </Link>
    </div>
  );
}

function useUserRole() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }) => setRole(data?.role ?? "job_seeker"));
  }, [user]);

  return { user, loading, role };
}

function AuthedNav({ onMobileClose }: { onMobileClose?: () => void }) {
  const { user, role, loading } = useUserRole();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [ddOpen, setDdOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDdOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (loading) return null;
  if (!user) return <LoginButtons />;

  const dashHref = role === "admin" ? "/admin" : role === "employer" ? "/employer/dashboard" : "/dashboard";
  const roleLabel = role === "admin" ? "Admin" : role === "employer" ? "Employer" : "Job Seeker";
  const roleColor = role === "admin" ? "#6366f1" : role === "employer" ? "var(--accent)" : "var(--brand)";
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Account";

  const handleSignOut = async () => {
    await signOut();
    setDdOpen(false);
    onMobileClose?.();
    void navigate({ to: "/" });
  };

  return (
    <div ref={ref} style={{ position: "relative" }} className="public-nav-cta">
      <button
        onClick={() => setDdOpen(v => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 8px", background: "var(--base)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--ink)" }}
      >
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: roleColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
        <ChevronDown size={12} style={{ color: "var(--muted)", transform: ddOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {ddOpen && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 220, zIndex: 300, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{displayName}</div>
            <div style={{ fontSize: 11, color: roleColor, fontWeight: 600, marginTop: 2 }}>{roleLabel}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{user.email}</div>
          </div>
          <Link to={dashHref as any} onClick={() => setDdOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", textDecoration: "none", borderBottom: "1px solid var(--line)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--base)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          >
            <LayoutDashboard size={15} style={{ color: roleColor }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Go to Dashboard</span>
          </Link>
          <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <LogOut size={15} style={{ color: "#dc2626" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const navA: React.CSSProperties = {
    fontSize: 14, fontWeight: 500, color: "var(--ink)",
    textDecoration: "none", padding: "4px 2px", position: "relative",
    transition: "color 0.13s",
  };
  const navActive: React.CSSProperties = {
    ...navA, color: "var(--brand)", fontWeight: 600,
  };

  return (
    <header style={{ background: "#fff", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 200 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/myfuturejobs-logo.png" alt="Praxo AI" style={{ height: 36, width: "auto" }} />
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="public-nav-links">
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} to={href as any} style={pathname === href ? navActive : navA}>
              {label}
              {pathname === href && (
                <span style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 2, background: "var(--accent)", borderRadius: 2 }} />
              )}
            </Link>
          ))}
        </nav>

        {/* CTA: Auth-aware nav button */}
        <AuthedNav />

        {/* Hamburger */}
        <button onClick={() => setOpen(v => !v)} style={{ display: "none", background: "none", border: "none", color: "var(--ink)", cursor: "pointer", padding: 4 }} className="public-nav-burger">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{ background: "#fff", borderTop: "1px solid var(--line)", padding: "12px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} to={href as any} style={{ fontSize: 15, fontWeight: 500, color: pathname === href ? "var(--brand)" : "var(--ink)", textDecoration: "none" }} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <div style={{ marginTop: 4 }}>
            <AuthedNav onMobileClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer style={{ background: "var(--brand)", color: "#fff", padding: "48px 24px 28px", marginTop: 80 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }} className="footer-grid">
          {/* Brand col */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              Praxo<span style={{ color: "var(--accent)" }}> AI</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 220 }}>
              PERKESO AI Matching — AI Employment Intelligence for Malaysia's workforce.
            </p>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.heading}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
                {col.heading}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(({ label, href }) => (
                  <Link key={href} to={href as any} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            © 2025 Praxo AI. A PERKESO Initiative. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link to="/privacy" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Privacy</Link>
            <Link to="/terms"   style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--base)", display: "flex", flexDirection: "column" }}>
      <PublicNav />
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <PublicFooter />
    </div>
  );
}
