/**
 * PerksoPrax AI — Premium Dark Header
 * Inline horizontal navigation with dropdown groups, no sidebar.
 */
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, ChevronDown, LogOut, User, Globe,
  Sparkles, Users, Briefcase, Brain, TrendingUp,
  BarChart2, GitBranch, FileText, Settings, Bot,
  MapPin, DollarSign, Award, Zap, Rocket,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { supabase } from "@/integrations/supabase/client";

const LANG_LABELS: Record<string, string> = { en: "EN", bm: "BM", zh: "中文", ta: "த" };
const LANG_OPTIONS = ["en", "bm"] as const; // only EN|BM for now

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

interface NavGroup {
  label: string;
  items: { to: string; label: string; desc?: string; icon?: React.ElementType }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Matching",
    items: [
      { to: "/employer/talent-discovery", label: "AI Candidate Matching", desc: "Find candidates by query", icon: Sparkles },
      { to: "/poc/ai-matching", label: "Vacancy → Candidates", desc: "Match vacancy to top candidates", icon: Users },
      { to: "/poc/recommendations", label: "Recommendations", desc: "AI-generated suggestions", icon: Award },
    ],
  },
  {
    label: "Vacancies",
    items: [
      { to: "/jobs", label: "Vacancy Database", desc: "Browse all postings", icon: Briefcase },
      { to: "/vacancy-parser", label: "Vacancy Parser", desc: "Extract from text", icon: FileText },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/skills-gap", label: "Competency Gap", desc: "Skill gap analysis", icon: Brain },
      { to: "/career-pathway", label: "Career Analysis", desc: "Career trajectory insights", icon: TrendingUp },
      { to: "/salary-intelligence", label: "Compensation Data", desc: "Salary benchmarks", icon: DollarSign },
      { to: "/employer/labour-market-intelligence", label: "Labour Market", desc: "Market intelligence", icon: BarChart2 },
      { to: "/taxonomy-intelligence", label: "Occupation Classification", desc: "NEC taxonomy lookup", icon: GitBranch },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/analyze", label: "Candidate Assessment", desc: "Analyze CV / resume", icon: FileText },
      { to: "/skills-passport", label: "Competency Profile", desc: "Skills passport view", icon: Award },
      { to: "/admin/ai-config", label: "Admin Config", desc: "System configuration", icon: Settings },
      { to: "/chat", label: "AI Assistant", desc: "Ask the AI assistant", icon: Bot },
    ],
  },
];

const PUBLIC_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/jobs", label: "Vacancies" },
  { to: "/poc/ai-matching", label: "Matching" },
  { to: "/about", label: "About" },
];

function Dropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = group.items.some((i) => isActive(pathname, i.to));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: active ? "var(--accent)" : "var(--ink)",
          padding: "8px 12px",
          borderRadius: 8,
          transition: "all 0.15s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.background = "var(--hover)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = active ? "var(--accent)" : "var(--ink)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {group.label}
        <ChevronDown size={13} style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          onMouseEnter={() => setOpen(true)}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            minWidth: 260,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow-drop)",
            padding: 8,
            zIndex: 1000,
          }}
        >
          {group.items.map((item) => {
            const Icon = item.icon || Briefcase;
            const itemActive = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to as any}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "background 0.15s",
                  background: itemActive ? "var(--hover)" : "transparent",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "var(--hover)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = itemActive ? "var(--hover)" : "transparent";
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: itemActive ? "var(--accent)" : "var(--ink)", fontSize: "0.8125rem" }}>{item.label}</div>
                  {item.desc && <div style={{ fontSize: "0.6875rem", color: "var(--muted)", marginTop: 1 }}>{item.desc}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const pathname = useRouterState().location.pathname;
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => setRole((data as any)?.role ?? "job_seeker"));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  const displayName = user?.email ? user.email.split("@")[0] : "";
  const roleLabel = role === "admin" ? "Admin" : role === "employer" ? "Officer" : "Jobseeker";

  return (
    <>
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        zIndex: 1000,
        background: "var(--header-bg)",
        borderBottom: "1px solid var(--line)",
        boxShadow: "var(--shadow-header)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          {/* Brand */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{
              display: "inline-flex", width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Sparkles size={16} style={{ color: "var(--brand-dark)" }} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)" }}>
                PerksoPrax<span style={{ color: "var(--accent)" }}>AI</span>
              </span>
              <span style={{ fontSize: "0.625rem", color: "var(--muted)", fontWeight: 500, letterSpacing: "0.02em" }}>
                Caseworker Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
            {NAV_GROUPS.map((group) => (
              <Dropdown key={group.label} group={group} pathname={pathname} />
            ))}
          </nav>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Language toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, border: "1px solid var(--line)", borderRadius: 8, padding: 2 }}>
              {LANG_OPTIONS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    background: lang === l ? "var(--accent)" : "transparent",
                    color: lang === l ? "var(--brand-dark)" : "var(--muted)",
                    border: "none",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>

            {user ? (
              <div ref={userRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={14} style={{ color: "var(--accent)" }} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{displayName}</div>
                    <div style={{ fontSize: "0.625rem", color: "var(--muted)", lineHeight: 1.2 }}>{roleLabel}</div>
                  </div>
                  <ChevronDown size={12} style={{ color: "var(--muted)", transition: "transform 0.15s", transform: userMenuOpen ? "rotate(180deg)" : "none" }} />
                </button>
                {userMenuOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    minWidth: 180,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-drop)",
                    padding: 8,
                    zIndex: 1001,
                  }}>
                    <button
                      onClick={handleSignOut}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: "var(--ink)",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "var(--hover)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--accent)",
                  color: "var(--brand-dark)",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Sign In
              </Link>
            )}

            {/* Mobile burger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--ink)", display: "none" }}
              className="mobile-burger"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "var(--surface)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)" }}>
              PerksoPrax<span style={{ color: "var(--accent)" }}>AI</span>
            </span>
            <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer" }}>
              <X size={22} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "auto" }}>
            {user ? NAV_GROUPS.flatMap((g) => g.items).map((item) => {
              const Icon = item.icon || Briefcase;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px",
                    borderRadius: 10,
                    color: "var(--ink)",
                    textDecoration: "none",
                    background: isActive(pathname, item.to) ? "var(--hover)" : "transparent",
                  }}
                >
                  <Icon size={18} style={{ color: "var(--accent)" }} />
                  {item.label}
                </Link>
              );
            }) : PUBLIC_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to as any}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px",
                  borderRadius: 10,
                  color: "var(--ink)",
                  textDecoration: "none",
                  background: isActive(pathname, l.to) ? "var(--hover)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            {user ? (
              <button
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            ) : (
              <Link
                to="/login"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  background: "var(--accent)",
                  color: "var(--brand-dark)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 991px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
        }
        @media (min-width: 992px) {
          .desktop-nav { display: flex !important; }
          .mobile-burger { display: none !important; }
        }
      `}</style>
    </>
  );
}

export function SiteFooter() {
  const linkStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--muted)",
    textDecoration: "none",
    transition: "color 0.15s",
  };

  const col = (title: string, links: { to: string; label: string }[]) => (
    <div>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((l) => (
          <Link key={l.to} to={l.to as any} style={linkStyle} onMouseOver={(e) => (e.currentTarget.style.color = "var(--accent)")} onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted)")}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <footer style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "3rem 0 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, paddingBottom: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{
                display: "inline-flex", width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={16} style={{ color: "var(--brand-dark)" }} />
              </span>
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)" }}>
                PerksoPrax<span style={{ color: "var(--accent)" }}>AI</span>
              </span>
            </div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "var(--muted)", marginBottom: 12, maxWidth: 320 }}>
              Caseworker Intelligence Platform for PERKESO employment officers.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", fontWeight: 600, color: "var(--subtle)", padding: "4px 10px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
              AI Engine Online
            </div>
          </div>
          {col("Platform", [
            { to: "/employer/talent-discovery", label: "Matching" },
            { to: "/jobs", label: "Vacancies" },
            { to: "/analyze", label: "CV Assess" },
            { to: "/skills-gap", label: "Skill Gap" },
          ])}
          {col("Intelligence", [
            { to: "/career-pathway", label: "Career Path" },
            { to: "/employer/labour-market-intelligence", label: "Labour Mkt" },
            { to: "/taxonomy-intelligence", label: "Occupation" },
            { to: "/salary-intelligence", label: "Compensation" },
          ])}
          {col("Legal", [
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
            { to: "/about", label: "About" },
          ])}
        </div>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
            © 2026 PerksoPrax AI. PERKESO Caseworker Intelligence Platform.
          </span>
        </div>
      </div>
    </footer>
  );
}
