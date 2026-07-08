import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/employer/signup")({
  ssr: false,
  component: EmployerSignupPage,
  head: () => ({
    meta: [
      { title: "Employer Sign Up — MYFutureJobs" },
      { name: "description", content: "Create an employer account on MYFutureJobs to post jobs." },
    ],
  }),
});

function EmployerSignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSubmitting(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/employer/login`,
        data: { role: "employer" },
      },
    });
    if (err) { setSubmitting(false); setError(err.message); return; }
    if (data.session && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, role: "employer" });
      setSubmitting(false);
      toast.success("Welcome to MYFutureJobs for Employers!");
      void navigate({ to: "/employer/dashboard" });
    } else {
      // Email confirm may be ON — try immediate sign-in as fallback
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr || !signInData.user) {
        setSubmitting(false);
        toast.success("Account created! Check your email to confirm, then log in.");
        void navigate({ to: "/employer/login" });
        return;
      }
      await supabase.from("profiles").upsert({ id: signInData.user.id, role: "employer" });
      setSubmitting(false);
      toast.success("Welcome to MYFutureJobs for Employers!");
      void navigate({ to: "/employer/dashboard" });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px',
    border: '1px solid var(--line)', borderRadius: 12,
    fontSize: 14, color: 'var(--ink)', background: 'var(--base)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '40px 36px', boxShadow: '0 8px 40px rgba(81,42,204,0.08)' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#f36c21', textTransform: 'uppercase', marginBottom: 8, padding: '3px 10px', borderRadius: 20, background: 'rgba(243,108,33,0.08)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f36c21', display: 'inline-block' }} />
            For Employers
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>Create Employer Account</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Post jobs and reach Malaysian talent.</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="email" style={labelStyle}>Work Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(81,42,204,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(81,42,204,0.08)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(81,42,204,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(81,42,204,0.08)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          {error && <p style={{ fontSize: 13, color: '#dc2626', margin: 0, background: 'rgba(220,38,38,0.06)', borderRadius: 8, padding: '8px 12px' }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{
            height: 46, background: 'linear-gradient(135deg, #512ACC 0%, #512ACC 100%)', color: '#fff', border: 'none',
            borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(81,42,204,0.15)', transition: 'all 0.15s',
          }}>
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Creating account…</> : 'Sign Up as Employer'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <button type="button"
          onClick={async () => {
            const { error: oauthErr } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/employer/dashboard` } });
            if (oauthErr) toast.error('Google sign-in is being configured.');
          }}
          style={{ width: '100%', height: 44, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink)', transition: 'all 0.15s' }}
        >
          <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
          Already have an account? <Link to="/employer/login" style={{ color: '#f36c21', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
        </p>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          <Link to="/signup" style={{ color: '#512ACC', textDecoration: 'none', fontWeight: 600 }}>Job Seeker Sign Up</Link>
        </p>
      </div>
    </div>
  );
}