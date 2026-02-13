"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  PlayCircle,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RecordingCard, {
  ContinueWatchingCard,
} from "@/components/recordings/recording-card";
import type {
  Recording,
  ContinueWatchingItem,
  DashboardStats,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// API → Frontend type mappers
// ---------------------------------------------------------------------------

interface ApiRecording {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  videoUrl: string;
  thumbnailUrl: string | null;
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
  tags: { id?: string; name: string }[];
  _count?: {
    watchHistory?: number;
    comments?: number;
  };
}

interface ApiWatchHistoryItem {
  id: string;
  progress: number;
  completed: boolean;
  lastWatchedAt: string;
  recording: ApiRecording;
}

function mapApiRecording(api: ApiRecording): Recording {
  return {
    id: api.id,
    title: api.title,
    description: api.description || "",
    duration: api.duration,
    thumbnailUrl: api.thumbnailUrl || "",
    presenter: {
      id: api.presenter.id,
      name: api.presenter.name,
      avatar: api.presenter.image ?? undefined,
      role: api.presenter.role,
    },
    series: api.series ? { id: api.series.id, name: api.series.name } : undefined,
    tags: api.tags.map((t) => t.name),
    views: api._count?.watchHistory ?? 0,
    status: api.status.toLowerCase() as Recording["status"],
    hasTranscript: false,
    hasSummary: false,
    recordedAt: new Date(api.createdAt),
    createdAt: new Date(api.createdAt),
  };
}

function mapApiWatchHistory(api: ApiWatchHistoryItem): ContinueWatchingItem {
  return {
    recording: mapApiRecording(api.recording),
    progress: api.progress,
    lastWatchedAt: new Date(api.lastWatchedAt),
  };
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

// ---------------------------------------------------------------------------
// Stat card config (icons & colors are static; values filled from API)
// ---------------------------------------------------------------------------

const statConfig = [
  {
    key: "totalRecordings" as const,
    label: "Total Recordings",
    unit: "recordings",
    icon: PlayCircle,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
  },
  {
    key: "totalWatchTime" as const,
    label: "Watch Time",
    unit: "hrs total watch time",
    icon: Clock,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    key: "activeViewers" as const,
    label: "Active Viewers",
    unit: "this month",
    icon: Users,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    key: "thisWeekUploads" as const,
    label: "New This Week",
    unit: "uploads",
    icon: TrendingUp,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
] as const;

// ---------------------------------------------------------------------------
// Section header component
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  href,
  linkLabel = "See all",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function RecordingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-video w-full" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: session } = useSession();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentRecordings, setRecentRecordings] = useState<Recording[] | null>(null);
  const [popularRecordings, setPopularRecordings] = useState<Recording[] | null>(null);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[] | null>(null);

  const [statsLoading, setStatsLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [popularLoading, setPopularLoading] = useState(true);
  const [continueLoading, setContinueLoading] = useState(true);

  // Fetch dashboard stats
  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setDashboardStats(data);
      })
      .catch(() => {
        setDashboardStats({
          totalRecordings: 0,
          totalWatchTime: 0,
          activeViewers: 0,
          thisWeekUploads: 0,
        });
      })
      .finally(() => setStatsLoading(false));
  }, []);

  // Fetch recent recordings
  useEffect(() => {
    fetch("/api/recordings?sort=newest&limit=6")
      .then((res) => res.json())
      .then((data) => {
        setRecentRecordings(
          (data.recordings as ApiRecording[]).map(mapApiRecording)
        );
      })
      .catch(() => setRecentRecordings([]))
      .finally(() => setRecentLoading(false));
  }, []);

  // Fetch popular recordings
  useEffect(() => {
    fetch("/api/recordings?sort=popular&limit=4")
      .then((res) => res.json())
      .then((data) => {
        setPopularRecordings(
          (data.recordings as ApiRecording[]).map(mapApiRecording)
        );
      })
      .catch(() => setPopularRecordings([]))
      .finally(() => setPopularLoading(false));
  }, []);

  // Fetch continue watching
  useEffect(() => {
    fetch("/api/watch-history")
      .then((res) => res.json())
      .then((data: ApiWatchHistoryItem[]) => {
        setContinueWatching(data.map(mapApiWatchHistory));
      })
      .catch(() => setContinueWatching([]))
      .finally(() => setContinueLoading(false));
  }, []);

  const userName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* ================================================================== */}
      {/* Greeting & Stats                                                    */}
      {/* ================================================================== */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-6"
      >
        {/* Greeting */}
        <motion.div variants={fadeUp} custom={0}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in your knowledge base
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <motion.div key={`stat-skel-${i}`} variants={fadeUp} custom={i + 1}>
                  <StatCardSkeleton />
                </motion.div>
              ))
            : statConfig.map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} custom={i + 1}>
                  <Card className="border-border/60 bg-card/80 backdrop-blur-sm transition-colors hover:border-border">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          stat.iconBg
                        )}
                      >
                        <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {dashboardStats
                            ? dashboardStats[stat.key].toString()
                            : "0"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {stat.unit}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>
      </motion.section>

      {/* ================================================================== */}
      {/* Continue Watching                                                   */}
      {/* ================================================================== */}
      {(continueLoading || (continueWatching && continueWatching.length > 0)) && (
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-4"
        >
          <motion.div variants={fadeUp} custom={0}>
            <SectionHeader title="Continue Watching" href="/recordings" />
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {continueLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <motion.div key={`cw-skel-${i}`} variants={fadeUp} custom={i + 1}>
                    <RecordingCardSkeleton />
                  </motion.div>
                ))
              : continueWatching!.map((item, i) => (
                  <motion.div key={item.recording.id} variants={fadeUp} custom={i + 1}>
                    <ContinueWatchingCard item={item} />
                  </motion.div>
                ))}
          </div>
        </motion.section>
      )}

      {/* ================================================================== */}
      {/* Recently Added                                                     */}
      {/* ================================================================== */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <SectionHeader title="Recently Added" href="/recordings" />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <motion.div key={`recent-skel-${i}`} variants={fadeUp} custom={i + 1}>
                  <RecordingCardSkeleton />
                </motion.div>
              ))
            : recentRecordings!.map((recording, i) => (
                <motion.div key={recording.id} variants={fadeUp} custom={i + 1}>
                  <RecordingCard recording={recording} />
                </motion.div>
              ))}
        </div>
      </motion.section>

      {/* ================================================================== */}
      {/* Popular This Month                                                 */}
      {/* ================================================================== */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <SectionHeader title="Popular This Month" href="/recordings" />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <motion.div key={`popular-skel-${i}`} variants={fadeUp} custom={i + 1}>
                  <RecordingCardSkeleton />
                </motion.div>
              ))
            : popularRecordings!.map((recording, i) => (
                <motion.div key={recording.id} variants={fadeUp} custom={i + 1}>
                  <RecordingCard recording={recording} />
                </motion.div>
              ))}
        </div>
      </motion.section>
    </div>
  );
}
