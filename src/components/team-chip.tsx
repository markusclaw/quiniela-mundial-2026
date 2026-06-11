"use client";

import { cn } from "@/lib/utils";
import { getTeam } from "@/lib/data/teams";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Badge } from "@/components/ui/badge";

const CREST_SIZE = { sm: "xs", md: "sm", lg: "lg" } as const;

export function TeamChip({
  teamId,
  showGroup = false,
  showPot = false,
  className,
  size = "md",
}: {
  teamId: string;
  showGroup?: boolean;
  showPot?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useT();
  const team = getTeam(teamId);
  if (!team) return null;
  const nameSize = size === "lg" ? "text-base" : "text-sm";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TeamCrest teamId={teamId} size={CREST_SIZE[size]} />
      <span className={cn("font-medium", nameSize)}>{team.name}</span>
      {showGroup && (
        <Badge variant="muted" className="ml-1">
          {t("chip.grp", { g: team.group })}
        </Badge>
      )}
      {showPot && (
        <Badge variant={team.pot >= 3 ? "gold" : "secondary"}>
          {t("common.pot", { n: team.pot })}
        </Badge>
      )}
    </span>
  );
}
