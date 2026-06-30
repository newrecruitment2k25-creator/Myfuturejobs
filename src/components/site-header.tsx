/**
 * Praxo AI — PERKESO Government Intelligence Header
 * White top-bar, horizontal nav, Intelligence dropdown, status chip, mobile overlay
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, ChevronDown, LogOut,
  BarChart2, FileSearch, GitBranch, TrendingUp,
  Sparkles, Play, ArrowRight, Brain,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const INTEL_ITEMS = [
  { to: "/skill-gap",             icon: Brain,      label: "Skill Gap Analysis",   desc: "Compare candidate skills to vacancy" },
  { to: "/career-pathway",        icon: TrendingUp, label: "Career Pathway",        desc: "Progression map to target role" },
  { to: "/taxonomy",              icon: GitBranch,  label: "Taxonomy Intelligence", desc: "MASCO / NEC / NOSS / MQA mapping" },
  { to: "/document-intelligence", icon: FileSearch, label: "Document Intelligence", desc: "Parse resumes and vacancies" },
  { to: "/labour-insights",       icon: BarChart2,  label: "Labour Insights",       desc: "Market & salary intelligence" },
  { to: "/recommended-jobs",      icon: Sparkles,   label: "Recommended Jobs",      desc: "Personalised job recommendations" },
] as const;

const MOBILE_LINKS = [
  { to: "/",                      label: "Home" },
  { to: "/jobs",                  label: "Job Search" },
  { to: "/poc/ai-matching",       label: "AI Matching" },
  { to: "/skill-gap",             label: "Skill Gap Analysis" },
  { to: "/career-pathway",        label: "Career Pathway" },
  { to: "/taxonomy",              label: "Taxonomy Intelligence" },
  { to: "/document-intelligence", label: "Document Intelligence" },
  { to: "/labour-insights",       label: "Labour Insights" },
  { to: "/recommended-jobs",      label: "Recommended Jobs" },
  { to: "/admin/ai-rules",        label: "AI Rules (Admin)" },
  { to: "/demo",                  label: "Guided Demo" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState().location.pathname;
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const intelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => setRole((data as any)?.role ?? "job_seeker"));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (intelRef.current && !intelRef.current.contains(e.target as Node)) setIntelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setIntelOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <>
      <header className="perkeso-header">
        <div className="perkeso-header-inner">
          {/* Brand */}
          <Link to="/" className="perkeso-brand">
            <span style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 6, background: "var(--brand)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, background: "#fff", borderRadius: 2 }} />
            </span>
            <span className="perkeso-brand-name">Praxo AI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="perkeso-nav">
            <Link to="/" className={`perkeso-nav-link${pathname === "/" ? " active" : ""}`}>Home</Link>
            <Link to="/jobs" className={`perkeso-nav-link${isActive(pathname, "/jobs") ? " active" : ""}`}>Job Search</Link>
            <Link to="/poc/ai-matching" className={`perkeso-nav-link${isActive(pathname, "/poc/ai-matching") ? " active" : ""}`}>AI Matching</Link>

            {/* Intelligence dropdown */}
            <div ref={intelRef} className="perkeso-dropdown">
              <button onClick={() => setIntelOpen(v => !v)}
                className={`perkeso-nav-link${INTEL_ITEMS.some(i => isActive(pathname, i.to)) ? " active" : ""}`}
                style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                Intelligence
                <ChevronDown size={13} style={{ transition: "transform 0.15s", transform: intelOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {intelOpen && (
                <div className="perkeso-dropdown-menu" style={{ minWidth: 280 }}>
                  {INTEL_ITEMS.map(item => (
                    <Link key={item.to} to={item.to as any} className="perkeso-dropdown-item">
                      <item.icon size={14} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.875rem" }}>{item.label}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 1 }}>{item.desc}</div>
                      </div>
                    </Link>
                  ))}
                  <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }} />
                  <Link to="/demo" className="perkeso-dropdown-item">
                    <Play size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.875rem" }}>Guided Demo</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 1 }}>Walk through all demo steps</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {user && role === "admin" && (
              <Link to="/admin" className={`perkeso-nav-link${isActive(pathname, "/admin") ? " active" : ""}`}>Admin</Link>
            )}

            <span style={{ flex: 1 }} />

            {user ? (
              <button onClick={handleSignOut}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px", fontSize: "0.8125rem", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
                <LogOut size={13} /> Sign out
              </button>
            ) : (
              <Link to="/login"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--brand)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
                Sign in <ArrowRight size={12} />
              </Link>
            )}
          </nav>

          {/* Status chip */}
          <div className="perkeso-status-chip">
            <span className="perkeso-status-dot" />
            Semantic AI Active
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMobileOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, marginLeft: "auto", display: "none" }}
            className="perkeso-mobile-burger">
            <Menu size={22} style={{ color: "var(--brand)" }} />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="perkeso-mobile-overlay">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 800, color: "#fff" }}>Praxo AI</span>
            <button onClick={() => setMobileOpen(false)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, cursor: "pointer", padding: 8, display: "flex" }}>
              <X size={18} style={{ color: "#fff" }} />
            </button>
          </div>
          {MOBILE_LINKS.map(l => (
            <Link key={l.to} to={l.to as any} className="perkeso-mobile-nav-link">{l.label}</Link>
          ))}
          <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
            {user ? (
              <button onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: "0.875rem", cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
                <LogOut size={14} /> Sign out
              </button>
            ) : (
              <Link to="/login"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 8, padding: "10px 16px", color: "var(--brand)", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
      <style>{`@media (max-width: 767px) { .perkeso-mobile-burger { display: flex !important; } }`}</style>
    </>
  );
}

export function SiteFooter() {
  const ls: React.CSSProperties = { fontSize: "0.8125rem", fontWeight: 500, color: "rgba(255,255,255,0.6)", textDecoration: "none" };
  return (
    <footer className="site-footer">
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, paddingBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 800, color: "#fff", marginBottom: 8 }}>Praxo AI</div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.65, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              PERKESO Employment Intelligence — Semantic job matching, skill gap analysis, and labour market insights.
            </p>
            <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)" }}>Semantic AI · PERKESO · SOCSO</p>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Explore</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link to="/jobs" style={ls}>Job Search</Link>
              <Link to="/skill-gap" style={ls}>Skill Gap Analysis</Link>
              <Link to="/career-pathway" style={ls}>Career Pathway</Link>
              <Link to="/labour-insights" style={ls}>Labour Insights</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Intelligence</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link to="/poc/ai-matching" style={ls}>AI Matching</Link>
              <Link to="/taxonomy" style={ls}>Taxonomy Intelligence</Link>
              <Link to="/document-intelligence" style={ls}>Document Intelligence</Link>
              <Link to="/demo" style={ls}>Guided Demo</Link>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 18, textAlign: "center", fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)" }}>
          © 2025 Praxo AI · PERKESO Employment Intelligence 🇲🇾
        </div>
      </div>
    </footer>
  );
}
