import { createFileRoute } from "@tanstack/react-router";
import { callAi, AI_MODELS } from "@/lib/ai-gateway";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/resume-builder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as any;
        if (!body?.action) return json({ error: "action required" }, 400);

        // ── write_summary ─────────────────────────────────────────────────────
        if (body.action === "write_summary") {
          const { name, experiences, skills, targetRole } = body;
          const expText = (experiences ?? [])
            .map((e: any) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate}): ${e.responsibilities}`)
            .join("\n");
          const prompt = `Write a concise, professional 3–4 sentence resume summary for a Malaysian job market.
Candidate: ${name || "Candidate"}
Target role: ${targetRole || "unspecified"}
Experience:\n${expText || "Not provided"}
Skills: ${(skills ?? []).join(", ") || "Not provided"}

Rules:
- Write in first person
- ATS-optimized, action-verb driven
- Highlight value and impact
- Do NOT include salary or IC number
- Return ONLY the summary paragraph, no labels`;

          const { text } = await callAi({
            model: AI_MODELS.GPT5_4_MINI,
            messages: [{ role: "user", content: prompt }],
            timeoutMs: 20000,
          });
          return json({ result: text?.trim() ?? "" });
        }

        // ── improve_bullets ───────────────────────────────────────────────────
        if (body.action === "improve_bullets") {
          const { title, company, responsibilities } = body;
          const prompt = `Rewrite these job responsibilities as 3–5 strong resume bullet points for a Malaysian professional resume.
Role: ${title || "role"} at ${company || "company"}
Original text: ${responsibilities || ""}

Rules:
- Start each bullet with a strong action verb (e.g., Led, Developed, Increased, Streamlined)
- Include quantifiable achievements where possible (% improvements, team size, revenue)
- ATS-friendly language
- Malaysian corporate context
- Return ONLY the bullet points, one per line, starting with "•"`;

          const { text } = await callAi({
            model: AI_MODELS.GPT5_4_MINI,
            messages: [{ role: "user", content: prompt }],
            timeoutMs: 20000,
          });
          return json({ result: text?.trim() ?? "" });
        }

        // ── suggest_skills ────────────────────────────────────────────────────
        if (body.action === "suggest_skills") {
          const { title, experiences, existingSkills } = body;
          const expText = (experiences ?? [])
            .map((e: any) => `${e.title} at ${e.company}: ${e.responsibilities}`)
            .join("\n");
          const prompt = `Suggest 10–15 relevant technical and soft skills for a Malaysian resume.
Job title: ${title || "professional"}
Experience summary:\n${expText || "Not provided"}
Already listed skills: ${(existingSkills ?? []).join(", ") || "none"}

Rules:
- Mix hard skills (tools, technologies, certifications) and soft skills
- Relevant to Malaysian job market (mention HRDF, ISO, MASCO where applicable)
- Do not repeat already listed skills
- Return ONLY a comma-separated list of skills, nothing else`;

          const { text } = await callAi({
            model: AI_MODELS.GPT5_4_MINI,
            messages: [{ role: "user", content: prompt }],
            timeoutMs: 20000,
          });
          const suggested = (text ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
          return json({ skills: suggested });
        }

        // ── ats_score ─────────────────────────────────────────────────────────
        if (body.action === "ats_score") {
          const { resumeData } = body;
          const r = resumeData ?? {};
          const prompt = `Score this Malaysian resume for ATS (Applicant Tracking System) compatibility. Return a JSON object.

Resume data:
- Name: ${r.personalInfo?.name || ""}
- Summary: ${r.summary || ""}
- Education entries: ${(r.education ?? []).length}
- Experience entries: ${(r.experience ?? []).length}
- Skills: ${(r.skills ?? []).join(", ")}
- Languages: ${(r.languages ?? []).map((l: any) => `${l.name} (${l.level})`).join(", ")}
- Has LinkedIn: ${!!r.personalInfo?.linkedin}
- Has phone: ${!!r.personalInfo?.phone}
- Has location: ${!!r.personalInfo?.location}

Evaluate and return ONLY this JSON:
{
  "score": <number 0-100>,
  "grade": "<A/B/C/D>",
  "strengths": ["<up to 3 strengths>"],
  "improvements": ["<up to 4 specific improvements>"],
  "keywords_missing": ["<suggest 3-5 missing ATS keywords based on common Malaysian job postings>"]
}`;

          const { text } = await callAi({
            model: AI_MODELS.GPT5_4_MINI,
            messages: [{ role: "user", content: prompt }],
            timeoutMs: 20000,
          });
          try {
            const cleaned = (text ?? "").replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return json(parsed);
          } catch {
            return json({ score: 0, grade: "—", strengths: [], improvements: ["Could not parse response"], keywords_missing: [] });
          }
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});
