import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Brain, FileText, BarChart2, CheckCircle2, Star, Users, Building2, Shield, ArrowRight } from "lucide-react";
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

function getPanelInfo(t: (k: any) => string, role: Role): { bg: string; bgGradient: string; eyebrow: string; heading: string; sub: string; features: string[]; quote: string; author: string; statValue: string; statLabel: string } {
  const panels: Record<Role, { bg: string; bgGradient: string; eyebrow: string; heading: string; sub: string; features: string[]; quote: string; author: string; statValue: string; statLabel: string }> = {
    job_seeker: {
      bg: "var(--brand)",
      bgGradient: "linear-gradient(160deg, #512ACC 0%, #6B4FD6 60%, #1a4a82 100%)",
      eyebrow: t("loginSeekerEyebrow"),
      heading: t("loginSeekerHeading"),
      sub: t("loginSeekerSub"),
      features: [t("loginSeekerF1"), t("loginSeekerF2"), t("loginSeekerF3"), t("loginSeekerF4"), t("loginSeekerF5")],
      quote: t("loginSeekerQuote"),
      author: t("loginSeekerAuthor"),
      statValue: t("loginSeekerStatValue"),
      statLabel: t("loginSeekerStatLabel"),
    },
    employer: {
      bg: "var(--accent)",
      bgGradient: "linear-gradient(160deg, #6B4FD6 0%, #512ACC 60%, #7B5CE0 100%)",
      eyebrow: t("loginEmployerEyebrow"),
      heading: t("loginEmployerHeading"),
      sub: t("loginEmployerSub"),
      features: [t("loginEmployerF1"), t("loginEmployerF2"), t("loginEmployerF3"), t("loginEmployerF4"), t("loginEmployerF5")],
      quote: t("loginEmployerQuote"),
      author: t("loginEmployerAuthor"),
      statValue: t("loginEmployerStatValue"),
      statLabel: t("loginEmployerStatLabel"),
    },
    admin: {
      bg: "#17152f",
      bgGradient: "linear-gradient(160deg, #0d0a23 0%, #1a1535 60%, #252045 100%)",
      eyebrow: t("loginAdminEyebrow"),
      heading: t("loginAdminHeading"),
      sub: t("loginAdminSub"),
      features: [t("loginAdminF1"), t("loginAdminF2"), t("loginAdminF3"), t("loginAdminF4"), t("loginAdminF5")],
      quote: t("loginAdminQuote"),
      author: t("loginAdminAuthor"),
      statValue: "SECURE",
      statLabel: t("loginAdminStatLabel"),
    },
  };
  return panels[role];
}

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

  const panel = getPanelInfo(t, role);

  const roleLabel = role === "job_seeker" ? t("loginRoleJobSeeker") : role === "employer" ? t("loginRoleEmployer") : t("loginRoleAdmin");

  const switchRole = (r: Role) => { setRole(r); setError(null); setEmail(""); setPassword(""); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError(t("loginErrRequired")); return; }
    setSubmitting(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setSubmitting(false);
      setError(t("loginErrIncorrect"));
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
      const label = actualRole === "employer" ? t("loginRoleEmployer") : actualRole === "admin" ? t("loginRoleAdmin") : t("loginRoleJobSeeker");
      setError(t("loginErrWrongRole").replace("{role}", label));
      return;
    }

    setSubmitting(false);
    toast.success(t("loginWelcomeBack"));
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
      <div style={{ flex: "0 0 44%", background: panel.bgGradient, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px", transition: "all 0.3s", position: "relative", overflow: "hidden" }} className="login-panel">
        {/* Decorative shapes */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", right: "10%", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.02)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 16, padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {panel.eyebrow} 🇲🇾
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 16px" }}>{panel.heading}</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0, maxWidth: 420 }}>{panel.sub}</p>
        </div>

        {/* Stat highlight */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: 32, display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", maxWidth: "fit-content" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>{panel.statValue}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{panel.statLabel}</div>
        </div>

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {panel.features.map((text: string) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={13} style={{ color: "rgba(255,255,255,0.7)" }} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", zIndex: 1, marginTop: 36, padding: "20px 24px", background: "rgba(255,255,255,0.06)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 8px", fontStyle: "italic" }}>{panel.quote}</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: 0 }}>{panel.author}</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", background: "var(--base)" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-blue)", marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            {t("loginSecureLogin")}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 6px" }}>{t("loginWelcome")}</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{t("loginSub")}</p>
        </div>

        {/* ── Role tabs ── */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 5, marginBottom: 24, boxShadow: "var(--shadow-card)" }}>
          {ROLE_TABS.map(({ id, icon: Icon }) => {
            const label = id === "job_seeker" ? t("loginRoleJobSeeker") : id === "employer" ? t("loginRoleEmployer") : t("loginRoleAdmin");
            const active = role === id;
            const activeColor = id === "employer" ? "var(--accent-blue)" : id === "admin" ? "#252045" : "var(--brand)";
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchRole(id)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "9px 4px", border: "none", borderRadius: 8,
                  fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.2s",
                  background: active ? "#fff" : "transparent",
                  color: active ? activeColor : "var(--muted)",
                  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
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
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, padding: "5px 14px", fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 16, width: "fit-content", letterSpacing: "0.03em" }}>
            <Shield size={11} /> {t("loginRestricted")}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label htmlFor="login-email" style={labelStyle}>{t("loginEmail")}</label>
            <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ ...inputStyle, height: 46, borderRadius: 10 }} />
          </div>
          <div>
            <label htmlFor="login-password" style={labelStyle}>{t("loginPassword")}</label>
            <input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, height: 46, borderRadius: 10 }} />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>!</span>
              </div>
              <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            height: 48, background: `linear-gradient(135deg, ${btnColor} 0%, ${btnColor}dd 100%)`, color: "#fff", border: "none",
            borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
            boxShadow: "0 4px 12px rgba(81,42,204,0.15)",
          }}
          onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
          >
            {submitting
              ? <><Loader2 className="size-4 animate-spin" /> {t("loginSigningIn")}</>
              : <>{t("loginSignInAs")} {roleLabel} <ArrowRight size={15} /></>
            }
          </button>
        </form>

        {role !== "admin" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, letterSpacing: "0.02em" }}>{t("loginOrContinue")}</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button"
                onClick={async () => {
                  const dest = role === "employer" ? "/employer/dashboard" : "/dashboard";
                  const { error: oauthErr } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${dest}` } });
                  if (oauthErr) toast.error("Google sign-in is being configured. Please use email/password.");
                }}
                style={{ flex: 1, height: 44, border: "1px solid var(--line-strong)", borderRadius: 10, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 14px", cursor: "pointer", fontSize: 13, color: "var(--ink)", fontWeight: 600, transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-blue)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line-strong)"; }}
              >
                <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>

              <button type="button"
                onClick={() => toast.info("MyDigital ID integration is being configured. Please use email/password for now.")}
                style={{ flex: 1, height: 44, border: "1px solid #003d99", borderRadius: 10, background: "#003d99", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 14px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 600, transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#002d77"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#003d99"; }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                  MY
                </span>
                MyDigital ID
              </button>
            </div>
          </>
        )}

        <p style={{ marginTop: 28, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          {t("loginNoAccount")} <Link to="/signup" style={{ color: "var(--accent-blue)", fontWeight: 700, textDecoration: "none" }}>{t("loginCreateOne")}</Link>
        </p>
      </div>
      </div>
    </div>
    <SiteFooter />
    </>
  );
}
