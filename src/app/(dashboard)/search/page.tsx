"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDuration, formatRelativeDate, getInitials } from "@/lib/utils";
import {
  Search,
  X,
  Clock,
  Play,
  Eye,
  Sparkles,
  TrendingUp,
  FolderOpen,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchRecording {
  id: string;
  title: string;
  description: string;
  duration: number;
  presenter: { name: string };
  series: { id: string; name: string } | null;
  tags: string[];
  views: number;
  createdAt: Date;
}

interface SearchSeries {
  id: string;
  name: string;
  description: string;
  recordingCount: number;
  coverColor: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRENDING_TOPICS = [
  "erasure coding",
  "kubernetes",
  "performance",
  "security",
  "architecture",
  "s3 api",
  "monitoring",
  "encryption",
];

const RECENT_SEARCHES = [
  "erasure coding healing",
  "multipart upload",
  "iam policies",
  "CI/CD pipeline",
];

// Mock transcript snippets keyed by recording id for transcript-match results.
const TRANSCRIPT_SNIPPETS: Record<
  string,
  { text: string; timestamp: string }
> = {
  r1: {
    text: "...we chose erasure coding over simple replication because the storage overhead drops from 3x to roughly 1.5x while maintaining the same durability guarantees across availability zones...",
    timestamp: "12:34",
  },
  r2: {
    text: "...the kubernetes control plane migration required careful coordination to ensure zero-downtime, we rolled nodes in batches of three...",
    timestamp: "08:21",
  },
  r3: {
    text: "...mutual TLS between services is enforced at the mesh layer, ensuring encrypted communication without application-level changes for security...",
    timestamp: "22:15",
  },
  r4: {
    text: "...server components eliminate the client bundle for these routes which dramatically improves performance on low-end devices...",
    timestamp: "15:47",
  },
  r5: {
    text: "...adding a composite index on (tenant_id, created_at) improved the query performance from 2.3 seconds down to 12 milliseconds...",
    timestamp: "31:02",
  },
  r7: {
    text: "...we instrument every service with OpenTelemetry for distributed tracing and monitoring across the entire request lifecycle...",
    timestamp: "19:44",
  },
  r9: {
    text: "...the CI/CD pipeline runs security scans, linting, unit tests, and integration tests in parallel to keep build times under eight minutes...",
    timestamp: "14:08",
  },
  r12: {
    text: "...our Redis cluster handles over 200k requests per second with sub-millisecond latency for improved performance at scale...",
    timestamp: "26:33",
  },
  r14: {
    text: "...the API gateway handles authentication, rate limiting, and request transformation before forwarding to downstream services with strict security policies...",
    timestamp: "10:55",
  },
  r16: {
    text: "...during the incident we identified the root cause within 15 minutes thanks to our monitoring and alerting setup...",
    timestamp: "38:12",
  },
  r18: {
    text: "...feature flags let us decouple deployments from releases, giving product full control over the architecture of progressive rollouts...",
    timestamp: "17:29",
  },
};

const SERIES_GRADIENT_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-sky-500 to-blue-600",
];

// ---------------------------------------------------------------------------
// API mappers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiRecording(apiRec: any): SearchRecording {
  return {
    id: apiRec.id,
    title: apiRec.title,
    description: apiRec.description || "",
    duration: apiRec.duration || 0,
    presenter: {
      name: apiRec.presenter?.name || "Unknown",
    },
    series: apiRec.series
      ? { id: apiRec.series.id, name: apiRec.series.name }
      : null,
    tags:
      apiRec.tags?.map((t: { id: string; name: string }) => t.name) || [],
    views: apiRec._count?.watchHistory || 0,
    createdAt: new Date(apiRec.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiSeries(apiSeries: any, index: number): SearchSeries {
  return {
    id: apiSeries.id,
    name: apiSeries.name,
    description: apiSeries.description || "",
    recordingCount: apiSeries._count?.recordings || 0,
    coverColor:
      SERIES_GRADIENT_COLORS[index % SERIES_GRADIENT_COLORS.length],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Wrap every occurrence of `term` inside `text` with a highlight span. */
function highlightText(text: string, term: string) {
  if (!term.trim()) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        className="rounded bg-yellow-500/20 text-yellow-200 px-0.5"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GradientThumbnail({ title }: { title: string }) {
  // Deterministic gradient based on title
  const gradients = [
    "from-violet-600 to-indigo-700",
    "from-blue-600 to-cyan-700",
    "from-emerald-600 to-teal-700",
    "from-orange-600 to-rose-700",
    "from-pink-600 to-purple-700",
    "from-sky-600 to-blue-700",
  ];
  const idx = title.length % gradients.length;
  return (
    <div
      className={cn(
        "relative aspect-video w-40 shrink-0 rounded-lg bg-gradient-to-br overflow-hidden",
        gradients[idx]
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-white/10 p-2 backdrop-blur-sm">
          <Play className="h-4 w-4 text-white fill-white" />
        </div>
      </div>
    </div>
  );
}

interface ResultCardProps {
  recording: SearchRecording;
  query: string;
  showTranscript?: boolean;
}

function ResultCard({ recording, query, showTranscript }: ResultCardProps) {
  const transcript = TRANSCRIPT_SNIPPETS[recording.id];
  const hasTranscriptMatch =
    showTranscript !== false &&
    transcript &&
    transcript.text.toLowerCase().includes(query.toLowerCase());

  return (
    <Link href={`/recordings/${recording.id}`} className="block group">
      <div className="flex gap-4 rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-border hover:bg-card hover:shadow-lg hover:shadow-primary/5">
        {/* Thumbnail */}
        <GradientThumbnail title={recording.title} />

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Title */}
          <h3 className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {highlightText(recording.title, query)}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {highlightText(recording.description, query)}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(recording.presenter.name)}
                </AvatarFallback>
              </Avatar>
              <span>{recording.presenter.name}</span>
            </span>

            {recording.series && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {recording.series.name}
              </Badge>
            )}

            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(recording.duration)}
            </span>

            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {recording.views}
            </span>

            <span>{formatRelativeDate(recording.createdAt)}</span>
          </div>

          {/* Transcript match */}
          {hasTranscriptMatch && (
            <div className="mt-1 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Badge
                variant="outline"
                className="shrink-0 gap-1 text-[10px] border-purple-500/30 text-purple-400"
              >
                <Sparkles className="h-3 w-3" />
                Transcript match
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                <span className="font-mono text-[10px] text-muted-foreground/60 mr-1.5">
                  [{transcript.timestamp}]
                </span>
                {highlightText(transcript.text, query)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<SearchRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState<SearchSeries[]>([]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch series for Browse by Series section
  useEffect(() => {
    let cancelled = false;

    async function fetchSeries() {
      try {
        const res = await fetch("/api/series");
        if (!res.ok) throw new Error("Failed to fetch series");
        const data = await res.json();
        if (!cancelled) {
          setSeries(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map((s: any, i: number) => mapApiSeries(s, i))
          );
        }
      } catch (err) {
        console.error("Error fetching series:", err);
      }
    }

    fetchSeries();
    return () => {
      cancelled = true;
    };
  }, []);

  // Search recordings via API when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchResults() {
      try {
        const res = await fetch(
          `/api/recordings?search=${encodeURIComponent(debouncedQuery)}&limit=20`
        );
        if (!res.ok) throw new Error("Failed to fetch recordings");
        const data = await res.json();
        if (!cancelled) {
          setResults(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.recordings.map((r: any) => mapApiRecording(r))
          );
        }
      } catch (err) {
        console.error("Error searching recordings:", err);
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Separate transcript-only matches for the Transcripts tab
  const transcriptResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return results.filter((r) =>
      TRANSCRIPT_SNIPPETS[r.id]?.text?.toLowerCase().includes(q)
    );
  }, [debouncedQuery, results]);

  const handleTopicClick = useCallback((topic: string) => {
    setQuery(topic);
    inputRef.current?.focus();
  }, []);

  const handleRecentClick = useCallback((search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  }, []);

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* ----------------------------------------------------------------- */}
      {/* Search input */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <div className="relative w-full max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recordings, transcripts, topics..."
            className={cn(
              "w-full rounded-2xl border border-border/60 bg-card/80 py-4 pl-12 pr-12 text-lg",
              "placeholder:text-muted-foreground/60",
              "shadow-lg shadow-black/10 backdrop-blur-sm",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40",
              "hover:border-border"
            )}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Discovery state (no query) */}
      {/* ----------------------------------------------------------------- */}
      {!hasQuery && (
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-10">
          {/* Trending Topics */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Trending Topics
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  className={cn(
                    "rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm",
                    "text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5",
                    "transition-all duration-200"
                  )}
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Recent Searches */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Recent Searches
            </div>
            <div className="flex flex-col gap-1">
              {RECENT_SEARCHES.map((search) => (
                <button
                  key={search}
                  onClick={() => handleRecentClick(search)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    "transition-colors"
                  )}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  {search}
                </button>
              ))}
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Browse by Series */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
              Browse by Series
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {series.map((s) => (
                <Link
                  key={s.id}
                  href={`/recordings?series=${s.id}`}
                  className="group"
                >
                  <Card className="overflow-hidden border-border/50 transition-all hover:border-border hover:shadow-md hover:shadow-primary/5">
                    <div
                      className={cn(
                        "h-2 bg-gradient-to-r",
                        s.coverColor
                      )}
                    />
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                        {s.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {s.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground/70">
                        {s.recordingCount} recordings
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Loading state */}
      {/* ----------------------------------------------------------------- */}
      {hasQuery && loading && (
        <div className="mx-auto flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Searching...
          </p>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Results state */}
      {/* ----------------------------------------------------------------- */}
      {hasQuery && !loading && results.length > 0 && (
        <div className="mx-auto w-full max-w-4xl flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Found{" "}
            <span className="font-medium text-foreground">
              {results.length}
            </span>{" "}
            result{results.length !== 1 ? "s" : ""} for{" "}
            <span className="font-medium text-foreground">
              &lsquo;{debouncedQuery}&rsquo;
            </span>
          </p>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                All
                <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px]">
                  {results.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="recordings" className="gap-1.5">
                <Play className="h-3 w-3" />
                Recordings
              </TabsTrigger>
              <TabsTrigger value="transcripts" className="gap-1.5">
                <FileText className="h-3 w-3" />
                Transcripts
                {transcriptResults.length > 0 && (
                  <span className="ml-1 rounded-full bg-purple-500/20 text-purple-400 px-1.5 py-0.5 text-[10px]">
                    {transcriptResults.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* All tab */}
            <TabsContent value="all" className="mt-4">
              <div className="flex flex-col gap-3">
                {results.map((recording) => (
                  <ResultCard
                    key={recording.id}
                    recording={recording}
                    query={debouncedQuery}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Recordings tab */}
            <TabsContent value="recordings" className="mt-4">
              <div className="flex flex-col gap-3">
                {results.map((recording) => (
                  <ResultCard
                    key={recording.id}
                    recording={recording}
                    query={debouncedQuery}
                    showTranscript={false}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Transcripts tab */}
            <TabsContent value="transcripts" className="mt-4">
              {transcriptResults.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {transcriptResults.map((recording) => (
                    <ResultCard
                      key={recording.id}
                      recording={recording}
                      query={debouncedQuery}
                      showTranscript={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No transcript matches found for this query.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Empty state */}
      {/* ----------------------------------------------------------------- */}
      {hasQuery && !loading && results.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-muted/50 p-5">
            <Search className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            No results found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Try different keywords or browse all recordings to find what
            you&apos;re looking for.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/recordings">Browse All</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
