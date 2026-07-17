"use client";

import { useState, useMemo, useCallback, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatRelativeDate,
  getInitials,
  formatViews,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Send,
  Sparkles,
  Eye,
  Calendar,
  Clock,
  SkipForward,
  Loader2,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  time: number; // seconds
  text: string;
}

interface ApiComment {
  id: string;
  content: string;
  timestamp: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ApiRecording {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  videoUrl: string;
  status: string;
  createdAt: string;
  presenter: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  };
  series?: {
    id: string;
    name: string;
  } | null;
  tags: { id: string; name: string }[];
  comments: ApiComment[];
  segments?: { startTime: number; text: string }[];
  summary?: string | null;
  tldr?: string | null;
  keyTakeaways?: string[] | null;
  _count?: {
    watchHistory?: number;
    bookmarks?: number;
  };
  viewerWatchHistory?: {
    progress: number;
    completed: boolean;
    lastWatchedAt: string;
  } | null;
  viewerBookmark?: {
    id: string;
    timestamp: number | null;
    createdAt: string;
  } | null;
  permissions?: {
    canDelete: boolean;
  };
}

interface RelatedRecording {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  presenter: { name: string };
  _count?: { watchHistory?: number };
}

// ─── Mock AI Summary Data (will be replaced by real AI later) ────────────────

const aiKeyTakeaways = [
  "Erasure coding provides significantly better storage efficiency than replication (1.5x vs 3x overhead) with comparable durability guarantees.",
  "Reed-Solomon coding over GF(2^8) with Vandermonde encoding matrices is the standard implementation approach.",
  "SIMD and Intel ISA-L optimizations are critical for production-grade write throughput.",
  "Degraded reads incur latency overhead; healthy reads have virtually zero performance impact.",
  "Bitrot detection via hash verification complements erasure coding for silent corruption scenarios.",
];

const aiTldr =
  "This session covers how MinIO uses Reed-Solomon erasure coding to distribute data across drives for high availability and storage efficiency. Instead of replicating data 3x, erasure coding achieves the same durability at just 1.5x overhead using data and parity shards. The implementation leverages SIMD/ISA-L optimizations for production-grade throughput, with automatic bitrot detection and background healing.";

const aiTopics = [
  "Erasure Coding Fundamentals",
  "Reed-Solomon Algorithm",
  "Galois Fields",
  "SIMD Optimization",
  "Storage Benchmarks",
  "Data Reconstruction",
  "Bitrot Detection",
  "Production Monitoring",
];

// ─── Mock Transcript (will be replaced by real transcription later) ──────────

const mockTranscript: TranscriptEntry[] = [
  { time: 0, text: "Welcome everyone to today's deep dive session. Glad to see so many familiar faces." },
  { time: 35, text: "Before we jump in, a quick agenda: we'll start with the fundamentals, then look at how this works in practice." },
  { time: 78, text: "So let's begin with the core concepts and walk through the architecture step by step." },
  { time: 135, text: "Think of it this way - we take the original approach and optimize it for our specific workload patterns." },
  { time: 210, text: "This is fundamentally different from the traditional approach. The efficiency gains are significant." },
  { time: 330, text: "Now let's look at the implementation details and how we handle edge cases in production." },
  { time: 465, text: "In our implementation, we use optimized data structures that give us excellent performance characteristics." },
  { time: 580, text: "Let me show you a quick demo of how this works end to end." },
  { time: 720, text: "Notice the performance here - this is because we're using optimized operations throughout the pipeline." },
  { time: 890, text: "One of the key trade-offs is the compute overhead. We mitigate this with specific optimizations." },
  { time: 1050, text: "Let's look at the benchmarks. The results speak for themselves." },
  { time: 1200, text: "For reads in normal conditions, there's virtually no overhead. Performance impact is minimal." },
  { time: 1380, text: "In production, we monitor the key metrics carefully and trigger alerts when needed." },
  { time: 1560, text: "Great question. Yes, we combine multiple techniques to handle that scenario." },
  { time: 1740, text: "To wrap up: this approach gives us the best balance of efficiency and reliability for our use case." },
];

// ─── Helper: format seconds to mm:ss ────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getMeaningfulViewThreshold(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 5;
  return Math.max(1, Math.min(5, Math.ceil(durationSec * 0.1)));
}

function parseResumeTime(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.floor(seconds);
}

const WATCH_PROGRESS_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type StoredWatchProgress = {
  progress: number;
  completed?: boolean;
  updatedAt: number;
};

function getWatchProgressStorageKey(recordingId: string, userId?: string) {
  return userId ? `replayhq:watch-progress:${userId}:${recordingId}` : null;
}

function readStoredWatchProgress(key: string | null): number {
  if (!key || typeof window === "undefined") return 0;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;

    const parsed = JSON.parse(raw) as Partial<StoredWatchProgress>;
    const progress = Math.floor(Number(parsed.progress));
    const updatedAt = Number(parsed.updatedAt);

    if (
      parsed.completed ||
      !Number.isFinite(progress) ||
      progress <= 0 ||
      !Number.isFinite(updatedAt) ||
      Date.now() - updatedAt > WATCH_PROGRESS_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(key);
      return 0;
    }

    return progress;
  } catch {
    return 0;
  }
}

function writeStoredWatchProgress(
  key: string | null,
  progress: number,
  completed = false
) {
  if (!key || typeof window === "undefined") return;

  const safeProgress = Math.max(0, Math.floor(progress));
  if (safeProgress <= 0) return;

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        progress: safeProgress,
        completed,
        updatedAt: Date.now(),
      } satisfies StoredWatchProgress)
    );
  } catch {
    // Server watch history remains canonical if browser storage is unavailable.
  }
}

function clearResumeTimeParam() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("t")) return;

  url.searchParams.delete("t");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const resumeAtParam = searchParams.get("t");
  const explicitResumeAt = useMemo(
    () => parseResumeTime(resumeAtParam),
    [resumeAtParam]
  );
  const progressStorageKey = useMemo(
    () => getWatchProgressStorageKey(id, session?.user?.id),
    [id, session?.user?.id]
  );

  // API data state
  const [recording, setRecording] = useState<ApiRecording | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [relatedRecordings, setRelatedRecordings] = useState<RelatedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localResumeAt, setLocalResumeAt] = useState(0);
  const [hasLoadedLocalResume, setHasLoadedLocalResume] = useState(false);
  const savedResumeAt =
    recording?.viewerWatchHistory && !recording.viewerWatchHistory.completed
      ? recording.viewerWatchHistory.progress
      : 0;
  const resumeAt = localResumeAt || savedResumeAt || explicitResumeAt;

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hasTrackedViewRef = useRef(false);
  const hasAppliedResumeRef = useRef(false);
  const appliedResumeAtRef = useRef(0);
  const programmaticSeekTargetRef = useRef<number | null>(null);
  const lastWatchSyncAtRef = useRef(0);
  const currentTimeRef = useRef(0);
  const lastLocalProgressStoreRef = useRef(0);

  // Transcript search
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // Comment input
  const [commentText, setCommentText] = useState("");

  // Fetch recording data
  useEffect(() => {
    let cancelled = false;

    async function fetchRecording() {
      try {
        const res = await fetch(`/api/recordings/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Recording not found");
          throw new Error("Failed to fetch recording");
        }
        const data: ApiRecording = await res.json();
        if (!cancelled) {
          setRecording(data);
          setComments(data.comments || []);

          // Fetch related recordings (same tags)
          const tagNames = data.tags.map((t) => t.name);
          if (tagNames.length > 0) {
            const relRes = await fetch(`/api/recordings?tag=${encodeURIComponent(tagNames[0])}&limit=7`);
            if (relRes.ok) {
              const relData = await relRes.json();
              if (!cancelled) {
                setRelatedRecordings(
                  relData.recordings
                    .filter((r: RelatedRecording) => r.id !== id)
                    .slice(0, 6)
                );
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecording();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch the video stream URL once per recording. Polling updates the
  // transcript/summary data, but changing a signed media URL reloads playback.
  useEffect(() => {
    if (!recording?.id) return;
    let cancelled = false;

    async function fetchStreamUrl() {
      try {
        const res = await fetch(`/api/recordings/${id}/stream`);
        if (res.ok) {
          const { url } = await res.json();
          if (!cancelled) setVideoSrc(url);
        }
      } catch {
        // video won't play — graceful degradation
      }
    }

    fetchStreamUrl();
    return () => { cancelled = true; };
  }, [recording?.id, id]);

  // Sync video element with state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    setIsBookmarked(Boolean(recording?.viewerBookmark));
  }, [recording?.viewerBookmark]);

  useEffect(() => {
    if (sessionStatus === "loading") {
      setHasLoadedLocalResume(false);
      return;
    }

    const storedProgress = readStoredWatchProgress(progressStorageKey);
    lastLocalProgressStoreRef.current = storedProgress;
    setLocalResumeAt(storedProgress);
    setHasLoadedLocalResume(true);
  }, [progressStorageKey, sessionStatus]);

  useEffect(() => {
    hasTrackedViewRef.current = false;
    hasAppliedResumeRef.current = false;
    appliedResumeAtRef.current = 0;
    programmaticSeekTargetRef.current = null;
    lastWatchSyncAtRef.current = 0;
    currentTimeRef.current = 0;
    lastLocalProgressStoreRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [explicitResumeAt, id]);

  const syncWatchHistory = useCallback(
    async ({
      progress,
      completed,
      force = false,
      keepalive,
    }: {
      progress: number;
      completed?: boolean;
      force?: boolean;
      keepalive?: boolean;
    }) => {
      if (!session?.user?.id) return;

      const now = Date.now();
      if (!force && now - lastWatchSyncAtRef.current < 15_000) return;
      lastWatchSyncAtRef.current = now;

      try {
        const res = await fetch("/api/watch-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive,
          body: JSON.stringify({
            recordingId: id,
            progress: Math.max(0, Math.floor(progress)),
            ...(completed === undefined ? {} : { completed }),
          }),
        });

        if (!res.ok) return;

        const data = (await res.json()) as {
          totalViews?: number;
        };

        hasTrackedViewRef.current = true;

        if (typeof data.totalViews === "number") {
          setRecording((current) =>
            current
              ? {
                  ...current,
                  _count: {
                    ...current._count,
                    watchHistory: data.totalViews,
                  },
                }
              : current
          );
        }
      } catch {
        // Watch history should never interrupt playback.
      }
    },
    [id, session?.user?.id]
  );

  const getCurrentVideoProgress = useCallback(() => {
    const video = videoRef.current;
    return Math.floor(video?.currentTime ?? currentTimeRef.current);
  }, []);

  const shouldSaveProgress = useCallback(
    (progress: number) => {
      if (progress <= 0) return false;
      if (hasTrackedViewRef.current) return true;

      const video = videoRef.current;
      const threshold = getMeaningfulViewThreshold(
        video?.duration || duration || recording?.duration || 0
      );

      return progress >= threshold;
    },
    [duration, recording?.duration]
  );

  const persistProgressLocally = useCallback(
    (progress: number, completed = false) => {
      const nextProgress = Math.max(0, Math.floor(progress));
      if (nextProgress <= 0) return;

      writeStoredWatchProgress(progressStorageKey, nextProgress, completed);
      lastLocalProgressStoreRef.current = nextProgress;

      if (completed) {
        setLocalResumeAt(0);
        return;
      }

      clearResumeTimeParam();
      setLocalResumeAt(nextProgress);
    },
    [progressStorageKey]
  );

  const saveCurrentProgress = useCallback(
    ({ keepalive = false }: { keepalive?: boolean } = {}) => {
      const progress = getCurrentVideoProgress();
      if (!shouldSaveProgress(progress)) return;
      persistProgressLocally(progress);
      void syncWatchHistory({ progress, force: true, keepalive });
    },
    [
      getCurrentVideoProgress,
      persistProgressLocally,
      shouldSaveProgress,
      syncWatchHistory,
    ]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Math.floor(video.currentTime);
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);

    if (
      shouldSaveProgress(nextTime) &&
      nextTime !== lastLocalProgressStoreRef.current
    ) {
      persistProgressLocally(nextTime);
    }

    if (!hasTrackedViewRef.current) {
      const threshold = getMeaningfulViewThreshold(
        video.duration || duration || recording?.duration || 0
      );

      if (nextTime >= threshold) {
        void syncWatchHistory({ progress: nextTime, force: true });
      }

      return;
    }

    void syncWatchHistory({ progress: nextTime });
  }, [
    duration,
    persistProgressLocally,
    recording?.duration,
    shouldSaveProgress,
    syncWatchHistory,
  ]);

  const applyResumePosition = useCallback(
    (metadataDuration?: number) => {
      const video = videoRef.current;
      if (!video || resumeAt <= 0) return;
      if (!hasLoadedLocalResume) return;
      if (video.readyState < 1) return;

      if (hasAppliedResumeRef.current) {
        const currentPosition = Math.floor(video.currentTime);
        const isStillAtAppliedPosition =
          Math.abs(currentPosition - appliedResumeAtRef.current) <= 1;

        if (!video.paused || !isStillAtAppliedPosition) return;
      }

      const intrinsicDuration = Number.isFinite(video.duration)
        ? Math.floor(video.duration)
        : 0;
      const resolvedDuration =
        (metadataDuration ?? intrinsicDuration) ||
        duration ||
        recording?.duration ||
        0;

      const maxSeek =
        resolvedDuration > 1 ? Math.max(0, resolvedDuration - 1) : resumeAt;
      const safeResumeAt = Math.min(resumeAt, maxSeek);

      if (safeResumeAt > 0) {
        programmaticSeekTargetRef.current = safeResumeAt;
        video.currentTime = safeResumeAt;
        currentTimeRef.current = safeResumeAt;
        setCurrentTime(safeResumeAt);
        hasAppliedResumeRef.current = true;
        appliedResumeAtRef.current = safeResumeAt;
      }
    },
    [duration, hasLoadedLocalResume, recording?.duration, resumeAt]
  );

  useEffect(() => {
    applyResumePosition();
  }, [applyResumePosition]);

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const metadataDuration = Number.isFinite(video.duration)
      ? Math.floor(video.duration)
      : 0;
    setDuration(metadataDuration);

    applyResumePosition(metadataDuration);
  }, [applyResumePosition]);

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false);
    if (!videoRef.current?.ended) {
      saveCurrentProgress();
    }
  }, [saveCurrentProgress]);

  const handleVideoSeeked = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const programmaticTarget = programmaticSeekTargetRef.current;
    if (
      programmaticTarget !== null &&
      Math.abs(Math.floor(video.currentTime) - programmaticTarget) <= 1
    ) {
      programmaticSeekTargetRef.current = null;
      return;
    }

    programmaticSeekTargetRef.current = null;

    if (!video.ended) {
      saveCurrentProgress();
    }
  }, [saveCurrentProgress]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    const finalProgress = Math.floor(
      videoRef.current?.duration || duration || recording?.duration || 0
    );
    persistProgressLocally(finalProgress, true);
    void syncWatchHistory({
      progress: finalProgress,
      completed: true,
      force: true,
    });
  }, [duration, persistProgressLocally, recording?.duration, syncWatchHistory]);

  useEffect(() => {
    const handlePageHide = () => saveCurrentProgress({ keepalive: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentProgress({ keepalive: true });
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveCurrentProgress({ keepalive: true });
    };
  }, [saveCurrentProgress]);

  // Submit a new comment
  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/recordings/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim(), timestamp: null }),
      });
      if (res.ok) {
        const newComment: ApiComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
      }
    } catch {
      // silently fail for now
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, submittingComment, id]);

  const handleDeleteRecording = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/recordings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete recording");
      }

      router.replace("/recordings");
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete recording"
      );
      setIsDeleting(false);
    }
  }, [id, isDeleting, router]);

  const handleToggleBookmark = useCallback(async () => {
    if (isBookmarking) return;

    const nextBookmarked = !isBookmarked;
    setIsBookmarking(true);
    setBookmarkError(null);
    setIsBookmarked(nextBookmarked);

    try {
      const res = await fetch(`/api/recordings/${id}/bookmark`, {
        method: nextBookmarked ? "POST" : "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Could not update saved recording.");
      }

      setIsBookmarked(Boolean(data.bookmarked));
      setRecording((current) =>
        current
          ? {
              ...current,
              viewerBookmark: data.bookmark ?? null,
              _count: {
                ...current._count,
                bookmarks:
                  typeof data.totalBookmarks === "number"
                    ? data.totalBookmarks
                    : current._count?.bookmarks,
              },
            }
          : current
      );
    } catch (err) {
      setIsBookmarked(!nextBookmarked);
      setBookmarkError(
        err instanceof Error ? err.message : "Could not update saved recording."
      );
    } finally {
      setIsBookmarking(false);
    }
  }, [id, isBookmarked, isBookmarking]);

  const videoDuration = duration || recording?.duration || 0;
  const progressPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  // Speed cycle
  const speeds = [1, 1.5, 2];
  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      const idx = speeds.indexOf(prev);
      return speeds[(idx + 1) % speeds.length];
    });
  }, []);

  // Seek via progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const dur = videoDuration;
      if (!dur) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = Math.floor(pct * dur);
      programmaticSeekTargetRef.current = null;
      currentTimeRef.current = newTime;
      setCurrentTime(newTime);
      if (videoRef.current) videoRef.current.currentTime = newTime;

      if (shouldSaveProgress(newTime)) {
        persistProgressLocally(newTime);
        void syncWatchHistory({ progress: newTime, force: true });
      }
    },
    [persistProgressLocally, shouldSaveProgress, syncWatchHistory, videoDuration]
  );

  // Jump to timestamp
  const jumpTo = useCallback(
    (seconds: number) => {
      programmaticSeekTargetRef.current = null;
      currentTimeRef.current = seconds;
      setCurrentTime(seconds);
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play();
      }

      if (shouldSaveProgress(seconds)) {
        persistProgressLocally(seconds);
        void syncWatchHistory({ progress: seconds, force: true });
      }

      setIsPlaying(true);
    },
    [persistProgressLocally, shouldSaveProgress, syncWatchHistory]
  );

  // Real transcript — null means not yet processed (show processing UI)
  const transcript: TranscriptEntry[] | null = useMemo(() => {
    if (recording?.segments && recording.segments.length > 0) {
      return recording.segments.map((s) => ({ time: s.startTime, text: s.text }));
    }
    return null;
  }, [recording?.segments]);

  const isTranscriptProcessing = !loading && transcript === null;

  // Real AI summary — null means not yet processed (show processing UI)
  // Postgres jsonb sometimes round-trips as a JSON string depending on driver path.
  const keyTakeaways: string[] | null = useMemo(() => {
    const real = recording?.keyTakeaways as unknown;
    if (Array.isArray(real) && real.length > 0) return real as string[];
    if (typeof real === "string") {
      try {
        const parsed = JSON.parse(real);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
      } catch {
        // fall through
      }
    }
    return null;
  }, [recording?.keyTakeaways]);

  const tldr: string | null = recording?.tldr || null;
  const isSummaryProcessing = !loading && (keyTakeaways === null || tldr === null);

  // Auto-poll every 5s while transcript or summary is still processing
  useEffect(() => {
    if (loading) return;
    if (!isTranscriptProcessing && !isSummaryProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/recordings/${id}`);
        if (!res.ok) return;
        const data: ApiRecording = await res.json();
        setRecording(data);
        setComments(data.comments || []);
      } catch {
        // silently ignore poll errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, loading, isTranscriptProcessing, isSummaryProcessing]);

  const topics: string[] = useMemo(() => {
    if (recording?.tags && recording.tags.length > 0) {
      return recording.tags.map((t) => t.name);
    }
    return aiTopics;
  }, [recording?.tags]);

  // Filtered transcript
  const filteredTranscript = useMemo(() => {
    if (!transcript) return null;
    if (!transcriptSearch.trim()) return transcript;
    const q = transcriptSearch.toLowerCase();
    return transcript.filter((entry) =>
      entry.text.toLowerCase().includes(q)
    );
  }, [transcriptSearch, transcript]);

  // Currently "playing" transcript entry
  const activeTranscriptIndex = useMemo(() => {
    if (!transcript) return 0;
    let idx = 0;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].time <= currentTime) {
        idx = i;
      }
    }
    return idx;
  }, [currentTime, transcript]);

  // Loading state
  if (loading) {
    return (
      <div className="page-enter -mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
          <div className="min-w-0 flex-1 space-y-5">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-[320px]">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-20 w-36 rounded-md" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !recording) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {error || "Recording not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The recording you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/recordings">Back to Recordings</Link>
        </Button>
      </div>
    );
  }

  // Derived values from API recording
  const tags = recording.tags.map((t) => t.name);
  const views = recording._count?.watchHistory ?? 0;

  return (
    <div className="page-enter -mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        {/* ────────────────────── LEFT COLUMN ────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Video Player */}
          <div className="group relative overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/40 ring-1 ring-white/5">
            {/* 16:9 aspect ratio */}
            <div className="relative aspect-video" onClick={togglePlay}>
              {/* Real video element */}
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="absolute inset-0 h-full w-full object-contain"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onEnded={handleVideoEnded}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onSeeked={handleVideoSeeked}
                  playsInline
                />
              ) : (
                /* Placeholder when no video URL */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/30 via-background to-primary/10">
                  <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
                  <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-primary/15 blur-[80px]" />
                  <div className="relative flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-white/40" />
                    <p className="text-sm text-white/50">Loading video...</p>
                  </div>
                </div>
              )}

              {/* Center play button (shown when paused) */}
              {videoSrc && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                      "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
                      "hover:bg-primary hover:scale-110 hover:shadow-xl hover:shadow-primary/40",
                      "active:scale-95"
                    )}
                  >
                    <Play className="ml-1 h-8 w-8" />
                  </button>
                </div>
              )}

              {/* Top-left: duration badge */}
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-black/50 text-white/80 backdrop-blur-sm border-white/10"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDuration(videoDuration)}
                </Badge>
              </div>

              {/* Custom controls overlay */}
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-16 transition-opacity duration-300",
                  "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress bar */}
                <div
                  className="group/progress relative mb-3 cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/20 transition-all group-hover/progress:h-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-150"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {/* Scrubber dot */}
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-md shadow-primary/30 transition-opacity group-hover/progress:opacity-100"
                    style={{ left: `calc(${progressPercent}% - 6px)` }}
                  />
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2">
                  {/* Play / Pause */}
                  <button
                    onClick={togglePlay}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="ml-0.5 h-4 w-4" />
                    )}
                  </button>

                  {/* Skip forward */}
                  <button
                    onClick={() => {
                      const newTime = Math.min(currentTime + 10, videoDuration);
                      currentTimeRef.current = newTime;
                      setCurrentTime(newTime);
                      if (videoRef.current) videoRef.current.currentTime = newTime;
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  {/* Volume */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>

                  {/* Timestamp */}
                  <span className="ml-1 text-xs font-medium tabular-nums text-white/70">
                    {formatTimestamp(currentTime)}{" "}
                    <span className="text-white/40">/</span>{" "}
                    {formatDuration(videoDuration)}
                  </span>

                  <div className="flex-1" />

                  {/* Speed */}
                  <button
                    onClick={cycleSpeed}
                    className="flex h-7 items-center justify-center rounded-md px-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    {playbackSpeed}x
                  </button>

                  {/* PiP */}
                  <button
                    onClick={() => {
                      if (videoRef.current && document.pictureInPictureEnabled) {
                        videoRef.current.requestPictureInPicture();
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <PictureInPicture2 className="h-4 w-4" />
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={() => {
                      const container = videoRef.current?.closest(".group");
                      if (container) {
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          container.requestFullscreen();
                        }
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Recording Info ───────────────────────────────────── */}
          <div className="mt-5 space-y-4">
            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {recording.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatViews(views)} views
              </span>
              <span className="text-muted-foreground/40">&#183;</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatRelativeDate(new Date(recording.createdAt))}
              </span>
              <span className="text-muted-foreground/40">&#183;</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(recording.duration)}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer transition-colors hover:bg-secondary/80"
                >
                  {tag}
                </Badge>
              ))}
              {recording.series && (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary cursor-pointer"
                >
                  {recording.series.name}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Presenter + action row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Presenter */}
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                  {recording.presenter.image && (
                    <AvatarImage src={recording.presenter.image} alt={recording.presenter.name} />
                  )}
                  <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                    {getInitials(recording.presenter.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {recording.presenter.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {recording.presenter.role}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-1.5",
                      isBookmarked && "text-primary"
                    )}
                    disabled={isBookmarking}
                    aria-pressed={isBookmarked}
                    aria-label={
                      isBookmarked
                        ? "Remove from saved recordings"
                        : "Save recording"
                    }
                    onClick={handleToggleBookmark}
                  >
                    {isBookmarking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bookmark
                        className={cn(
                          "h-4 w-4",
                          isBookmarked && "fill-primary"
                        )}
                      />
                    )}
                    {isBookmarked ? "Saved" : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy link"}
                  </Button>
                  {recording.permissions?.canDelete && (
                    <Dialog
                      open={deleteDialogOpen}
                      onOpenChange={(open) => {
                        if (isDeleting) return;
                        setDeleteDialogOpen(open);
                        if (!open) setDeleteError(null);
                      }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                            onSelect={(event) => {
                              event.preventDefault();
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete recording
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <DialogTitle>Delete recording?</DialogTitle>
                          <DialogDescription>
                            This permanently removes the recording, transcript,
                            summary, comments, history, and uploaded media files.
                          </DialogDescription>
                        </DialogHeader>

                        {deleteError && (
                          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {deleteError}
                          </div>
                        )}

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteRecording}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {bookmarkError && (
                  <p className="max-w-[260px] text-xs text-destructive sm:text-right">
                    {bookmarkError}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-lg bg-secondary/40 p-4">
              <p
                className={cn(
                  "text-sm leading-relaxed text-muted-foreground",
                  !showDescription && "line-clamp-2"
                )}
              >
                {recording.description || "No description provided."}
              </p>
              {(recording.description?.length ?? 0) > 150 && (
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {showDescription ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>

            <Separator />

            {/* ── Tabs Section ─────────────────────────────────── */}
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="summary">AI Summary</TabsTrigger>
                <TabsTrigger value="comments">
                  Comments
                  <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    {comments.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* ── Transcript Tab ──────────────────────────────── */}
              <TabsContent value="transcript" className="mt-4">
                {isTranscriptProcessing ? (
                  /* Processing state */
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/30 py-14 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Transcribing recording…</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This usually takes a few minutes. The transcript will appear here automatically.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search transcript..."
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        className="h-8 pl-9 text-xs"
                      />
                    </div>

                    {/* Entries */}
                    <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                      {filteredTranscript!.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No matching transcript entries found.
                        </p>
                      )}
                      {filteredTranscript!.map((entry, i) => {
                        const originalIdx = transcript!.indexOf(entry);
                        const isActive = originalIdx === activeTranscriptIndex;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "group/entry flex gap-3 rounded-lg px-3 py-2.5 transition-colors",
                              isActive
                                ? "bg-accent/60 border-l-2 border-primary"
                                : "hover:bg-secondary/50"
                            )}
                          >
                            <button
                              onClick={() => jumpTo(entry.time)}
                              className="mt-0.5 shrink-0 text-xs font-medium tabular-nums text-primary hover:underline"
                            >
                              {formatTimestamp(entry.time)}
                            </button>
                            <p
                              className={cn(
                                "text-sm leading-relaxed",
                                isActive
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {entry.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── AI Summary Tab ──────────────────────────────── */}
              <TabsContent value="summary" className="mt-4 space-y-6">
                {isSummaryProcessing ? (
                  /* Processing state */
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/30 py-14 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Generating AI summary…</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        AI is analyzing the recording. Summary will be ready shortly.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* AI badge */}
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Generated by AI
                    </Badge>

                    {/* Key Takeaways */}
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Key Takeaways
                      </h3>
                      <div className="space-y-2.5">
                        {keyTakeaways!.map((item, i) => (
                          <div key={i} className="flex gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* TL;DR */}
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        TL;DR
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {tldr}
                      </p>
                    </div>

                    <Separator />

                    {/* Topics Covered */}
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Topics Covered
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── Comments Tab ────────────────────────────────── */}
              <TabsContent value="comments" className="mt-4 space-y-4">
                {/* Comment list */}
                <div className="space-y-4">
                  {comments.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group/comment flex gap-3"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {comment.user.image && (
                          <AvatarImage src={comment.user.image} alt={comment.user.name || "User"} />
                        )}
                        <AvatarFallback className="bg-secondary text-[11px] font-semibold">
                          {getInitials(comment.user.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {comment.user.name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(new Date(comment.createdAt))}
                          </span>
                          {comment.timestamp !== null && (
                            <button
                              onClick={() => jumpTo(comment.timestamp!)}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary transition-colors hover:bg-primary/20"
                            >
                              {formatTimestamp(comment.timestamp)}
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Add a comment */}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {session?.user?.image && (
                      <AvatarImage src={session.user.image} alt={session.user.name || "You"} />
                    )}
                    <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                      {getInitials(session?.user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmitComment();
                    }}
                  >
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="h-9 flex-1 text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!commentText.trim() || submittingComment}
                      className="shrink-0"
                    >
                      {submittingComment ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ────────────────────── RIGHT COLUMN (Sidebar) ────────── */}
        <div className="w-full shrink-0 lg:w-[320px]">
          <div className="sticky top-6 space-y-6">
            {/* Related Recordings */}
            {relatedRecordings.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Related Recordings
                </h2>
                <div className="space-y-2">
                  {relatedRecordings.map((rec) => (
                    <Link
                      key={rec.id}
                      href={`/recordings/${rec.id}`}
                      className="group/card flex gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/60"
                    >
                      <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/20 via-background to-primary/5 ring-1 ring-white/5">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-5 w-5 text-white/40 transition-colors group-hover/card:text-primary" />
                        </div>
                        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium tabular-nums text-white/80">
                          {formatDuration(rec.duration)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover/card:text-primary">
                          {rec.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rec.presenter.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                          {formatViews(rec._count?.watchHistory ?? 0)} views &#183;{" "}
                          {formatRelativeDate(new Date(rec.createdAt))}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
