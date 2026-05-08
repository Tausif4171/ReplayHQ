import { spawn } from "node:child_process";

/**
 * Extracts a mono 16 kHz WAV from a video file using ffmpeg.
 *
 * 16 kHz mono is whisper.cpp's native input format — feeding it anything else
 * makes the binary resample internally, wasting CPU and introducing artifacts.
 * WAV (PCM) avoids re-decode latency vs. mp3/opus inputs.
 */
export async function extractAudio(
  videoPath: string,
  outputPath: string
): Promise<void> {
  await runFfmpeg([
    "-y",                  // overwrite output if it exists
    "-i", videoPath,
    "-vn",                 // strip video
    "-ac", "1",            // mono
    "-ar", "16000",        // 16 kHz sample rate (whisper's native rate)
    "-c:a", "pcm_s16le",   // signed 16-bit little-endian PCM
    outputPath,
  ]);
}

/**
 * Probes a media file's duration in seconds using ffprobe.
 * Returns null if the file is unreadable.
 */
export async function probeDuration(filePath: string): Promise<number | null> {
  try {
    const out = await runFfprobe([
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const seconds = parseFloat(out.trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return runProcessVoid("ffmpeg", args);
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => { stdout += c.toString(); });
    child.stderr?.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`ffprobe exited ${code}: ${stderr.slice(-300)}`));
    });
  });
}

function runProcessVoid(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}
