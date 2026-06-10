import { cn } from "@/lib/utils";
import { getTeam, flagUrl } from "@/lib/data/teams";

const SIZES: Record<string, number> = { xs: 20, sm: 24, md: 30, lg: 40, xl: 56 };

/**
 * A team's flag rendered as a crisp circular "crest" badge.
 * Uses public-domain country flag artwork (flagcdn.com), framed to read as an
 * official shield. Falls back to the emoji flag if the image can't load.
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
  if (!team) return null;
  const url = flagUrl(teamId);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-black/10",
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: px * 0.7 }}>{team.flag}</span>
      )}
    </span>
  );
}
