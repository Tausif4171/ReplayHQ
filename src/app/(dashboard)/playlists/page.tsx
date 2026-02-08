"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration, getInitials } from "@/lib/utils";
import {
  Plus,
  Play,
  Clock,
  ListVideo,
  X,
  Sparkles,
  GraduationCap,
  Shield,
  Server,
  Zap,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface Playlist {
  id: string;
  name: string;
  description: string;
  recordingCount: number;
  totalDuration: string;
  creator: {
    name: string;
    initials: string;
  };
  badge?: "mandatory" | "recommended";
  icon: React.ReactNode;
  gradient: string;
  thumbnailColors: string[];
}

const playlists: Playlist[] = [
  {
    id: "pl-1",
    name: "New Joiner Onboarding",
    description:
      "Essential recordings for getting started with the team, tools, and culture.",
    recordingCount: 8,
    totalDuration: "4.5 hours",
    creator: { name: "Harshavardhana", initials: "H" },
    badge: "mandatory",
    icon: <GraduationCap className="h-5 w-5" />,
    gradient: "from-purple-600 to-blue-600",
    thumbnailColors: [
      "bg-purple-500/30",
      "bg-blue-500/30",
      "bg-indigo-500/30",
      "bg-violet-500/30",
    ],
  },
  {
    id: "pl-2",
    name: "Erasure Coding Deep Dive",
    description:
      "Comprehensive series on erasure coding principles, implementation details, and optimization strategies.",
    recordingCount: 4,
    totalDuration: "2.8 hours",
    creator: { name: "Krishna Mohan", initials: "KM" },
    icon: <Code className="h-5 w-5" />,
    gradient: "from-emerald-600 to-teal-600",
    thumbnailColors: [
      "bg-emerald-500/30",
      "bg-teal-500/30",
      "bg-green-500/30",
      "bg-cyan-500/30",
    ],
  },
  {
    id: "pl-3",
    name: "Security Fundamentals",
    description:
      "Core security practices, threat modeling, and secure coding guidelines for all engineers.",
    recordingCount: 5,
    totalDuration: "3.2 hours",
    creator: { name: "Aditya Singh", initials: "AS" },
    badge: "recommended",
    icon: <Shield className="h-5 w-5" />,
    gradient: "from-red-600 to-orange-600",
    thumbnailColors: [
      "bg-red-500/30",
      "bg-orange-500/30",
      "bg-rose-500/30",
      "bg-amber-500/30",
    ],
  },
  {
    id: "pl-4",
    name: "Kubernetes & MinIO",
    description:
      "Running MinIO on Kubernetes: deployment patterns, scaling, and operational best practices.",
    recordingCount: 3,
    totalDuration: "1.9 hours",
    creator: { name: "Farhan Patel", initials: "FP" },
    icon: <Server className="h-5 w-5" />,
    gradient: "from-blue-600 to-cyan-600",
    thumbnailColors: [
      "bg-blue-500/30",
      "bg-cyan-500/30",
      "bg-sky-500/30",
      "bg-indigo-500/30",
    ],
  },
  {
    id: "pl-5",
    name: "Performance Optimization",
    description:
      "Techniques for profiling, benchmarking, and optimizing MinIO for maximum throughput.",
    recordingCount: 6,
    totalDuration: "4.1 hours",
    creator: { name: "Krishna Mohan", initials: "KM" },
    icon: <Zap className="h-5 w-5" />,
    gradient: "from-amber-600 to-yellow-600",
    thumbnailColors: [
      "bg-amber-500/30",
      "bg-yellow-500/30",
      "bg-orange-500/30",
      "bg-lime-500/30",
    ],
  },
  {
    id: "pl-6",
    name: "S3 API Masterclass",
    description:
      "Complete walkthrough of S3 API compatibility, advanced features, and integration patterns.",
    recordingCount: 4,
    totalDuration: "2.6 hours",
    creator: { name: "Harshavardhana", initials: "H" },
    icon: <Sparkles className="h-5 w-5" />,
    gradient: "from-pink-600 to-purple-600",
    thumbnailColors: [
      "bg-pink-500/30",
      "bg-purple-500/30",
      "bg-fuchsia-500/30",
      "bg-violet-500/30",
    ],
  },
];

export default function PlaylistsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: "",
    type: "none" as "none" | "mandatory" | "recommended",
  });

  const featuredPlaylist = playlists[0];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playlists</h1>
          <p className="mt-1 text-muted-foreground">
            Curated collections for structured learning
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Playlist
        </Button>
      </div>

      {/* Featured playlist hero */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div
          className={cn(
            "relative bg-gradient-to-r p-8 sm:p-10",
            featuredPlaylist.gradient
          )}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute right-1/3 top-1/2 h-20 w-20 rounded-full bg-white/15" />
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/30">
                  Mandatory
                </Badge>
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/30">
                  Featured
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {featuredPlaylist.name}
              </h2>
              <p className="text-white/80">
                Essential recordings for getting started with the team, tools, and
                culture.
              </p>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <ListVideo className="h-4 w-4" />
                  {featuredPlaylist.recordingCount} recordings
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {featuredPlaylist.totalDuration}
                </span>
              </div>
              <Button
                size="lg"
                className="mt-2 bg-white text-gray-900 hover:bg-white/90"
              >
                <Play className="h-4 w-4" />
                Start Learning
              </Button>
            </div>

            {/* Stacked thumbnail preview */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-2 gap-2">
                {featuredPlaylist.thumbnailColors.map((color, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-20 w-24 items-center justify-center rounded-lg",
                      color
                    )}
                  >
                    <Play className="h-6 w-6 text-white/60" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Playlists grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {playlists.slice(1).map((playlist) => (
          <Card
            key={playlist.id}
            className="group cursor-pointer transition-all hover:shadow-md"
          >
            <CardHeader className="pb-3">
              {/* Thumbnail grid */}
              <div className="mb-3 grid grid-cols-4 gap-1.5 overflow-hidden rounded-lg">
                {playlist.thumbnailColors.map((color, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex aspect-video items-center justify-center rounded-sm",
                      color
                    )}
                  >
                    <Play className="h-3 w-3 text-white/50" />
                  </div>
                ))}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {playlist.icon}
                  </div>
                  <CardTitle className="text-base leading-tight">
                    {playlist.name}
                  </CardTitle>
                </div>
                {playlist.badge && (
                  <Badge
                    variant={
                      playlist.badge === "mandatory"
                        ? "destructive"
                        : "default"
                    }
                    className={cn(
                      "shrink-0",
                      playlist.badge === "recommended" &&
                        "bg-blue-500 hover:bg-blue-600"
                    )}
                  >
                    {playlist.badge === "mandatory"
                      ? "Mandatory"
                      : "Recommended"}
                  </Badge>
                )}
              </div>
              <CardDescription className="line-clamp-2 mt-1.5">
                {playlist.description}
              </CardDescription>
            </CardHeader>

            <CardFooter className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListVideo className="h-3.5 w-3.5" />
                  {playlist.recordingCount} recordings
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {playlist.totalDuration}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {playlist.creator.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {playlist.creator.name}
                </span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Create New Playlist</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Organize recordings into a curated learning path
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Infrastructure Essentials"
                  value={newPlaylist.name}
                  onChange={(e) =>
                    setNewPlaylist((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  placeholder="What will viewers learn from this playlist?"
                  rows={3}
                  value={newPlaylist.description}
                  onChange={(e) =>
                    setNewPlaylist((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Type toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <div className="flex gap-2">
                  {(["none", "mandatory", "recommended"] as const).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setNewPlaylist((prev) => ({ ...prev, type }))
                        }
                        className={cn(
                          "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                          newPlaylist.type === type
                            ? type === "mandatory"
                              ? "bg-destructive text-destructive-foreground"
                              : type === "recommended"
                                ? "bg-blue-500 text-white"
                                : "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {type === "none"
                          ? "Standard"
                          : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!newPlaylist.name.trim()}
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylist({
                    name: "",
                    description: "",
                    type: "none",
                  });
                }}
              >
                Create Playlist
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
