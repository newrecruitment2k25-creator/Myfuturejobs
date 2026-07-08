import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Users, Building2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Sign Up — MYFutureJobs" },
      { name: "description", content: "Create a free MYFutureJobs account to save your CV analyses." },
    ],
  }),
});

type SignupRole = "job_seeker" | "employer";

const SIGNUP_TABS: { id: SignupRole; label: string; icon: typeof Users }[] = [
  { id: "job_seeker", label: "Job Seeker", icon: Users },
  { id: "employer",   label: "Employer",   icon: Building2 },
];

const ROLE_COPY: Record<SignupRole, { title: string; subtitle: string; cta: string }> = {
  job_seeker: {
    title: "Create your account",
    subtitle: "Get matched to jobs based on your skills and experience.",
    cta: "Create Job Seeker Account",
  },
  employer: {
    title: "Register as employer",
    subtitle: "Post jobs and find the right talent for your company.",
    cta: "Create Employer Account",
  },
};

function SignupPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const search = useSearch({ strict: false }) as { tab?: string };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("job_seeker");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (search?.tab === "employer") setRole("employer");
  }, [search?.tab]);

  const copy = ROLE_COPY[role];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSubmitting(true);
    const redirectMap = { job_seeker: "/login", employer: "/login" };
    const dashMap = { job_seeker: "/dashboard", employer: "/employer/dashboard" };
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}${redirectMap[role]}`, data: { role } },
    });
    if (err) { setSubmitting(false); setError(err.message); return; }
    if (data.session && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, role });
      setSubmitting(false);
      toast.success("Welcome to MYFutureJobs!");
      void navigate({ to: dashMap[role] });
    } else {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr || !signInData.user) {
        setSubmitting(false);
        toast.success("Account created! Check your email to confirm, then log in.");
        void navigate({ to: redirectMap[role] });
        return;
      }
      await supabase.from("profiles").upsert({ id: signInData.user.id, role });
      setSubmitting(false);
      toast.success("Welcome to MYFutureJobs!");
      void navigate({ to: dashMap[role] });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 48, padding: "0 14px",
    border: "1px solid var(--line)", borderRadius: 12,
    fontSize: 14, color: "var(--ink)", background: "var(--base)",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6, display: "block",
  };

  return (
    <>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(135deg, #FAFAFA 0%, #F5F3FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 440, background: "#fff", border: "1px solid var(--line)", borderRadius: 24, padding: "40px 36px", boxShadow: "0 12px 48px rgba(81,42,204,0.08)" }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ display: "inline-flex", width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--brand) 0%, #7B5CE0 100%)", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 14, height: 14, background: "#fff", borderRadius: 4 }} />
            </span>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>MYFutureJobs</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>PERKESO Career Gateway</div>
            </div>
          </div>

          {/* Role tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 28 }}>
            {SIGNUP_TABS.map(({ id, icon: Icon, label }) => {
              const active = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setRole(id); setError(null); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    padding: "14px 8px", borderRadius: 14, border: active ? "2px solid var(--brand)" : "1px solid var(--line)",
                    background: active ? "rgba(81,42,204,0.06)" : "var(--base)", cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <Icon size={20} style={{ color: active ? "var(--brand)" : "var(--muted)" }} />
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 600, color: active ? "var(--brand)" : "var(--ink)" }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Header copy */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 6px" }}>{copy.title}</h1>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>{copy.subtitle}</p>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(81,42,204,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(81,42,204,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input id="password" type="password" autoComplete="new-password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(81,42,204,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(81,42,204,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
              />
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
              height: 48, background: "linear-gradient(135deg, #31C47A 0%, #27A866 100%)", color: "#fff", border: "none",
              borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
              boxShadow: "0 4px 16px rgba(49,196,122,0.25)",
            }}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Creating account…</> : <>{copy.cta} <ArrowRight size={15} /></>}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          <button type="button"
            onClick={async () => {
              const { error: oauthErr } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
              if (oauthErr) toast.error("Google sign-in is being configured. Please use email/password for now.");
            }}
            style={{ width: "100%", height: 46, border: "1px solid var(--line)", borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "var(--ink)", fontWeight: 600, transition: "all 0.15s" }}
          >
            <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ marginTop: 28, fontSize: 14, color: "var(--muted)", textAlign: "center" }}>
            Already have an account? <Link to="/login" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}