"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Trophy,
  CalendarDays,
  LayoutGrid,
  Settings,
  LogOut,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePool } from "@/components/pool-provider";
import { LangToggle } from "@/components/lang-toggle";
import { ResultsAutoSync, SyncIndicator } from "@/components/sync-indicator";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", key: "nav.home", icon: Home },
  { href: "/leaderboard", key: "nav.table", icon: Trophy },
  { href: "/fixtures", key: "nav.fixtures", icon: CalendarDays },
  { href: "/draw", key: "nav.packs", icon: LayoutGrid },
  { href: "/rules", key: "nav.rules", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, logout, state } = usePool();
  const { t } = useT();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">
                {state.settings.name}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {t("brand.event")}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(item.key)}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <SyncIndicator className="hidden sm:inline-flex" />
            <LangToggle />
            {me?.isModerator && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {me.name}
              </span>
            )}
            {/* Subtle organizer entry */}
            <Link
              href="/admin"
              aria-label={t("nav.admin")}
              title={t("nav.admin")}
              className={cn(
                "inline-grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === "/admin" && "bg-secondary text-foreground",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
            {me?.isModerator && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label={t("action.logout")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <ResultsAutoSync />

      <main className="container animate-fade-up py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <BottomLink
              key={item.href}
              href={item.href}
              label={t(item.key)}
              icon={item.icon}
              active={pathname === item.href}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
