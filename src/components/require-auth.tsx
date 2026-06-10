"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePool } from "@/components/pool-provider";
import { AppShell } from "@/components/app-shell";
import { Trophy } from "lucide-react";

export function RequireAuth({
  children,
  moderatorOnly = false,
}: {
  children: React.ReactNode;
  moderatorOnly?: boolean;
}) {
  const router = useRouter();
  const { ready, me } = usePool();

  useEffect(() => {
    if (ready && !me) router.replace("/");
    if (ready && me && moderatorOnly && !me.isModerator)
      router.replace("/dashboard");
  }, [ready, me, moderatorOnly, router]);

  if (!ready || !me) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <Trophy className="h-6 w-6 animate-pulse" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
