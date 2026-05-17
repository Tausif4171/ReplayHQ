"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  FileVideo,
  X,
  Check,
  CheckCircle,
  Sparkles,
  Brain,
  Upload,
  Calendar,
  Film,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Video,
  Clock,
  HardDrive,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Details" },
  { id: 3, label: "Publish" },
] as const;

const ACCEPTED_TYPES: Record<string, string[]> = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Stepper                                                            */
/* ------------------------------------------------------------------ */

function Stepper({
  currentStep,
  className,
}: {
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isFuture = currentStep < step.id;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 font-semibold transition-all duration-300",
                  isCompleted &&
                    "h-9 w-9 border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "h-10 w-10 border-primary bg-primary/10 text-primary shadow-md shadow-primary/20",
                  isFuture &&
                    "h-9 w-9 border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm">{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isCurrent && "text-primary",
                  isCompleted && "text-primary",
                  isFuture && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 mb-5 h-0.5 w-16 rounded-full transition-colors duration-500 sm:w-24",
                  currentStep > step.id + 1
                    ? "bg-primary"
                    : currentStep > step.id
                      ? "bg-primary/40"
                      : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Feature Toggle Card                                             */
/* ------------------------------------------------------------------ */

function AIToggleCard({
  icon: Icon,
  title,
  description,
  active,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
        active
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p
          className={cn(
            "text-sm font-semibold transition-colors",
            active ? "text-foreground" : "text-foreground/80"
          )}
        >
          {title}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
          active ? "bg-primary" : "bg-muted-foreground/25"
        )}
      >
        <div
          className={cn(
            "h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            active ? "translate-x-3.5" : "translate-x-0"
          )}
        />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Upload Page                                                   */
/* ------------------------------------------------------------------ */

interface SeriesOption {
  id: string;
  name: string;
  description: string | null;
  _count: { recordings: number };
}

interface ZoomFileSummary {
  id: string;
  fileType: string;
  fileSize: number;
  recordingType: string;
  recordingStart: string;
  recordingEnd: string;
}

interface ZoomMeetingSummary {
  id: string;
  meetingId: number;
  topic: string;
  startTime: string;
  duration: number; // minutes
  totalSize: number;
  recordingFiles: ZoomFileSummary[];
}

export default function UploadPage() {
  const router = useRouter();

  /* ---- State ---- */
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [series, setSeries] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recordingDate, setRecordingDate] = useState(todayISO());
  const [aiTranscript, setAiTranscript] = useState(true);
  const [aiSummary, setAiSummary] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedRecordingId, setPublishedRecordingId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [objectKey, setObjectKey] = useState<string | null>(null);
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [thumbnailCandidates, setThumbnailCandidates] = useState<
    { blobUrl: string; timestamp: number }[]
  >([]);
  const [selectedThumbIndex, setSelectedThumbIndex] = useState(0);
  const [customThumbnail, setCustomThumbnail] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [useCustomThumb, setUseCustomThumb] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);

  // Zoom import state
  const [importSource, setImportSource] = useState<"upload" | "zoom">("upload");
  const [zoomConnected, setZoomConnected] = useState<boolean | null>(null);
  const [zoomRecordings, setZoomRecordings] = useState<ZoomMeetingSummary[]>([]);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [selectedZoomMeeting, setSelectedZoomMeeting] = useState<ZoomMeetingSummary | null>(null);
  const [selectedZoomFile, setSelectedZoomFile] = useState<ZoomFileSummary | null>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  /* ---- Real upload to MinIO ---- */
  useEffect(() => {
    if (!file || isUploaded || objectKey) return;

    let cancelled = false;
    setUploadError(null);

    async function uploadFile() {
      try {
        // 1. Get presigned upload URL from our API
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file!.name }),
        });

        if (!res.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { presignedUrl, objectKey: key } = await res.json();
        if (cancelled) return;

        // 2. Upload file directly to MinIO via presigned PUT
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && !cancelled) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", file!.type || "video/mp4");
          xhr.send(file!);
        });

        if (!cancelled) {
          setObjectKey(key);
          setIsUploaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setUploadError(err instanceof Error ? err.message : "Upload failed");
          setUploadProgress(0);
        }
      } finally {
        xhrRef.current = null;
      }
    }

    uploadFile();

    return () => {
      cancelled = true;
      xhrRef.current?.abort();
    };
  }, [file, isUploaded, objectKey]);

  /* ---- Extract duration & best 3 thumbnail candidates from video ---- */
  /*
   * Strategy: divide the video into 3 equal segments (early / middle / late).
   * Sample 4 frames per segment, score each for quality, and pick the best
   * frame from each segment. This guarantees 3 visually distinct thumbnails.
   */
  useEffect(() => {
    if (!file || !isUploaded) return;

    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const SAMPLES_PER_SEGMENT = 4;
    const SEGMENT_COUNT = 3;
    let seekIndex = 0;
    let samplePoints: number[] = [];
    // Each sample knows which segment (0/1/2) it belongs to
    const scored: {
      blobUrl: string;
      timestamp: number;
      score: number;
      segment: number;
    }[] = [];

    const canvas = document.createElement("canvas");

    function scoreFrame(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number
    ): number {
      const { data } = ctx.getImageData(0, 0, w, h);
      const pixelCount = w * h;

      // Build grayscale + compute average color channels for variety scoring
      let lumSum = 0;
      let lumSq = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      const gray = new Float32Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[i] = lum;
        lumSum += lum;
        lumSq += lum * lum;
        rSum += r;
        gSum += g;
        bSum += b;
      }

      const lumMean = lumSum / pixelCount;

      // Contrast: luminance standard deviation
      const contrast = Math.sqrt(lumSq / pixelCount - lumMean * lumMean);

      // Color saturation: how much the avg color deviates from gray
      const rMean = rSum / pixelCount;
      const gMean = gSum / pixelCount;
      const bMean = bSum / pixelCount;
      const saturation = Math.sqrt(
        (rMean - lumMean) ** 2 +
          (gMean - lumMean) ** 2 +
          (bMean - lumMean) ** 2
      );

      // Sharpness: Laplacian variance (sample every other pixel for speed)
      let lapSq = 0;
      let lapCount = 0;
      for (let y = 1; y < h - 1; y += 2) {
        for (let x = 1; x < w - 1; x += 2) {
          const idx = y * w + x;
          const lap =
            gray[idx - w] +
            gray[idx + w] +
            gray[idx - 1] +
            gray[idx + 1] -
            4 * gray[idx];
          lapSq += lap * lap;
          lapCount++;
        }
      }
      const sharpness = lapSq / lapCount;

      // Penalize very dark or very bright (likely blank/transition frames)
      const brightnessPenalty =
        lumMean < 25 || lumMean > 235 ? 0.2 : lumMean < 50 || lumMean > 210 ? 0.6 : 1;

      // Penalize very low contrast (likely solid-color or near-blank)
      const contrastPenalty = contrast < 15 ? 0.3 : 1;

      return (
        (sharpness * 0.5 + contrast * 0.3 + saturation * 0.2) *
        brightnessPenalty *
        contrastPenalty
      );
    }

    function captureFrame(): {
      blobUrl: string;
      score: number;
    } | null {
      // Score at small size for speed
      const scoreW = Math.min(video.videoWidth, 160);
      const scoreH = Math.round(scoreW * (video.videoHeight / video.videoWidth));
      canvas.width = scoreW;
      canvas.height = scoreH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, scoreW, scoreH);
      const score = scoreFrame(ctx, scoreW, scoreH);

      // Capture full-size thumbnail
      const thumbW = Math.min(video.videoWidth, 640);
      const thumbH = Math.round(thumbW * (video.videoHeight / video.videoWidth));
      canvas.width = thumbW;
      canvas.height = thumbH;
      ctx.drawImage(video, 0, 0, thumbW, thumbH);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const byteStr = atob(dataUrl.split(",")[1]);
      const ab = new ArrayBuffer(byteStr.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
      const blob = new Blob([ab], { type: "image/jpeg" });

      return { blobUrl: URL.createObjectURL(blob), score };
    }

    video.addEventListener("loadedmetadata", () => {
      if (cancelled) return;
      const dur = video.duration;
      setVideoDuration(Math.round(dur));

      // Build sample points: 4 per segment, 3 segments
      const margin = dur * 0.05; // skip first/last 5%
      const usable = dur - 2 * margin;
      const segLen = usable / SEGMENT_COUNT;

      samplePoints = [];
      for (let seg = 0; seg < SEGMENT_COUNT; seg++) {
        const segStart = margin + seg * segLen;
        const step = segLen / (SAMPLES_PER_SEGMENT + 1);
        for (let s = 1; s <= SAMPLES_PER_SEGMENT; s++) {
          samplePoints.push(segStart + step * s);
        }
      }

      video.currentTime = samplePoints[0];
    });

    video.addEventListener("seeked", () => {
      if (cancelled) return;

      const segment = Math.floor(seekIndex / SAMPLES_PER_SEGMENT);
      const result = captureFrame();
      if (result) {
        scored.push({
          ...result,
          timestamp: Math.round(video.currentTime),
          segment,
        });
      }

      seekIndex++;
      if (seekIndex < samplePoints.length) {
        video.currentTime = samplePoints[seekIndex];
      } else {
        // Pick the best frame from each segment
        const winners: typeof scored = [];
        for (let seg = 0; seg < SEGMENT_COUNT; seg++) {
          const segFrames = scored.filter((f) => f.segment === seg);
          if (segFrames.length === 0) continue;
          segFrames.sort((a, b) => b.score - a.score);
          winners.push(segFrames[0]);
          // Free unused blobs from this segment
          segFrames.slice(1).forEach((f) => URL.revokeObjectURL(f.blobUrl));
        }

        if (!cancelled) {
          setThumbnailCandidates(
            winners.map(({ blobUrl, timestamp }) => ({ blobUrl, timestamp }))
          );
          setSelectedThumbIndex(0);
        }
        URL.revokeObjectURL(objectUrl);
        video.remove();
      }
    });

    video.src = objectUrl;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isUploaded]);

  /* ---- Auto-advance to step 2 once (only on first upload completion) ---- */
  const hasAutoAdvanced = useRef(false);
  useEffect(() => {
    if (isUploaded && currentStep === 1 && !hasAutoAdvanced.current) {
      hasAutoAdvanced.current = true;
      const timeout = setTimeout(() => setCurrentStep(2), 600);
      return () => clearTimeout(timeout);
    }
  }, [isUploaded, currentStep]);

  /* ---- Fetch series from API ---- */
  useEffect(() => {
    fetch("/api/series")
      .then((res) => res.json())
      .then((data) => setSeriesOptions(data))
      .catch(() => setSeriesOptions([]));
  }, []);

  /* ---- Check Zoom connection ---- */
  useEffect(() => {
    fetch("/api/zoom/status")
      .then((res) => res.json())
      .then((data) => setZoomConnected(data.connected))
      .catch(() => setZoomConnected(false));
  }, []);

  /* ---- Dropzone ---- */
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const droppedFile = acceptedFiles[0];
      setFile(droppedFile);
      setTitle(stripExtension(droppedFile.name));
      setUploadProgress(0);
      setIsUploaded(false);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 5 * 1024 * 1024 * 1024, // 5 GB
    multiple: false,
  });

  /* ---- Tag helpers ---- */
  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  /* ---- File removal ---- */
  const removeFile = () => {
    xhrRef.current?.abort();
    setFile(null);
    setUploadProgress(0);
    setIsUploaded(false);
    setObjectKey(null);
    setUploadError(null);
    setTitle("");
  };

  /* ---- Custom thumbnail upload ---- */
  const handleCustomThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Revoke previous custom preview
    if (customThumbnail) URL.revokeObjectURL(customThumbnail.previewUrl);
    setCustomThumbnail({ file: f, previewUrl: URL.createObjectURL(f) });
    setUseCustomThumb(true);
    // Reset file input so the same file can be re-selected
    e.target.value = "";
  };

  const removeCustomThumb = () => {
    if (customThumbnail) URL.revokeObjectURL(customThumbnail.previewUrl);
    setCustomThumbnail(null);
    setUseCustomThumb(false);
  };

  /* ---- Fetch Zoom recordings ---- */
  const fetchZoomRecordings = async () => {
    setZoomLoading(true);
    try {
      const res = await fetch("/api/zoom/recordings");
      if (res.ok) {
        const data = await res.json();
        setZoomRecordings(data.meetings || []);
      }
    } catch {
      // Silently fail
    } finally {
      setZoomLoading(false);
    }
  };

  /* ---- Select a Zoom recording to import ---- */
  const selectZoomRecording = (meeting: ZoomMeetingSummary) => {
    setSelectedZoomMeeting(meeting);
    // Auto-select the first MP4 file
    setSelectedZoomFile(meeting.recordingFiles[0] || null);
    // Pre-fill form fields
    setTitle(meeting.topic || "");
    if (meeting.startTime) {
      setRecordingDate(meeting.startTime.split("T")[0]);
    }
    setVideoDuration(meeting.duration * 60); // convert minutes to seconds
  };

  /* ---- Continue from Zoom selection to step 2 ---- */
  const continueFromZoom = () => {
    if (!selectedZoomMeeting || !selectedZoomFile) return;
    setImportSource("zoom");
    setCurrentStep(2);
  };

  /* ---- Navigation ---- */
  const goNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, 4) as 1 | 2 | 3);
  const goBack = () =>
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3);

  /* ---- Publish ---- */
  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);

    try {
      if (importSource === "zoom" && selectedZoomMeeting && selectedZoomFile) {
        // Zoom import flow
        const res = await fetch("/api/zoom/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingUuid: selectedZoomMeeting.id,
            recordingFileId: selectedZoomFile.id,
            title: title.trim(),
            description: description.trim() || undefined,
            seriesId: series || undefined,
            tags,
          }),
        });

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Server returned an unexpected response");
        }

        if (!res.ok) {
          throw new Error(data.error || "Failed to import recording");
        }

        setPublishedRecordingId(data.id);
        setIsPublished(true);
        setCurrentStep(4 as number);
        return; // Skip the rest of handlePublish
      }

      // Original file upload flow continues below...

      // Upload selected thumbnail to MinIO
      let uploadedThumbKey = thumbnailKey;
      if (!uploadedThumbKey) {
        try {
          let thumbBlob: Blob | null = null;
          let thumbFilename = "thumbnail.jpg";

          if (useCustomThumb && customThumbnail) {
            // User uploaded a custom thumbnail
            thumbBlob = customThumbnail.file;
            thumbFilename = customThumbnail.file.name;
          } else if (thumbnailCandidates.length > 0) {
            // Use the selected auto-generated thumbnail
            const selected = thumbnailCandidates[selectedThumbIndex];
            if (selected) {
              const blobRes = await fetch(selected.blobUrl);
              thumbBlob = await blobRes.blob();
            }
          }

          if (thumbBlob) {
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: thumbFilename }),
            });

            if (uploadRes.ok) {
              const { presignedUrl, objectKey: thumbKey } =
                await uploadRes.json();
              const putRes = await fetch(presignedUrl, {
                method: "PUT",
                headers: { "Content-Type": thumbBlob.type || "image/jpeg" },
                body: thumbBlob,
              });
              if (putRes.ok) {
                uploadedThumbKey = thumbKey;
                setThumbnailKey(thumbKey);
              }
            }
          }
        } catch {
          // Thumbnail upload is best-effort
        }
      }

      const res = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          videoUrl: objectKey || "pending-upload",
          thumbnailUrl: uploadedThumbKey || undefined,
          duration: videoDuration,
          seriesId: series || undefined,
          tags,
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server returned an unexpected response");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish recording");
      }

      setPublishedRecordingId(data.id);
      setIsPublished(true);
      setCurrentStep(4 as number);
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  /* ---- Reset for "Upload Another" ---- */
  const resetAll = () => {
    // Revoke blob URLs to free memory
    thumbnailCandidates.forEach((c) => URL.revokeObjectURL(c.blobUrl));
    if (customThumbnail) URL.revokeObjectURL(customThumbnail.previewUrl);

    hasAutoAdvanced.current = false;
    setCurrentStep(1);
    setFile(null);
    setUploadProgress(0);
    setIsUploaded(false);
    setObjectKey(null);
    setThumbnailKey(null);
    setThumbnailCandidates([]);
    setSelectedThumbIndex(0);
    setCustomThumbnail(null);
    setUseCustomThumb(false);
    setVideoDuration(0);
    setUploadError(null);
    setTitle("");
    setDescription("");
    setSeries("");
    setTags([]);
    setTagInput("");
    setRecordingDate(todayISO());
    setAiTranscript(true);
    setAiSummary(true);
    setIsPublished(false);
    setPublishedRecordingId(null);
    setPublishError(null);
    setImportSource("upload");
    setSelectedZoomMeeting(null);
    setSelectedZoomFile(null);
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  /* ---------- Success state ---------- */
  if (isPublished) {
    return (
      <div className="mx-auto max-w-3xl">
        <Stepper currentStep={4} className="mb-10" />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-bold tracking-tight">
            Recording Published!
          </h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            {importSource === "zoom"
              ? "Your Zoom recording is being imported. It will be available in a few minutes."
              : "Your recording is being processed. AI transcription and summary will be ready in a few minutes."}
          </p>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={resetAll}>
              Upload Another
            </Button>
            <Button
              size="lg"
              onClick={() =>
                router.push(`/recordings/${publishedRecordingId}`)
              }
            >
              View Recording
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* ---- Page Header ---- */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Upload Recording</h1>
        <p className="mt-1 text-muted-foreground">
          Share knowledge with your team
        </p>
      </div>

      {/* ---- Stepper ---- */}
      <Stepper currentStep={currentStep} className="mb-10" />

      {/* ============================================================= */}
      {/*  STEP 1 - Upload File / Import from Zoom                       */}
      {/* ============================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <UploadCloud className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger
                value="zoom"
                className="gap-2"
                onClick={() => {
                  if (zoomConnected && zoomRecordings.length === 0) {
                    fetchZoomRecordings();
                  }
                }}
              >
                <Video className="h-4 w-4" />
                Import from Zoom
              </TabsTrigger>
            </TabsList>

            {/* Upload File Tab */}
            <TabsContent value="upload" className="mt-6">
              {!file ? (
                /* --- Dropzone --- */
                <div
                  {...getRootProps()}
                  className={cn(
                    "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-20 text-center transition-all duration-300",
                    isDragActive
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                      : "border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02]"
                  )}
                >
                  <input {...getInputProps()} />
                  <div
                    className={cn(
                      "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
                      isDragActive
                        ? "bg-primary/15 text-primary scale-110"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                  >
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <p className="mb-1 text-base font-medium">
                    {isDragActive
                      ? "Drop your recording here"
                      : "Drag & drop your recording here"}
                  </p>
                  <p className="mb-5 text-sm text-muted-foreground">or</p>
                  <Button
                    type="button"
                    size="lg"
                    className="pointer-events-none shadow-md"
                  >
                    Browse Files
                  </Button>
                  <p className="mt-5 text-xs text-muted-foreground">
                    MP4, WebM, MOV up to 5GB
                  </p>
                </div>
              ) : (
                /* --- File selected / uploading --- */
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileVideo className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium leading-tight">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} &middot; {file.type.split("/")[1]?.toUpperCase() ?? "VIDEO"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {uploadError
                            ? "Upload failed"
                            : isUploaded
                              ? "Upload complete"
                              : "Uploading..."}
                        </span>
                        <span className="font-medium tabular-nums">
                          {uploadError ? "" : `${uploadProgress}%`}
                        </span>
                      </div>
                      <Progress
                        value={uploadError ? 0 : uploadProgress}
                        className={cn(
                          "h-2 transition-all",
                          isUploaded && "[&>div]:bg-green-500",
                          uploadError && "[&>div]:bg-destructive"
                        )}
                      />
                    </div>
                    {uploadError && (
                      <p className="mt-3 text-sm text-destructive">
                        {uploadError}. Please remove the file and try again.
                      </p>
                    )}
                    {isUploaded && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Ready to continue
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 1 navigation for file upload */}
              {isUploaded && (
                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 mt-7">
                  <Button onClick={() => { setImportSource("upload"); goNext(); }} size="lg">
                    Continue to Details
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Import from Zoom Tab */}
            <TabsContent value="zoom" className="mt-6">
              {zoomConnected === null ? (
                /* Loading state */
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Checking Zoom connection...</p>
                </div>
              ) : !zoomConnected ? (
                /* Not connected */
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-16 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                    <Video className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="mb-2 text-base font-medium">Connect Zoom to import recordings</h3>
                  <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
                    Link your Zoom account to import cloud recordings directly — no manual download needed.
                  </p>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/settings">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect Zoom in Settings
                    </Link>
                  </Button>
                </div>
              ) : (
                /* Connected — show recordings */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Your Zoom Cloud Recordings</h3>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchZoomRecordings}
                      disabled={zoomLoading}
                    >
                      <RefreshCw className={cn("mr-2 h-3.5 w-3.5", zoomLoading && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>

                  {zoomLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="mt-3 text-sm text-muted-foreground">Loading recordings from Zoom...</p>
                    </div>
                  ) : zoomRecordings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12 text-center">
                      <Video className="mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">No cloud recordings found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Make sure you have cloud recording enabled in your Zoom settings
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {zoomRecordings.map((meeting) => (
                        <button
                          key={meeting.id}
                          type="button"
                          onClick={() => selectZoomRecording(meeting)}
                          className={cn(
                            "w-full rounded-xl border p-4 text-left transition-all duration-200",
                            selectedZoomMeeting?.id === meeting.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border bg-card hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Radio indicator */}
                            <div className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              selectedZoomMeeting?.id === meeting.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/30"
                            )}>
                              {selectedZoomMeeting?.id === meeting.id && (
                                <div className="h-2 w-2 rounded-full bg-white" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{meeting.topic}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(meeting.startTime).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {meeting.duration} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" />
                                  {formatFileSize(meeting.recordingFiles.reduce((acc, f) => acc + f.fileSize, 0))}
                                </span>
                              </div>

                              {/* Recording file variants */}
                              {meeting.recordingFiles.length > 1 && selectedZoomMeeting?.id === meeting.id && (
                                <div className="mt-3 space-y-1.5">
                                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Select view:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {meeting.recordingFiles.map((rf) => (
                                      <button
                                        key={rf.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedZoomFile(rf);
                                        }}
                                        className={cn(
                                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                                          selectedZoomFile?.id === rf.id
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/30"
                                        )}
                                      >
                                        {rf.recordingType.replace(/_/g, " ")}
                                        <span className="ml-1.5 text-[10px] opacity-60">
                                          ({formatFileSize(rf.fileSize)})
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Continue button */}
                  {selectedZoomMeeting && selectedZoomFile && (
                    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Button onClick={continueFromZoom} size="lg">
                        Continue to Details
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ============================================================= */}
      {/*  STEP 2 - Details                                             */}
      {/* ============================================================= */}
      {currentStep === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* --- Form Fields --- */}
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="text-sm font-medium leading-none"
              >
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                placeholder="Give your recording a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="description"
                  className="text-sm font-medium leading-none"
                >
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {description.length}/500
                </span>
              </div>
              <textarea
                id="description"
                rows={4}
                maxLength={500}
                placeholder="What is this recording about? Key topics, context, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Series */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Series
              </label>
              <Select value={series} onValueChange={setSeries}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select series" />
                </SelectTrigger>
                <SelectContent>
                  {seriesOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Tags</label>
              <div
                className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring cursor-text"
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pl-2.5 pr-1 py-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag);
                      }}
                      className="ml-0.5 rounded-sm p-0.5 hover:bg-foreground/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "Type a tag and press Enter" : ""}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-[120px]"
                />
              </div>
            </div>

            {/* Thumbnail Picker */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium leading-none">
                  Thumbnail
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {importSource === "zoom"
                    ? "Thumbnail will be auto-generated after the recording is imported"
                    : "Choose from auto-generated options or upload your own"}
                </p>
              </div>

              {importSource === "zoom" ? (
                <div className="flex aspect-video max-w-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
                  <div className="text-center">
                    <Video className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Auto-generated</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Hidden file input for custom thumbnail */}
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCustomThumbUpload}
                  />

                  {/* Auto-generated candidates + upload option */}
                  <div className="grid grid-cols-4 gap-3">
                    {thumbnailCandidates.length === 0
                      ? /* Loading skeletons */
                        [0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50"
                          >
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ))
                      : /* Generated thumbnails */
                        thumbnailCandidates.map((candidate, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedThumbIndex(idx);
                              setUseCustomThumb(false);
                            }}
                            className={cn(
                              "group/thumb relative aspect-video overflow-hidden rounded-lg border-2 transition-all duration-200",
                              !useCustomThumb && selectedThumbIndex === idx
                                ? "border-primary ring-2 ring-primary/20 shadow-md"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            <img
                              src={candidate.blobUrl}
                              alt={`Thumbnail option ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
                              {formatTimestamp(candidate.timestamp)}
                            </div>
                            {!useCustomThumb && selectedThumbIndex === idx && (
                              <div className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        ))}

                    {/* Custom upload card */}
                    {customThumbnail ? (
                      <button
                        type="button"
                        onClick={() => setUseCustomThumb(true)}
                        className={cn(
                          "group/thumb relative aspect-video overflow-hidden rounded-lg border-2 transition-all duration-200",
                          useCustomThumb
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : "border-border hover:border-muted-foreground/50"
                        )}
                      >
                        <img
                          src={customThumbnail.previewUrl}
                          alt="Custom thumbnail"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Custom
                        </div>
                        {useCustomThumb && (
                          <div className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        {/* Remove / replace button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomThumb();
                          }}
                          className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => thumbInputRef.current?.click()}
                        className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                      >
                        <UploadCloud className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Upload</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Recording Date */}
            <div className="space-y-2">
              <label
                htmlFor="recordingDate"
                className="text-sm font-medium leading-none"
              >
                Recording Date
              </label>
              <Input
                id="recordingDate"
                type="date"
                value={recordingDate}
                onChange={(e) => setRecordingDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <Separator />

          {/* --- AI Processing Toggles --- */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">AI Processing</h3>
              <p className="text-xs text-muted-foreground">
                Enhance your recording with AI-powered features
              </p>
            </div>

            <div className="space-y-3">
              <AIToggleCard
                icon={Sparkles}
                title="Auto-generate transcript"
                description="Use AI to transcribe audio to searchable text"
                active={aiTranscript}
                onToggle={() => setAiTranscript((prev) => !prev)}
              />
              <AIToggleCard
                icon={Brain}
                title="Generate AI summary"
                description="Extract key takeaways and action items"
                active={aiSummary}
                onToggle={() => setAiSummary((prev) => !prev)}
              />
            </div>
          </div>

          {/* Step 2 navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="lg" onClick={goBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              size="lg"
              onClick={goNext}
              disabled={!title.trim()}
            >
              Review & Publish
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  STEP 3 - Review & Publish                                    */}
      {/* ============================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Your Recording</CardTitle>
              <CardDescription>
                Make sure everything looks good before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* File info */}
              {file && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} &middot;{" "}
                      {file.type.split("/")[1]?.toUpperCase() ?? "VIDEO"}
                    </p>
                  </div>
                </div>
              )}

              {/* Zoom recording info */}
              {importSource === "zoom" && selectedZoomMeeting && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Video className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Zoom Cloud Recording</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedZoomMeeting.topic} &middot;{" "}
                      {selectedZoomFile ? formatFileSize(selectedZoomFile.fileSize) : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Selected thumbnail preview */}
              {(useCustomThumb && customThumbnail) ||
              thumbnailCandidates.length > 0 ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Thumbnail
                    </p>
                    <div className="w-48 overflow-hidden rounded-lg border border-border">
                      <img
                        src={
                          useCustomThumb && customThumbnail
                            ? customThumbnail.previewUrl
                            : thumbnailCandidates[selectedThumbIndex]?.blobUrl
                        }
                        alt="Selected thumbnail"
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                    {useCustomThumb && (
                      <p className="text-[11px] text-muted-foreground">
                        Custom upload
                      </p>
                    )}
                  </div>
                </>
              ) : null}

              <Separator />

              {/* Details grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewRow icon={FileText} label="Title" value={title} />
                <ReviewRow
                  icon={Film}
                  label="Series"
                  value={
                    seriesOptions.find((s) => s.id === series)?.name ||
                    "Not specified"
                  }
                />
                <ReviewRow
                  icon={Calendar}
                  label="Recording Date"
                  value={
                    recordingDate
                      ? new Date(recordingDate + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "Not specified"
                  }
                />
              </div>

              {/* Description */}
              {description && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </p>
                    <p className="text-sm leading-relaxed">{description}</p>
                  </div>
                </>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* AI features */}
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Features
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiTranscript && (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      Auto-transcription
                    </div>
                  )}
                  {aiSummary && (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      <Brain className="h-3 w-3" />
                      AI Summary
                    </div>
                  )}
                  {!aiTranscript && !aiSummary && (
                    <p className="text-sm text-muted-foreground">
                      No AI features enabled
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {publishError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {publishError}
            </div>
          )}

          {/* Step 3 navigation */}
          <div className="flex justify-between">
            <Button variant="outline" size="lg" onClick={goBack} disabled={isPublishing}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" disabled={isPublishing}>
                Save as Draft
              </Button>
              <Button size="lg" onClick={handlePublish} disabled={isPublishing}>
                <Upload className="mr-1 h-4 w-4" />
                {isPublishing ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small review row helper                                            */
/* ------------------------------------------------------------------ */

function ReviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
