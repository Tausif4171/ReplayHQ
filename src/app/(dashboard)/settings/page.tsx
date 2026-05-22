"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import {
  User,
  Bell,
  Palette,
  Info,
  Camera,
  Sun,
  Moon,
  Monitor,
  Link2,
  Video,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const initialNotifications: NotificationSetting[] = [
  {
    id: "new-recordings",
    title: "New recordings",
    description: "Get notified when new recordings are uploaded",
    enabled: true,
  },
  {
    id: "mandatory-playlists",
    title: "Mandatory playlists",
    description: "Reminders for unwatched mandatory content",
    enabled: true,
  },
  {
    id: "comments-mentions",
    title: "Comments & mentions",
    description: "When someone comments on your recordings",
    enabled: false,
  },
  {
    id: "weekly-digest",
    title: "Weekly digest",
    description: "Weekly summary of new content and your watch stats",
    enabled: true,
  },
];

type Theme = "dark" | "light" | "system";

const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
  { id: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
  { id: "system", label: "System", icon: <Monitor className="h-5 w-5" /> },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("Tausif Khan");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedTheme, setSelectedTheme] = useState<Theme>("dark");

  // Zoom integration state
  const [zoomConnected, setZoomConnected] = useState(false);
  const [zoomLoading, setZoomLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [zoomMessage, setZoomMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check Zoom connection status on mount
  useEffect(() => {
    fetch("/api/zoom/status")
      .then((res) => res.json())
      .then((data) => {
        setZoomConnected(data.connected);
        setZoomLoading(false);
      })
      .catch(() => setZoomLoading(false));
  }, []);

  // Handle Zoom callback query params
  useEffect(() => {
    const zoomParam = searchParams.get("zoom");
    if (zoomParam === "connected") {
      setZoomConnected(true);
      setZoomMessage({
        type: "success",
        text: "Zoom account connected successfully!",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/settings");
    } else if (zoomParam === "error") {
      const reason = searchParams.get("reason") || "unknown";
      setZoomMessage({
        type: "error",
        text: `Failed to connect Zoom: ${reason.replace(/_/g, " ")}`,
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const connectZoom = () => {
    window.location.href = "/api/zoom/connect";
  };

  const disconnectZoom = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/zoom/disconnect", { method: "POST" });
      setZoomConnected(false);
      setZoomMessage({
        type: "success",
        text: "Zoom account disconnected.",
      });
    } catch {
      setZoomMessage({
        type: "error",
        text: "Failed to disconnect Zoom.",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account preferences and notification settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="group relative">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-xl font-semibold">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="flex h-9 w-full max-w-sm items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                    tausif@minio.io
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <div>
                    <Badge variant="secondary" className="text-xs">
                      Engineer
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Integrations</CardTitle>
            </div>
            <CardDescription>
              Connect external services to import recordings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Zoom message banner */}
            {zoomMessage && (
              <div
                className={cn(
                  "mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm",
                  zoomMessage.type === "success"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {zoomMessage.type === "success" ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <Info className="h-4 w-4 shrink-0" />
                )}
                {zoomMessage.text}
                <button
                  onClick={() => setZoomMessage(null)}
                  className="ml-auto text-xs opacity-60 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex items-start gap-4 sm:items-center">
              {/* Zoom icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <Video className="h-6 w-6 text-blue-400" />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Zoom</p>
                  {zoomLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : zoomConnected ? (
                    <Badge className="bg-green-500/15 text-green-400 hover:bg-green-500/20 text-[10px] px-1.5 py-0">
                      Connected
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Not connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Import cloud recordings directly from your Zoom account
                </p>
              </div>

              {/* Action button */}
              <div className="shrink-0">
                {zoomLoading ? (
                  <Button variant="outline" size="sm" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </Button>
                ) : zoomConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectZoom}
                    disabled={disconnecting}
                    className="text-destructive hover:text-destructive"
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={connectZoom}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connect Zoom
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Choose which notifications you would like to receive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                    {/* Toggle button */}
                    <button
                      onClick={() => toggleNotification(notification.id)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
                        notification.enabled
                          ? "bg-primary"
                          : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                          notification.enabled
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        )}
                        style={{ marginTop: "2px" }}
                      />
                    </button>
                  </div>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                    selectedTheme === theme.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      selectedTheme === theme.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {theme.icon}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      selectedTheme === theme.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {theme.label}
                  </span>
                  {selectedTheme === theme.id && (
                    <span className="text-[10px] font-medium text-primary">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">ReplayHQ v0.1.0</p>
                <p className="text-sm text-muted-foreground">
                  Built with love for the MinIO team
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// Add this new default export at the bottom:
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}