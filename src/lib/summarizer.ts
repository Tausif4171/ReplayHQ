import { z } from "zod";
import {
  buildSummarizePrompt,
  SUMMARIZE_PROMPT_VERSION,
  type SummarizePromptInput,
} from "./prompts/summarize-v1";

/**
 * Provider-agnostic summarization contract.
 *
 * Implementations can wrap Ollama (local), OpenAI, Anthropic, or anything
 * else that produces structured JSON. The worker only sees this interface,
 * so swapping providers is one new class.
 */

export const SummarySchema = z.object({
  summary: z.string().min(40).max(2000),
  tldr: z.string().min(10).max(400),
  keyTakeaways: z.array(z.string().min(3).max(400)).min(2).max(10),
  suggestedTags: z
    .array(
      z
        .string()
        .min(2)
        .max(40)
        .transform((s) => s.toLowerCase().trim())
    )
    .min(1)
    .max(8),
});

export type SummaryShape = z.infer<typeof SummarySchema>;

export interface SummaryResult extends SummaryShape {
  promptVersion: number;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface SummarizerInput extends SummarizePromptInput {}

export interface Summarizer {
  summarize(input: SummarizerInput): Promise<SummaryResult>;
}

// ---------------------------------------------------------------------------
// Ollama implementation
// ---------------------------------------------------------------------------

export interface OllamaSummarizerOptions {
  baseUrl?: string;
  model?: string;
  /**
   * If structured output validation fails, retry the same prompt with a
   * "your previous response was invalid JSON" reminder this many times before
   * giving up. Each retry doubles latency, so keep this small.
   */
  retries?: number;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaSummarizer implements Summarizer {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly retries: number;

  constructor(opts: OllamaSummarizerOptions = {}) {
    this.baseUrl = opts.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.model = opts.model ?? process.env.SUMMARIZE_MODEL ?? "qwen2.5:7b";
    this.retries = opts.retries ?? 1;
  }

  async summarize(input: SummarizerInput): Promise<SummaryResult> {
    const start = Date.now();
    const { system, user } = buildSummarizePrompt(input);

    let lastError: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const userMessage =
        attempt === 0
          ? user
          : `${user}\n\nIMPORTANT: Your previous response was invalid JSON. Reason: ${lastError}\nReturn ONLY a single valid JSON object matching the schema above. No prose, no fences.`;

      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: "json", // forces grammar-level JSON conformance in Ollama
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMessage },
          ],
          options: { temperature: 0.2 },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `Ollama returned ${res.status}: ${body.slice(0, 500)}`
        );
      }

      const data = (await res.json()) as OllamaChatResponse;
      inputTokens = data.prompt_eval_count ?? 0;
      outputTokens = data.eval_count ?? 0;

      const raw = data.message.content;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        lastError = e instanceof Error ? e.message : "JSON parse error";
        continue;
      }

      const validated = SummarySchema.safeParse(parsed);
      if (!validated.success) {
        lastError = validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
          .slice(0, 400);
        continue;
      }

      return {
        ...validated.data,
        promptVersion: SUMMARIZE_PROMPT_VERSION,
        modelId: `ollama:${this.model}`,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      };
    }

    throw new Error(
      `Summarizer failed after ${this.retries + 1} attempts. Last error: ${lastError}`
    );
  }
}
