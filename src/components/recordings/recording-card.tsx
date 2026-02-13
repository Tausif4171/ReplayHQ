"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  Eye,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatRelativeDate,
  formatViews,
  getInitials,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  type Recording,
  type ContinueWatchingItem,
  getGradientForRecording,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecordingCardProps {
  recording: Recording;
  progress?: number; // 0-100 for continue watching
  view?: "grid" | "list";
  className?: string;
}

// ---------------------------------------------------------------------------
// RecordingCard
// ---------------------------------------------------------------------------

export default function RecordingCard({
  recording,
  progress,
  view = "grid",
  className,
}: RecordingCardProps) {
  if (view === "list") {
    return (
      <RecordingListItem
        recording={recording}
        progress={progress}
        className={className}
      />
    );
  }

  const gradient = getGradientForRecording(recording.id);
  const isProcessing = recording.status === "processing";

  return (
    <Link href={`/recordings/${recording.id}`} className="block">
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-300 hover:shadow-xl hover:shadow-black/20",
          className
        )}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Thumbnail                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="relative aspect-video w-full overflow-hidden">
          {/* Thumbnail image or gradient fallback */}
          {recording.thumbnailUrl ? (
            <img
              src={`/api/media?key=${encodeURIComponent(recording.thumbnailUrl)}`}
              alt={recording.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-80",
                  gradient
                )}
              />
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="h-8 w-8 text-white/20" />
              </div>
            </>
          )}

          {/* Play button overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processing
              </div>
            </div>
          )}

          {/* Duration badge (bottom-right, YouTube style) */}
          {!isProcessing && (
            <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {formatDuration(recording.duration)}
            </div>
          )}

          {/* Progress bar at very bottom */}
          {typeof progress === "number" && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0">
              <Progress
                value={progress}
                className="h-1 rounded-none bg-white/20"
              />
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Content                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
            {recording.title}
          </h3>

          {/* Presenter + Series */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {recording.presenter.avatar && (
                <AvatarImage
                  src={recording.presenter.avatar}
                  alt={recording.presenter.name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(recording.presenter.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">
              {recording.presenter.name}
            </span>
            {recording.series && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full px-2 py-0 text-[10px] font-medium"
                >
                  {recording.series.name}
                </Badge>
              </>
            )}
          </div>

          {/* Bottom row: views, date, transcript */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(recording.views)} views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(recording.recordedAt)}
            </span>
            {recording.hasTranscript && (
              <span className="flex items-center gap-1 text-primary/70">
                <FileText className="h-3 w-3" />
                Transcript
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// RecordingListItem - Horizontal list variant
// ---------------------------------------------------------------------------

function RecordingListItem({
  recording,
  progress,
  className,
}: {
  recording: Recording;
  progress?: number;
  className?: string;
}) {
  const gradient = getGradientForRecording(recording.id);
  const isProcessing = recording.status === "processing";

  return (
    <Link href={`/recordings/${recording.id}`} className="block">
      <div
        className={cn(
          "group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          className
        )}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-48 shrink-0 overflow-hidden rounded-lg">
          {recording.thumbnailUrl ? (
            <img
              src={`/api/media?key=${encodeURIComponent(recording.thumbnailUrl)}`}
              alt={recording.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-80",
                  gradient
                )}
              />
              <div className="absolute inset-0 bg-black/10" />
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            {isProcessing ? (
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 group-hover:opacity-100">
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              </div>
            )}
          </div>
          {!isProcessing && (
            <div className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {formatDuration(recording.duration)}
            </div>
          )}
          {typeof progress === "number" && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0">
              <Progress
                value={progress}
                className="h-0.5 rounded-none bg-white/20"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {recording.series && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {recording.series.name}
            </span>
          )}
          <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {recording.title}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {recording.description}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              {recording.presenter.avatar && (
                <AvatarImage
                  src={recording.presenter.avatar}
                  alt={recording.presenter.name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
                {getInitials(recording.presenter.name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground/80">
              {recording.presenter.name}
            </span>
            <span className="text-muted-foreground/40">&middot;</span>
            <span>{recording.presenter.role}</span>
          </div>
        </div>

        {/* Right meta */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="flex flex-wrap gap-1.5">
            {recording.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full px-2 py-0 text-[10px] font-medium"
              >
                {tag}
              </Badge>
            ))}
            {recording.tags.length > 2 && (
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0 text-[10px] font-medium"
              >
                +{recording.tags.length - 2}
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(recording.views)} views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(recording.recordedAt)}
            </span>
            {recording.hasTranscript && (
              <span className="flex items-center gap-1 text-primary/70">
                <FileText className="h-3 w-3" />
                Transcript
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ContinueWatchingCard - Compact variant with progress bar
// ---------------------------------------------------------------------------

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  className?: string;
}

export function ContinueWatchingCard({
  item,
  className,
}: ContinueWatchingCardProps) {
  return (
    <RecordingCard
      recording={item.recording}
      progress={item.progress}
      className={className}
    />
  );
}
