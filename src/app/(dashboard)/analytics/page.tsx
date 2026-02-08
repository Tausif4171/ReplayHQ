"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration, getInitials } from "@/lib/utils";
import { mockRecordings } from "@/lib/mock-data";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  BarChart3,
  Trophy,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const timeRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

const viewsData = [
  { label: "Mon", value: 186 },
  { label: "Tue", value: 215 },
  { label: "Wed", value: 148 },
  { label: "Thu", value: 276 },
  { label: "Fri", value: 198 },
  { label: "Sat", value: 89 },
  { label: "Sun", value: 135 },
];

const teamMembers = [
  {
    name: "Sarah Chen",
    role: "Staff Engineer",
    initials: "SC",
    watched: 18,
    total: 20,
    watchTime: "14.2 hrs",
  },
  {
    name: "Marcus Johnson",
    role: "SRE Lead",
    initials: "MJ",
    watched: 16,
    total: 20,
    watchTime: "12.8 hrs",
  },
  {
    name: "Priya Patel",
    role: "Security Engineer",
    initials: "PP",
    watched: 14,
    total: 20,
    watchTime: "11.5 hrs",
  },
  {
    name: "Alex Rivera",
    role: "Frontend Lead",
    initials: "AR",
    watched: 12,
    total: 20,
    watchTime: "9.3 hrs",
  },
  {
    name: "David Kim",
    role: "Database Engineer",
    initials: "DK",
    watched: 10,
    total: 20,
    watchTime: "7.6 hrs",
  },
  {
    name: "Emily Zhang",
    role: "Product Manager",
    initials: "EZ",
    watched: 8,
    total: 20,
    watchTime: "5.1 hrs",
  },
];

const popularTags = [
  { tag: "erasure-coding", views: 234 },
  { tag: "architecture", views: 189 },
  { tag: "kubernetes", views: 156 },
  { tag: "security", views: 142 },
  { tag: "performance", views: 128 },
  { tag: "storage", views: 115 },
  { tag: "onboarding", views: 98 },
  { tag: "api-design", views: 76 },
];

const maxTagViews = 234;

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState("Last 7 days");

  const maxViews = Math.max(...viewsData.map((d) => d.value));

  const topRecordings = [...mockRecordings]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const maxRecordingViews = topRecordings[0]?.views ?? 1;

  const medalColors: Record<number, string> = {
    0: "text-yellow-500",
    1: "text-zinc-400",
    2: "text-amber-700",
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Track engagement and knowledge sharing across your team
          </p>
        </div>

        {/* Time range filter */}
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                selectedRange === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Views
            </CardTitle>
            <div className="rounded-md bg-green-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,247</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0">
                +12%
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Watch Hours */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Watch Hours
            </CardTitle>
            <div className="rounded-md bg-blue-500/10 p-2">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              342<span className="text-lg font-normal text-muted-foreground">hrs</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0">
                +8%
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
            <div className="rounded-md bg-purple-500/10 p-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              73<span className="text-lg font-normal text-muted-foreground">%</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-0">
                +5%
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Active Viewers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Viewers
            </CardTitle>
            <div className="rounded-md bg-orange-500/10 p-2">
              <Users className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              28<span className="text-lg font-normal text-muted-foreground">/35</span>
            </div>
            <div className="mt-1">
              <Progress value={80} className="h-1.5" />
              <span className="mt-1 block text-xs text-muted-foreground">
                80% of team active
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Views Over Time */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  Views Over Time
                </CardTitle>
                <CardDescription className="mt-1">
                  Daily views for the selected period
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {viewsData.reduce((sum, d) => sum + d.value, 0).toLocaleString()} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bar chart grid lines */}
            <div className="relative">
              {/* Y-axis labels and grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-8">
                {[300, 200, 100, 0].map((val) => (
                  <div key={val} className="flex items-center gap-2">
                    <span className="w-8 text-right text-[10px] text-muted-foreground">
                      {val}
                    </span>
                    <div className="flex-1 border-t border-dashed border-border" />
                  </div>
                ))}
              </div>

              {/* Bars */}
              <div className="relative flex items-end justify-around gap-3 pl-10 pt-2" style={{ height: "220px" }}>
                {viewsData.map((day) => {
                  const heightPercent = (day.value / 300) * 100;
                  return (
                    <div
                      key={day.label}
                      className="group flex flex-1 flex-col items-center gap-1"
                    >
                      {/* Value tooltip */}
                      <span className="text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {day.value}
                      </span>
                      {/* Bar */}
                      <div
                        className="w-full max-w-[40px] rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary"
                        style={{ height: `${heightPercent}%` }}
                      />
                      {/* Label */}
                      <span className="mt-1 text-xs text-muted-foreground">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Watched Recordings */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  Most Watched Recordings
                </CardTitle>
                <CardDescription className="mt-1">
                  Top recordings ranked by total views
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topRecordings.map((recording, index) => (
                <div key={recording.id} className="group">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        index < 3
                          ? "bg-muted"
                          : "text-muted-foreground"
                      )}
                    >
                      <span className={cn(index < 3 && medalColors[index])}>
                        #{index + 1}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {recording.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {recording.views.toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{recording.presenter.name}</span>
                        <span>-</span>
                        <span>{formatDuration(recording.duration)}</span>
                      </div>
                      {/* Popularity bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                                ? "bg-zinc-400"
                                : index === 2
                                  ? "bg-amber-700"
                                  : "bg-primary/60"
                          )}
                          style={{
                            width: `${(recording.views / maxRecordingViews) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {index < topRecordings.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Engagement */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Team Engagement
                </CardTitle>
                <CardDescription className="mt-1">
                  Individual viewing activity sorted by engagement
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member, index) => (
                <div key={member.name}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs font-medium">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.role}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {member.watched}/{member.total}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.watchTime}
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={(member.watched / member.total) * 100}
                        className="mt-2 h-1.5"
                      />
                    </div>
                  </div>
                  {index < teamMembers.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Tags */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  Popular Tags
                </CardTitle>
                <CardDescription className="mt-1">
                  Most viewed content categories
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularTags.map((item, index) => (
                <div key={item.tag} className="group">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {item.tag}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.views} views
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all group-hover:bg-primary"
                      style={{
                        width: `${(item.views / maxTagViews) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
