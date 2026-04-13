const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const SCHOOL_MONTHS = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // Sep-Jun

const INDICATORS = {
  energy: { label: "Electricity", unit: "kWh", color: "#5aa7ff" },
  water: { label: "Water", unit: "L", color: "#53e5ff" },
  office: { label: "Office supplies", unit: "€", color: "#9d7bff" },
  cleaning: { label: "Cleaning products", unit: "€", color: "#35d39a" }
};

const CHART_DEFS = [
  {
    key: "energy-year",
    indicator: "energy",
    months: [...Array(12).keys()],
    canvasId: "chartEnergyYear",
    noteId: "note-energy-year"
  },
  {
    key: "energy-school",
    indicator: "energy",
    months: SCHOOL_MONTHS,
    canvasId: "chartEnergySchool",
    noteId: "note-energy-school"
  },
  {
    key: "water-year",
    indicator: "water",
    months: [...Array(12).keys()],
    canvasId: "chartWaterYear",
    noteId: "note-water-year"
  },
  {
    key: "water-school",
    indicator: "water",
    months: SCHOOL_MONTHS,
    canvasId: "chartWaterSchool",
    noteId: "note-water-school"
  },
  {
    key: "office-year",
    indicator: "office",
    months: [...Array(12).keys()],
    canvasId: "chartOfficeYear",
    noteId: "note-office-year"
  },
  {
    key: "office-school",
    indicator: "office",
    months: SCHOOL_MONTHS,
    canvasId: "chartOfficeSchool",
    noteId: "note-office-school"
  },
  {
    key: "cleaning-year",
    indicator: "cleaning",
    months: [...Array(12).keys()],
    canvasId: "chartCleaningYear",
    noteId: "note-cleaning-year"
  },
  {
    key: "cleaning-school",
    indicator: "cleaning",
    months: SCHOOL_MONTHS,
    canvasId: "chartCleaningSchool",
    noteId: "note-cleaning-school"
  }
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

const efficiencySelect = document.getElementById("efficiencySelect");
const behaviourSelect = document.getElementById("behaviourSelect");
const circularSelect = document.getElementById("circularSelect");

const forecastStatus = document.getElementById("forecastStatus");
const summaryForecast = document.getElementById("summaryForecast");
const summaryReduced = document.getElementById("summaryReduced");
const summaryReduction = document.getElementById("summaryReduction");
const summarySavings = document.getElementById("summarySavings");
const insightBox = document.getElementById("insightBox");

const toggleImprovementBtn = document.getElementById("toggleImprovementBtn");
const improvementContent = document.getElementById("improvementContent");

document.getElementById("calculateBtn").addEventListener("click", calculateAllCharts);
document.getElementById("applyReductionBtn").addEventListener("click", applyReductionScenario);
document.getElementById("resetBtn").addEventListener("click", resetDashboard);

toggleImprovementBtn.addEventListener("click", () => {
  improvementContent.classList.toggle("hidden");
});

document.addEventListener("DOMContentLoaded", async () => {
  initCharts();
  await loadJsonData();
  calculateAllCharts();
});

async function loadJsonData() {
  try {
    const response = await fetch("dataclean_final_TA08.json");
    if (!response.ok) throw new Error("Could not load dataclean_final_TA08.json");
    rawData = await response.json();
    monthlyData = buildMonthlyData(rawData);
    insightBox.textContent = "JSON data loaded successfully. Click calculate to generate the 8 required analysis charts.";
    forecastStatus.textContent = "Loaded";
  } catch (error) {
    console.error(error);
    insightBox.textContent = "Error loading JSON. Make sure dataclean_final_TA08.json is in the same folder and open the page with Live Server.";
    forecastStatus.textContent = "Error";
  }
}

function buildMonthlyData(data) {
  const result = {
    energy: { monthly: new Array(12).fill(0), unit: "kWh" },
    water: { monthly: new Array(12).fill(0), unit: "L" },
    office: { monthly: new Array(12).fill(0), unit: "€" },
    cleaning: { monthly: new Array(12).fill(0), unit: "€" }
  };

  if (data.aigua) {
    data.aigua.forEach(day => {
      const month = new Date(day.data).getMonth();
      const totalDay = (day.hores || []).reduce((acc, h) => acc + (Number(h.consum_l) || 0), 0);
      result.water.monthly[month] += totalDay;
    });
  }

  if (data.consumibles_oficina) {
    data.consumibles_oficina.forEach(item => {
      const month = new Date(item.data).getMonth();
      result.office.monthly[month] += Number(item.cost_eur) || 0;
    });
  }

  if (data.neteja_higiene) {
    data.neteja_higiene.forEach(item => {
      const month = new Date(item.data).getMonth();
      result.cleaning.monthly[month] += Number(item.cost_eur) || 0;
    });
  }

  if (data.planta_solar) {
    data.planta_solar.forEach(item => {
      const month = new Date(item.data).getMonth();
      result.energy.monthly[month] += Number(item.consumption_kwh) || 0;
    });
  }

  return result;
}

function initCharts() {
  CHART_DEFS.forEach(def => {
    const cfg = INDICATORS[def.indicator];
    charts[def.key] = new Chart(document.getElementById(def.canvasId), {
      type: "bar",
      data: {
        labels: def.months.map(m => MONTH_SHORT[m]),
        datasets: [
          {
            label: "Forecast",
            data: new Array(def.months.length).fill(0),
            backgroundColor: cfg.color
          },
          {
            label: "Reduced",
            data: new Array(def.months.length).fill(0),
            backgroundColor: "rgba(255,255,255,0.35)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#dbe4ff" },
            grid: { color: "rgba(255,255,255,.06)" }
          },
          y: {
            ticks: { color: "#dbe4ff" },
            grid: { color: "rgba(255,255,255,.06)" }
          }
        },
        plugins: {
          legend: {
            labels: { color: "#dbe4ff" }
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

function calculateAllCharts() {
  if (!monthlyData) return;

  computedResults = {};
  let globalForecast = 0;

  CHART_DEFS.forEach(def => {
    const result = calculateSeries(def.indicator, def.months);
    computedResults[def.key] = {
      ...result,
      reducedSeries: new Array(result.series.length).fill(0),
      reducedTotal: 0
    };

    charts[def.key].data.labels = def.months.map(m => MONTH_SHORT[m]);
    charts[def.key].data.datasets[0].data = result.series;
    charts[def.key].data.datasets[1].data = new Array(result.series.length).fill(0);
    charts[def.key].update();

    document.getElementById(def.noteId).textContent =
      `Forecast total: ${formatNumber(result.total)} ${result.unit}`;

    globalForecast += result.total;
  });

  summaryForecast.textContent = formatNumber(globalForecast);
  summaryReduced.textContent = "0";
  summaryReduction.textContent = "0%";
  summarySavings.textContent = "0";
  forecastStatus.textContent = "Calculated";
  insightBox.textContent = "The 8 required calculations have been generated successfully from the JSON data.";
}

function calculateSeries(indicatorKey, activeMonths) {
  const baseSeries = monthlyData[indicatorKey].monthly;
  const unit = monthlyData[indicatorKey].unit;

  const trendPct = parseFloat(trendEl.value) / 100;
  const winterPct = parseFloat(winterBoostEl.value) / 100;
  const summerPct = parseFloat(summerBoostEl.value) / 100;
  const schoolPct = parseFloat(schoolBoostEl.value) / 100;

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

function applyReductionScenario() {
  if (!Object.keys(computedResults).length) {
    alert("Please calculate the forecast first.");
    return;
  }

  const efficiency = parseFloat(efficiencySelect.value);
  const behaviour = parseFloat(behaviourSelect.value);
  const circular = parseFloat(circularSelect.value);

  let totalReductionPct = efficiency + behaviour + circular;
  if (totalReductionPct > 30) totalReductionPct = 30;

  const factor = 1 - totalReductionPct / 100;

  let globalForecast = 0;
  let globalReduced = 0;

  CHART_DEFS.forEach(def => {
    const current = computedResults[def.key];
    const reducedSeries = current.series.map(v => round2(v * factor));
    const reducedTotal = round2(reducedSeries.reduce((a, b) => a + b, 0));

    current.reducedSeries = reducedSeries;
    current.reducedTotal = reducedTotal;

    charts[def.key].data.datasets[1].data = reducedSeries;
    charts[def.key].update();

    document.getElementById(def.noteId).textContent =
      `Forecast total: ${formatNumber(current.total)} ${current.unit} · Reduced total: ${formatNumber(reducedTotal)} ${current.unit}`;

    globalForecast += current.total;
    globalReduced += reducedTotal;
  });

  const savings = round2(globalForecast - globalReduced);
  const pct = globalForecast > 0 ? round2(((globalForecast - globalReduced) / globalForecast) * 100) : 0;

  summaryForecast.textContent = formatNumber(globalForecast);
  summaryReduced.textContent = formatNumber(globalReduced);
  summaryReduction.textContent = `${pct}%`;
  summarySavings.textContent = formatNumber(savings);

  insightBox.textContent = `The reduction scenario has been applied. Combined reduction across the 8 calculations: ${pct}%.`;
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
  efficiencySelect.value = "0";
  behaviourSelect.value = "0";
  circularSelect.value = "0";
  calculateAllCharts();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}