"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import {
  applyThemePreference,
  storeThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Info,
  KeyRound,
  Link2,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Sun,
  User,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type UserRole = "ADMIN" | "UPLOADER" | "VIEWER";

interface SettingsResponse {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: UserRole;
    hasPassword: boolean;
  };
  preferences: {
    theme: ThemePreference;
    notifyAccessRequests: boolean;
  };
}

type SettingsMessage = {
  type: "success" | "error";
  text: string;
  actionHref?: string;
  actionLabel?: string;
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  UPLOADER: "Uploader",
  VIEWER: "Viewer",
};

const roleDescriptions: Record<UserRole, string> = {
  ADMIN: "Can manage team access, upload recordings, and perform admin actions.",
  UPLOADER: "Can upload recordings and use the team knowledge library.",
  VIEWER: "Can watch, search, comment, and save recordings.",
};

const themes: {
  id: ThemePreference;
  label: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    id: "dark",
    label: "Dark",
    description: "Always use the dark workspace theme.",
    icon: <Moon className="h-5 w-5" />,
  },
  {
    id: "light",
    label: "Light",
    description: "Use the lighter interface theme.",
    icon: <Sun className="h-5 w-5" />,
  },
  {
    id: "system",
    label: "System",
    description: "Match your device appearance.",
    icon: <Monitor className="h-5 w-5" />,
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const { update } = useSession();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [profileName, setProfileName] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsMessage, setSettingsMessage] =
    useState<SettingsMessage | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);
  const [passwordState, setPasswordState] = useState<"idle" | "loading">(
    "idle"
  );

  const [zoomConnected, setZoomConnected] = useState(false);
  const [zoomLoading, setZoomLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [zoomMessage, setZoomMessage] = useState<SettingsMessage | null>(null);

  const isAdmin = settings?.user.role === "ADMIN";

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);

    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load settings.");
      }

      setSettings(data);
      setProfileName(data.user.name || "");
      storeThemePreference(data.preferences.theme, data.user.id);
      applyThemePreference(data.preferences.theme);
    } catch (error) {
      setSettingsMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load settings.",
      });
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetch("/api/zoom/status")
      .then((response) => response.json())
      .then((data) => {
        setZoomConnected(Boolean(data.connected));
        setZoomLoading(false);
      })
      .catch(() => setZoomLoading(false));
  }, []);

  useEffect(() => {
    const zoomParam = searchParams.get("zoom");

    if (zoomParam === "connected") {
      setZoomConnected(true);
      setZoomMessage({
        type: "success",
        text: "Zoom account connected.",
      });
      window.history.replaceState({}, "", "/settings");
    } else if (zoomParam === "error") {
      const reason = searchParams.get("reason") || "unknown";
      setZoomMessage({
        type: "error",
        text: `Zoom connection failed: ${reason.replace(/_/g, " ")}.`,
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  const notificationRows = useMemo(() => {
    if (!isAdmin) return [];

    return [
      {
        key: "notifyAccessRequests" as const,
        title: "Access requests",
        description:
          "Show pending member requests in the notification menu.",
      },
    ];
  }, [isAdmin]);

  function dispatchSettingsUpdated(nextSettings: SettingsResponse) {
    window.dispatchEvent(
      new CustomEvent("replayhq:settings-updated", {
        detail: { preferences: nextSettings.preferences },
      })
    );
  }

  async function patchSettings(
    payload: Partial<{
      profile: { name: string };
      preferences: Partial<SettingsResponse["preferences"]>;
    }>
  ) {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to save settings.");
    }

    setSettings(data);
    setProfileName(data.user.name || "");
    dispatchSettingsUpdated(data);

    return data as SettingsResponse;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;

    const nextName = profileName.trim();

    if (!nextName) {
      setSettingsMessage({
        type: "error",
        text: "Display name cannot be empty.",
      });
      return;
    }

    if (nextName === (settings.user.name || "")) {
      setSettingsMessage({
        type: "success",
        text: "Profile is already up to date.",
      });
      return;
    }

    setSavingProfile(true);
    setSettingsMessage(null);

    try {
      await patchSettings({ profile: { name: nextName } });
      await update();
      setSettingsMessage({
        type: "success",
        text: "Profile updated.",
      });
    } catch (error) {
      setSettingsMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleNotification(
    key: keyof Pick<SettingsResponse["preferences"], "notifyAccessRequests">
  ) {
    if (!settings) return;

    const previousSettings = settings;
    const nextValue = !settings.preferences[key];
    const optimisticSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: nextValue,
      },
    };

    setSettings(optimisticSettings);
    dispatchSettingsUpdated(optimisticSettings);
    setSavingPreference(key);
    setSettingsMessage(null);

    try {
      const updatedSettings = await patchSettings({
        preferences: { [key]: nextValue },
      });
      setSettingsMessage({
        type: "success",
        text: updatedSettings.preferences[key]
          ? "Access request notifications are on."
          : "Access request notifications are off.",
      });
    } catch (error) {
      setSettings(previousSettings);
      dispatchSettingsUpdated(previousSettings);
      setSettingsMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update notification settings.",
      });
    } finally {
      setSavingPreference(null);
    }
  }

  async function updateTheme(theme: ThemePreference) {
    if (!settings || settings.preferences.theme === theme) return;

    const previousSettings = settings;
    const previousTheme = settings.preferences.theme;
    const optimisticSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        theme,
      },
    };

    setSettings(optimisticSettings);
    storeThemePreference(theme, settings.user.id);
    applyThemePreference(theme);
    setSavingPreference("theme");
    setSettingsMessage(null);

    try {
      await patchSettings({ preferences: { theme } });
      setSettingsMessage({
        type: "success",
        text: `${themes.find((item) => item.id === theme)?.label} theme selected.`,
      });
    } catch (error) {
      setSettings(previousSettings);
      storeThemePreference(previousTheme, previousSettings.user.id);
      applyThemePreference(previousTheme);
      setSettingsMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update theme.",
      });
    } finally {
      setSavingPreference(null);
    }
  }

  async function sendPasswordInstructions() {
    if (!settings?.user.email || passwordState === "loading") return;

    setPasswordState("loading");
    setSettingsMessage(null);

    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.user.email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send password instructions.");
      }

      setSettingsMessage({
        type: "success",
        text: settings.user.hasPassword
          ? "Password reset instructions sent."
          : "Password setup instructions sent.",
        actionHref: data.debugResetUrl,
        actionLabel: data.debugResetUrl ? "Open setup link" : undefined,
      });
    } catch (error) {
      setSettingsMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to send password instructions.",
      });
    } finally {
      setPasswordState("idle");
    }
  }

  const connectZoom = () => {
    window.location.href = "/api/zoom/connect";
  };

  const disconnectZoom = async () => {
    setDisconnecting(true);
    setZoomMessage(null);

    try {
      const response = await fetch("/api/zoom/disconnect", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to disconnect Zoom.");
      }

      setZoomConnected(false);
      setZoomMessage({
        type: "success",
        text: "Zoom account disconnected.",
      });
    } catch (error) {
      setZoomMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to disconnect Zoom.",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (settingsLoading) {
    return <SettingsSkeleton />;
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your profile, connected apps, and workspace preferences.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-6">
            <StatusBanner
              type="error"
              text="Settings could not be loaded."
            />
            <Button type="button" variant="outline" onClick={fetchSettings}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentName = settings?.user.name?.trim() || "ReplayHQ user";
  const currentEmail = settings?.user.email || "";
  const currentRole = settings?.user.role || "VIEWER";
  const currentTheme = settings?.preferences.theme || "dark";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, connected apps, and workspace preferences.
        </p>
      </div>

      {settingsMessage && (
        <StatusBanner
          type={settingsMessage.type}
          text={settingsMessage.text}
          actionHref={settingsMessage.actionHref}
          actionLabel={settingsMessage.actionLabel}
          onDismiss={() => setSettingsMessage(null)}
        />
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Your visible name, sign-in email, and access level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-20 w-20">
                {settings?.user.image ? (
                  <AvatarImage
                    src={settings.user.image}
                    alt={currentName}
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <AvatarFallback className="text-xl font-semibold">
                  {getInitials(currentName)}
                </AvatarFallback>
              </Avatar>

              <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="display-name" className="text-sm font-medium">
                      Display name
                    </label>
                    <div className="flex max-w-md flex-col gap-2 sm:flex-row">
                      <Input
                        id="display-name"
                        type="text"
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                        disabled={savingProfile}
                        placeholder="Your name"
                      />
                      <Button
                        type="submit"
                        disabled={savingProfile || !profileName.trim()}
                        className="sm:w-[108px]"
                      >
                        {savingProfile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <div className="flex h-9 max-w-md items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                      {currentEmail}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {roleLabels[currentRole]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {roleDescriptions[currentRole]}
                      </span>
                    </div>
                  </div>
                </form>

                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-medium">Email password</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {settings?.user.hasPassword
                            ? "A ReplayHQ password is set for this account."
                            : "No ReplayHQ password has been created yet."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={sendPasswordInstructions}
                        disabled={passwordState === "loading"}
                      >
                        {passwordState === "loading" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        {settings?.user.hasPassword
                          ? "Send reset link"
                          : "Send setup link"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Integrations</CardTitle>
            </div>
            <CardDescription>
              Connect services that can import recordings into ReplayHQ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {zoomMessage && (
              <StatusBanner
                type={zoomMessage.type}
                text={zoomMessage.text}
                onDismiss={() => setZoomMessage(null)}
                className="mb-4"
              />
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Video className="h-6 w-6 text-blue-400" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Zoom</p>
                  {zoomLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : zoomConnected ? (
                    <Badge className="bg-green-500/15 px-1.5 py-0 text-[10px] text-green-400 hover:bg-green-500/20">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Not connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Import cloud recordings from the connected Zoom account.
                </p>
              </div>

              <div className="shrink-0">
                {zoomLoading ? (
                  <Button variant="outline" size="sm" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={connectZoom}>
                    <ExternalLink className="h-4 w-4" />
                    Connect Zoom
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {notificationRows.length > 0 && settings && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Control the alerts that are active in ReplayHQ today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {notificationRows.map((notification, index) => (
                  <div key={notification.key}>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                      <Toggle
                        checked={settings.preferences[notification.key]}
                        disabled={savingPreference === notification.key}
                        onCheckedChange={() => toggleNotification(notification.key)}
                      />
                    </div>
                    {index < notificationRows.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Choose how ReplayHQ should look on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {themes.map((theme) => {
                const active = currentTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateTheme(theme.id)}
                    className={cn(
                      "flex min-h-[132px] flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {savingPreference === "theme" && active ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        theme.icon
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {theme.label}
                      {active ? (
                        <Badge className="px-1.5 py-0 text-[10px]">
                          Active
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-xs leading-5 text-muted-foreground">
                      {theme.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-medium">ReplayHQ v0.1.0</p>
              <p className="max-w-2xl text-muted-foreground">
                Internal video knowledge platform for secure team recordings,
                searchable transcripts, summaries, and access control.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBanner({
  type,
  text,
  actionHref,
  actionLabel,
  onDismiss,
  className,
}: SettingsMessage & {
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        type === "success"
          ? "border-green-500/25 bg-green-500/10 text-green-300"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p>{text}</p>
        {actionHref && actionLabel ? (
          <a
            href={actionHref}
            className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-4"
          >
            {actionLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs opacity-70 transition-opacity hover:opacity-100"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onCheckedChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-wait disabled:opacity-70",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      >
        {disabled ? (
          <span className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-6">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-muted-foreground">Loading...</div>}
    >
      <SettingsContent />
    </Suspense>
  );
}
