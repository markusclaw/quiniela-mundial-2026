import type { Team, GroupId } from "@/lib/types";

// 2026 FIFA World Cup — final draw (Dec 5, 2025), Canada/Mexico/USA.
// Pot assignments per FIFA seeding (ranking of 19 Nov 2025); Pot 4 includes
// the playoff winners. Source: 2026 FIFA World Cup draw.
export const TEAMS: Team[] = [
  // Group A
  { id: "MEX", name: "Mexico", flag: "🇲🇽", pot: 1, group: "A", confederation: "CONCACAF", fifaRank: 15 },
  { id: "RSA", name: "South Africa", flag: "🇿🇦", pot: 3, group: "A", confederation: "CAF", fifaRank: 56 },
  { id: "KOR", name: "South Korea", flag: "🇰🇷", pot: 2, group: "A", confederation: "AFC", fifaRank: 22 },
  { id: "CZE", name: "Czech Republic", flag: "🇨🇿", pot: 4, group: "A", confederation: "UEFA", fifaRank: 43 },

  // Group B
  { id: "CAN", name: "Canada", flag: "🇨🇦", pot: 1, group: "B", confederation: "CONCACAF", fifaRank: 27 },
  { id: "BIH", name: "Bosnia & Herzegovina", flag: "🇧🇦", pot: 4, group: "B", confederation: "UEFA", fifaRank: 74 },
  { id: "QAT", name: "Qatar", flag: "🇶🇦", pot: 3, group: "B", confederation: "AFC", fifaRank: 52 },
  { id: "SUI", name: "Switzerland", flag: "🇨🇭", pot: 2, group: "B", confederation: "UEFA", fifaRank: 17 },

  // Group C
  { id: "BRA", name: "Brazil", flag: "🇧🇷", pot: 1, group: "C", confederation: "CONMEBOL", fifaRank: 6 },
  { id: "MAR", name: "Morocco", flag: "🇲🇦", pot: 2, group: "C", confederation: "CAF", fifaRank: 11 },
  { id: "HAI", name: "Haiti", flag: "🇭🇹", pot: 4, group: "C", confederation: "CONCACAF", fifaRank: 84 },
  { id: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", pot: 3, group: "C", confederation: "UEFA", fifaRank: 36 },

  // Group D
  { id: "USA", name: "United States", flag: "🇺🇸", pot: 1, group: "D", confederation: "CONCACAF", fifaRank: 14 },
  { id: "PAR", name: "Paraguay", flag: "🇵🇾", pot: 3, group: "D", confederation: "CONMEBOL", fifaRank: 39 },
  { id: "AUS", name: "Australia", flag: "🇦🇺", pot: 2, group: "D", confederation: "AFC", fifaRank: 26 },
  { id: "TUR", name: "Turkey", flag: "🇹🇷", pot: 4, group: "D", confederation: "UEFA", fifaRank: 25 },

  // Group E
  { id: "GER", name: "Germany", flag: "🇩🇪", pot: 1, group: "E", confederation: "UEFA", fifaRank: 12 },
  { id: "CUW", name: "Curaçao", flag: "🇨🇼", pot: 4, group: "E", confederation: "CONCACAF", fifaRank: 82 },
  { id: "CIV", name: "Ivory Coast", flag: "🇨🇮", pot: 3, group: "E", confederation: "CAF", fifaRank: 41 },
  { id: "ECU", name: "Ecuador", flag: "🇪🇨", pot: 2, group: "E", confederation: "CONMEBOL", fifaRank: 23 },

  // Group F
  { id: "NED", name: "Netherlands", flag: "🇳🇱", pot: 1, group: "F", confederation: "UEFA", fifaRank: 7 },
  { id: "JPN", name: "Japan", flag: "🇯🇵", pot: 2, group: "F", confederation: "AFC", fifaRank: 18 },
  { id: "SWE", name: "Sweden", flag: "🇸🇪", pot: 4, group: "F", confederation: "UEFA", fifaRank: 38 },
  { id: "TUN", name: "Tunisia", flag: "🇹🇳", pot: 3, group: "F", confederation: "CAF", fifaRank: 45 },

  // Group G
  { id: "BEL", name: "Belgium", flag: "🇧🇪", pot: 1, group: "G", confederation: "UEFA", fifaRank: 8 },
  { id: "EGY", name: "Egypt", flag: "🇪🇬", pot: 3, group: "G", confederation: "CAF", fifaRank: 34 },
  { id: "IRN", name: "Iran", flag: "🇮🇷", pot: 2, group: "G", confederation: "AFC", fifaRank: 21 },
  { id: "NZL", name: "New Zealand", flag: "🇳🇿", pot: 4, group: "G", confederation: "OFC", fifaRank: 86 },

  // Group H
  { id: "ESP", name: "Spain", flag: "🇪🇸", pot: 1, group: "H", confederation: "UEFA", fifaRank: 1 },
  { id: "CPV", name: "Cape Verde", flag: "🇨🇻", pot: 4, group: "H", confederation: "CAF", fifaRank: 68 },
  { id: "KSA", name: "Saudi Arabia", flag: "🇸🇦", pot: 3, group: "H", confederation: "AFC", fifaRank: 58 },
  { id: "URU", name: "Uruguay", flag: "🇺🇾", pot: 2, group: "H", confederation: "CONMEBOL", fifaRank: 16 },

  // Group I
  { id: "FRA", name: "France", flag: "🇫🇷", pot: 1, group: "I", confederation: "UEFA", fifaRank: 3 },
  { id: "SEN", name: "Senegal", flag: "🇸🇳", pot: 2, group: "I", confederation: "CAF", fifaRank: 19 },
  { id: "IRQ", name: "Iraq", flag: "🇮🇶", pot: 4, group: "I", confederation: "AFC", fifaRank: 57 },
  { id: "NOR", name: "Norway", flag: "🇳🇴", pot: 3, group: "I", confederation: "UEFA", fifaRank: 29 },

  // Group J
  { id: "ARG", name: "Argentina", flag: "🇦🇷", pot: 1, group: "J", confederation: "CONMEBOL", fifaRank: 2 },
  { id: "ALG", name: "Algeria", flag: "🇩🇿", pot: 3, group: "J", confederation: "CAF", fifaRank: 35 },
  { id: "AUT", name: "Austria", flag: "🇦🇹", pot: 2, group: "J", confederation: "UEFA", fifaRank: 24 },
  { id: "JOR", name: "Jordan", flag: "🇯🇴", pot: 4, group: "J", confederation: "AFC", fifaRank: 66 },

  // Group K
  { id: "POR", name: "Portugal", flag: "🇵🇹", pot: 1, group: "K", confederation: "UEFA", fifaRank: 5 },
  { id: "COD", name: "DR Congo", flag: "🇨🇩", pot: 4, group: "K", confederation: "CAF", fifaRank: 60 },
  { id: "UZB", name: "Uzbekistan", flag: "🇺🇿", pot: 3, group: "K", confederation: "AFC", fifaRank: 57 },
  { id: "COL", name: "Colombia", flag: "🇨🇴", pot: 2, group: "K", confederation: "CONMEBOL", fifaRank: 13 },

  // Group L
  { id: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", pot: 1, group: "L", confederation: "UEFA", fifaRank: 4 },
  { id: "CRO", name: "Croatia", flag: "🇭🇷", pot: 2, group: "L", confederation: "UEFA", fifaRank: 10 },
  { id: "GHA", name: "Ghana", flag: "🇬🇭", pot: 4, group: "L", confederation: "CAF", fifaRank: 72 },
  { id: "PAN", name: "Panama", flag: "🇵🇦", pot: 3, group: "L", confederation: "CONCACAF", fifaRank: 30 },
];

export const GROUP_IDS: GroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export const teamMap: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
);

export function getTeam(id: string): Team | undefined {
  return teamMap[id];
}

export function teamsByGroup(group: GroupId): Team[] {
  return TEAMS.filter((t) => t.group === group);
}

// A representative flag color per team (RGB), used to tint the hero background.
const TEAM_COLORS: Record<string, [number, number, number]> = {
  MEX: [0, 104, 71], RSA: [0, 119, 73], KOR: [205, 46, 58], CZE: [17, 69, 126],
  CAN: [213, 43, 30], BIH: [0, 20, 137], QAT: [138, 21, 56], SUI: [213, 43, 30],
  BRA: [0, 151, 57], MAR: [193, 39, 45], HAI: [0, 32, 145], SCO: [0, 90, 170],
  USA: [10, 49, 97], PAR: [213, 43, 30], AUS: [0, 103, 71], TUR: [227, 10, 23],
  GER: [221, 0, 0], CUW: [0, 33, 118], CIV: [255, 130, 0], ECU: [255, 209, 0],
  NED: [255, 102, 0], JPN: [188, 0, 45], SWE: [0, 106, 167], TUN: [225, 0, 0],
  BEL: [255, 205, 0], EGY: [206, 17, 38], IRN: [35, 159, 64], NZL: [0, 33, 113],
  ESP: [170, 21, 27], CPV: [0, 56, 147], KSA: [22, 93, 48], URU: [0, 56, 168],
  FRA: [0, 35, 149], SEN: [0, 135, 81], IRQ: [206, 17, 38], NOR: [186, 12, 47],
  ARG: [108, 172, 228], ALG: [0, 98, 51], AUT: [237, 28, 36], JOR: [0, 122, 61],
  POR: [218, 41, 28], COD: [0, 114, 206], UZB: [0, 153, 219], COL: [252, 209, 22],
  ENG: [206, 17, 38], CRO: [215, 0, 0], GHA: [0, 107, 63], PAN: [0, 32, 91],
};

/** Team flag color (RGB), falling back to brand green. */
export function teamColor(id: string | null | undefined): [number, number, number] {
  return (id && TEAM_COLORS[id]) || [16, 74, 56];
}

export function teamsByPot(pot: 1 | 2 | 3 | 4): Team[] {
  return TEAMS.filter((t) => t.pot === pot).sort((a, b) => a.fifaRank - b.fifaRank);
}

// ISO codes for flag artwork (public-domain country flags via flagcdn.com).
// England & Scotland use GB subdivision codes supported by flagcdn.
export const FLAG_ISO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
};

// Crisp scalable flag image. flagcdn serves public-domain flag artwork.
export function flagUrl(teamId: string): string {
  const iso = FLAG_ISO[teamId];
  return iso ? `https://flagcdn.com/${iso}.svg` : "";
}

// ── Custom crest overrides ───────────────────────────────────────────────
// Drop your own crest images into /public/crests named by team id, e.g.
// /public/crests/BRA.png, then add that id below. Any team listed here uses
// its custom image; everything else falls back to the country flag, and if a
// custom image fails to load it also falls back to the flag automatically.
// (You supply the artwork — see /public/crests/README.txt.)
export const CUSTOM_CRESTS = new Set<string>([
  // "BRA", "ARG", "ESP", ...
]);

export const CREST_EXT = "png"; // png | svg | webp

export function crestOverrideUrl(teamId: string): string | null {
  return CUSTOM_CRESTS.has(teamId) ? `/crests/${teamId}.${CREST_EXT}` : null;
}
