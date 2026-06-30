import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAi } from "./ai-gateway";

const InputSchema = z.object({
  missingSkills: z.array(z.string()),
  currentSkills: z.array(z.string()).optional().default([]),
  targetRole: z.string(),
  industry: z.string(),
  employerType: z.string(),
  experienceLevel: z.string()
});

const CourseSchema = z.object({
  name: z.string(),
  platform: z.string(),
  url: z.string(),
  price: z.string(),
  duration: z.string(),
  relevance: z.string(),
  hrd_claimable: z.boolean(),
  malaysian_note: z.string().nullable()
});

const SkillRecommendationSchema = z.object({
  skill_gap: z.string(),
  courses: z.array(CourseSchema)
});

const GoogleCertSchema = z.object({
  name: z.string(),
  url: z.string(),
  duration: z.string(),
  price: z.string()
});

const MalaysianTrainingSchema = z.object({
  name: z.string(),
  platform: z.string(),
  url: z.string(),
  price: z.string(),
  note: z.string()
});

const OutputSchema = z.object({
  recommendations: z.array(z.unknown()).default([]),
  google_certificates: z.array(z.unknown()).default([]),
  malaysian_training: z.array(z.unknown()).default([]),
  learning_path: z.array(z.string()).default([]),
  total_estimated_duration: z.string().default("Unknown"),
  estimated_cost: z.string().default("Unknown")
});

const StrictOutputSchema = z.object({
  recommendations: z.array(SkillRecommendationSchema).default([]),
  google_certificates: z.array(GoogleCertSchema).default([]),
  malaysian_training: z.array(MalaysianTrainingSchema).default([]),
  learning_path: z.array(z.string()).default([]),
  total_estimated_duration: z.string().default("Unknown"),
  estimated_cost: z.string().default("Unknown")
});

type TrainingInput = z.infer<typeof InputSchema>;
export type TrainingOutput = z.infer<typeof StrictOutputSchema>;

export const searchTrainingResources = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }: { data: TrainingInput }): Promise<TrainingOutput> => {
    const { missingSkills, currentSkills, targetRole, industry, employerType, experienceLevel } = data;

    const prompt = `You are a career development advisor specialising in the Malaysian job market. Based on the candidate profile below, recommend REAL courses from known platforms.

Candidate Profile:
- Current Skills: ${currentSkills.length > 0 ? currentSkills.join(", ") : "Not specified"}
- Skills to Develop: ${missingSkills.join(", ")}
- Target Role: ${targetRole}
- Industry: ${industry}
- Employer Type: ${employerType}
- Experience Level: ${experienceLevel}

Use ONLY these platforms and their search URL patterns:
- Coursera: https://www.coursera.org/search?query=ENCODED_TERM
- Udemy: https://www.udemy.com/courses/search/?q=ENCODED_TERM
- LinkedIn Learning: https://www.linkedin.com/learning/search?keywords=ENCODED_TERM
- Google Certificates: https://grow.google/certificates/
- edX: https://www.edx.org/search?q=ENCODED_TERM
- FutureLearn: https://www.futurelearn.com/search?q=ENCODED_TERM
- HRD Corp Malaysia: https://www.hrdcorp.gov.my/
- e-Latih (Malaysian Gov): https://www.e-latih.gov.my/

URL encoding rules: replace spaces with + in query params. Example for "Python Data Analysis": https://www.coursera.org/search?query=Python+Data+Analysis

For each skill gap provide 2-3 courses. Prioritise: free > affordable > premium. Flag HRD Corp claimable courses clearly as they are subsidised for Malaysians.`;

    const { toolArgs } = await callAi({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: "You are a career development advisor for Malaysia. Recommend real, existing courses from reputable platforms." },
        { role: "user", content: prompt }
      ],
      tool: {
        type: "function",
        function: {
          name: "provide_training_recommendations",
          description: "Provide AI-powered course recommendations for skill gaps",
          parameters: {
            type: "object",
            required: ["recommendations", "google_certificates", "malaysian_training", "learning_path", "total_estimated_duration", "estimated_cost"],
            properties: {
              recommendations: {
                type: "array",
                description: "Course recommendations grouped by skill gap",
                items: {
                  type: "object",
                  required: ["skill_gap", "courses"],
                  properties: {
                    skill_gap: { type: "string" },
                    courses: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["name", "platform", "url", "price", "duration", "relevance", "hrd_claimable", "malaysian_note"],
                        properties: {
                          name: { type: "string" },
                          platform: { type: "string" },
                          url: { type: "string" },
                          price: { type: "string" },
                          duration: { type: "string" },
                          relevance: { type: "string" },
                          hrd_claimable: { type: "boolean" },
                          malaysian_note: { type: ["string", "null"] }
                        }
                      }
                    }
                  }
                }
              },
              google_certificates: {
                type: "array",
                description: "Relevant Google Career Certificates",
                items: {
                  type: "object",
                  required: ["name", "url", "duration", "price"],
                  properties: {
                    name: { type: "string" },
                    url: { type: "string" },
                    duration: { type: "string" },
                    price: { type: "string" }
                  }
                }
              },
              malaysian_training: {
                type: "array",
                description: "Malaysian government / HRD Corp training options",
                items: {
                  type: "object",
                  required: ["name", "platform", "url", "price", "note"],
                  properties: {
                    name: { type: "string" },
                    platform: { type: "string" },
                    url: { type: "string" },
                    price: { type: "string" },
                    note: { type: "string" }
                  }
                }
              },
              learning_path: {
                type: "array",
                description: "Ordered learning steps with timeline",
                items: { type: "string" }
              },
              total_estimated_duration: { type: "string" },
              estimated_cost: { type: "string", description: "Cost range in RM including free options" }
            }
          }
        }
      },
      busyMessage: "AI is finding the best courses for your skill gaps..."
    });

    const raw = toolArgs as Record<string, unknown>;

    // Unwrap if AI returned a nested wrapper object
    let payload: Record<string, unknown> = raw;
    if (!Array.isArray(raw?.recommendations)) {
      const nested = Object.values(raw).find(
        (v) => v && typeof v === "object" && !Array.isArray(v) && (v as any).recommendations
      ) as Record<string, unknown> | undefined;
      if (nested) payload = nested;
    }

    // Filter recommendations to only valid objects (drop stray strings)
    if (Array.isArray(payload.recommendations)) {
      payload = {
        ...payload,
        recommendations: payload.recommendations.filter(
          (r) => r && typeof r === "object" && !Array.isArray(r) && "skill_gap" in (r as object)
        ),
      };
    }

    return StrictOutputSchema.parse(payload);
  });
