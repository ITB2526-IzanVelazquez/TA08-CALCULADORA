const SCHOOL_MONTHS = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const INDICATORS = {
  energy: { label: "Electricity", unit: "kWh", color: "#5aa7ff" },
  water: { label: "Water", unit: "L", color: "#53e5ff" },
  office: { label: "Office supplies", unit: "€", color: "#9d7bff" },
  cleaning: { label: "Cleaning products", unit: "€", color: "#35d39a" }
};

const CHART_DEFS = [
  { key: "energy-year", indicator: "energy", months: [...Array(12).keys()], canvasId: "chartEnergyYear", noteId: "note-energy-year" },
  { key: "energy-school", indicator: "energy", months: SCHOOL_MONTHS, canvasId: "chartEnergySchool", noteId: "note-energy-school" },
  { key: "water-year", indicator: "water", months: [...Array(12).keys()], canvasId: "chartWaterYear", noteId: "note-water-year" },
  { key: "water-school", indicator: "water", months: SCHOOL_MONTHS, canvasId: "chartWaterSchool", noteId: "note-water-school" },
  { key: "office-year", indicator: "office", months: [...Array(12).keys()], canvasId: "chartOfficeYear", noteId: "note-office-year" },
  { key: "office-school", indicator: "office", months: SCHOOL_MONTHS, canvasId: "chartOfficeSchool", noteId: "note-office-school" },
  { key: "cleaning-year", indicator: "cleaning", months: [...Array(12).keys()], canvasId: "chartCleaningYear", noteId: "note-cleaning-year" },
  { key: "cleaning-school", indicator: "cleaning", months: SCHOOL_MONTHS, canvasId: "chartCleaningSchool", noteId: "note-cleaning-school" }
];

let rawData = null;
let monthlyData = null;
let charts = {};
let computedResults = {};

const trendEl = document.getElementById("trend");
const winterBoostEl = document.getElementById("winterBoost");
const summerBoostEl = document.getElementById("summerBoost");
const schoolBoostEl = document.getElementById("schoolBoost");
const seasonalityEl = document.getElementById("seasonality");
const variabilityEl = document.getElementById("variability");

const forecastStatus = document.getElementById("forecastStatus");
const summaryForecast = document.getElementById("summaryForecast");
const summaryReduced = document.getElementById("summaryReduced");
const summaryReduction = document.getElementById("summaryReduction");
const summarySavings = document.getElementById("summarySavings");
const insightBox = document.getElementById("insightBox");
const selectedReductionEl = document.getElementById("selectedReduction");

const actionCheckboxes = Array.from(document.querySelectorAll(".action-checkbox"));

document.getElementById("resetBtn").addEventListener("click", resetDashboard);

[
  trendEl,
  winterBoostEl,
  summerBoostEl,
  schoolBoostEl,
  seasonalityEl,
  variabilityEl
].forEach(el => {
  el.addEventListener("input", handleSettingsChange);
  el.addEventListener("change", handleSettingsChange);
});

actionCheckboxes.forEach(cb => cb.addEventListener("change", recalculateAll));

window.addEventListener("load", async () => {
  initCharts();
  await loadJsonData();
  recalculateAll();
});

function handleSettingsChange(event) {
  clampInput(event.target);
  recalculateAll();
}

function clampInput(el) {
  if (!el || el.type !== "number") return;
  let value = parseInt(el.value || "0", 10);
  if (Number.isNaN(value)) value = 0;
  if (value > 100) value = 100;
  if (value < -100) value = -100;
  el.value = value;
}

async function loadJsonData() {
  try {
    const response = await fetch("./dataclean_final_TA08.json?ts=" + Date.now(), {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    rawData = await response.json();
    monthlyData = buildMonthlyData(rawData);

    forecastStatus.textContent = "Calculated";
    insightBox.textContent = "JSON data loaded successfully. Forecasts update automatically when you change the calculator or the selected actions.";
    console.log("JSON loaded correctly", monthlyData);
  } catch (error) {
    console.error("JSON load error:", error);
    forecastStatus.textContent = "Error";
    insightBox.textContent = "Error loading JSON. Open the page with Live Server and check that dataclean_final_TA08.json is in the same folder.";
  }
}

function buildMonthlyData(data) {
  const result = {
    energy: { monthly: new Array(12).fill(0), unit: "kWh" },
    water: { monthly: new Array(12).fill(0), unit: "L" },
    office: { monthly: new Array(12).fill(0), unit: "€" },
    cleaning: { monthly: new Array(12).fill(0), unit: "€" }
  };

  if (Array.isArray(data?.aigua)) {
    data.aigua.forEach(day => {
      if (!day || !day.data) return;
      const date = new Date(day.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();

      const totalDay = Array.isArray(day.hores)
        ? day.hores.reduce((acc, h) => acc + (Number(h?.consum_l) || 0), 0)
        : 0;

      result.water.monthly[month] += totalDay;
    });
  }

  if (Array.isArray(data?.consumibles_oficina)) {
    data.consumibles_oficina.forEach(item => {
      if (!item || !item.data) return;
      const date = new Date(item.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      result.office.monthly[month] += Number(item.cost_eur) || 0;
    });
  }

  if (Array.isArray(data?.neteja_higiene)) {
    data.neteja_higiene.forEach(item => {
      if (!item || !item.data) return;
      const date = new Date(item.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      result.cleaning.monthly[month] += Number(item.cost_eur) || 0;
    });
  }

  if (Array.isArray(data?.planta_solar)) {
    data.planta_solar.forEach(item => {
      if (!item || !item.data) return;
      const date = new Date(item.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      result.energy.monthly[month] += Number(item.consumption_kwh) || 0;
    });
  }

  return result;
}

function initCharts() {
  CHART_DEFS.forEach(def => {
    const cfg = INDICATORS[def.indicator];
    const canvas = document.getElementById(def.canvasId);

    charts[def.key] = new Chart(canvas, {
      type: "bar",
      data: {
        labels: def.months.map(m => MONTH_SHORT[m]),
        datasets: [
          {
            label: "Forecast",
            data: new Array(def.months.length).fill(0),
            backgroundColor: cfg.color,
            borderRadius: 8
          },
          {
            label: "After selected actions",
            data: new Array(def.months.length).fill(0),
            backgroundColor: "rgba(255,255,255,0.30)",
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            ticks: { color: "#dbe4ff", maxRotation: 0, minRotation: 0 },
            grid: { color: "rgba(255,255,255,.06)" }
          },
          y: {
            ticks: { color: "#dbe4ff" },
            grid: { color: "rgba(255,255,255,.06)" }
          }
        },
        plugins: {
          legend: {
            labels: { color: "#dbe4ff", boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: "#0d1327",
            titleColor: "#fff",
            bodyColor: "#dce4ff"
          }
        }
      }
    });
  });
}

function recalculateAll() {
  if (!monthlyData) return;

  computedResults = {};
  let globalForecast = 0;
  let globalReduced = 0;
  const selectedReduction = getSelectedReductionFactor();

  selectedReductionEl.textContent = `${selectedReduction.percentage}%`;

  CHART_DEFS.forEach(def => {
    const result = calculateSeries(def.indicator, def.months);
    const reducedSeries = result.series.map(v => round2(v * selectedReduction.factor));
    const reducedTotal = round2(reducedSeries.reduce((a, b) => a + b, 0));

    computedResults[def.key] = {
      ...result,
      reducedSeries,
      reducedTotal
    };

    charts[def.key].data.labels = def.months.map(m => MONTH_SHORT[m]);
    charts[def.key].data.datasets[0].data = result.series;
    charts[def.key].data.datasets[1].data = reducedSeries;
    charts[def.key].update();

    const note = document.getElementById(def.noteId);
    note.textContent =
      `Forecast: ${formatNumber(result.total)} ${result.unit} · Reduced: ${formatNumber(reducedTotal)} ${result.unit}`;

    globalForecast += result.total;
    globalReduced += reducedTotal;
  });

  const savings = round2(globalForecast - globalReduced);
  const pct = globalForecast > 0 ? round2(((globalForecast - globalReduced) / globalForecast) * 100) : 0;

  summaryForecast.textContent = formatNumber(globalForecast);
  summaryReduced.textContent = formatNumber(globalReduced);
  summaryReduction.textContent = `${pct}%`;
  summarySavings.textContent = formatNumber(savings);

  forecastStatus.textContent = "Calculated";
  insightBox.textContent = `The page recalculates automatically. Selected actions currently apply an estimated reduction of ${selectedReduction.percentage}% (maximum 30%).`;
}

function calculateSeries(indicatorKey, activeMonths) {
  const baseSeries = monthlyData[indicatorKey].monthly;
  const unit = monthlyData[indicatorKey].unit;

  const trendPct = safePercent(trendEl.value);
  const winterPct = safePercent(winterBoostEl.value);
  const summerPct = safePercent(summerBoostEl.value);
  const schoolPct = safePercent(schoolBoostEl.value);

  const seed = indicatorKey.charCodeAt(0);
  const series = [];

  activeMonths.forEach((monthIndex, position) => {
    let value = baseSeries[monthIndex] || 0;

    value *= (1 + trendPct * (position / Math.max(1, activeMonths.length - 1)));

    if (seasonalityEl.checked) {
      if ([11, 0, 1].includes(monthIndex)) value *= (1 + winterPct);
      if ([5, 6, 7].includes(monthIndex)) value *= (1 + summerPct);
      if (SCHOOL_MONTHS.includes(monthIndex)) value *= (1 + schoolPct);
    }

    if (variabilityEl.checked) {
      const v = pseudoRandomVariation(monthIndex, seed);
      value *= (1 + v);
    }

    series.push(round2(value));
  });

  return {
    series,
    total: round2(series.reduce((a, b) => a + b, 0)),
    unit
  };
}

function getSelectedReductionFactor() {
  const total = actionCheckboxes
    .filter(cb => cb.checked)
    .reduce((sum, cb) => sum + Number(cb.dataset.impact || 0), 0);

  const capped = Math.min(total, 30);
  return {
    percentage: capped,
    factor: 1 - capped / 100
  };
}

function safePercent(value) {
  let n = parseInt(value || "0", 10);
  if (Number.isNaN(n)) n = 0;
  if (n > 100) n = 100;
  if (n < -100) n = -100;
  return n / 100;
}

function pseudoRandomVariation(index, seed) {
  const raw = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  const frac = raw - Math.floor(raw);
  return (frac - 0.5) * 0.18;
}

function resetDashboard() {
  trendEl.value = 5;
  winterBoostEl.value = 12;
  summerBoostEl.value = 8;
  schoolBoostEl.value = 10;
  seasonalityEl.checked = true;
  variabilityEl.checked = true;
  actionCheckboxes.forEach(cb => cb.checked = false);
  recalculateAll();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}