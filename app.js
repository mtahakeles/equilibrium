/* ============================================================
   app.js — wires data → optimizer → UI
   ============================================================ */

const COLORS = {
  paperDim: "#A9B4C4",
  cryo: "#5FD4D0",
  brass: "#C69749",
  ember: "#E1573F",
  line: "#22304a",
};

let businessData = generateBusinessData(42);
let currentBuffer = 1500;

function fmtMoney(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function drawEnergyChart(history) {
  const canvas = document.getElementById("energy-canvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const max = Math.max(...history);
  const min = Math.min(...history);
  const pad = 20;

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + ((h - pad * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.strokeStyle = COLORS.cryo;
  ctx.lineWidth = 1.6;
  history.forEach((val, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const norm = max === min ? 0.5 : (val - min) / (max - min);
    const y = h - pad - norm * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // fill under curve, faint
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fillStyle = "rgba(95, 212, 208, 0.08)";
  ctx.fill();
}

function drawForecastChart(baselineBalances, optimizedBalances, buffer) {
  const canvas = document.getElementById("forecast-canvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const padL = 60, padR = 20, padT = 20, padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const allVals = [...baselineBalances, ...optimizedBalances, buffer, 0];
  const max = Math.max(...allVals) * 1.1;
  const min = Math.min(...allVals) * 1.1;

  const xForWeek = (wk) => padL + (wk / (WEEKS - 1)) * plotW;
  const yForVal = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

  // gridlines + y labels
  ctx.strokeStyle = COLORS.line;
  ctx.fillStyle = COLORS.paperDim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.lineWidth = 1;
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const val = min + ((max - min) / steps) * i;
    const y = yForVal(val);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    ctx.fillText(fmtMoney(val), 4, y + 4);
  }

  // x labels
  for (let wk = 0; wk < WEEKS; wk++) {
    ctx.fillText("W" + (wk + 1), xForWeek(wk) - 8, h - padB + 18);
  }

  // zero line
  ctx.strokeStyle = "rgba(237,234,224,0.35)";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(padL, yForVal(0));
  ctx.lineTo(w - padR, yForVal(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // buffer line
  ctx.strokeStyle = COLORS.brass;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padL, yForVal(buffer));
  ctx.lineTo(w - padR, yForVal(buffer));
  ctx.stroke();
  ctx.setLineDash([]);

  function drawLine(values, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    values.forEach((v, wk) => {
      const x = xForWeek(wk), y = yForVal(v);
      if (wk === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    values.forEach((v, wk) => {
      const x = xForWeek(wk), y = yForVal(v);
      const risk = v < buffer;
      ctx.beginPath();
      ctx.arc(x, y, risk ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = risk ? COLORS.ember : color;
      ctx.fill();
    });
  }

  drawLine(baselineBalances, COLORS.paperDim);
  drawLine(optimizedBalances, COLORS.cryo);
}

function populateTable(schedule) {
  const tbody = document.getElementById("schedule-body");
  tbody.innerHTML = "";
  const baseline = baselineSchedule(businessData.bills);

  businessData.bills.forEach((bill) => {
    const optWeek = schedule[bill.id];
    const baseWeek = baseline[bill.id];
    let tag, tagClass;
    if (optWeek < bill.dueWeek) {
      tag = `Early · ${bill.earlyDiscountPct}% off`;
      tagClass = "tag-discount";
    } else if (optWeek > bill.dueWeek) {
      tag = `Late · +${bill.latePenaltyPct}%/wk`;
      tagClass = "tag-penalty";
    } else {
      tag = "On time";
      tagClass = "tag-same";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${bill.name}</td>
      <td class="mono">${fmtMoney(bill.amount)}</td>
      <td class="mono">W${bill.dueWeek + 1}</td>
      <td class="mono">W${baseWeek + 1}</td>
      <td class="mono">W${optWeek + 1}</td>
      <td><span class="tag ${tagClass}">${tag}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function runPipeline(buffer) {
  const baseline = baselineSchedule(businessData.bills);
  const baselineBalances = projectCashFlow(businessData, baseline);
  const baselineCost = totalEffectiveCost(businessData.bills, baseline);

  const { bestSchedule, history } = annealPaymentSchedule(businessData, buffer, {
    iterations: 1800,
    startTemp: 4200,
    coolingRate: 0.996,
    seed: 7,
  });

  const optimizedBalances = projectCashFlow(businessData, bestSchedule);
  const optimizedCost = totalEffectiveCost(businessData.bills, bestSchedule);

  const delta = optimizedCost - baselineCost; // positive = optimized schedule costs more
  const baselineRisk = countRiskWeeks(baselineBalances, buffer);
  const optimizedRisk = countRiskWeeks(optimizedBalances, buffer);
  const risksEliminated = Math.max(0, baselineRisk - optimizedRisk);

  const statSavedEl = document.getElementById("stat-saved");
  const statSavedLabelEl = document.getElementById("stat-saved-label");
  if (delta <= 0) {
    statSavedEl.textContent = fmtMoney(Math.abs(delta));
    statSavedEl.style.color = "var(--cryo)";
    statSavedLabelEl.textContent = "Saved vs. naive schedule";
  } else {
    statSavedEl.textContent = "+" + fmtMoney(delta);
    statSavedEl.style.color = "var(--brass)";
    statSavedLabelEl.textContent = "Spent to de-risk the schedule";
  }

  document.getElementById("stat-risk").textContent = `${risksEliminated} of ${baselineRisk}`;
  document.getElementById("stat-iterations").textContent = history.length.toLocaleString("en-US");

  drawEnergyChart(history);
  drawForecastChart(baselineBalances, optimizedBalances, buffer);
  populateTable(bestSchedule);
}

document.getElementById("buffer-slider").addEventListener("input", (e) => {
  currentBuffer = Number(e.target.value);
  document.getElementById("buffer-value").textContent = fmtMoney(currentBuffer);
});

document.getElementById("rerun-btn").addEventListener("click", () => {
  runPipeline(currentBuffer);
});

document.getElementById("buffer-value").textContent = fmtMoney(currentBuffer);
runPipeline(currentBuffer);
