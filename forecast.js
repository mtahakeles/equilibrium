/* ============================================================
   forecast.js — Weekly cash balance projection
   Given a payment schedule (map of billId -> week paid), computes
   the running cash balance for every week of the horizon.
   ============================================================ */

function effectiveAmount(bill, weekPaid) {
  if (weekPaid < bill.dueWeek) {
    return bill.amount * (1 - bill.earlyDiscountPct / 100);
  }
  if (weekPaid > bill.dueWeek) {
    const weeksLate = weekPaid - bill.dueWeek;
    return bill.amount * (1 + (bill.latePenaltyPct / 100) * weeksLate);
  }
  return bill.amount;
}

function projectCashFlow(businessData, schedule) {
  const { startingBalance, weeklyRevenue, fixedWeeklyCost, bills } = businessData;
  const balances = [];
  let running = startingBalance;

  for (let w = 0; w < WEEKS; w++) {
    running += weeklyRevenue[w] - fixedWeeklyCost;

    for (const bill of bills) {
      const weekPaid = schedule[bill.id];
      if (weekPaid === w) {
        running -= effectiveAmount(bill, weekPaid);
      }
    }
    balances.push(Math.round(running));
  }
  return balances;
}

function baselineSchedule(bills) {
  const schedule = {};
  for (const bill of bills) schedule[bill.id] = bill.dueWeek;
  return schedule;
}

function totalEffectiveCost(bills, schedule) {
  let total = 0;
  for (const bill of bills) {
    total += effectiveAmount(bill, schedule[bill.id]);
  }
  return Math.round(total);
}

function countRiskWeeks(balances, buffer) {
  return balances.filter((b) => b < buffer).length;
}
