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
      "This diagram predicts the next 3 years using the current JSON data, the dashboard settings and the selected sustainability actions.";
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

  roadmapChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [
        {
          label: "Year 1",
          data: new Array(12).fill(0),
          borderColor: "#5aa7ff",
          backgroundColor: "rgba(90,167,255,.15)",
          borderWidth: 3,
          tension: 0.35,
          fill: false
        },
        {
          label: "Year 2",
          data: new Array(12).fill(0),
          borderColor: "#53e5ff",
          backgroundColor: "rgba(83,229,255,.15)",
          borderWidth: 3,
          tension: 0.35,
          fill: false
        },
        {
          label: "Year 3",
          data: new Array(12).fill(0),
          borderColor: "#9d7bff",
          backgroundColor: "rgba(157,123,255,.15)",
          borderWidth: 3,
          tension: 0.35,
          fill: false
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
            font: { size: 12 }
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

  document.getElementById("selectedIndicatorTitle").textContent =
    `${indicatorMeta.label} · 3-year projection`;

  roadmapChart.data.datasets[0].data = projection.year1;
  roadmapChart.data.datasets[1].data = projection.year2;
  roadmapChart.data.datasets[2].data = projection.year3;

  roadmapChart.options.animation.duration = animate ? 1000 : 0;
  roadmapChart.update();

  const total1 = sum(projection.year1);
  const total2 = sum(projection.year2);
  const total3 = sum(projection.year3);
  const reduction = total1 > 0 ? round2(((total1 - total3) / total1) * 100) : 0;

  document.getElementById("year1Total").textContent = `${formatNumber(total1)} ${indicatorMeta.unit}`;
  document.getElementById("year2Total").textContent = `${formatNumber(total2)} ${indicatorMeta.unit}`;
  document.getElementById("year3Total").textContent = `${formatNumber(total3)} ${indicatorMeta.unit}`;
  document.getElementById("year3Reduction").textContent = `${reduction}%`;

  document.getElementById("roadmapSummaryText").textContent =
    `${indicatorMeta.label} is projected over 3 years. Year 1 uses the current dashboard settings, Year 2 is a prediction based on the same behaviour and partial implementation of selected actions, and Year 3 shows the longer-term prediction with the action package fully consolidated.`;
}

function buildThreeYearProjectionForIndicator(indicatorKey, state) {
  const base = monthlyData[indicatorKey].monthly.slice();
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

  const year1 = buildProjectedYear(base, 1, trendPct, winterPct, summerPct, schoolPct, seasonality, variability, indicatorKey, selectedReductionTotal * 0.4);
  const year2 = buildProjectedYear(year1, 2, trendPct, winterPct, summerPct, schoolPct, seasonality, variability, indicatorKey, selectedReductionTotal * 0.7);
  const year3 = buildProjectedYear(year2, 3, trendPct, winterPct, summerPct, schoolPct, seasonality, variability, indicatorKey, selectedReductionTotal * 1.0);

  return { year1, year2, year3 };
}

function buildProjectedYear(inputSeries, yearNumber, trendPct, winterPct, summerPct, schoolPct, seasonality, variability, indicatorKey, reductionPct) {
  const seed = indicatorKey.charCodeAt(0) + yearNumber * 13;

  return inputSeries.map((baseValue, monthIndex) => {
    let value = Number(baseValue) || 0;

    value *= (1 + trendPct);

    if (seasonality) {
      if ([11,0,1].includes(monthIndex)) value *= (1 + winterPct);
      if ([5,6,7].includes(monthIndex)) value *= (1 + summerPct);
      if ([8,9,10,11,0,1,2,3,4,5].includes(monthIndex)) value *= (1 + schoolPct);
    }

    if (variability) {
      const v = pseudoRandomVariation(monthIndex, seed);
      value *= (1 + v);
    }

    value *= (1 - reductionPct / 100);

    return round2(value);
  });
}

function pseudoRandomVariation(index, seed) {
  const raw = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  const frac = raw - Math.floor(raw);
  return (frac - 0.5) * 0.12;
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