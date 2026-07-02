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

import { Briefcase, Users, Shield, FileText, Video, LayoutDashboard, Building2, FileSearch as FileSearchIcon, Settings, Activity, MapPin } from "lucide-react";

const INTEL_ITEMS = [
  { to: "/skill-gap",             icon: Brain,      label: "Skill Gap Analysis",   desc: "Compare candidate skills to vacancy" },
  { to: "/career-pathway",        icon: TrendingUp, label: "Career Pathway",        desc: "Progression map to target role" },
  { to: "/taxonomy",              icon: GitBranch,  label: "Taxonomy Intelligence", desc: "MASCO / NEC / NOSS / MQA mapping" },
  { to: "/document-intelligence", icon: FileSearch, label: "Document Intelligence", desc: "Parse resumes and vacancies" },
  { to: "/labour-insights",       icon: BarChart2,  label: "Labour Insights",       desc: "Market & salary intelligence" },
  { to: "/recommended-jobs",      icon: Sparkles,   label: "Recommended Jobs",      desc: "Personalised job recommendations" },
] as const;

// Role-specific navigation links
const JOB_SEEKER_LINKS = [
  { to: "/dashboard",     label: "Dashboard" },
  { to: "/jobs",          label: "Job Search" },
  { to: "/my-cv",         label: "My CV" },
  { to: "/skill-gap",     label: "Skill Gap" },
  { to: "/career-pathway", label: "Career Path" },
  { to: "/recommended-jobs", label: "Recommended" },
] as const;

const EMPLOYER_LINKS = [
  { to: "/employer/dashboard",           label: "Dashboard" },
  { to: "/employer/vacancy-builder",     label: "Post a Job" },
  { to: "/employer/interviews",          label: "Interviews" },
  { to: "/employer/talent-discovery",    label: "Talent Discovery" },
  { to: "/employer/labour-market-intelligence", label: "Labour Intel" },
] as const;

const ADMIN_LINKS = [
  { to: "/admin",                    label: "Console" },
  { to: "/admin/users",              label: "Users" },
  { to: "/admin/candidates",         label: "Candidates" },
  { to: "/admin/audit-logs",         label: "Audit Logs" },
  { to: "/admin/system-monitoring",  label: "System" },
  { to: "/admin/configuration",      label: "Config" },
] as const;

const PUBLIC_LINKS = [
  { to: "/",                label: "Home" },
  { to: "/jobs",            label: "Job Search" },
  { to: "/poc/ai-matching", label: "AI Matching" },
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

  // Build role-specific nav links
  const navLinks = user && role === "employer" ? EMPLOYER_LINKS
    : user && role === "admin" ? ADMIN_LINKS
    : user && role === "job_seeker" ? JOB_SEEKER_LINKS
    : PUBLIC_LINKS;

  const showIntelDropdown = !user || role === "job_seeker";

  return (
    <>
      <header className="perkeso-header" style={{
        background: "#fff",
        borderBottom: "2px solid var(--brand)",
        boxShadow: "0 2px 12px rgba(10,38,71,0.06)",
      }}>
        <div className="perkeso-header-inner" style={{ height: 60, gap: "1.5rem" }}>
          {/* Brand */}
          <Link to="/" className="perkeso-brand" style={{ gap: 8 }}>
            <span style={{
              display: "inline-flex", width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--brand) 0%, var(--accent-blue) 100%)",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(10,38,71,0.2)",
            }}>
              <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 3 }} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="perkeso-brand-name" style={{ fontSize: "1rem" }}>Praxo AI</span>
              <span style={{ fontSize: "0.625rem", color: "var(--subtle)", fontWeight: 500, letterSpacing: "0.02em" }}>PERKESO Employment Intelligence</span>
            </div>
          </Link>

          {/* Desktop nav — role-aware */}
          <nav className="perkeso-nav" style={{ gap: "0.25rem" }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to as any}
                className={`perkeso-nav-link${isActive(pathname, link.to) ? " active" : ""}`}
                style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                {link.label}
              </Link>
            ))}

            {/* Intelligence dropdown — only for public + job seekers */}
            {showIntelDropdown && (
              <div ref={intelRef} className="perkeso-dropdown">
                <button onClick={() => setIntelOpen(v => !v)}
                  className={`perkeso-nav-link${INTEL_ITEMS.some(i => isActive(pathname, i.to)) ? " active" : ""}`}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600 }}>
                  Intelligence
                  <ChevronDown size={13} style={{ transition: "transform 0.15s", transform: intelOpen ? "rotate(180deg)" : "none" }} />
                </button>
                {intelOpen && (
                  <div className="perkeso-dropdown-menu" style={{ minWidth: 300, borderRadius: 12, boxShadow: "0 8px 32px rgba(10,38,71,0.12)", border: "1px solid var(--line)" }}>
                    {INTEL_ITEMS.map(item => (
                      <Link key={item.to} to={item.to as any} className="perkeso-dropdown-item" style={{ borderRadius: 8, padding: "10px 12px", margin: "2px 0" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <item.icon size={15} style={{ color: "var(--accent-blue)" }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.8125rem" }}>{item.label}</div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--muted)", marginTop: 1 }}>{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                    <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }} />
                    <Link to="/demo" className="perkeso-dropdown-item" style={{ borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Play size={15} style={{ color: "var(--success)" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.8125rem" }}>Guided Demo</div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--muted)", marginTop: 1 }}>Walk through all demo steps</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <span style={{ flex: 1 }} />

            {/* Role badge */}
            {user && role && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.03em",
                padding: "3px 10px", borderRadius: 20,
                background: role === "admin" ? "#fef2f2" : role === "employer" ? "var(--accent-glow)" : "var(--success-light)",
                color: role === "admin" ? "#dc2626" : role === "employer" ? "var(--accent-blue)" : "var(--success)",
              }}>
                {role === "admin" ? <Shield size={10} /> : role === "employer" ? <Building2 size={10} /> : <Users size={10} />}
                {role === "admin" ? "ADMIN" : role === "employer" ? "EMPLOYER" : "JOB SEEKER"}
              </span>
            )}

            {user ? (
              <button onClick={handleSignOut}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "none", border: "1px solid var(--line)", borderRadius: 8,
                  padding: "6px 14px", fontSize: "0.8125rem", fontWeight: 600,
                  color: "var(--muted)", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--brand)"; el.style.color = "var(--brand)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--line)"; el.style.color = "var(--muted)"; }}
              >
                <LogOut size={13} /> Sign out
              </button>
            ) : (
              <Link to="/login"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg, var(--brand) 0%, var(--accent-blue) 100%)",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "7px 16px", fontSize: "0.8125rem", fontWeight: 700,
                  textDecoration: "none", boxShadow: "0 2px 8px rgba(10,38,71,0.15)",
                }}>
                Sign in <ArrowRight size={12} />
              </Link>
            )}
          </nav>

          {/* Mobile burger */}
          <button onClick={() => setMobileOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, marginLeft: "auto", display: "none" }}
            className="perkeso-mobile-burger">
            <Menu size={22} style={{ color: "var(--brand)" }} />
          </button>
        </div>
      </header>

      {/* Mobile overlay — role-aware */}
      {mobileOpen && (
        <div className="perkeso-mobile-overlay" style={{ background: "linear-gradient(180deg, var(--brand) 0%, var(--brand-dark) 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 3 }} />
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 800, color: "#fff" }}>Praxo AI</span>
            </div>
            <button onClick={() => setMobileOpen(false)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex" }}>
              <X size={18} style={{ color: "#fff" }} />
            </button>
          </div>
          {(user ? navLinks : PUBLIC_LINKS).map(l => (
            <Link key={l.to} to={l.to as any} className="perkeso-mobile-nav-link" style={{ fontSize: "0.9375rem", padding: "12px 16px", borderRadius: 10 }}>{l.label}</Link>
          ))}
          {showIntelDropdown && (
            <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.5rem" }}>
              {INTEL_ITEMS.map(item => (
                <Link key={item.to} to={item.to as any} className="perkeso-mobile-nav-link" style={{ fontSize: "0.875rem", padding: "10px 16px", borderRadius: 8, opacity: 0.8 }}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
            {user ? (
              <button onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
                <LogOut size={14} /> Sign out
              </button>
            ) : (
              <Link to="/login"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 10, padding: "12px 16px", color: "var(--brand)", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}>
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
  const ls: React.CSSProperties = { fontSize: "0.8125rem", fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" };
  return (
    <footer className="site-footer" style={{ background: "linear-gradient(180deg, var(--brand-dark) 0%, #040d1a 100%)", padding: "3.5rem 0 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, paddingBottom: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-blue) 0%, #4a90d9 100%)", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 3 }} />
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 800, color: "#fff" }}>Praxo AI</span>
            </div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "rgba(255,255,255,0.45)", marginBottom: 12, maxWidth: 320 }}>
              PERKESO Employment Intelligence — Semantic job matching, skill gap analysis, and labour market insights for Malaysia's workforce.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Semantic AI · PERKESO · SOCSO 🇲🇾
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>Job Seekers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link to="/jobs" style={ls}>Job Search</Link>
              <Link to="/skill-gap" style={ls}>Skill Gap Analysis</Link>
              <Link to="/career-pathway" style={ls}>Career Pathway</Link>
              <Link to="/my-cv" style={ls}>My CV</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>Intelligence</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link to="/poc/ai-matching" style={ls}>AI Matching</Link>
              <Link to="/taxonomy" style={ls}>Taxonomy Intelligence</Link>
              <Link to="/document-intelligence" style={ls}>Document Intelligence</Link>
              <Link to="/labour-insights" style={ls}>Labour Insights</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>Employers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link to="/employer/signup" style={ls}>Register as Employer</Link>
              <Link to="/employer/login" style={ls}>Employer Login</Link>
              <Link to="/employer/talent-discovery" style={ls}>Talent Discovery</Link>
              <Link to="/demo" style={ls}>Guided Demo</Link>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)" }}>© 2025 Praxo AI · PERKESO Employment Intelligence 🇲🇾</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link to="/privacy" style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Privacy</Link>
            <Link to="/terms" style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Terms</Link>
            <Link to="/contact" style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
