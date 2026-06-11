// ─────────────────────────────────────────────────────────────────────────────
//  Tournament reference dates only.
//
//  NOTE: the old hand-rolled round-robin schedule generator was removed — it
//  produced incorrect pairings (e.g. it did not match the real opening match,
//  Mexico vs South Africa). The app gets all real fixtures, kickoff times and
//  scores from the live feeds (openfootball + API-Football), never from a
//  generated schedule. Keep it that way.
// ─────────────────────────────────────────────────────────────────────────────

// Group stage window for the 2026 tournament.
export const GROUP_STAGE_WINDOW = "June 11 – July 3, 2026";

export const KNOCKOUT_INFO = [
  { key: "r32", dates: "June 28 – July 3" },
  { key: "r16", dates: "July 4 – 7" },
  { key: "qf", dates: "July 9 – 11" },
  { key: "sf", dates: "July 14 – 15" },
  { key: "final", dates: "July 19" },
];
