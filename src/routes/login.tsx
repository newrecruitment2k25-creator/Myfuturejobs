import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Brain, FileText, BarChart2, CheckCircle2, Star, Users, Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Log In — MYFutureJobs" },
      { name: "description", content: "Log in to your MYFutureJobs account." },
    ],
  }),
});

type Role = "job_seeker" | "employer" | "admin";

const ROLE_TABS: { id: Role; label: string; icon: typeof Users }[] = [
  { id: "job_seeker", label: "Job Seeker", icon: Users },
  { id: "employer",   label: "Employer",   icon: Building2 },
  { id: "admin",      label: "Admin",      icon: Shield },
];

const ROLE_DEST: Record<Role, string> = {
  job_seeker: "/dashboard",
  employer:   "/employer/dashboard",
  admin:      "/admin",
};

const PANEL_INFO: Record<Role, { bg: string; eyebrow: string; heading: string; sub: string; features: string[]; quote: string; author: string }> = {
  job_seeker: {
    bg: "var(--brand)",
    eyebrow: "PERKESO · SOCSO · MYFutureJobs 🇲🇾",
    heading: "Malaysia's AI-Powered Employment Portal",
    sub: "Join 1,449 registered candidates using MYFutureJobs to find jobs, build careers, and connect with top employers across 5,828 active vacancies.",
    features: ["AI-powered CV analysis & matching", "Smart resume builder for Malaysian market", "Real-time labour market intelligence", "One-click apply to active vacancies", "Interview prep with AI simulation"],
    quote: '"MYFutureJobs helped me land a job at a top MNC in just 2 weeks. The AI matching is incredible."',
    author: "— Amir Z., Software Engineer · Kuala Lumpur",
  },
  employer: {
    bg: "var(--accent)",
    eyebrow: "EMPLOYER PORTAL · MYFutureJobs 🇲🇾",
    heading: "Hire Smarter with AI-Powered Recruitment",
    sub: "Connect with qualified Malaysian candidates faster. Our AI matches your vacancies to the best talent automatically.",
    features: ["Access 1,449 verified candidate profiles", "Real-time labour market & salary intelligence", "AI-powered vacancy builder & job description", "Automated AI video interviews & scoring", "Shortlist candidates with one click"],
    quote: '"We filled 3 senior engineering positions in under 10 days using MYFutureJobs AI shortlisting. Game changer."',
    author: "— Faizal R., Head of Talent · TechCorp Malaysia",
  },
  admin: {
    bg: "#17152f",
    eyebrow: "GOVERNANCE CONSOLE · MYFutureJobs 🇲🇾",
    heading: "Admin & Operations Centre",
    sub: "Authorised personnel only. Manage users, roles, audit trails, system configuration, and platform governance.",
    features: ["Full user & role management", "Real-time platform analytics & KPIs", "Comprehensive audit log trail", "System configuration & feature flags", "RBAC & PDPA compliance controls"],
    quote: '"Restricted access. All login attempts are logged and monitored."',
    author: "— MYFutureJobs Security Policy",
  },
};

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const search = useSearch({ strict: false }) as { tab?: string };
  const [role, setRole] = useState<Role>("job_seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Preselect Admin tab if ?tab=admin
  useEffect(() => {
    if (search?.tab === "admin") setRole("admin");
  }, [search?.tab]);

  const panel = PANEL_INFO[role];

  const switchRole = (r: Role) => { setRole(r); setError(null); setEmail(""); setPassword(""); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    setSubmitting(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setSubmitting(false);
      setError("Incorrect email or password.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    let actualRole: Role = "job_seeker";
    if (uid) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      if (profile?.role) actualRole = profile.role as Role;
    }

    if (actualRole !== role) {
      await supabase.auth.signOut();
      setSubmitting(false);
      const label = actualRole === "employer" ? "Employer" : actualRole === "admin" ? "Admin" : "Job Seeker";
      setError(`These credentials belong to a ${label} account. Please select the correct role tab above.`);
      return;
    }

    setSubmitting(false);
    toast.success("Welcome back!");
    void navigate({ to: ROLE_DEST[role] as any });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 12px",
    border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)",
    fontSize: 14, color: "var(--ink)", background: "var(--surface)",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, display: "block",
  };

  const btnColor = role === "employer" ? "var(--accent)" : role === "admin" ? "#17152f" : "var(--brand)";

  return (
    <>
    <div style={{ minHeight: "calc(100vh - 64px)", background: "var(--base)", display: "flex" }}>

      {/* ── Left info panel (changes per role) ── */}
      <div style={{ flex: "0 0 42%", background: panel.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px", transition: "background 0.3s" }} className="login-panel">
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>{panel.eyebrow}</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, margin: "0 0 14px" }}>{panel.heading}</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 }}>{panel.sub}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {panel.features.map(text => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={14} style={{ color: "rgba(255,255,255,0.6)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, padding: "18px 22px", background: "rgba(255,255,255,0.08)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 8px", fontStyle: "italic" }}>{panel.quote}</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", margin: 0 }}>{panel.author}</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 6px" }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Select your account type and sign in.</p>
        </div>

        {/* ── Role tabs ── */}
        <div style={{ display: "flex", gap: 6, background: "var(--base)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 4, marginBottom: 24 }}>
          {ROLE_TABS.map(({ id, label, icon: Icon }) => {
            const active = role === id;
            const activeColor = id === "employer" ? "var(--accent)" : id === "admin" ? "#17152f" : "var(--brand)";
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchRole(id)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px 4px", border: "none", borderRadius: "calc(var(--radius-sm) - 2px)",
                  fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s",
                  background: active ? "#fff" : "transparent",
                  color: active ? activeColor : "var(--muted)",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Role badge ── */}
        {role === "admin" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 16, width: "fit-content" }}>
            <Shield size={11} /> RESTRICTED ACCESS — AUTHORISED PERSONNEL ONLY
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="login-email" style={labelStyle}>Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="login-password" style={labelStyle}>Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
              <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            height: 44, background: btnColor, color: "#fff", border: "none",
            borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.15s",
          }}>
            {submitting
              ? <><Loader2 className="size-4 animate-spin" /> Signing in…</>
              : `Sign In as ${ROLE_TABS.find(r => r.id === role)?.label}`
            }
          </button>
        </form>

        {role !== "admin" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            <button type="button"
              onClick={async () => {
                const dest = role === "employer" ? "/employer/dashboard" : "/dashboard";
                const { error: oauthErr } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${dest}` } });
                if (oauthErr) toast.error("Google sign-in is being configured. Please use email/password.");
              }}
              style={{ width: "100%", height: 40, border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", cursor: "pointer", fontSize: 13, color: "var(--ink)" }}
            >
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* MyDigital ID — Malaysian government SSO */}
            <button type="button"
              onClick={() => toast.info("MyDigital ID integration is being configured. Please use email/password for now.")}
              style={{ width: "100%", height: 40, border: "none", borderRadius: "var(--radius-sm)", background: "#003d99", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 600, marginTop: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#002d77"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#003d99"; }}
            >
              {/* MY badge */}
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 5, background: "rgba(255,255,255,0.18)", fontSize: 10, fontWeight: 800, flexShrink: 0, letterSpacing: "0.02em" }}>
                MY
              </span>
              <span style={{ flex: 1, textAlign: "left" }}>Continue with MyDigital ID</span>
              <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 500 }}>Malaysia Gov SSO</span>
            </button>
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          No account? <Link to="/signup" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link>
        </p>
      </div>
      </div>
    </div>
    <SiteFooter />
    </>
  );
}
