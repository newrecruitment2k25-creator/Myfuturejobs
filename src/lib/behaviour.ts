export interface BehaviourData {
  grand_total?: number;
  submitted_application_count?: number;
  interview_count?: number;
  sign_in_count?: number;
  job_offer_count?: number;
  total_applications?: number;
  total_interviews?: number;
  total_offers?: number;
}

export interface EngagementLevel {
  label: string;
  color: string;
  bg: string;
  key: "highly_active" | "active" | "moderate" | "low";
}

export function getEngagementLevel(b: BehaviourData | null | undefined): EngagementLevel {
  if (!b) return { label: "Unknown", color: "#94A3B8", bg: "#F8FAFC", key: "low" };
  const apps = b.submitted_application_count ?? b.total_applications ?? 0;
  const interviews = b.interview_count ?? b.total_interviews ?? 0;
  if (interviews > 3 || apps > 80)  return { label: "🔥 Highly Active", color: "#10B981", bg: "#ECFDF5", key: "highly_active" };
  if (apps > 30)                    return { label: "✅ Active",         color: "#6366F1", bg: "#EEF2FF", key: "active" };
  const total = b.grand_total ?? 0;
  if (total > 200)                  return { label: "✅ Active",         color: "#6366F1", bg: "#EEF2FF", key: "active" };
  if (apps > 10 || total > 50)      return { label: "⚡ Moderate",       color: "#F59E0B", bg: "#FFFBEB", key: "moderate" };
  return                                   { label: "💤 Low Activity",   color: "#94A3B8", bg: "#F8FAFC", key: "low" };
}

export function behaviourBonus(b: BehaviourData | null | undefined): number {
  if (!b) return 0;
  let bonus = 0;
  const apps      = b.submitted_application_count ?? b.total_applications ?? 0;
  const interviews = b.interview_count ?? b.total_interviews ?? 0;
  const signIns   = b.sign_in_count ?? 0;
  const offers    = b.job_offer_count ?? b.total_offers ?? 0;
  const total     = b.grand_total ?? 0;

  if (apps > 80)       bonus += 10;
  else if (apps > 40)  bonus += 7;
  else if (apps > 15)  bonus += 4;

  if (interviews > 5)  bonus += 8;
  else if (interviews > 2) bonus += 5;
  else if (interviews > 0) bonus += 3;

  if (signIns > 40)    bonus += 5;
  else if (signIns > 15) bonus += 3;

  if (offers > 0)      bonus += 5;

  if (total < 10)      bonus -= 5;

  return bonus; // range: -5 to +28
}

export function behaviourTooltip(b: BehaviourData | null | undefined): string {
  if (!b) return "No activity data available.";
  const apps = b.submitted_application_count ?? b.total_applications ?? 0;
  const interviews = b.interview_count ?? b.total_interviews ?? 0;
  return `This candidate has submitted ${apps} application${apps !== 1 ? "s" : ""} and attended ${interviews} interview${interviews !== 1 ? "s" : ""} — ${interviews > 3 || apps > 80 ? "they're actively job hunting." : apps > 10 ? "showing moderate engagement." : "low recent activity."}`;
}
