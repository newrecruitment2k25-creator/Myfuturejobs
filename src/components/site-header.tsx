/**
 * MYFutureJobs — PERKESO Government Intelligence Header
 * White top-bar, horizontal nav, Intelligence dropdown, status chip, mobile overlay
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, ChevronDown, LogOut,
  BarChart2, FileSearch, GitBranch, TrendingUp,
  Sparkles, Play, ArrowRight, Brain, Globe,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { supabase } from "@/integrations/supabase/client";

import { Briefcase, Users, Shield, FileText, Video, LayoutDashboard, Building2, FileSearch as FileSearchIcon, Settings, Activity, MapPin } from "lucide-react";

const INTEL_ITEMS_ALL = [
  { to: "/skill-gap",             icon: Brain,      labelKey: "navSkillGap",         descKey: "intelSkillGapDesc" },
  { to: "/career-pathway",        icon: TrendingUp, labelKey: "navCareerPathway",     descKey: "intelCareerPathwayDesc" },
  { to: "/taxonomy",              icon: GitBranch,  labelKey: "landingCap3Tag",       descKey: "intelTaxonomyDesc" },
  { to: "/document-intelligence", icon: FileSearch, labelKey: "navDocumentIntel",    descKey: "intelDocumentDesc" },
  { to: "/labour-insights",       icon: BarChart2,  labelKey: "navLabourInsights",    descKey: "intelLabourDesc" },
  { to: "/recommended-jobs",      icon: Sparkles,   labelKey: "navRecommendedJobs",   descKey: "intelRecommendedDesc" },
] as const;

// Job seeker only sees relevant intelligence items
const INTEL_ITEMS_JOB_SEEKER = INTEL_ITEMS_ALL.filter(i =>
  ["/skill-gap", "/career-pathway", "/labour-insights", "/recommended-jobs"].includes(i.to)
);

// Role-specific navigation links
const JOB_SEEKER_LINKS = [
  { to: "/dashboard",     labelKey: "navDashboard" },
  { to: "/jobs",          labelKey: "navJobSearch" },
  { to: "/my-cv",         labelKey: "navMyCV" },
  { to: "/about",         labelKey: "navAbout" },
  { to: "/events",        labelKey: "navEvents" },
  { to: "/contact",       labelKey: "navContact" },
] as const;

const EMPLOYER_LINKS = [
  { to: "/employer/dashboard",           labelKey: "navDashboard" },
  { to: "/employer/vacancy-builder",     labelKey: "navPostJob" },
  { to: "/employer/talent-discovery",    labelKey: "navTalentDiscovery" },
  { to: "/employer/labour-market-intelligence", labelKey: "navLabourIntel" },
  { to: "/about",         labelKey: "navAbout" },
  { to: "/events",        labelKey: "navEvents" },
  { to: "/contact",       labelKey: "navContact" },
] as const;

const ADMIN_LINKS = [
  { to: "/admin",                    labelKey: "navConsole" },
  { to: "/admin/users",              labelKey: "navUsers" },
  { to: "/admin/candidates",         labelKey: "navCandidates" },
  { to: "/admin/audit-logs",         labelKey: "navAuditLogs" },
  { to: "/admin/system-monitoring",  labelKey: "navSystem" },
  { to: "/admin/configuration",      labelKey: "navConfig" },
  { to: "/about",         labelKey: "navAbout" },
  { to: "/events",        labelKey: "navEvents" },
  { to: "/contact",       labelKey: "navContact" },
] as const;

const PUBLIC_LINKS = [
  { to: "/",                labelKey: "navHome" },
  { to: "/jobs",            labelKey: "navJobSearch" },
  { to: "/poc/ai-matching", labelKey: "navAiMatching" },
  { to: "/about",           labelKey: "navAbout" },
  { to: "/events",          labelKey: "navEvents" },
  { to: "/contact",         labelKey: "navContact" },
] as const;

const MOBILE_LINKS_PUBLIC = [
  { to: "/",                      labelKey: "navHome" },
  { to: "/jobs",                  labelKey: "navJobSearch" },
  { to: "/poc/ai-matching",       labelKey: "navAiMatching" },
  { to: "/about",                 labelKey: "navAbout" },
  { to: "/events",                labelKey: "navEvents" },
  { to: "/contact",               labelKey: "navContact" },
  { to: "/skill-gap",             labelKey: "navSkillGap" },
  { to: "/career-pathway",        labelKey: "navCareerPathway" },
  { to: "/labour-insights",       labelKey: "navLabourInsights" },
  { to: "/recommended-jobs",      labelKey: "navRecommendedJobs" },
  { to: "/demo",                  labelKey: "headerGuidedDemo" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

const LANG_LABELS: Record<string, string> = { en: "EN", bm: "BM", zh: "中文", ta: "த" };
const LANG_OPTIONS = ["en", "bm", "zh", "ta"] as const;

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const pathname = useRouterState().location.pathname;
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const intelRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => setRole((data as any)?.role ?? "job_seeker"));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (intelRef.current && !intelRef.current.contains(e.target as Node)) setIntelOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setIntelOpen(false); setLangOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  // Build role-specific nav links with translated labels
  const translateLink = (link: { to: string; labelKey: string }) => ({ to: link.to, label: t(link.labelKey as any) });
  const navLinks = (user && role === "employer" ? EMPLOYER_LINKS
    : user && role === "admin" ? ADMIN_LINKS
    : user && role === "job_seeker" ? JOB_SEEKER_LINKS
    : PUBLIC_LINKS).map(translateLink);

  const showIntelDropdown = !user || role === "job_seeker";
  const intelItems = (role === "job_seeker" ? INTEL_ITEMS_JOB_SEEKER : INTEL_ITEMS_ALL).map(i => ({ to: i.to, icon: i.icon, label: t(i.labelKey as any), desc: t(i.descKey as any) }));
  const mobileLinks = user ? navLinks : MOBILE_LINKS_PUBLIC.map(translateLink);

  return (
    <>
      <header className="perkeso-header" style={{
        background: "#fff",
        borderBottom: "2px solid var(--brand)",
        boxShadow: "0 2px 12px rgba(81,42,204,0.06)",
      }}>
        <div className="perkeso-header-inner" style={{ height: 60, gap: "1.5rem" }}>
          {/* Brand */}
          <Link to="/" className="perkeso-brand" style={{ gap: 8 }}>
            <span style={{
              display: "inline-flex", width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--brand) 0%, var(--accent-blue) 100%)",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(81,42,204,0.2)",
            }}>
              <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 3 }} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="perkeso-brand-name" style={{ fontSize: "1rem" }}>MYFutureJobs</span>
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
                  className={`perkeso-nav-link${intelItems.some(i => isActive(pathname, i.to)) ? " active" : ""}`}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600 }}>
                  {t("headerIntelligence")}
                  <ChevronDown size={13} style={{ transition: "transform 0.15s", transform: intelOpen ? "rotate(180deg)" : "none" }} />
                </button>
                {intelOpen && (
                  <div className="perkeso-dropdown-menu" style={{ minWidth: 300, borderRadius: 12, boxShadow: "0 8px 32px rgba(81,42,204,0.12)", border: "1px solid var(--line)" }}>
                    {intelItems.map(item => (
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
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.8125rem" }}>{t("headerGuidedDemo")}</div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--muted)", marginTop: 1 }}>{t("headerGuidedDemoDesc")}</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <span style={{ flex: 1 }} />

            {/* Language toggle */}
            <div ref={langRef} style={{ position: "relative" }}>
              <button onClick={() => setLangOpen(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "none", border: "1px solid var(--line)", borderRadius: 8,
                  padding: "5px 10px", fontSize: "0.75rem", fontWeight: 700,
                  color: "var(--muted)", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--brand)"; el.style.color = "var(--brand)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--line)"; el.style.color = "var(--muted)"; }}
              >
                <Globe size={13} /> {LANG_LABELS[lang]}
                <ChevronDown size={11} style={{ transition: "transform 0.15s", transform: langOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {langOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(81,42,204,0.12)", padding: 4, zIndex: 1000, minWidth: 120 }}>
                  {LANG_OPTIONS.map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "7px 12px", border: "none", borderRadius: 6,
                        fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: lang === l ? "var(--accent-glow)" : "transparent",
                        color: lang === l ? "var(--accent-blue)" : "var(--ink)",
                        transition: "all 0.1s",
                      }}
                      onMouseEnter={e => { if (lang !== l) (e.currentTarget as HTMLElement).style.background = "var(--base)"; }}
                      onMouseLeave={e => { if (lang !== l) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {LANG_LABELS[l]}
                      {lang === l && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-blue)", marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                {role === "admin" ? t("loginRoleAdmin") : role === "employer" ? t("loginRoleEmployer") : t("loginRoleJobSeeker")}
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
                <LogOut size={13} /> {t("headerSignOut")}
              </button>
            ) : (
              <Link to="/login"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg, var(--brand) 0%, var(--accent-blue) 100%)",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "7px 16px", fontSize: "0.8125rem", fontWeight: 700,
                  textDecoration: "none", boxShadow: "0 2px 8px rgba(81,42,204,0.15)",
                }}>
                {t("headerSignIn")} <ArrowRight size={12} />
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
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 800, color: "#fff" }}>MYFutureJobs</span>
            </div>
            <button onClick={() => setMobileOpen(false)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex" }}>
              <X size={18} style={{ color: "#fff" }} />
            </button>
          </div>
          {mobileLinks.map(l => (
            <Link key={l.to} to={l.to as any} className="perkeso-mobile-nav-link" style={{ fontSize: "0.9375rem", padding: "12px 16px", borderRadius: 10 }}>{l.label}</Link>
          ))}
          {showIntelDropdown && (
            <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.5rem" }}>
              {intelItems.map(item => (
                <Link key={item.to} to={item.to as any} className="perkeso-mobile-nav-link" style={{ fontSize: "0.875rem", padding: "10px 16px", borderRadius: 8, opacity: 0.8 }}>
                  {item.label}
                </Link>
              ))}
              <Link to="/demo" className="perkeso-mobile-nav-link" style={{ fontSize: "0.875rem", padding: "10px 16px", borderRadius: 8, opacity: 0.8 }}>
                {t("headerGuidedDemo")}
              </Link>
            </div>
          )}
          {/* Language toggle in mobile */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {LANG_OPTIONS.map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "0.8125rem", fontWeight: 700, transition: "all 0.15s",
                  background: lang === l ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                  color: lang === l ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >{LANG_LABELS[l]}</button>
            ))}
          </div>

          <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
            {user ? (
              <button onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
                <LogOut size={14} /> {t("headerSignOut")}
              </button>
            ) : (
              <Link to="/login"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 10, padding: "12px 16px", color: "var(--brand)", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}>
                {t("headerSignIn")}
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => setRole((data as any)?.role ?? "job_seeker"));
  }, [user]);

  const ls: React.CSSProperties = { fontSize: "0.8125rem", fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" };

  const jobSeekerLinks = [
    { to: "/jobs", label: t("navJobSearch") },
    { to: "/skill-gap", label: t("navSkillGap") },
    { to: "/career-pathway", label: t("navCareerPathway") },
    { to: "/my-cv", label: t("navMyCV") },
    { to: "/recommended-jobs", label: t("navRecommendedJobs") },
  ];

  const employerLinks = [
    { to: "/employer/dashboard", label: t("navDashboard") },
    { to: "/employer/vacancy-builder", label: t("navPostJob") },
    { to: "/employer/talent-discovery", label: t("navTalentDiscovery") },
    { to: "/employer/labour-market-intelligence", label: t("navLabourIntel") },
  ];

  const adminLinks = [
    { to: "/admin", label: t("navConsole") },
    { to: "/admin/users", label: t("navUsers") },
    { to: "/admin/candidates", label: t("navCandidates") },
    { to: "/admin/system-monitoring", label: t("navSystem") },
  ];

  const publicJobSeekerLinks = [
    { to: "/jobs", label: t("navJobSearch") },
    { to: "/skill-gap", label: t("navSkillGap") },
    { to: "/career-pathway", label: t("navCareerPathway") },
  ];

  const publicIntelLinks = [
    { to: "/labour-insights", label: t("navLabourInsights") },
    { to: "/recommended-jobs", label: t("navRecommendedJobs") },
  ];

  const publicEmployerLinks = [
    { to: "/employer/signup", label: t("footerRegisterEmployer") },
    { to: "/employer/login", label: t("footerEmployerLogin") },
    { to: "/demo", label: t("footerGuidedDemo") },
  ];

  const col1 = user && role === "job_seeker" ? jobSeekerLinks
    : user && role === "employer" ? employerLinks
    : user && role === "admin" ? adminLinks
    : publicJobSeekerLinks;

  const col2 = user && role === "job_seeker" ? publicIntelLinks
    : user && role === "employer" ? [{ to: "/employer/talent-discovery", label: t("navTalentDiscovery") }, { to: "/demo", label: t("footerGuidedDemo") }]
    : user && role === "admin" ? [{ to: "/admin/audit-logs", label: t("navAuditLogs") }, { to: "/admin/configuration", label: t("navConfig") }]
    : publicIntelLinks;

  const col3 = user && role === "employer" ? [{ to: "/demo", label: t("footerGuidedDemo") }]
    : user && role === "admin" ? [{ to: "/demo", label: t("footerGuidedDemo") }]
    : publicEmployerLinks;

  const col4Links = [
    { to: "/about", label: t("navAbout") },
    { to: "/events", label: t("navEvents") },
    { to: "/demo", label: t("footerGuidedDemo") },
    { to: "/privacy", label: t("footerPrivacy") },
    { to: "/terms", label: t("footerTerms") },
  ];

  const col1Title = user && role === "employer" ? t("footerEmployers") : user && role === "admin" ? t("navConsole") : t("footerJobSeekers");
  const col2Title = user && role === "employer" ? t("footerIntelligence") : user && role === "admin" ? t("navAuditLogs") : t("footerIntelligence");
  const col3Title = user && role === "employer" ? t("footerMore") : user && role === "admin" ? t("footerMore") : t("footerEmployers");

  return (
    <footer className="site-footer" style={{ background: "linear-gradient(180deg, var(--brand-dark) 0%, #040d1a 100%)", padding: "3.5rem 0 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 40, paddingBottom: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-blue) 0%, #4a90d9 100%)", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 3 }} />
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 800, color: "#fff" }}>MYFutureJobs</span>
            </div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "rgba(255,255,255,0.45)", marginBottom: 12, maxWidth: 320 }}>
              {t("footerDesc")}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Semantic AI · PERKESO · SOCSO 🇲🇾
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>{col1Title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col1.map(l => <Link key={l.to} to={l.to as any} style={ls}>{l.label}</Link>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>{col2Title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col2.map(l => <Link key={l.to} to={l.to as any} style={ls}>{l.label}</Link>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>{col3Title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col3.map(l => <Link key={l.to} to={l.to as any} style={ls}>{l.label}</Link>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>{t("footerMore")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col4Links.map(l => <Link key={l.to} to={l.to as any} style={ls}>{l.label}</Link>)}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)" }}>{t("footerCopyright")}</span>
        </div>
      </div>
    </footer>
  );
}
