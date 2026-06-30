import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export type OpsRole = "admin" | "employer" | "job_seeker";

type GuardState =
  | { status: "loading" }
  | { status: "authorized"; role: OpsRole; userId: string; email: string }
  | { status: "unauthorized"; role: OpsRole | null }
  | { status: "unauthenticated" };

/**
 * Role guard for admin/protected modules.
 * allowedRoles: the set of roles permitted to access this page.
 * Redirects to /login if unauthenticated.
 * Redirects to role-appropriate dashboard if wrong role — never exposes content.
 */
export function useOpsGuard(allowedRoles: OpsRole[]) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<GuardState>({ status: "loading" });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({ status: "unauthenticated" });
      const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
      void navigate({ to: isAdminRoute ? "/admin/login" : "/login" } as any);
      return;
    }

    Promise.resolve(
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
    ).then(({ data, error }) => {
      const role = (data?.role ?? "job_seeker") as OpsRole;

      if (error || !data) {
        void navigate({ to: "/dashboard" } as any);
        setState({ status: "unauthorized", role: "job_seeker" });
        return;
      }

      if (allowedRoles.includes(role)) {
        setState({ status: "authorized", role, userId: user.id, email: user.email ?? "" });
      } else {
        const dest = role === "employer" ? "/employer/dashboard" : "/dashboard";
        void navigate({ to: dest } as any);
        setState({ status: "unauthorized", role });
      }
    }).catch(() => {
      void navigate({ to: "/dashboard" } as any);
      setState({ status: "unauthorized", role: null });
    });
  }, [user, authLoading]);

  return state;
}
