import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Provider-agnostic transcription contract.
 *
 * Implementations can wrap OpenAI Whisper API, Deepgram, or local whisper.cpp.
 * The worker only sees this interface — swapping providers is one new class.
 */
export interface TranscriptionSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  language: string;
  modelId: string;
  durationMs: number;
}

export interface Transcriber {
  transcribe(audioPath: string): Promise<TranscriptionResult>;
}

/**
 * Local whisper.cpp implementation. Shells out to the `whisper-cli` binary
 * installed via `brew install whisper-cpp` and parses its `--output-json-full`
 * artifact.
 *
 * Why shell out instead of binding native code:
 *   - Zero native build chain to maintain (no node-gyp pain).
 *   - whisper.cpp picks up Metal GPU automatically on Apple Silicon.
 *   - The process boundary makes failures easy to diagnose: we get an exit
 *     code and stderr, not a segfault inside Node.
 */
export interface WhisperCppOptions {
  binaryPath?: string;
  threads?: number;
  /**
   * When true (default), whisper auto-detects the source language and emits
   * an English translation — matching the behaviour of Otter, YouTube auto-
   * captions, and Loom. Set false to keep transcripts in the source language.
   * Has no effect when running an English-only model (e.g. ggml-base.en.bin).
   */
  translateToEnglish?: boolean;
}

export class WhisperCppTranscriber implements Transcriber {
  private readonly binaryPath: string;
  private readonly threads: number;
  private readonly translateToEnglish: boolean;

  constructor(
    private readonly modelPath: string,
    options: WhisperCppOptions = {}
  ) {
    this.binaryPath = options.binaryPath ?? "whisper-cli";
    this.threads = options.threads ?? 8;
    this.translateToEnglish = options.translateToEnglish ?? true;
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    const start = Date.now();
    // whisper-cli writes <audioPath>.json next to the input. We strip the
    // extension and let it append.
    const outputPrefix = audioPath.replace(/\.[^.]+$/, "");
    const jsonPath = `${outputPrefix}.json`;

    const args = [
      "--model", this.modelPath,
      "--file", audioPath,
      "--output-json-full",
      "--output-file", outputPrefix,
      "--threads", String(this.threads),
      "--language", "auto",
      "--no-prints",
    ];
    if (this.translateToEnglish) args.push("--translate");

    await runProcess(this.binaryPath, args);

    const raw = await readFile(jsonPath, "utf8");
    const parsed = JSON.parse(raw) as WhisperCppOutput;

    const segments: TranscriptionSegment[] = parsed.transcription.map((s) => ({
      startTime: s.offsets.from / 1000,
      endTime: s.offsets.to / 1000,
      text: s.text.trim(),
    }));

    return {
      fullText: segments.map((s) => s.text).join(" ").trim(),
      segments,
      language: parsed.result?.language ?? "en",
      modelId: `whisper.cpp:${path.basename(this.modelPath, ".bin")}`,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Minimal subset of whisper.cpp's `--output-json-full` schema we depend on.
 * Documented at: https://github.com/ggerganov/whisper.cpp
 */
interface WhisperCppOutput {
  result?: { language?: string };
  transcription: Array<{
    offsets: { from: number; to: number }; // milliseconds
    text: string;
  }>;
}

function runProcess(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          `${cmd} exited with code ${code}. stderr: ${stderr.slice(-500)}`
        )
      );
    });
  });
}
