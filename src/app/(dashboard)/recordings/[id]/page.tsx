"use client";

import { useState, useMemo, useCallback, useEffect, use } from "react";
import Link from "next/link";
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
  _count?: {
    watchHistory?: number;
    bookmarks?: number;
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

// ─── Page Component ──────────────────────────────────────────────────────────

export default function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();

  // API data state
  const [recording, setRecording] = useState<ApiRecording | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [relatedRecordings, setRelatedRecordings] = useState<RelatedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const progressPercent = recording ? (currentTime / recording.duration) * 100 : 0;

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
      if (!recording) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setCurrentTime(Math.floor(pct * recording.duration));
    },
    [recording]
  );

  // Jump to timestamp
  const jumpTo = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
  }, []);

  // Filtered transcript
  const filteredTranscript = useMemo(() => {
    if (!transcriptSearch.trim()) return mockTranscript;
    const q = transcriptSearch.toLowerCase();
    return mockTranscript.filter((entry) =>
      entry.text.toLowerCase().includes(q)
    );
  }, [transcriptSearch]);

  // Currently "playing" transcript entry
  const activeTranscriptIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < mockTranscript.length; i++) {
      if (mockTranscript[i].time <= currentTime) {
        idx = i;
      }
    }
    return idx;
  }, [currentTime]);

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
          <div className="group relative overflow-hidden rounded-xl bg-black/90 shadow-2xl shadow-black/40 ring-1 ring-white/5">
            {/* 16:9 aspect ratio */}
            <div className="relative aspect-video">
              {/* Gradient placeholder background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-primary/10" />

              {/* Decorative grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Animated gradient orbs */}
              <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
              <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-primary/15 blur-[80px]" />

              {/* Center play button & title */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                    "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
                    "hover:bg-primary hover:scale-110 hover:shadow-xl hover:shadow-primary/40",
                    "active:scale-95",
                    isPlaying && "bg-white/10 backdrop-blur-sm hover:bg-white/20"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="ml-1 h-8 w-8" />
                  )}
                </button>
                <div className="max-w-md px-4 text-center">
                  <p className="text-sm font-medium text-white/60">
                    {recording.presenter.name}
                  </p>
                  <p className="mt-1 text-base font-semibold text-white/90 line-clamp-2">
                    {recording.title}
                  </p>
                </div>
              </div>

              {/* Top-left: live badge / recording indicator */}
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-black/50 text-white/80 backdrop-blur-sm border-white/10"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDuration(recording.duration)}
                </Badge>
              </div>

              {/* Custom controls overlay */}
              <div className={cn(
                "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-16 transition-opacity duration-300",
                "opacity-0 group-hover:opacity-100"
              )}>
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
                    onClick={() => setIsPlaying(!isPlaying)}
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
                    onClick={() =>
                      setCurrentTime((t) =>
                        Math.min(t + 10, recording.duration)
                      )
                    }
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
                    {formatDuration(recording.duration)}
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
                  <button className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                    <PictureInPicture2 className="h-4 w-4" />
                  </button>

                  {/* Fullscreen */}
                  <button className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white">
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5",
                    isBookmarked && "text-primary"
                  )}
                  onClick={() => setIsBookmarked(!isBookmarked)}
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4",
                      isBookmarked && "fill-primary"
                    )}
                  />
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
                  {filteredTranscript.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No matching transcript entries found.
                    </p>
                  )}
                  {filteredTranscript.map((entry, i) => {
                    const originalIdx = mockTranscript.indexOf(entry);
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
              </TabsContent>

              {/* ── AI Summary Tab ──────────────────────────────── */}
              <TabsContent value="summary" className="mt-4 space-y-6">
                {/* AI badge */}
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generated by AI
                </Badge>

                {/* Key Takeaways */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    Key Takeaways
                  </h3>
                  <div className="space-y-2.5">
                    {aiKeyTakeaways.map((item, i) => (
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
                    {aiTldr}
                  </p>
                </div>

                <Separator />

                {/* Topics Covered */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    Topics Covered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aiTopics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
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
