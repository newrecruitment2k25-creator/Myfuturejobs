import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export function useRoleGuard(requiredRole: "job_seeker" | "employer") {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setChecking(false);
      void navigate({ to: requiredRole === "employer" ? "/employer/login" : "/login" });
      return;
    }

    setChecking(true);
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        let role: string;

        if (error || !data) {
          // No profile exists (legacy account or trigger missed) — create one and default to requiredRole
          await supabase
            .from("profiles")
            .upsert({ id: user.id, role: requiredRole });
          role = requiredRole;
        } else {
          role = data.role ?? "job_seeker";
        }

        if (role !== requiredRole) {
          const target = role === "employer" ? "/employer/dashboard" : "/dashboard";
          const label = role === "employer" ? "employer" : "jobseeker";
          toast.info(`Redirected to your ${label} dashboard`);
          void navigate({ to: target });
        } else {
          setChecked(true);
        }
        setChecking(false);
      })
      .catch(() => {
        // Network or unexpected error — fail open, allow access rather than crash
        setChecked(true);
        setChecking(false);
      });
  }, [user, authLoading, requiredRole]);

  return { checked, loading: authLoading || checking };
}
