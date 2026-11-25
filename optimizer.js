// Payment scheduling with simulated annealing.
//
// Each bill is paid in one of its allowed weeks. The cost ("energy") of a
// schedule = what the bills cost after early discounts / late penalties
// + a squared penalty for every week the balance sits under the buffer
// + a large fixed penalty for any negative week.
//
// The one-hot encoding is the same one a QUBO formulation would use (the
// hackathon theme was quantum computing), but everything here runs
// classically. Note the negative-balance penalty is a step, not a
// quadratic term, so strictly speaking this isn't a pure QUBO.

function computeEnergy(businessData, schedule, buffer, riskWeight = 3.5) {
  const linearCost = totalEffectiveCost(businessData.bills, schedule);
  const balances = projectCashFlow(businessData, schedule);

  let quadraticPenalty = 0;
  for (const bal of balances) {
    if (bal < buffer) {
      const gap = buffer - bal;
      quadraticPenalty += gap * gap * 0.002 * riskWeight;
    }
    if (bal < 0) {
      quadraticPenalty += 5000; // hard shortfall penalty
    }
  }
  return linearCost + quadraticPenalty;
}

function randomSchedule(bills, rand) {
  const schedule = {};
  for (const bill of bills) {
    const options = bill.allowedWeeks;
    schedule[bill.id] = options[Math.floor(rand() * options.length)];
  }
  return schedule;
}

/**
 * Simulated annealing search over the one-hot payment-week encoding.
 * Returns { bestSchedule, bestEnergy, history } where history is the
 * energy trace used to draw the "cooling" convergence chart.
 */
function annealPaymentSchedule(businessData, buffer, options = {}) {
  const {
    iterations = 1800,
    startTemp = 4200,
    coolingRate = 0.996,
    seed = 7,
  } = options;

  const rand = makeSeededRandom(seed);
  const bills = businessData.bills;

  let current = randomSchedule(bills, rand);
  let currentEnergy = computeEnergy(businessData, current, buffer);

  let best = { ...current };
  let bestEnergy = currentEnergy;

  let temp = startTemp;
  const history = [currentEnergy];

  for (let i = 0; i < iterations; i++) {
    const bill = bills[Math.floor(rand() * bills.length)];
    const options = bill.allowedWeeks;
    if (options.length > 1) {
      const proposal = { ...current };
      let newWeek;
      do {
        newWeek = options[Math.floor(rand() * options.length)];
      } while (newWeek === current[bill.id]);
      proposal[bill.id] = newWeek;

      const proposalEnergy = computeEnergy(businessData, proposal, buffer);
      const delta = proposalEnergy - currentEnergy;

      if (delta < 0 || rand() < Math.exp(-delta / temp)) {
        current = proposal;
        currentEnergy = proposalEnergy;
        if (currentEnergy < bestEnergy) {
          best = { ...current };
          bestEnergy = currentEnergy;
        }
      }
    }
    temp *= coolingRate;
    history.push(currentEnergy);
  }

  return { bestSchedule: best, bestEnergy, history };
}
