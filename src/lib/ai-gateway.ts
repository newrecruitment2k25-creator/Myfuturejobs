// Central AI gateway for MYFutureJobs Workforce Intelligence Platform
// Upgraded to GPT-5 for enhanced reasoning, recruiter-grade assessments, and government-grade intelligence
// Supports model fallback, retry logic, and structured outputs

type AiTool = {
  type: "function";
  function: { name: string; description?: string; parameters: Record<string, unknown> };
};

type CallAiOptions = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  tool?: AiTool;
  signal?: AbortSignal;
  busyMessage?: string;
  maxRetries?: number;
  timeoutMs?: number;
};

export type CallAiResult = {
  text: string | null;
  toolArgs: unknown | null;
  raw: unknown;
  modelUsed: string;
  reasoning?: string;
};

// Model configuration for GPT-5.5/5.4 upgrade
export const AI_MODELS = {
  GPT5_5: "gpt-5.5",                       // Heavy analysis: CV analysis, interview summaries (best quality)
  GPT5_4_MINI: "gpt-5.4-mini",             // Fast operations: questions, scoring, chatbot (speed + low cost)
  GPT5_4: "gpt-5.4",                       // Fallback for structured outputs and POC matching
  GPT4O: "gpt-4o",                         // Legacy fallback (kept for compatibility)
  GPT4O_MINI: "gpt-4o-mini",               // Legacy fallback (kept for compatibility)
} as const;

const DEFAULT_BASE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60000;           // 60 second timeout for GPT-5 reasoning
const DEFAULT_MAX_RETRIES = 2;

function resolveConfig() {
  const baseUrl = process.env.AI_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured. Please contact support.");
  return { baseUrl, apiKey };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callAiWithRetry(
  opts: CallAiOptions,
  attempt: number = 0
): Promise<CallAiResult> {
  const { baseUrl, apiKey } = resolveConfig();
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      // Enable reasoning for heavy analysis models (NOT when using tools - GPT-5.5 limitation)
      ...((opts.model === AI_MODELS.GPT5_5 && !opts.tool) && {
        reasoning_effort: "high",  // Request high reasoning effort for recruiter-grade outputs
      }),
    };

    if (opts.tool) {
      body.tools = [opts.tool];
      body.tool_choice = { type: "function", function: { name: opts.tool.function.name } };
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-ID": `PraxoAI-${Date.now()}-${attempt}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Handle rate limiting with exponential backoff
      if (res.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`[AI Gateway] Rate limited, retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        return callAiWithRetry(opts, attempt + 1);
      }

      if (res.status === 429) throw new Error(opts.busyMessage ?? "We're handling lots of requests right now. Please try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please contact the site owner.");
      if (res.status >= 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        console.log(`[AI Gateway] Server error ${res.status}, retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        return callAiWithRetry(opts, attempt + 1);
      }

      const txt = await res.text().catch(() => "");
      console.error("[AI Gateway] Error:", res.status, txt.slice(0, 500));
      throw new Error(`AI request failed (${res.status}). Please try again.`);
    }

    const payload = await res.json();
    const message = payload?.choices?.[0]?.message;

    // Extract reasoning if available (GPT-5 feature)
    const reasoning = message?.reasoning_content || message?.reasoning;

    let toolArgs: unknown | null = null;
    if (opts.tool) {
      const rawArgs = message?.tool_calls?.[0]?.function?.arguments;
      if (!rawArgs) {
        console.error("[AI Gateway] No tool call in response:", JSON.stringify(payload).slice(0, 500));
        throw new Error("AI returned an unexpected response. Please try again.");
      }
      try {
        toolArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
      } catch (e) {
        console.error("[AI Gateway] Failed to parse tool args:", e);
        throw new Error("AI returned malformed data. Please try again.");
      }
    }

    return {
      text: typeof message?.content === "string" ? message.content : null,
      toolArgs,
      raw: payload,
      modelUsed: opts.model,
      reasoning: reasoning ? String(reasoning) : undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout with retry
    if (error instanceof Error && error.name === "AbortError" && attempt < maxRetries) {
      console.log(`[AI Gateway] Request timeout, retrying (${attempt + 1}/${maxRetries})...`);
      return callAiWithRetry(opts, attempt + 1);
    }

    throw error;
  }
}

/**
 * Primary AI call function with GPT-5 support
 * Automatically retries on failure and handles graceful fallbacks
 */
export async function callAi(opts: CallAiOptions): Promise<CallAiResult> {
  try {
    // Primary call with requested model (usually GPT-5)
    return await callAiWithRetry(opts);
  } catch (error) {
    // If heavy model fails, fall back to GPT-5.4 for structured output tasks
    if ((opts.model === AI_MODELS.GPT5_5) && opts.tool) {
      console.log("[AI Gateway] GPT-5.5 failed, falling back to GPT-5.4 for structured output...");
      try {
        return await callAiWithRetry({ ...opts, model: AI_MODELS.GPT5_4 });
      } catch (fallbackError) {
        console.error("[AI Gateway] Fallback to GPT-5.4 also failed:", fallbackError);
      }
    }
    throw error;
  }
}

/**
 * Convenience function for recruiter-grade CV analysis
 * Uses GPT-5.5 with high reasoning effort for detailed assessments
 */
export async function analyzeWithGpt5(
  systemPrompt: string,
  userPrompt: string,
  tool: AiTool,
  busyMessage?: string
): Promise<CallAiResult> {
  return callAi({
    model: AI_MODELS.GPT5_5,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tool,
    busyMessage,
    timeoutMs: 90000, // 90s for complex CV analysis
  });
}

/**
 * Convenience function for interview intelligence
 * Uses GPT-5.4-mini for quick question generation, GPT-5.5 for assessments
 */
export async function interviewWithGpt5(
  systemPrompt: string,
  userPrompt: string,
  tool?: AiTool,
  useMini: boolean = false,
  busyMessage?: string
): Promise<CallAiResult> {
  return callAi({
    model: useMini ? AI_MODELS.GPT5_4_MINI : AI_MODELS.GPT5_5,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tool,
    busyMessage,
    timeoutMs: useMini ? 30000 : 60000,
  });
}

/**
 * Create a text embedding via OpenAI text-embedding-3-small.
 * Fails safely and returns null if the API key is missing or the call fails.
 */
export async function createEmbedding(input: string, env: { AI_API_KEY?: string }): Promise<number[] | null> {
  try {
    if (!env?.AI_API_KEY) {
      console.warn("[AI Gateway] AI_API_KEY missing; semantic embedding unavailable");
      return null;
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input,
        dimensions: 384,
      }),
    });

    if (!res.ok) {
      console.warn("[AI Gateway] OpenAI embedding failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) {
    console.warn("[AI Gateway] Embedding creation failed:", e);
    return null;
  }
}
