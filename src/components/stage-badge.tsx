"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import type { Stage } from "@/lib/types";

export function StageBadge({ stage }: { stage: Stage }) {
  const { t } = useT();
  const variant =
    stage === "champion"
      ? "gold"
      : stage === "eliminated"
        ? "muted"
        : stage === "group"
          ? "secondary"
          : "default";
  return <Badge variant={variant as any}>{t(`stage.${stage}`)}</Badge>;
}
