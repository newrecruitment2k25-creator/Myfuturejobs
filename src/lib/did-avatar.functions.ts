import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DID_BASE = "https://api.d-id.com";

// High-quality AI-generated professional headshots (no copyright issues)
const PRESENTERS = {
  female: {
    url: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
    voice: "en-US-JennyNeural",
    name: "Sarah",
  },
  male: {
    url: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/noelle.jpg",
    voice: "en-US-DavisNeural",
    name: "Adam",
  },
} as const;

const InputSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.string().optional(),
  presenter: z.enum(["female", "male"]).optional().default("female"),
});

export const generateTalkingAvatar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.DID_API_KEY;
    if (!apiKey) return { videoUrl: null };

    const presenterKey = data.presenter ?? "female";
    const presenter = PRESENTERS[presenterKey];
    const voiceId = data.voice ?? presenter.voice;

    // 1. Create talk
    let talkId: string;
    try {
      const createRes = await fetch(`${DID_BASE}/talks`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          source_url: presenter.url,
          script: {
            type: "text",
            input: data.text,
            provider: {
              type: "microsoft",
              voice_id: voiceId,
            },
          },
          config: {
            fluent: true,
            pad_audio: 0.5,
            stitch: true,
          },
          driver_url: "bank://lively",
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error("[D-ID] create talk failed:", err);
        return { videoUrl: null };
      }

      const created = await createRes.json() as { id: string };
      talkId = created.id;
    } catch (e) {
      console.error("[D-ID] network error on create:", e);
      return { videoUrl: null };
    }

    // 2. Poll for completion (max ~20 seconds, 500ms intervals)
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const pollRes = await fetch(`${DID_BASE}/talks/${talkId}`, {
          headers: {
            Authorization: `Basic ${apiKey}`,
            Accept: "application/json",
          },
        });
        if (!pollRes.ok) continue;
        const talk = await pollRes.json() as { status: string; result_url?: string };
        if (talk.status === "done" && talk.result_url) {
          return { videoUrl: talk.result_url };
        }
        if (talk.status === "error") {
          console.error("[D-ID] talk failed:", talk);
          return { videoUrl: null };
        }
      } catch {
        // polling error — keep trying
      }
    }

    console.error("[D-ID] timed out waiting for talk:", talkId);
    return { videoUrl: null };
  });
