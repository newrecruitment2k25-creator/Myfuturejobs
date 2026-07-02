import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Users, Building2, Zap, Globe, Award } from "lucide-react";
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

function SignupPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"job_seeker" | "employer">("job_seeker");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    // If session returned directly (email confirm OFF), proceed
    if (data.session && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, role });
      setSubmitting(false);
      toast.success("Welcome to MYFutureJobs!");
      void navigate({ to: dashMap[role] });
    } else {
      // Email confirm may be ON — try immediate sign-in as fallback
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
    width: '100%', height: 42, padding: '0 12px',
    border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-sm)',
    fontSize: 14, color: 'var(--ink)', background: 'var(--surface)',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, display: 'block',
  };

  const stats = [
    { icon: Users,  value: "1,449",   label: "Registered Candidates" },
    { icon: Globe,  value: "5,828",  label: "Active Job Listings" },
    { icon: Zap,    value: "85%",   label: "Interview Success Rate" },
    { icon: Award,  value: "#1",    label: "National Employment Portal" },
  ];

  return (
    <>
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--base)', display: 'flex' }}>

      {/* ── Left info panel (changes per role) ── */}
      <div style={{ flex: '0 0 42%', background: role === 'employer' ? 'var(--accent)' : 'var(--brand)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', transition: 'background 0.3s' }} className="login-panel">
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>PERKESO · SOCSO · MYFutureJobs 🇲🇾</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.25, margin: '0 0 16px' }}>Start Your Career Journey Today</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>Malaysia's most intelligent job platform — powered by AI, built for every Malaysian professional.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Icon size={18} style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8 }} />
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 8px', fontStyle: 'italic' }}>"I created my profile, the AI matched me to 12 jobs instantly. Got called for 3 interviews the same week."</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>— Nurul H., HR Executive · Petaling Jaya</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 6px' }}>Create your account</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Select your account type to get started.</p>
        </div>

        {/* Role pill tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--base)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: 24 }}>
          {([
            { id: 'job_seeker' as const, label: 'Job Seeker', icon: Users },
            { id: 'employer'   as const, label: 'Employer',   icon: Building2 },
          ] as const).map(({ id, label, icon: Icon }) => {
            const active = role === id;
            const activeColor = id === 'employer' ? 'var(--accent)' : 'var(--brand)';
            return (
              <button key={id} type="button" onClick={() => { setRole(id); setError(null); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 4px', border: 'none', borderRadius: 'calc(var(--radius-sm) - 2px)',
                  fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? '#fff' : 'transparent',
                  color: active ? activeColor : 'var(--muted)',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Icon size={13} />{label}
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="email" style={labelStyle}>{t("email")}</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>{t("password")}</label>
            <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle} />
          </div>
          {error && <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{
            height: 44, background: role === 'employer' ? 'var(--accent)' : 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Creating account…</> : `Create ${role === 'employer' ? 'Employer' : 'Job Seeker'} Account`}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t("orContinueWith")}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button"
            onClick={async () => {
              const { error: oauthErr } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
              if (oauthErr) toast.error('Google sign-in is being configured. Please use email/password for now.');
            }}
            style={{ height: 40, border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', cursor: 'pointer', fontSize: 13, color: 'var(--ink)' }}
          >
            <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <button disabled style={{ height: 40, border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--base)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', cursor: 'not-allowed', fontSize: 13, color: 'var(--muted)', opacity: 0.6 }}>
            <span style={{ fontSize: 15 }}>🇲🇾</span> Sign up with MyDigital ID
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--muted)', background: 'var(--line)', borderRadius: 4, padding: '2px 6px' }}>Soon</span>
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
          {t("haveAccount")} <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{t("login")}</Link>
        </p>
      </div>
      </div>
    </div>
    <SiteFooter />
    </>
  );
}