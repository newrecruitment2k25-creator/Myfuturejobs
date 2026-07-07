import { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--base)", display: "flex", flexDirection: "column" }}>
      <SiteHeader />
      <div style={{ flex: 1, paddingTop: 64 }}>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
