const ROADMAP_INDICATORS = {
  energy: { label: "Electricity", unit: "kWh", color: "#5aa7ff" },
  water: { label: "Water", unit: "L", color: "#53e5ff" },
  office: { label: "Office supplies", unit: "€", color: "#9d7bff" },
  cleaning: { label: "Cleaning products", unit: "€", color: "#35d39a" }
};

let monthlyData = null;
let roadmapChart = null;
let dashboardState = null;
let currentIndicator = "energy";

window.addEventListener("load", async () => {
  initRoadmapChart();
  bindIndicatorButtons();
  await loadRoadmapData();
});

function bindIndicatorButtons() {
  const buttons = document.querySelectorAll(".indicator-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentIndicator = btn.dataset.indicator;
      renderSelectedIndicator(true);
    });
  });
}

async function loadRoadmapData() {
  try {
    const response = await fetch("./dataclean_final_TA08.json?ts=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawData = await response.json();
    monthlyData = buildMonthlyData(rawData);
    dashboardState = getSavedDashboardState();

    document.getElementById("roadmapIntro").textContent =
      "This diagram predicts all months of the next 3 years using the JSON data, the dashboard settings and the selected actions.";
    renderSelectedIndicator(false);
  } catch (error) {
    console.error("Roadmap JSON error:", error);
    document.getElementById("roadmapIntro").textContent =
      "Error loading roadmap data. Open the page with Live Server and check that dataclean_final_TA08.json is in the same folder.";
    document.getElementById("roadmapSummaryText").textContent =
      "No dynamic diagram could be generated because the JSON was not loaded correctly.";
  }
}

function getSavedDashboardState() {
  try {
    const raw = localStorage.getItem("ta08_dashboard_state");
    if (!raw) {
      return {
        trend: 5,
        winterBoost: 12,
        summerBoost: 8,
        schoolBoost: 10,
        seasonality: true,
        variability: true,
        selectedActions: []
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      trend: 5,
      winterBoost: 12,
      summerBoost: 8,
      schoolBoost: 10,
      seasonality: true,
      variability: true,
      selectedActions: []
    };
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
      if (!day?.data) return;
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
      if (!item?.data) return;
      const date = new Date(item.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      result.office.monthly[month] += Number(item?.cost_eur) || 0;
    });
  }

  if (Array.isArray(data?.neteja_higiene)) {
    data.neteja_higiene.forEach(item => {
      if (!item?.data) return;
      const date = new Date(item.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      result.cleaning.monthly[month] += Number(item?.cost_eur) || 0;
    });
  }

  if (Array.isArray(data?.planta_solar)) {
    data.planta_solar.forEach(item => {
      if (!item?.data) return;
      const date = new Date(item.data);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      result.energy.monthly[month] += Number(item?.consumption_kwh) || 0;
    });
  }

  return result;
}

function initRoadmapChart() {
  const ctx = document.getElementById("mainRoadmapChart");
  const currentYear = new Date().getFullYear();

  roadmapChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [
        {
          label: `${currentYear} · no actions`,
          data: new Array(12).fill(0),
          borderColor: "rgba(90,167,255,0.60)",
          backgroundColor: "rgba(90,167,255,0.10)",
          borderWidth: 2.5,
          borderDash: [8, 6],
          tension: 0.35,
          fill: false,
          pointRadius: 2.5,
          pointHoverRadius: 5
        },
        {
          label: `${currentYear} · with actions`,
          data: new Array(12).fill(0),
          borderColor: "#5aa7ff",
          backgroundColor: "rgba(90,167,255,0.18)",
          borderWidth: 3,
          tension: 0.35,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: `${currentYear + 1} · no actions`,
          data: new Array(12).fill(0),
          borderColor: "rgba(83,229,255,0.60)",
          backgroundColor: "rgba(83,229,255,0.10)",
          borderWidth: 2.5,
          borderDash: [8, 6],
          tension: 0.35,
          fill: false,
          pointRadius: 2.5,
          pointHoverRadius: 5
        },
        {
          label: `${currentYear + 1} · with actions`,
          data: new Array(12).fill(0),
          borderColor: "#53e5ff",
          backgroundColor: "rgba(83,229,255,0.18)",
          borderWidth: 3,
          tension: 0.35,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: `${currentYear + 2} · no actions`,
          data: new Array(12).fill(0),
          borderColor: "rgba(157,123,255,0.60)",
          backgroundColor: "rgba(157,123,255,0.10)",
          borderWidth: 2.5,
          borderDash: [8, 6],
          tension: 0.35,
          fill: false,
          pointRadius: 2.5,
          pointHoverRadius: 5
        },
        {
          label: `${currentYear + 2} · with actions`,
          data: new Array(12).fill(0),
          borderColor: "#9d7bff",
          backgroundColor: "rgba(157,123,255,0.18)",
          borderWidth: 3,
          tension: 0.35,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#dbe4ff",
            font: { size: 11 },
            boxWidth: 12,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#dbe4ff", font: { size: 11 } },
          grid: { color: "rgba(255,255,255,.06)" }
        },
        y: {
          beginAtZero: true,
          grace: "10%",
          ticks: {
            color: "#dbe4ff",
            font: { size: 11 },
            callback: (value) => formatAxisValue(value)
          },
          grid: { color: "rgba(255,255,255,.06)" }
        }
      }
    }
  });
}

function renderSelectedIndicator(animate) {
  if (!monthlyData || !dashboardState || !roadmapChart) return;

  const projection = buildThreeYearProjectionForIndicator(currentIndicator, dashboardState);
  const indicatorMeta = ROADMAP_INDICATORS[currentIndicator];
  const currentYear = new Date().getFullYear();

  document.getElementById("selectedIndicatorTitle").textContent =
    `${indicatorMeta.label} · 3-year projection`;

  roadmapChart.data.datasets[0].label = `${currentYear} · no actions`;
  roadmapChart.data.datasets[1].label = `${currentYear} · with actions`;
  roadmapChart.data.datasets[2].label = `${currentYear + 1} · no actions`;
  roadmapChart.data.datasets[3].label = `${currentYear + 1} · with actions`;
  roadmapChart.data.datasets[4].label = `${currentYear + 2} · no actions`;
  roadmapChart.data.datasets[5].label = `${currentYear + 2} · with actions`;

  roadmapChart.data.datasets[0].data = projection.year1Base;
  roadmapChart.data.datasets[1].data = projection.year1Reduced;
  roadmapChart.data.datasets[2].data = projection.year2Base;
  roadmapChart.data.datasets[3].data = projection.year2Reduced;
  roadmapChart.data.datasets[4].data = projection.year3Base;
  roadmapChart.data.datasets[5].data = projection.year3Reduced;

  roadmapChart.options.animation.duration = animate ? 1000 : 0;
  roadmapChart.update();

  const total1 = sum(projection.year1Reduced);
  const total2 = sum(projection.year2Reduced);
  const total3 = sum(projection.year3Reduced);
  const reduction = total1 > 0 ? round2(((sum(projection.year1Base) - total3) / sum(projection.year1Base)) * 100) : 0;

  document.getElementById("year1Total").textContent = `${formatNumber(total1)} ${indicatorMeta.unit}`;
  document.getElementById("year2Total").textContent = `${formatNumber(total2)} ${indicatorMeta.unit}`;
  document.getElementById("year3Total").textContent = `${formatNumber(total3)} ${indicatorMeta.unit}`;
  document.getElementById("year3Reduction").textContent = `${reduction}%`;

  document.getElementById("roadmapSummaryText").textContent =
    `${indicatorMeta.label} is displayed with 2 versions for each year: dashed lines show the prediction before reductions, and continuous lines show the same prediction after applying the selected actions from the main dashboard.`;
}

function buildThreeYearProjectionForIndicator(indicatorKey, state) {
  const rawSeries = monthlyData[indicatorKey].monthly.slice();
  const completedBaseSeries = buildCompletedBaseYear(rawSeries, indicatorKey);

  const trendPct = clampPercent(state.trend) / 100;
  const winterPct = clampPercent(state.winterBoost) / 100;
  const summerPct = clampPercent(state.summerBoost) / 100;
  const schoolPct = clampPercent(state.schoolBoost) / 100;
  const variability = Boolean(state.variability);
  const seasonality = Boolean(state.seasonality);

  const selectedReductionTotal = Math.min(
    (state.selectedActions || [])
      .filter(a => a.checked)
      .reduce((sum, a) => sum + Number(a.impact || 0), 0),
    30
  );

  const year1Base = buildPredictedYear(
    completedBaseSeries,
    indicatorKey,
    1,
    trendPct,
    winterPct,
    summerPct,
    schoolPct,
    seasonality,
    variability,
    0
  );

  const year1Reduced = buildPredictedYear(
    completedBaseSeries,
    indicatorKey,
    1,
    trendPct,
    winterPct,
    summerPct,
    schoolPct,
    seasonality,
    variability,
    selectedReductionTotal * 0.40
  );

  const year2Base = buildPredictedYear(
    year1Base,
    indicatorKey,
    2,
    trendPct,
    winterPct,
    summerPct,
    schoolPct,
    seasonality,
    variability,
    0
  );

  const year2Reduced = buildPredictedYear(
    year1Reduced,
    indicatorKey,
    2,
    trendPct,
    winterPct,
    summerPct,
    schoolPct,
    seasonality,
    variability,
    selectedReductionTotal * 0.70
  );

  const year3Base = buildPredictedYear(
    year2Base,
    indicatorKey,
    3,
    trendPct,
    winterPct,
    summerPct,
    schoolPct,
    seasonality,
    variability,
    0
  );

  const year3Reduced = buildPredictedYear(
    year2Reduced,
    indicatorKey,
    3,
    trendPct,
    winterPct,
    summerPct,
    schoolPct,
    seasonality,
    variability,
    selectedReductionTotal * 1.00
  );

  return { year1Base, year1Reduced, year2Base, year2Reduced, year3Base, year3Reduced };
}

function buildCompletedBaseYear(rawSeries, indicatorKey) {
  const filled = new Array(12).fill(0);
  const existing = rawSeries
    .map((value, index) => ({ value: Number(value) || 0, index }))
    .filter(item => item.value > 0);

  if (existing.length === 0) {
    return buildFallbackSeries(indicatorKey);
  }

  const averageExisting = existing.reduce((sum, item) => sum + item.value, 0) / existing.length;

  for (let i = 0; i < 12; i++) {
    if ((Number(rawSeries[i]) || 0) > 0) {
      filled[i] = Number(rawSeries[i]);
      continue;
    }

    const seasonalFactor = getDefaultSeasonFactor(indicatorKey, i);
    const neighbourEstimate = estimateFromNeighbours(rawSeries, i);

    if (neighbourEstimate > 0) {
      filled[i] = neighbourEstimate;
    } else {
      filled[i] = averageExisting * seasonalFactor;
    }
  }

  return smoothSeries(filled);
}

function buildFallbackSeries(indicatorKey) {
  const base = [];
  for (let i = 0; i < 12; i++) {
    base.push(round2(100 * getDefaultSeasonFactor(indicatorKey, i)));
  }
  return smoothSeries(base);
}

function estimateFromNeighbours(series, index) {
  const previous = findNearestValue(series, index, -1);
  const next = findNearestValue(series, index, 1);

  if (previous > 0 && next > 0) return (previous + next) / 2;
  if (previous > 0) return previous;
  if (next > 0) return next;
  return 0;
}

function findNearestValue(series, startIndex, direction) {
  let i = startIndex + direction;
  while (i >= 0 && i < 12) {
    const value = Number(series[i]) || 0;
    if (value > 0) return value;
    i += direction;
  }
  return 0;
}

function getDefaultSeasonFactor(indicatorKey, monthIndex) {
  let factor = 1;

  if ([8, 9, 10, 11, 0, 1, 2, 3, 4, 5].includes(monthIndex)) factor *= 1.08;
  if ([6, 7].includes(monthIndex)) factor *= 0.80;

  if (monthIndex === 7) factor *= 0.12; // August
  if (monthIndex === 11) factor *= 0.50; // December
  if (monthIndex === 3) factor *= 0.60; // April / Easter

  if (indicatorKey === "energy") {
    if ([11, 0, 1].includes(monthIndex)) factor *= 1.15;
    if ([5, 6].includes(monthIndex)) factor *= 0.92;
  }

  if (indicatorKey === "water") {
    if ([5, 6].includes(monthIndex)) factor *= 1.10;
  }

  if (indicatorKey === "office") {
    if ([8, 9, 10, 1, 2, 3, 4].includes(monthIndex)) factor *= 1.10;
    if ([6, 7].includes(monthIndex)) factor *= 0.55;
  }

  if (indicatorKey === "cleaning") {
    if ([8, 9, 10, 1, 2, 3, 4].includes(monthIndex)) factor *= 1.08;
    if ([6, 7].includes(monthIndex)) factor *= 0.65;
  }

  return factor;
}

function smoothSeries(series) {
  const smoothed = [];

  for (let i = 0; i < series.length; i++) {
    const prev = series[(i - 1 + series.length) % series.length];
    const curr = series[i];
    const next = series[(i + 1) % series.length];

    const value = (prev * 0.2) + (curr * 0.6) + (next * 0.2);
    smoothed.push(round2(value));
  }

  return smoothed;
}

function buildPredictedYear(inputSeries, indicatorKey, yearNumber, trendPct, winterPct, summerPct, schoolPct, seasonality, variability, reductionPct) {
  const seed = indicatorKey.charCodeAt(0) + yearNumber * 17;

  const projected = inputSeries.map((baseValue, monthIndex) => {
    let value = Number(baseValue) || 0;

    value *= (1 + trendPct);

    if (seasonality) {
      value *= getInstitutionSeasonalityFactor(indicatorKey, monthIndex, winterPct, summerPct, schoolPct);
    }

    if (variability) {
      const v = pseudoRandomVariation(monthIndex, seed);
      value *= (1 + v);
    }

    value *= (1 - reductionPct / 100);

    return round2(value);
  });

  return smoothSeries(projected);
}

function getInstitutionSeasonalityFactor(indicatorKey, monthIndex, winterPct, summerPct, schoolPct) {
  let factor = 1;

  if ([11, 0, 1].includes(monthIndex)) factor *= (1 + winterPct);
  if ([5, 6, 7].includes(monthIndex)) factor *= (1 + summerPct);
  if ([8, 9, 10, 11, 0, 1, 2, 3, 4, 5].includes(monthIndex)) factor *= (1 + schoolPct);

  if (monthIndex === 7) factor *= 0.10; // August
  if (monthIndex === 11) factor *= 0.45; // December
  if (monthIndex === 3) factor *= 0.55; // April / Easter

  if (indicatorKey === "office") {
    if (monthIndex === 7) factor *= 0.05;
    if (monthIndex === 11) factor *= 0.60;
    if (monthIndex === 3) factor *= 0.65;
  }

  if (indicatorKey === "cleaning") {
    if (monthIndex === 7) factor *= 0.20;
    if (monthIndex === 11) factor *= 0.70;
    if (monthIndex === 3) factor *= 0.70;
  }

  if (indicatorKey === "water") {
    if (monthIndex === 7) factor *= 0.25;
    if (monthIndex === 11) factor *= 0.70;
    if (monthIndex === 3) factor *= 0.70;
  }

  if (indicatorKey === "energy") {
    if (monthIndex === 7) factor *= 0.20;
    if (monthIndex === 11) factor *= 0.65;
    if (monthIndex === 3) factor *= 0.70;
  }

  return factor;
}

function pseudoRandomVariation(index, seed) {
  const raw = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  const frac = raw - Math.floor(raw);
  return (frac - 0.5) * 0.10;
}

function clampPercent(n) {
  n = Number(n || 0);
  if (n > 100) return 100;
  if (n < -100) return -100;
  return n;
}

function sum(arr) {
  return round2(arr.reduce((a, b) => a + b, 0));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

function formatAxisValue(value) {
  const n = Number(value);
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}
