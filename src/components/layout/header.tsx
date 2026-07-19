"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  Menu,
  Search,
  Bell,
  LogOut,
  Settings,
  ChevronDown,
  ShieldCheck,
  Inbox,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/recordings": "Recordings",
  "/upload": "Upload",
  "/search": "Search",
  "/playlists": "Playlists",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/settings/admin": "Team access",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAccessCount, setPendingAccessCount] = useState(0);
  const [
    accessRequestNotificationsEnabled,
    setAccessRequestNotificationsEnabled,
  ] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const initials = getInitials(userName);
  const isAdmin = session?.user?.role === "ADMIN";
  const unreadNotifications = pendingAccessCount;

  useEffect(() => {
    if (pathname === "/search") {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("q") || "");
    } else {
      setSearchQuery("");
    }
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setAccessRequestNotificationsEnabled(true);
      return;
    }

    let cancelled = false;

    async function fetchNotificationSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled) {
          setAccessRequestNotificationsEnabled(
            data.preferences?.notifyAccessRequests ?? true
          );
        }
      } catch {
        if (!cancelled) {
          setAccessRequestNotificationsEnabled(true);
        }
      }
    }

    fetchNotificationSettings();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    function handleSettingsUpdated(event: Event) {
      const preferences = (event as CustomEvent).detail?.preferences;
      if (typeof preferences?.notifyAccessRequests === "boolean") {
        setAccessRequestNotificationsEnabled(preferences.notifyAccessRequests);
      }
    }

    window.addEventListener("replayhq:settings-updated", handleSettingsUpdated);
    return () =>
      window.removeEventListener(
        "replayhq:settings-updated",
        handleSettingsUpdated
      );
  }, []);

  useEffect(() => {
    if (!isAdmin || !accessRequestNotificationsEnabled) {
      setPendingAccessCount(0);
      return;
    }

    let cancelled = false;

    async function fetchPendingAccessCount() {
      try {
        const response = await fetch("/api/admin/access-requests?status=PENDING");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setPendingAccessCount(data.counts?.pending ?? 0);
        }
      } catch {
        if (!cancelled) {
          setPendingAccessCount(0);
        }
      }
    }

    fetchPendingAccessCount();
  }, [isAdmin, accessRequestNotificationsEnabled]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  const getTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    const base = "/" + pathname.split("/")[1];
    return pageTitles[base] || "ReplayHQ";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {getTitle()}
        </h1>
      </div>

      {/* Center: search bar */}
      <div className="mx-auto hidden w-full max-w-md md:block">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search recordings, topics, transcripts..."
            aria-label="Search recordings"
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70",
              "transition-all duration-200",
              "focus:border-primary/50 focus:bg-secondary focus:outline-none focus:ring-1 focus:ring-primary/30"
            )}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </form>
      </div>

      {/* Right: notifications + user menu */}
      <div className="ml-auto flex items-center gap-2">
        {/* Mobile search button */}
        <button
          type="button"
          onClick={() => router.push("/search")}
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={
                unreadNotifications > 0
                  ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}`
                  : "Notifications"
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {isAdmin && pendingAccessCount > 0 ? (
              <DropdownMenuItem
                onClick={() => router.push("/settings/admin")}
                className="cursor-pointer items-start gap-3 py-3"
              >
                <UserPlus className="mt-0.5 h-4 w-4 text-primary" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {pendingAccessCount} access request{pendingAccessCount === 1 ? "" : "s"} pending
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Review new team members in Team access.
                  </span>
                </div>
              </DropdownMenuItem>
            ) : (
              <div className="flex items-start gap-3 px-2 py-3 text-sm">
                <Inbox className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {isAdmin && !accessRequestNotificationsEnabled
                      ? "Access request notifications are off"
                      : "No new notifications"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin && !accessRequestNotificationsEnabled
                      ? "Turn them back on from Settings when needed."
                      : "Access requests and important updates will appear here."}
                  </span>
                </div>
              </div>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer gap-2"
            >
              <Settings className="h-4 w-4" />
              Notification settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-all hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials}
                </div>
              )}
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User info */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="h-10 w-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {userName}
                  </p>
                  {userEmail && (
                    <p className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </p>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>

            {session?.user?.role === "ADMIN" && (
              <DropdownMenuItem
                onClick={() => router.push("/settings/admin")}
                className="cursor-pointer gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Team access
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
