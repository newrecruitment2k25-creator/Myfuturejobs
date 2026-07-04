import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/contact")({
  ssr: false,
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Us — MYFutureJobs" },
      { name: "description", content: "Get in touch with the MYFutureJobs team for support, partnerships, or enquiries." },
    ],
  }),
});

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
  padding: "10px 14px", fontSize: 14, color: "var(--ink)", background: "#fff",
  outline: "none", boxSizing: "border-box",
};

function ContactPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", margin: "0 0 10px" }}>{t("contactTitle")}</h1>
          <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>
            {t("contactSub")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "start" }} className="contact-grid">

          {/* Form */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", padding: "36px" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ width: 52, height: 52, background: "rgba(33,31,96,0.08)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Send size={22} style={{ color: "var(--brand)" }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{t("contactFormSent")}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)" }}>{t("contactFormSentSub")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>{t("contactFormName")}</label>
                    <input style={inp} type="text" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>{t("contactFormEmail")}</label>
                    <input style={inp} type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>{t("contactFormSubject")}</label>
                  <select style={{ ...inp }} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                    <option value="">{t("contactSelectTopic")}</option>
                    <option>{t("contactTopicSeeker")}</option>
                    <option>{t("contactTopicEmployer")}</option>
                    <option>{t("contactTopicTechnical")}</option>
                    <option>{t("contactTopicPartnership")}</option>
                    <option>{t("contactTopicOther")}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>{t("contactFormMessage")}</label>
                  <textarea style={{ ...inp, resize: "vertical" }} rows={5} placeholder="Tell us how we can help you..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "var(--brand)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  <Send size={15} /> {t("contactFormSend")}
                </button>
              </form>
            )}
          </div>

          {/* Info sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: Mail,  label: t("contactEmailUs"),       val: "hello@resumy.gov.my",                 sub: null },
              { icon: Phone, label: t("contactCallUs"),         val: "+60 3-8000 8000",                     sub: null },
              { icon: MapPin,label: t("contactOfficeAddr"),  val: "Menara PERKESO, 281 Jalan Ampang,",   sub: "50538 Kuala Lumpur, Malaysia" },
            ].map(({ icon: Icon, label, val, sub }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, background: "var(--base)", borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{val}</div>
                  {sub && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
                </div>
              </div>
            ))}

            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "18px 20px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>{t("contactOfficeHours")}</div>
              {[["Monday - Friday", "8:30 AM - 5:30 PM", false], ["Saturday - Sunday", "Closed", true], ["Public Holidays", "Closed", true]].map(([day, time, closed]) => (
                <div key={day as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{day as string}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: closed ? "#e53e3e" : "var(--ink)" }}>{time as string}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(33,31,96,0.04)", border: "1px solid rgba(33,31,96,0.12)", borderRadius: "var(--radius-lg)", padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Sparkles size={14} style={{ color: "var(--brand)", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: "var(--brand)", lineHeight: 1.5 }}>{t("contactAiSupport")}</p>
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div style={{ marginTop: 48, borderRadius: "var(--radius-xl)", overflow: "hidden", height: 240, background: "var(--line)", position: "relative" }}>
          <div style={{ position: "absolute", bottom: 20, left: 20, background: "#fff", borderRadius: "var(--radius-lg)", padding: "14px 18px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{t("contactHqLocation")}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("contactHqSub")}</div>
          </div>
        </div>

      </div>
    </div>
    <SiteFooter />
    </>
  );
}
