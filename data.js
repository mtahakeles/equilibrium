/* ============================================================
   data.js — Synthetic small-business financial data
   Deterministic seeded generator so every demo run is repeatable.
   ============================================================ */

function makeSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const WEEKS = 10;

function generateBusinessData(seed = 42) {
  const rand = makeSeededRandom(seed);

  const startingBalance = 8200;
  const baseWeeklyRevenue = 6100;
  const revenueVariance = 1600;
  const fixedWeeklyCost = 4650; // payroll, rent, utilities — not schedulable

  const weeklyRevenue = [];
  for (let w = 0; w < WEEKS; w++) {
    const seasonalDip = w === 3 || w === 7 ? -900 : 0; // slow weeks
    const noise = (rand() - 0.5) * 2 * revenueVariance;
    weeklyRevenue.push(Math.round(baseWeeklyRevenue + seasonalDip + noise));
  }

  const vendorNames = [
    "Northstar Supplies", "CloudHost Inc.", "Print & Co.", "Meridian Logistics",
    "BlueLeaf Packaging", "Anchor Insurance", "Redline Equipment", "Solace Payroll Svc",
    "Granite Office Lease", "Pixel Marketing Co.", "Fleetwise Fuel", "Harbor Legal"
  ];

  const bills = vendorNames.map((name, i) => {
    const dueWeek = 1 + Math.floor(rand() * (WEEKS - 2));
    const amount = Math.round(400 + rand() * 2600);
    const hasEarlyDiscount = rand() > 0.4;
    const earlyDiscountPct = hasEarlyDiscount ? Math.round((1.5 + rand() * 2.5) * 10) / 10 : 0;
    const latePenaltyPct = Math.round((2 + rand() * 3) * 10) / 10;
    const windowBefore = Math.min(dueWeek, 2);
    const windowAfter = Math.min(WEEKS - 1 - dueWeek, 2);

    const allowedWeeks = [];
    for (let w = dueWeek - windowBefore; w <= dueWeek + windowAfter; w++) {
      allowedWeeks.push(w);
    }

    return {
      id: `bill-${i}`,
      name,
      amount,
      dueWeek,
      earlyDiscountPct,
      latePenaltyPct,
      allowedWeeks,
    };
  });

  return { startingBalance, weeklyRevenue, fixedWeeklyCost, bills };
}
