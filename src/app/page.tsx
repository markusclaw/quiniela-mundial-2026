"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

// The pool lives behind a single public link. Send everyone to the
// general dashboard; the organizer reaches Admin via its own PIN gate.
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <Trophy className="h-6 w-6 animate-pulse" />
    </div>
  );
}
