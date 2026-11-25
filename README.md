# Equilibrium

A browser demo I made for the QuantumHacks hackathon. It projects a small business's cash balance 10 weeks ahead, then reschedules its bills to pick up early-payment discounts without letting the balance drop under a safety buffer.

Live demo: https://mtahakeles.github.io/equilibrium/

## How it works

- `data.js`: seeded synthetic business with weekly revenue (with seasonal dips), fixed costs, and 12 vendor bills. Each bill has a due week, an early-payment discount, a late penalty and a window of allowed payment weeks.
- `forecast.js`: weekly running balance for a given schedule.
- `optimizer.js`: simulated annealing over the schedules. The cost is the bills' effective cost plus a squared penalty for weeks under the buffer and a big penalty for negative weeks.
- `app.js`: charts (plain canvas) and a slider to change the buffer and re-run.

The hackathon theme was quantum computing. That's why the problem is written with a one-hot / QUBO-style encoding, the form a quantum annealer would take. The solver itself is ordinary simulated annealing on the CPU. For a problem this size, a mixed-integer solver would find the exact optimum. Annealing was the point of the exercise, not the best tool.

## Run locally

No build step:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
