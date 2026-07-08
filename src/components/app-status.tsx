import { CheckCircle2, Circle, XCircle, Clock } from "lucide-react";
import type { AppStatus } from "@/lib/ops-api";

// ── Config ────────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<AppStatus, { label: string; badge: string; dot: string }> = {
  applied:     { label: "Applied",     badge: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  shortlisted: { label: "Shortlisted", badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  interview:   { label: "Screening",   badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  kiv:         { label: "KIV",         badge: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  offered:     { label: "Offered",     badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  hired:       { label: "Hired",       badge: "bg-green-100 text-green-800 border-green-300",  dot: "bg-green-700" },
  rejected:    { label: "Rejected",    badge: "bg-red-50 text-red-700 border-red-200",         dot: "bg-red-500" },
};

export const PIPELINE_STEPS: AppStatus[] = ["applied", "shortlisted", "interview", "offered", "hired"];
export const ALL_STATUSES: AppStatus[] = ["applied", "shortlisted", "interview", "kiv", "offered", "hired", "rejected"];

// ── Badge ─────────────────────────────────────────────────────────────────────

export function AppStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as AppStatus] ?? {
    label: status,
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cfg.badge}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

export function AppStatusStepper({ status }: { status: AppStatus }) {
  const isTerminal = status === "rejected" || status === "kiv";
  const currentIdx = PIPELINE_STEPS.indexOf(status);

  return (
    <div className="w-full">
      {/* Main pipeline */}
      <div className="flex items-center gap-0">
        {PIPELINE_STEPS.map((step, idx) => {
          const cfg = STATUS_CONFIG[step];
          const isDone = !isTerminal && currentIdx > idx;
          const isCurrent = !isTerminal && currentIdx === idx;
          const isFuture = isTerminal || currentIdx < idx;

          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              {/* Node */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`flex size-6 items-center justify-center rounded-full border-2 transition-all ${
                  isDone ? "border-emerald-500 bg-emerald-500" :
                  isCurrent ? `border-2 ${cfg.dot.replace("bg-", "border-")} bg-white` :
                  "border-border bg-background"
                }`}>
                  {isDone
                    ? <CheckCircle2 className="size-3.5 text-white" />
                    : isCurrent
                    ? <Circle className={`size-3 ${cfg.dot.replace("bg-", "text-")}`} />
                    : <Circle className="size-3 text-muted-foreground/30" />
                  }
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isDone ? "text-emerald-600" : isCurrent ? "text-foreground" : "text-muted-foreground/50"
                }`}>
                  {cfg.label}
                </span>
              </div>
              {/* Connector */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${isDone ? "bg-emerald-400" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* KIV / Rejected terminal badge */}
      {isTerminal && (
        <div className="mt-2 flex items-center gap-1.5">
          {status === "rejected"
            ? <XCircle className="size-3.5 text-red-500 shrink-0" />
            : <Clock className="size-3.5 text-yellow-600 shrink-0" />
          }
          <span className={`text-xs font-semibold ${status === "rejected" ? "text-red-600" : "text-yellow-700"}`}>
            {STATUS_CONFIG[status].label}
          </span>
        </div>
      )}
    </div>
  );
}
