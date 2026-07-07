import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Search, Users, Bot, BarChart3, Settings,
  Plus, HelpCircle, LogOut, Briefcase,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const MENU_ITEMS = [
  { to: "/employer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/employer/talent-discovery", icon: Search, label: "Talent Discovery" },
  { to: "/poc/ai-matching", icon: Users, label: "AI Matching" },
  { to: "/employer/interviews", icon: Bot, label: "AI Interview" },
  { to: "/employer/labour-market-intelligence", icon: BarChart3, label: "Market Analytics" },
  { to: "/employer/settings", icon: Settings, label: "Settings" },
];

export function OfficerSidebar({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--base)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          background: "#0f172a",
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          position: "fixed",
          top: 64,
          bottom: 0,
          left: 0,
          zIndex: 100,
          borderRight: "1px solid #1e293b",
        }}
        className="officer-sidebar"
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Briefcase size={18} style={{ color: "#0f172a" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#fff" }}>Officer Console</div>
            <div style={{ fontSize: "0.625rem", color: "#94a3b8", letterSpacing: "0.02em" }}>AI-Enabled Recruitment</div>
          </div>
        </div>

        {/* Menu */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
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
                  color: active ? "#0f172a" : "#cbd5e1",
                  background: active ? "#06b6d4" : "transparent",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => { if (!active) { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; } }}
                onMouseOut={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#cbd5e1"; } }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* New vacancy */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <Link
            to="/employer/vacancy-builder"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              background: "#06b6d4",
              color: "#0f172a",
              fontSize: "0.8125rem",
              fontWeight: 700,
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            <Plus size={16} /> New Vacancy
          </Link>
        </div>

        {/* Bottom actions */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid #1e293b", paddingTop: 16 }}>
          <Link
            to="/contact"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 8,
              textDecoration: "none",
              color: "#94a3b8",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            <HelpCircle size={16} /> Support
          </Link>
          <button
            onClick={() => signOut()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 260, paddingTop: 64, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
