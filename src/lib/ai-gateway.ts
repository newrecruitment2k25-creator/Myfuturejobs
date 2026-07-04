// Central AI gateway for MYFutureJobs Workforce Intelligence Platform
// Two-tier: Groq Llama 3.3 70B (primary, open-source) + OpenAI GPT-4o-mini (fallback)
// Supports model fallback, retry logic, structured outputs, and forceOpenAI flag

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
  forceOpenAI?: boolean;
};

export type CallAiResult = {
  text: string | null;
  toolArgs: unknown | null;
  raw: unknown;
  modelUsed: string;
  reasoning?: string;
};

// Model configuration — Groq primary, OpenAI fallback
export const AI_MODELS = {
  GROQ_LLAMA_33_70B: "llama-3.3-70b-versatile",   // Primary: Groq Llama 3.3 70B (free, open-source)
  GPT4O_MINI: "gpt-4o-mini",                      // Fallback: OpenAI GPT-4o-mini for tool calls
  GPT4O: "gpt-4o",                                // OpenAI GPT-4o for complex reasoning
  GPT5_5: "gpt-5.5",                              // Heavy analysis (legacy compat)
  GPT5_4_MINI: "gpt-5.4-mini",                    // Fast operations (legacy compat)
  GPT5_4: "gpt-5.4",                              // Structured outputs (legacy compat)
} as const;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_BASE_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_RETRIES = 2;

function resolveGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return { baseUrl: GROQ_BASE_URL, apiKey, model: AI_MODELS.GROQ_LLAMA_33_70B };
}

function resolveOpenAIConfig() {
  const baseUrl = process.env.AI_BASE_URL || OPENAI_BASE_URL;
  const apiKey = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured. Please contact support.");
  return { baseUrl, apiKey };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callProvider(
  opts: CallAiOptions,
  baseUrl: string,
  apiKey: string,
  model: string,
  attempt: number = 0
): Promise<CallAiResult> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
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
      if (res.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`[AI Gateway] Rate limited (${model}), retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        return callProvider(opts, baseUrl, apiKey, model, attempt + 1);
      }

      if (res.status === 429) throw new Error(opts.busyMessage ?? "We're handling lots of requests right now. Please try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please contact the site owner.");
      if (res.status >= 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        console.log(`[AI Gateway] Server error ${res.status} (${model}), retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        return callProvider(opts, baseUrl, apiKey, model, attempt + 1);
      }

      const txt = await res.text().catch(() => "");
      console.error(`[AI Gateway] Error (${model}):`, res.status, txt.slice(0, 500));
      throw new Error(`AI request failed (${res.status}). Please try again.`);
    }

    const payload = await res.json();
    const message = payload?.choices?.[0]?.message;
    const reasoning = message?.reasoning_content || message?.reasoning;

    let toolArgs: unknown | null = null;
    if (opts.tool) {
      const rawArgs = message?.tool_calls?.[0]?.function?.arguments;
      if (!rawArgs) {
        console.error(`[AI Gateway] No tool call in response (${model}):`, JSON.stringify(payload).slice(0, 500));
        throw new Error("AI returned an unexpected response. Please try again.");
      }
      try {
        toolArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
      } catch (e) {
        console.error(`[AI Gateway] Failed to parse tool args (${model}):`, e);
        throw new Error("AI returned malformed data. Please try again.");
      }
    }

    return {
      text: typeof message?.content === "string" ? message.content : null,
      toolArgs,
      raw: payload,
      modelUsed: model,
      reasoning: reasoning ? String(reasoning) : undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError" && attempt < maxRetries) {
      console.log(`[AI Gateway] Request timeout (${model}), retrying (${attempt + 1}/${maxRetries})...`);
      return callProvider(opts, baseUrl, apiKey, model, attempt + 1);
    }

    throw error;
  }
}

/**
 * Primary AI call function with two-tier fallback.
 * Tier 1: Groq Llama 3.3 70B (primary, open-source, free)
 * Tier 2: OpenAI GPT-4o-mini (fallback for when Groq fails or forceOpenAI is set)
 * Use forceOpenAI=true to skip Groq for structured tool calls.
 */
export async function callAi(opts: CallAiOptions): Promise<CallAiResult> {
  const useOpenAI = opts.forceOpenAI || opts.tool;

  if (!useOpenAI) {
    const groqConfig = resolveGroqConfig();
    if (groqConfig) {
      try {
        return await callProvider(opts, groqConfig.baseUrl, groqConfig.apiKey, groqConfig.model);
      } catch (error) {
        console.log("[AI Gateway] Groq failed, falling back to OpenAI:", (error as Error).message);
      }
    }
  }

  const openAIConfig = resolveOpenAIConfig();
  const openAIModel = opts.tool ? AI_MODELS.GPT4O_MINI : (opts.model === AI_MODELS.GPT5_5 ? AI_MODELS.GPT4O : opts.model);
  return callProvider(opts, openAIConfig.baseUrl, openAIConfig.apiKey, openAIModel);
}

/**
 * Convenience function for recruiter-grade CV analysis
 * Uses Groq Llama 3.3 (primary) with OpenAI fallback for tool calls
 */
export async function analyzeWithGpt5(
  systemPrompt: string,
  userPrompt: string,
  tool: AiTool,
  busyMessage?: string
): Promise<CallAiResult> {
  return callAi({
    model: AI_MODELS.GROQ_LLAMA_33_70B,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tool,
    busyMessage,
    timeoutMs: 90000,
  });
}

/**
 * Convenience function for interview intelligence
 * Uses Groq Llama 3.3 for quick question generation, OpenAI for tool-based assessments
 */
export async function interviewWithGpt5(
  systemPrompt: string,
  userPrompt: string,
  tool?: AiTool,
  useMini: boolean = false,
  busyMessage?: string
): Promise<CallAiResult> {
  return callAi({
    model: AI_MODELS.GROQ_LLAMA_33_70B,
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
 * Create a text embedding using two-tier fallback.
 * Tier 1: Cloudflare Workers AI @cf/baai/bge-small-en-v1.5 (free, open-source, 384 dims)
 * Tier 2: OpenAI text-embedding-3-small (384 dims)
 * Fails safely and returns null if all providers fail.
 */
export async function createEmbedding(input: string, env: { AI_API_KEY?: string }): Promise<number[] | null> {
  // Tier 1: Cloudflare Workers AI BGE-small-en-v1.5 (free, open-source)
  try {
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cfAccount && cfToken) {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/baai/bge-small-en-v1.5`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: [input] }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const embedding = data?.result?.data?.[0];
        if (Array.isArray(embedding) && embedding.length === 384) {
          return embedding;
        }
      }
      console.warn("[AI Gateway] Cloudflare BGE embedding failed, falling back to OpenAI:", res.status);
    }
  } catch (e) {
    console.warn("[AI Gateway] Cloudflare BGE embedding error, falling back to OpenAI:", e);
  }

  // Tier 2: OpenAI text-embedding-3-small (fallback)
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
