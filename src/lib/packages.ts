import type { DistributionMode, Package, Tier } from "@/lib/types";
import { teamsByPot } from "@/lib/data/teams";

export interface PackageBuildOpts {
  mode: DistributionMode;
  buyIn: number; // flat per-package price (balanced / individual)
  tierBuyIns: { premium: number; mid: number; value: number };
}

/**
 * Builds 12 packages of 4 teams each — one team from every seeding pot.
 *
 * - balanced / individual: supporting teams are snake-paired against the
 *   headliner order, so every bundle is roughly equal strength; flat price.
 * - tiered: teams are paired in straight rank order, so the top packages are
 *   genuinely stronger (premium) and priced higher than the value packages.
 *
 * (In individual mode the packages aren't used for ownership — teams are
 * assigned one by one — but we still build them as a harmless default.)
 */
export function buildPackages(opts: PackageBuildOpts): Package[] {
  const { mode, buyIn, tierBuyIns } = opts;
  const pot1 = teamsByPot(1); // best -> worst (by FIFA rank)
  const pot2 = teamsByPot(2);
  const pot3 = teamsByPot(3);
  const pot4 = teamsByPot(4);

  const tieredComposition = mode === "tiered";
  const pot2x = tieredComposition ? pot2 : [...pot2].reverse();
  const pot4x = tieredComposition ? pot4 : [...pot4].reverse();

  return pot1.map((head, i) => {
    const tier: Tier = i < 4 ? "premium" : i < 8 ? "mid" : "value";
    const price = tieredComposition ? tierBuyIns[tier] : buyIn;
    return {
      id: `PKG-${String(i + 1).padStart(2, "0")}`,
      label: `${head.name} Pack`,
      tier,
      buyIn: price,
      teamIds: [head.id, pot2x[i].id, pot3[i].id, pot4x[i].id],
    };
  });
}
