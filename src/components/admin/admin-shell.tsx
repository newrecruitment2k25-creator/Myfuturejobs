import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface AdminPageHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  onRefresh?: () => void;
  refreshLoading?: boolean;
  children?: React.ReactNode;
}

export function AdminPageHeader({
  badge,
  title,
  subtitle,
  backTo,
  backLabel = "Back to Admin Console",
  onRefresh,
  refreshLoading,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#512ACC] via-[#6B4FD6] to-[#512ACC] p-6 shadow-lg">
      <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/5" />
      <div className="absolute right-20 -bottom-24 size-56 rounded-full bg-white/[0.03]" />
      <div className="relative flex flex-col gap-4">
        {backTo && (
          <Link to={backTo} className="inline-flex w-max items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="size-3.5" /> {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {badge && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {badge}
              </div>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="text-sm text-white/50 mt-1 max-w-2xl">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshLoading}
                className="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <RefreshCw className={`mr-1.5 size-3.5 ${refreshLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminSectionCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function AdminSectionCard({ icon, title, subtitle, accent, children, action }: AdminSectionCardProps) {
  return (
    <section className={`rounded-2xl border bg-card p-5 shadow-sm ${accent ? "border-primary/20" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 text-primary">{icon}</span>}
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface AdminStatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "primary" | "success" | "warning" | "destructive";
}

export function AdminStatTile({ label, value, sub, color = "primary" }: AdminStatTileProps) {
  const colorClass = {
    primary: "text-primary",
    success: "text-emerald-500",
    warning: "text-amber-500",
    destructive: "text-destructive",
  }[color];
  return (
    <div className="rounded-xl bg-secondary/40 px-4 py-3 text-center border border-border">
      <p className={`text-2xl font-extrabold tabular-nums ${colorClass}`}>{value}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

interface AdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function AdminEmptyState({ icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="text-muted-foreground mx-auto mb-3">{icon}</div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}
