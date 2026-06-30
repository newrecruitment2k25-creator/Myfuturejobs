import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users, Sparkles, Clock, Building2, GraduationCap, Briefcase, Globe, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

export const Route = createFileRoute("/events")({
  ssr: false,
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Career Fairs & Hiring Events — MYFutureJobs" },
      { name: "description", content: "Discover upcoming career fairs, hiring events, and graduate placement programmes across Malaysia." },
    ],
  }),
});

type EventTag = "Career Fair" | "Tech" | "Graduate" | "Government" | "Nationwide" | "Workshop";

interface CareerEvent {
  id: string;
  name: string;
  organiser: string;
  date: string;
  time: string;
  location: string;
  description: string;
  tags: EventTag[];
  icon: typeof Calendar;
  image: string;
  featured?: boolean;
}

const EVENTS: CareerEvent[] = [
  {
    id: "1",
    name: "PERKESO Career Fair 2026",
    organiser: "PERKESO / SOCSO",
    date: "15 August 2026",
    time: "9:00 AM – 5:00 PM",
    location: "KLCC Convention Centre, Kuala Lumpur",
    description: "Malaysia's largest annual career fair connecting thousands of jobseekers with top employers across all sectors. Over 200 companies, live interviews, and free CV consultations on-site.",
    tags: ["Career Fair", "Nationwide"],
    icon: Briefcase,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80",
    featured: true,
  },
  {
    id: "2",
    name: "Tech Hiring Day 2026",
    organiser: "MDEC & MYFutureJobs",
    date: "22 August 2026",
    time: "10:00 AM – 6:00 PM",
    location: "Cyberjaya Innovation Hub, Selangor",
    description: "Focused tech recruitment event featuring Malaysia's top MNCs and startups. Roles in software engineering, data science, cybersecurity, cloud infrastructure, and product management.",
    tags: ["Tech", "Career Fair"],
    icon: Globe,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    featured: true,
  },
  {
    id: "3",
    name: "Graduate Placement Programme",
    organiser: "Talent Corp Malaysia",
    date: "1–5 September 2026",
    time: "8:30 AM – 4:30 PM",
    location: "Nationwide (KL, Penang, JB, Kota Kinabalu)",
    description: "A 5-day structured graduate placement programme with participating GLCs, MNCs, and SMEs. Fresh graduates are assessed, matched, and placed directly into roles.",
    tags: ["Graduate", "Nationwide"],
    icon: GraduationCap,
    image: "https://images.unsplash.com/photo-1627556704302-624286467c65?w=600&q=80",
  },
  {
    id: "4",
    name: "Government Sector Recruitment Drive",
    organiser: "Jabatan Perkhidmatan Awam (JPA)",
    date: "12 September 2026",
    time: "8:00 AM – 3:00 PM",
    location: "Putrajaya International Convention Centre",
    description: "Open recruitment for federal and state government positions. Roles available in administration, engineering, healthcare, and education. MyDigital ID required for registration.",
    tags: ["Government", "Career Fair"],
    icon: Building2,
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80",
  },
  {
    id: "5",
    name: "HRD Corp Upskilling Fair",
    organiser: "HRD Corp Malaysia",
    date: "26 September 2026",
    time: "9:00 AM – 5:00 PM",
    location: "Mid Valley Exhibition Centre, Kuala Lumpur",
    description: "Connect with HRD Corp-certified training providers and upskilling programmes. Subsidised courses in digital skills, leadership, manufacturing, and professional certification.",
    tags: ["Workshop", "Nationwide"],
    icon: Sparkles,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  },
  {
    id: "6",
    name: "Sarawak Digital Economy Job Fair",
    organiser: "MCMC & Sarawak Digital Economy Corporation",
    date: "10 October 2026",
    time: "9:00 AM – 4:00 PM",
    location: "Borneo Convention Centre, Kuching",
    description: "Dedicated job fair for Sarawak's growing digital economy sector. Targeting roles in fintech, e-commerce, content creation, data analytics, and government digitalisation projects.",
    tags: ["Tech", "Career Fair"],
    icon: Globe,
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&q=80",
  },
];

const TAG_COLORS: Record<EventTag, string> = {
  "Career Fair": "bg-blue-100 text-blue-700 border-blue-200",
  "Tech":        "bg-violet-100 text-violet-700 border-violet-200",
  "Graduate":    "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Government":  "bg-amber-100 text-amber-700 border-amber-200",
  "Nationwide":  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Workshop":    "bg-orange-100 text-orange-700 border-orange-200",
};

const AI_SUGGESTIONS = [
  { role: "Software Engineer", event: "Tech Hiring Day 2026", reason: "Matches your technical skills profile" },
  { role: "Fresh Graduate", event: "Graduate Placement Programme", reason: "Ideal for candidates with <2 years experience" },
  { role: "Data Analyst", event: "PERKESO Career Fair 2026", reason: "Multiple analytics roles available" },
];

const TAG_STYLE: Record<EventTag, React.CSSProperties> = {
  "Career Fair": { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  "Tech":        { background: "#ede9fe", color: "#7c3aed", border: "1px solid #ddd6fe" },
  "Graduate":    { background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" },
  "Government":  { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" },
  "Nationwide":  { background: "#cffafe", color: "#0e7490", border: "1px solid #a5f3fc" },
  "Workshop":    { background: "#ffedd5", color: "#9a3412", border: "1px solid #fed7aa" },
};

function EventsPage() {
  return (
    <PublicLayout>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section style={{ background: "var(--brand)", padding: "56px 24px 48px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 20, letterSpacing: "0.05em" }}>
            🇲🇾 NATIONAL TALENT HUB
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, margin: "0 0 16px" }}>
            Career Fairs & Hiring Events
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 540, margin: "0 auto 28px", lineHeight: 1.65 }}>
            Connect with top-tier employers, participate in nationwide career roadshows, and secure your next role through MYFutureJobs's exclusive AI-matched hiring events.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-sm)", padding: "8px 16px", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
            <Calendar size={14} /> {EVENTS.length} Upcoming Events
          </div>
        </div>
      </section>

      {/* ── Filters strip ─────────────────────────────────── */}
      <section style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "8px 14px" }}>
            <Calendar size={14} style={{ color: "var(--muted)" }} />
            <input type="text" placeholder="Search events..." style={{ border: "none", outline: "none", fontSize: 13, color: "var(--ink)", background: "transparent", flex: 1 }} />
          </div>
          {["Event Type", "Location", "Month"].map(f => (
            <select key={f} style={{ padding: "8px 14px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--muted)", background: "#fff", outline: "none" }}>
              <option>{f}</option>
            </select>
          ))}
        </div>
      </section>

      {/* ── Event Cards ───────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="event-grid">
          {EVENTS.map(event => {
            const Icon = event.icon;
            return (
              <div key={event.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lift)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                {/* Event image */}
                <div style={{ height: 180, position: "relative", overflow: "hidden" }}>
                  <img
                    src={event.image}
                    alt={event.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                    onError={e => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = "none";
                      const parent = el.parentElement;
                      if (parent) parent.style.background = "linear-gradient(135deg, var(--brand) 0%, #3b3a8a 100%)";
                    }}
                  />
                  {/* dark gradient overlay at bottom */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                  {event.featured && (
                    <span style={{ position: "absolute", top: 12, left: 12, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em" }}>⭐ Featured</span>
                  )}
                  <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                    {event.tags.slice(0, 1).map(tag => (
                      <span key={tag} style={{ ...TAG_STYLE[tag], fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>{tag}</span>
                    ))}
                  </div>
                  {/* organiser badge at bottom */}
                  <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon size={13} style={{ color: "#fff" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{event.organiser}</span>
                  </div>
                </div>

                <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} />{event.date} • {event.time}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4, margin: 0 }}>{event.name}</h3>
                  <p style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} />{event.location}</p>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{event.description}</p>
                  <button disabled style={{ marginTop: 8, padding: "9px 0", background: "var(--brand)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "not-allowed", opacity: 0.7 }}>
                    Register (Coming Soon)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Host CTA ──────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ background: "var(--brand)", borderRadius: "var(--radius-xl)", padding: "48px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Want to host a career event?</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: "0 0 28px", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            Join forces with MYFutureJobs and PERKESO to bring the best talent to your organization. We provide the platform, AI matching, and logistical support for national-scale success.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Contact Event Team <ArrowRight size={14} />
            </Link>
            <Link to="/about" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Download Partner Guide
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
