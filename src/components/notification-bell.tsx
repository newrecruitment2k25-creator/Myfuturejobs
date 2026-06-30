import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Notification {
  id: string;
  created_at: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
}

function typeIcon(type: string) {
  switch (type) {
    case "success":  return <CheckCircle className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />;
    case "warning":  return <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />;
    case "error":    return <XCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />;
    default:         return <Info className="size-3.5 text-blue-500 shrink-0 mt-0.5" />;
  }
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, created_at, title, message, type, link, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user]);

  // Poll every 30 seconds while logged in
  useEffect(() => {
    if (!user) return;
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      await (supabase as any).from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
    setOpen(false);
    if (n.link) void navigate({ to: n.link as any });
  };

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((p) => !p); if (!open) void fetchNotifications(); }}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-background shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{unreadCount} unread</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void markRead(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent ${n.is_read ? "opacity-60" : "bg-primary/3"}`}
                >
                  {typeIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold text-foreground leading-snug ${!n.is_read ? "font-bold" : ""}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="mt-1 size-2 rounded-full bg-primary shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={() => void markAllRead()}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="size-3.5" /> Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
