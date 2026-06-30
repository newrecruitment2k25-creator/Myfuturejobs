/**
 * Server-side notification helper.
 * Uses supabaseAdmin so it bypasses RLS and can insert for any user.
 * Safe to call fire-and-forget (never throws to caller).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface InsertNotificationOpts {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function insertNotification(opts: InsertNotificationOpts): Promise<number> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("notifications")
      .insert({
        user_id: opts.user_id,
        title: opts.title,
        message: opts.message,
        type: opts.type ?? "info",
        link: opts.link ?? null,
        is_read: false,
        metadata: opts.metadata ?? {},
      })
      .select("id");
    if (error) {
      console.warn("[notifications] insert error:", error.message);
      return 0;
    }
    const count = (data as any[])?.length ?? 0;
    console.log("[notifications] inserted notification count:", count);
    return count;
  } catch (e) {
    // Fire-and-forget — never block main flow
    console.warn("[notifications] Failed to insert notification:", e);
    return 0;
  }
}
