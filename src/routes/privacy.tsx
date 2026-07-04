import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ChevronRight } from "lucide-react";
import { SiteFooter } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/privacy")({
  ssr: false,
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — MYFutureJobs" },
      { name: "description", content: "How MYFutureJobs collects, uses, and protects your personal information." },
    ],
  }),
});

const PRIVACY_SECTIONS = [
  { id: "intro",    num: "01", title: "Introduction",        body: `Welcome to MYFutureJobs, a PERKESO Initiative. We are committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information in accordance with the Personal Data Protection Act 2010 (PDPA) of Malaysia.\n\nBy using the MYFutureJobs platform, you consent to the data practices described in this statement. We ensure that your career journey is supported by secure, ethical data handling practices designed to maximise your employability while maintaining absolute digital sovereignty over your personal information.` },
  { id: "data",     num: "02", title: "Data Collection",     body: `We collect information that you provide directly to us, including but not limited to:\n• Personal Identification: Full name, NRIC/Passport number, date of birth.\n• Contact Information: Email address, phone number, residential address.\n• Professional Profile: Resume data, work history, educational qualifications, skills, and certifications.\n• Technical Data: IP address, browser type, and device identifiers collected through your interactions with our platform.` },
  { id: "use",      num: "03", title: "How We Use Data",     body: `We use your information to provide and improve our services, match jobseekers with relevant opportunities, enable AI-powered CV analysis and interview preparation, communicate with you, and comply with legal obligations. We may also use anonymised data for research and platform improvements.` },
  { id: "ai",       num: "04", title: "AI Processing", body: `MYFutureJobs leverages the MYFutureJobs Engine to provide precision career matching and resume optimisation.\n\nAnonymised Synthesis: Your data is stripped of direct identifiers before being processed for skill-gap analysis and job recommendations.\n\nNo Training Usage: We do not use your private personal data to train public AI models. Your data remains within the MYFutureJobs secure perimeter.\n\nAI-generated insights are designed to assist, not replace, human judgment in the recruitment process.` },
  { id: "storage",  num: "05", title: "Data Storage",        body: `Your data is stored on high-security servers located within Malaysia to ensure full compliance with national data sovereignty laws. We utilise military-grade AES-256 encryption for data at rest and TLS 1.3 for data in transit.\n\nRetention Policy: We retain your information for as long as your account is active or as needed to provide you services, unless a longer retention period is required by law.` },
  { id: "sharing",  num: "06", title: "Sharing & Disclosure", body: `We do not sell your personal information. We may share information with employers when you apply for a job or consent to candidate matching, with service providers who help us operate the platform, and when required by law or to protect our rights and safety.` },
  { id: "rights",   num: "07", title: "Your Rights",          body: `You have the right to:\n• Access your personal data\n• Correct inaccuracies\n• Request data deletion\n• Withdraw consent\n\nContact our Data Protection Officer at dpo@myfuturejobs.gov.my to exercise these rights.` },
  { id: "cookies",  num: "08", title: "Cookies",              body: `We may use cookies and similar technologies to enhance your experience, remember preferences, and analyse usage. You can manage cookie preferences through your browser settings.` },
  { id: "security", num: "09", title: "Security",             body: `We implement appropriate technical and organisational measures to protect your data. However, no internet transmission or storage system is completely secure and we cannot guarantee absolute security.` },
];

function PrivacyPage() {
  const { t } = useLanguage();
  return (
    <>
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          <Link to="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <ChevronRight size={13} />
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{t("privacyTitle")}</span>
        </div>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", margin: "0 0 8px" }}>{t("privacyTitle")}</h1>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("privacyUpdated")}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start" }} className="privacy-grid">

          {/* TOC sidebar */}
          <div style={{ position: "sticky", top: 72, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "16px 0", overflow: "hidden" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", padding: "0 16px 10px" }}>{t("privacyContents")}</div>
            {PRIVACY_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ display: "block", padding: "7px 16px", fontSize: 13, color: "var(--muted)", textDecoration: "none", borderLeft: "2px solid transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
              >
                {s.title}
              </a>
            ))}
            <div style={{ margin: "12px 16px 0", padding: "10px 12px", background: "rgba(33,31,96,0.05)", borderRadius: "var(--radius-xs)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Shield size={12} style={{ color: "var(--brand)", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: "var(--brand)", lineHeight: 1.5 }}>This document is legally audited for compliance with Malaysian national regulations.</p>
            </div>
          </div>

          {/* Sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {PRIVACY_SECTIONS.map(s => (
              <div key={s.id} id={s.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "28px 32px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{s.num}.</span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{s.title}</h2>
                </div>
                {s.body.split("\n\n").map((para, i) => (
                  <div key={i} style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.75, marginBottom: 12, whiteSpace: "pre-line" }}>{para}</div>
                ))}
              </div>
            ))}
            <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "8px 0 0" }}>
              {t("privacyFooter")}<br />© 2024–2026 MYFutureJobs Platform
            </p>
          </div>
        </div>
      </div>
    </div>
    <SiteFooter />
    </>
  );
}
