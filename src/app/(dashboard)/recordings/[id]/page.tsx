"use client";

import { useState, useMemo, useCallback, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatRelativeDate,
  getInitials,
  formatViews,
} from "@/lib/utils";
import { mockRecordings } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

// ─── Mock Transcript Data ────────────────────────────────────────────────────

interface TranscriptEntry {
  time: number; // seconds
  text: string;
}

const mockTranscript: TranscriptEntry[] = [
  {
    time: 0,
    text: "Welcome everyone to today's deep dive session on erasure coding in distributed storage systems. Glad to see so many familiar faces.",
  },
  {
    time: 35,
    text: "Before we jump in, a quick agenda: we'll start with the fundamentals, move into Reed-Solomon coding, then look at how this works in practice.",
  },
  {
    time: 78,
    text: "So what is erasure coding? At its core, it's a method of data protection where data is broken into fragments, expanded with redundant pieces, and stored across different locations.",
  },
  {
    time: 135,
    text: "Think of it this way - you take your original data, split it into k data blocks, then generate m parity blocks. You can recover all data from any k of the k+m total blocks.",
  },
  {
    time: 210,
    text: "This is fundamentally different from replication. With 3x replication, you need 3x the storage. With erasure coding at a 4+2 config, you only need 1.5x the storage for similar durability.",
  },
  {
    time: 330,
    text: "Now let's talk about Reed-Solomon specifically. It's based on polynomial interpolation over finite fields - Galois fields to be precise.",
  },
  {
    time: 465,
    text: "In our implementation, we use GF(2^8) which gives us a field of 256 elements. Each symbol is one byte. The encoding matrix is a Vandermonde matrix.",
  },
  {
    time: 580,
    text: "Let me show you a quick demo. Here we have a 4+2 configuration running. I'm going to deliberately fail two drives and show you the reconstruction process.",
  },
  {
    time: 720,
    text: "Notice the reconstruction happened in under 200 milliseconds for this block. That's because we're using SIMD-optimized matrix operations on the encoding/decoding path.",
  },
  {
    time: 890,
    text: "One of the key trade-offs is the compute overhead during writes. Every write operation now involves matrix multiplication. We mitigate this with Intel ISA-L optimizations.",
  },
  {
    time: 1050,
    text: "Let's look at the benchmarks. For sequential writes, we see about a 15% throughput reduction compared to simple replication, but the storage savings more than compensate.",
  },
  {
    time: 1200,
    text: "For reads with all drives healthy, there's virtually no overhead. It's only during degraded reads - when we need to reconstruct - that we see latency impact.",
  },
  {
    time: 1380,
    text: "In production, we monitor the reconstruction rate carefully. If it drops below our SLA threshold, we trigger an alert and potentially rebalance the cluster.",
  },
  {
    time: 1560,
    text: "Questions so far? ... Great question about bitrot detection. Yes, we combine erasure coding with hash verification on each block to detect silent corruption.",
  },
  {
    time: 1740,
    text: "To wrap up: erasure coding gives us the sweet spot between storage efficiency and data durability. The key is choosing the right EC configuration for your workload profile.",
  },
];

// ─── Mock Comments Data ──────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: { name: string; initials: string };
  content: string;
  videoTime?: number;
  postedAt: Date;
}

const mockComments: Comment[] = [
  {
    id: "c1",
    author: { name: "Marcus Johnson", initials: "MJ" },
    content:
      "The SIMD optimization section was super insightful. Would love a follow-up session on the specific ISA-L intrinsics used.",
    videoTime: 890,
    postedAt: new Date("2026-02-02"),
  },
  {
    id: "c2",
    author: { name: "Alex Rivera", initials: "AR" },
    content:
      "Great session! The benchmark comparison between replication and EC really put things in perspective for the team.",
    postedAt: new Date("2026-02-01"),
  },
  {
    id: "c3",
    author: { name: "Priya Patel", initials: "PP" },
    content:
      "How does this interact with our encryption-at-rest layer? Do we encrypt before or after erasure coding?",
    videoTime: 465,
    postedAt: new Date("2026-02-01"),
  },
  {
    id: "c4",
    author: { name: "Jordan Lee", initials: "JL" },
    content:
      "The live demo of drive failure recovery was impressive. Can we get the reconstruction latency numbers for different EC configurations?",
    videoTime: 720,
    postedAt: new Date("2026-01-31"),
  },
];

// ─── Mock AI Summary Data ────────────────────────────────────────────────────

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

  const recording = useMemo(() => {
    return mockRecordings.find((r) => r.id === id) ?? mockRecordings[0];
  }, [id]);

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

  const progressPercent = (currentTime / recording.duration) * 100;

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
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setCurrentTime(Math.floor(pct * recording.duration));
    },
    [recording.duration]
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

  // Related recordings (same series or shared tags)
  const relatedRecordings = useMemo(() => {
    return mockRecordings
      .filter(
        (r) =>
          r.id !== recording.id &&
          (r.series?.id === recording.series?.id ||
            r.tags.some((t) => recording.tags.includes(t)))
      )
      .slice(0, 6);
  }, [recording.id, recording.series, recording.tags]);

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
                {formatViews(recording.views)} views
              </span>
              <span className="text-muted-foreground/40">&#183;</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatRelativeDate(recording.createdAt)}
              </span>
              <span className="text-muted-foreground/40">&#183;</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(recording.duration)}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {recording.tags.map((tag) => (
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
                {recording.description}
              </p>
              {recording.description.length > 150 && (
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
                    {mockComments.length}
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
                  {mockComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group/comment flex gap-3"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-secondary text-[11px] font-semibold">
                          {comment.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {comment.author.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(comment.postedAt)}
                          </span>
                          {comment.videoTime !== undefined && (
                            <button
                              onClick={() => jumpTo(comment.videoTime!)}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary transition-colors hover:bg-primary/20"
                            >
                              {formatTimestamp(comment.videoTime)}
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
                    <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                      TK
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="h-9 flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!commentText.trim()}
                      className="shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                          {formatViews(rec.views)} views &#183;{" "}
                          {formatRelativeDate(rec.createdAt)}
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
