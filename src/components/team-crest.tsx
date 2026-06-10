"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getTeam, flagUrl, crestOverrideUrl } from "@/lib/data/teams";

const SIZES: Record<string, number> = { xs: 20, sm: 24, md: 30, lg: 40, xl: 56 };

/**
 * A team's badge rendered as a crisp circular "crest".
 * Source order with graceful fallback:
 *   1. Your custom crest in /public/crests/<ID>.<ext> (if listed in CUSTOM_CRESTS)
 *   2. Public-domain country flag (flagcdn.com)
 *   3. Emoji flag
 * You supply any custom crest artwork yourself — none ships with the project.
 */
export function TeamCrest({
  teamId,
  size = "md",
  className,
}: {
  teamId: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const team = getTeam(teamId);
  const px = SIZES[size];

  const sources = [crestOverrideUrl(teamId), flagUrl(teamId)].filter(
    Boolean,
  ) as string[];
  const [idx, setIdx] = useState(0);

  useEffect(() => setIdx(0), [teamId]);

  if (!team) return null;
  const current = sources[idx];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-black/10",
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          onError={() => setIdx((i) => i + 1)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: px * 0.7 }}>{team.flag}</span>
      )}
    </span>
  );
}
