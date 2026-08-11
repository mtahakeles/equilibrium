# Equilibrium

**Cash flow forecasting and quantum-inspired payment scheduling for small businesses.**

Equilibrium projects a small business's cash position over the next 10 weeks, then
reschedules its outstanding bills using a QUBO-style cost function solved with
Simulated Annealing — the same classical technique used to benchmark quantum
annealers (like D-Wave) before or without real quantum hardware — to capture
early-payment discounts and steer the business away from every week its balance
would dip below a safety buffer.

🔗 Live demo: *add your GitHub Pages / hosting link here*
🎥 Demo video: *add your video link here*

## Running it locally

No build step, no dependencies. Just open `index.html` in a browser, or serve the
folder statically:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How it works

1. **Data** (`data.js`) — a deterministic, seeded synthetic dataset: starting cash
   balance, weekly revenue (with seasonal dips and noise), fixed weekly costs
   (payroll, rent), and a set of vendor bills, each with a due week, an
   early-payment discount, a late-payment penalty, and a window of weeks it's
   allowed to be paid in.
2. **Forecast** (`forecast.js`) — projects the weekly cash balance for any given
   payment schedule (which week each bill is actually paid in).
3. **Optimizer** (`optimizer.js`) — the core of the project. Each bill's payment
   week is encoded as a one-hot binary decision — exactly the variable shape used
   in QUBO (Quadratic Unconstrained Binary Optimization) formulations. The cost
   ("energy") function combines:
   - a **linear** term: discount captured or penalty incurred for paying early/late
   - a **quadratic** term: a penalty on `(buffer − balance)²` for every week the
     projected balance dips under the safety buffer, plus a hard penalty for any
     negative balance
   Simulated Annealing then searches this landscape with a cooling temperature
   schedule, accepting worse moves early (when "hot") and only better moves later
   (as it "cools") — converging toward a low-cost, low-risk schedule. The energy
   trace of this search is visualized live in the dashboard's hero chart.
4. **UI** (`index.html`, `style.css`, `app.js`) — renders the forecast, the
   optimizer's convergence, and a side-by-side schedule comparison, with a
   safety-buffer slider to re-run the optimizer against different risk tolerances.

## Project structure

```
equilibrium/
├── index.html      UI structure
├── style.css        design system
├── data.js          synthetic business data generator
├── forecast.js       cash balance projection
├── optimizer.js       QUBO-style cost function + simulated annealing
└── app.js           wiring: runs the pipeline, draws the charts
```

## Built with

HTML5 Canvas, vanilla JavaScript (no framework, no build step), CSS3,
Simulated Annealing / QUBO-inspired combinatorial optimization.
