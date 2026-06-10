import type { Package, Tier } from "@/lib/types";
import { teamsByPot } from "@/lib/data/teams";

/**
 * Builds 12 tiered "packages" of 4 teams each — one team from every seeding
 * pot. The package is *tiered* by the strength of its headline (Pot 1) team,
 * which sets the buy-in. To keep things fair, supporting teams are paired in a
 * snake pattern so total package strength stays balanced: a premium headliner
 * gets weaker support, a value headliner gets stronger support. Pot shares are
 * equal weight regardless of buy-in, so a cheap "value" package that runs deep
 * pays the same prize as a premium one — huge upside for the bold.
 */
export function buildPackages(buyIns: {
  premium: number;
  mid: number;
  value: number;
}): Package[] {
  const pot1 = teamsByPot(1); // best -> worst (by FIFA rank)
  const pot2 = teamsByPot(2);
  const pot3 = teamsByPot(3);
  const pot4 = teamsByPot(4);

  // Snake the supporting pots against the headliner ordering to balance value.
  const pot2r = [...pot2].reverse();
  const pot4r = [...pot4].reverse();

  return pot1.map((head, i) => {
    const tier: Tier = i < 4 ? "premium" : i < 8 ? "mid" : "value";
    const buyIn =
      tier === "premium"
        ? buyIns.premium
        : tier === "mid"
          ? buyIns.mid
          : buyIns.value;

    return {
      id: `PKG-${String(i + 1).padStart(2, "0")}`,
      label: `${head.name} Pack`,
      tier,
      buyIn,
      teamIds: [head.id, pot2r[i].id, pot3[i].id, pot4r[i].id],
    };
  });
}

export const TIER_META: Record<
  Tier,
  { label: string; blurb: string }
> = {
  premium: {
    label: "Premium",
    blurb: "Built around a title favorite. Higher buy-in, better odds.",
  },
  mid: {
    label: "Contender",
    blurb: "A solid headliner with balanced support. The sweet spot.",
  },
  value: {
    label: "Underdog",
    blurb: "No favorites — all upside. Cheapest buy-in, biggest payout multiplier.",
  },
};
