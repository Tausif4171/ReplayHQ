"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  SlidersHorizontal,
  Film,
  X,
  Loader2,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RecordingCard from "@/components/recordings/recording-card";
import type { Recording, Series } from "@/lib/mock-data";

type SortOption = "newest" | "oldest" | "most-viewed" | "a-z";
type ViewMode = "grid" | "list";

const ALL_TAGS = [
  "All",
  "storage",
  "architecture",
  "kubernetes",
  "security",
  "performance",
  "s3",
] as const;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-viewed", label: "Most Viewed" },
  { value: "a-z", label: "A-Z" },
];

const SERIES_GRADIENT_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-sky-500 to-blue-600",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiRecording(apiRec: any): Recording {
  return {
    id: apiRec.id,
    title: apiRec.title,
    description: apiRec.description || "",
    duration: apiRec.duration || 0,
    thumbnailUrl: apiRec.thumbnailUrl || "",
    presenter: {
      id: apiRec.presenter?.id || "",
      name: apiRec.presenter?.name || "Unknown",
      avatar: apiRec.presenter?.image || undefined,
      role: apiRec.presenter?.role || "",
    },
    series: apiRec.series
      ? { id: apiRec.series.id, name: apiRec.series.name }
      : undefined,
    tags: apiRec.tags?.map((t: { id: string; name: string }) => t.name) || [],
    views: apiRec._count?.watchHistory || 0,
    status: (apiRec.status || "ready").toLowerCase() as
      | "processing"
      | "ready"
      | "failed",
    hasTranscript: false,
    hasSummary: false,
    recordedAt: new Date(apiRec.createdAt),
    createdAt: new Date(apiRec.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiSeries(apiSeries: any, index: number): Series {
  return {
    id: apiSeries.id,
    name: apiSeries.name,
    description: apiSeries.description || "",
    recordingCount: apiSeries._count?.recordings || 0,
    coverColor:
      SERIES_GRADIENT_COLORS[index % SERIES_GRADIENT_COLORS.length],
  };
}

export default function RecordingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("All Series");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedTag, setSelectedTag] = useState("All");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);

  // Fetch recordings from API
  useEffect(() => {
    let cancelled = false;

    async function fetchRecordings() {
      try {
        setLoadingRecordings(true);
        const params = new URLSearchParams({ limit: "100" });
        if (showSavedOnly) params.set("saved", "true");

        const res = await fetch(`/api/recordings?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch recordings");
        const data = await res.json();
        if (!cancelled) {
          setRecordings(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.recordings.map((r: any) => mapApiRecording(r))
          );
        }
      } catch (err) {
        console.error("Error fetching recordings:", err);
      } finally {
        if (!cancelled) setLoadingRecordings(false);
      }
    }

    fetchRecordings();
    return () => {
      cancelled = true;
    };
  }, [showSavedOnly]);

  // Fetch series from API
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
      } finally {
        if (!cancelled) setLoadingSeries(false);
      }
    }

    fetchSeries();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = loadingRecordings || loadingSeries;

  // Filter and sort recordings
  const filteredRecordings = useMemo(() => {
    let results = [...recordings];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
      );
    }

    // Filter by series
    if (selectedSeries !== "All Series") {
      results = results.filter((r) => r.series?.name === selectedSeries);
    }

    // Filter by tag
    if (selectedTag !== "All") {
      results = results.filter((r) => r.tags.includes(selectedTag));
    }

    // Sort
    switch (sortBy) {
      case "newest":
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case "oldest":
        results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "most-viewed":
        results.sort((a, b) => b.views - a.views);
        break;
      case "a-z":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return results;
  }, [recordings, searchQuery, selectedSeries, sortBy, selectedTag]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedSeries !== "All Series" ||
    selectedTag !== "All" ||
    showSavedOnly;

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedSeries("All Series");
    setSelectedTag("All");
    setShowSavedOnly(false);
    setSortBy("newest");
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        {/* Page header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recordings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse all team recordings and learning sessions
            </p>
          </div>
        </div>

        {/* Series cards skeleton */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse rounded-xl bg-secondary/60"
            />
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="h-9 w-64 animate-pulse rounded-md bg-secondary/60" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-secondary/60" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-secondary/60" />
        </div>

        {/* Tag pills skeleton */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 animate-pulse rounded-full bg-secondary/60"
            />
          ))}
        </div>

        {/* Loading indicator */}
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading recordings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Recordings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all team recordings and learning sessions
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>

      {/* Series cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {series.map((s) => (
          <button
            key={s.id}
            onClick={() =>
              setSelectedSeries(
                selectedSeries === s.name ? "All Series" : s.name
              )
            }
            className={cn(
              "group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200",
              "bg-gradient-to-br",
              s.coverColor,
              selectedSeries === s.name
                ? "ring-2 ring-white/30 shadow-lg scale-[1.02]"
                : "hover:shadow-md hover:scale-[1.01]"
            )}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative">
              <p className="text-sm font-semibold text-white leading-tight">
                {s.name}
              </p>
              <p className="mt-1.5 text-xs text-white/70">
                {s.recordingCount} recordings
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-4 text-sm bg-secondary/50 border-border focus-visible:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Series dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setSeriesDropdownOpen(!seriesDropdownOpen);
                setSortDropdownOpen(false);
              }}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                selectedSeries !== "All Series"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="max-w-[160px] truncate">{selectedSeries}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  seriesDropdownOpen && "rotate-180"
                )}
              />
            </button>
            {seriesDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSeriesDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                  <div className="p-1">
                    {["All Series", ...series.map((s) => s.name)].map(
                      (option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSelectedSeries(option);
                            setSeriesDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                            selectedSeries === option
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-secondary"
                          )}
                        >
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setSortDropdownOpen(!sortDropdownOpen);
                setSeriesDropdownOpen(false);
              }}
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  sortDropdownOpen && "rotate-180"
                )}
              />
            </button>
            {sortDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSortDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                  <div className="p-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setSortDropdownOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                          sortBy === option.value
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            variant={showSavedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSavedOnly((value) => !value)}
            className={cn(
              "h-9 gap-1.5 px-3 text-sm",
              showSavedOnly
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark
              className={cn("h-3.5 w-3.5", showSavedOnly && "fill-current")}
            />
            Saved
          </Button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Tag pills */}
        <div className="flex flex-wrap items-center gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                selectedTag === tag
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {filteredRecordings.length}
          </span>{" "}
          recording{filteredRecordings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Recordings grid / list */}
      {filteredRecordings.length > 0 ? (
        <div
          className={cn(
            "mt-4",
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          )}
        >
          {filteredRecordings.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              view={viewMode}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            {showSavedOnly ? "No saved recordings yet" : "No recordings found"}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {showSavedOnly
              ? "Save recordings you want to revisit, and they will appear here."
              : "No recordings match your current filters. Try adjusting your search query, series, or tag selections."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="mt-4"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
