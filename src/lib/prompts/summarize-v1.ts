/**
 * Versioned summarization prompt.
 *
 * Bump SUMMARIZE_PROMPT_VERSION whenever the prompt or schema changes
 * meaningfully. The summarize worker stores the version it ran with on each
 * Recording, so we can re-process only stale rows after a tweak:
 *
 *     UPDATE "Recording" SET "summarizedAt" = NULL
 *      WHERE "summaryPromptVersion" < $current
 *        AND "transcript" IS NOT NULL;
 *
 * Then re-enqueue. No "did I already do this?" guesswork.
 */

export const SUMMARIZE_PROMPT_VERSION = 1;

export interface SummarizePromptInput {
  transcript: string;
  recordingTitle: string;
  presenterName?: string | null;
  existingTags: string[];
}

export interface SummarizePrompt {
  system: string;
  user: string;
}

export function buildSummarizePrompt(
  input: SummarizePromptInput
): SummarizePrompt {
  const existingTagsLine =
    input.existingTags.length > 0
      ? input.existingTags.join(", ")
      : "(none yet)";

  return {
    system:
      "You are a senior knowledge-management assistant. Your job is to extract durable, searchable knowledge from meeting transcripts so a team can find answers without rewatching the video. You output ONLY valid JSON matching the requested schema. No prose, no markdown fences.",

    user: `Recording title: "${input.recordingTitle}"
${input.presenterName ? `Presenter: ${input.presenterName}` : ""}

Existing tags in our knowledge base (PREFER these when applicable; only invent new ones if no existing tag fits):
${existingTagsLine}

Transcript:
"""
${input.transcript}
"""

Produce a JSON object with EXACTLY these fields:

- "summary": a 2-3 paragraph narrative summary (~150-300 words) describing what was learned, decided, or demonstrated. Skip pleasantries, intros, and meta-commentary about the meeting itself.
- "tldr": a single sentence under 280 chars capturing the essence. Imagine it is the only thing someone reads.
- "keyTakeaways": an array of 3-7 short bullet points of concrete, actionable knowledge. Each item is one sentence.
- "suggestedTags": an array of 3-7 lowercase, kebab-case topical tags (e.g. "kubernetes", "ci-cd"). Prefer existing tags above when applicable.

Return ONLY the JSON object. No preamble, no closing remarks, no \`\`\` fences.`,
  };
}
