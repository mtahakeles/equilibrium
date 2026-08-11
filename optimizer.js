/* ============================================================
   optimizer.js — Quantum-inspired payment scheduling
   ------------------------------------------------------------
   Each bill's "which week do I pay this" decision is a one-hot
   binary vector over its allowed weeks — exactly the variable
   encoding used in QUBO (Quadratic Unconstrained Binary
   Optimization) formulations. The cost/"energy" function mixes:

     1) a LINEAR term  — discount captured / penalty avoided
     2) a QUADRATIC term — a penalty on (buffer - runningBalance)^2
        for every week the projected balance dips below the
        safety buffer (a squared linear function of the binary
        variables is itself quadratic in those variables)

   This is the same cost landscape D-Wave-style quantum annealers
   are built to search. We search it classically with Simulated
   Annealing — the standard technique used to benchmark and
   validate QUBO solutions before/without real quantum hardware.
   ============================================================ */

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
