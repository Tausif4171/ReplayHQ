"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, Search, Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/recordings": "Recordings",
  "/upload": "Upload",
  "/search": "Search",
  "/playlists": "Playlists",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();

  const getTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    // Handle nested routes
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recordings, topics, transcripts..."
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70",
              "transition-all duration-200",
              "focus:border-primary/50 focus:bg-secondary focus:outline-none focus:ring-1 focus:ring-primary/30"
            )}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </div>
      </div>

      {/* Right: notifications + avatar */}
      <div className="ml-auto flex items-center gap-2">
        {/* Mobile search button */}
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden">
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          {/* Notification dot */}
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
          </span>
        </button>

        {/* Divider */}
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        {/* User avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary transition-all hover:bg-primary/25 hover:ring-2 hover:ring-primary/20">
          TK
        </button>
      </div>
    </header>
  );
}
