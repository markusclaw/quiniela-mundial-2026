import type { GroupId } from "@/lib/types";
import { GROUP_IDS, teamsByGroup } from "./teams";

export interface Fixture {
  id: string;
  group: GroupId;
  matchday: 1 | 2 | 3;
  homeId: string;
  awayId: string;
}

// Standard 4-team round-robin schedule (3 matchdays, 6 matches per group).
// Positions 1..4 within a group; pairing pattern is the canonical one used
// by FIFA group stages.
const ROUND_ROBIN: [number, number][][] = [
  [[0, 3], [1, 2]], // MD1: 1v4, 2v3
  [[3, 1], [2, 0]], // MD2: 4v2, 3v1
  [[0, 1], [2, 3]], // MD3: 1v2, 3v4
];

export function groupFixtures(group: GroupId): Fixture[] {
  const teams = teamsByGroup(group); // ordered by data position (pos 1..4)
  const out: Fixture[] = [];
  ROUND_ROBIN.forEach((pairs, mdIdx) => {
    pairs.forEach(([h, a], i) => {
      out.push({
        id: `${group}-MD${mdIdx + 1}-${i + 1}`,
        group,
        matchday: (mdIdx + 1) as 1 | 2 | 3,
        homeId: teams[h].id,
        awayId: teams[a].id,
      });
    });
  });
  return out;
}

export const ALL_FIXTURES: Fixture[] = GROUP_IDS.flatMap(groupFixtures);

// Group stage window for the 2026 tournament.
export const GROUP_STAGE_WINDOW = "June 11 – 27, 2026";
export const KNOCKOUT_INFO = [
  { key: "r32", dates: "June 28 – July 3" },
  { key: "r16", dates: "July 4 – 7" },
  { key: "qf", dates: "July 9 – 11" },
  { key: "sf", dates: "July 14 – 15" },
  { key: "final", dates: "July 19" },
];
