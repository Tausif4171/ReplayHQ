"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  PlayCircle,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import RecordingCard, {
  ContinueWatchingCard,
} from "@/components/recordings/recording-card";
import {
  mockRecordings,
  mockContinueWatching,
  mockDashboardStats,
} from "@/lib/mock-data";

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
// Stat card data
// ---------------------------------------------------------------------------

const stats = [
  {
    label: "Total Recordings",
    value: mockDashboardStats.totalRecordings.toString(),
    unit: "recordings",
    icon: PlayCircle,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
  },
  {
    label: "Watch Time",
    value: `${mockDashboardStats.totalWatchTime}`,
    unit: "hrs total watch time",
    icon: Clock,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    label: "Active Viewers",
    value: mockDashboardStats.activeViewers.toString(),
    unit: "this month",
    icon: Users,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    label: "New This Week",
    value: mockDashboardStats.thisWeekUploads.toString(),
    unit: "uploads",
    icon: TrendingUp,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
] as const;

// ---------------------------------------------------------------------------
// Data slices
// ---------------------------------------------------------------------------

const recentRecordings = [...mockRecordings]
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  .slice(0, 6);

const popularRecordings = [...mockRecordings]
  .sort((a, b) => b.views - a.views)
  .slice(0, 4);

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
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
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
            Welcome back, Tausif
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in your knowledge base
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
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
                      {stat.value}
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
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <SectionHeader title="Continue Watching" href="/recordings" />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockContinueWatching.map((item, i) => (
            <motion.div key={item.recording.id} variants={fadeUp} custom={i + 1}>
              <ContinueWatchingCard item={item} />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ================================================================== */}
      {/* Recently Added                                                     */}
      {/* ================================================================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <SectionHeader title="Recently Added" href="/recordings" />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentRecordings.map((recording, i) => (
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
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <SectionHeader title="Popular This Month" href="/recordings" />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularRecordings.map((recording, i) => (
            <motion.div key={recording.id} variants={fadeUp} custom={i + 1}>
              <RecordingCard recording={recording} />
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
