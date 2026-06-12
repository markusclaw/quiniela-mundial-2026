"use client";

import { PublicShell } from "@/components/require-auth";
import { useT } from "@/lib/i18n";
import { GroupStandings } from "@/components/group-standings";

function GroupsInner() {
  const { t } = useT();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.groups")}</h1>
      <GroupStandings />
    </div>
  );
}

export default function GroupsPage() {
  return (
    <PublicShell>
      <GroupsInner />
    </PublicShell>
  );
}
