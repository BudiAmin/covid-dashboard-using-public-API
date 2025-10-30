// API Configuration
const API_BASE = "https://disease.sh/v3/covid-19";
let covidChart = null;
let historicalChart = null;
let currentCountry = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadGlobalData();
  setupEventListeners();
  initializeDatePickers();
  startRealTimeUpdate();
});

// Event Listeners
function setupEventListeners() {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  const updateChartBtn = document.getElementById("updateChartBtn");

  searchBtn.addEventListener("click", searchCountry);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchCountry();
    }
  });

  updateChartBtn.addEventListener("click", updateHistoricalChart);
}

// Initialize Date Pickers
function initializeDatePickers() {
  const endDate = document.getElementById("endDate");
  const startDate = document.getElementById("startDate");

  // Set end date to today
  const today = new Date();
  endDate.value = today.toISOString().split("T")[0];
  endDate.max = today.toISOString().split("T")[0];

  // Set start date to 30 days ago
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  startDate.value = thirtyDaysAgo.toISOString().split("T")[0];
  startDate.max = today.toISOString().split("T")[0];

  // Load initial historical data
  loadHistoricalData("all", 30);
}

// Load Global Data
async function loadGlobalData() {
  try {
    const response = await fetch(`${API_BASE}/all`);
    const data = await response.json();

    updateStats(data);
    updateLastUpdate(data.updated);
    initChart(data);
  } catch (error) {
    console.error("Error loading global data:", error);
    showError("Gagal memuat data global");
  }
}

// Search Country
async function searchCountry() {
  const searchInput = document.getElementById("searchInput");
  const countryName = searchInput.value.trim();

  if (!countryName) {
    alert("Silakan masukkan nama negara");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/countries/${countryName}`);

    if (!response.ok) {
      throw new Error("Negara tidak ditemukan");
    }

    const data = await response.json();
    currentCountry = countryName;

    updateStats(data);
    updateCountryInfo(data);
    updateLastUpdate(data.updated);
    updateChart(data);

    // Update historical chart for selected country
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const days = calculateDaysDifference(startDate, endDate);
    loadHistoricalData(countryName, days);
  } catch (error) {
    console.error("Error searching country:", error);
    alert(
      "Negara tidak ditemukan. Coba gunakan nama dalam bahasa Inggris (contoh: Indonesia, United States, India)"
    );
  }
}

// Calculate Days Difference
function calculateDaysDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 30;
}

// Load Historical Data
async function loadHistoricalData(country, days) {
  const loader = document.getElementById("chartLoader");
  const canvas = document.getElementById("historicalChart");

  loader.classList.remove("hidden");
  canvas.style.display = "none";

  try {
    const endpoint =
      country === "all"
        ? `${API_BASE}/historical/all?lastdays=${days}`
        : `${API_BASE}/historical/${country}?lastdays=${days}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    // Process data
    let cases, deaths, recovered;

    if (country === "all") {
      cases = data.cases;
      deaths = data.deaths;
      recovered = data.recovered;
    } else {
      cases = data.timeline.cases;
      deaths = data.timeline.deaths;
      recovered = data.timeline.recovered;
    }

    initHistoricalChart(cases, deaths, recovered);
  } catch (error) {
    console.error("Error loading historical data:", error);
    alert(
      "Gagal memuat data historis. Pastikan negara yang dipilih memiliki data historis."
    );
  } finally {
    loader.classList.add("hidden");
    canvas.style.display = "block";
  }
}

// Update Historical Chart
function updateHistoricalChart() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!startDate || !endDate) {
    alert("Silakan pilih tanggal mulai dan akhir");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    alert("Tanggal mulai harus lebih kecil dari tanggal akhir");
    return;
  }

  const days = calculateDaysDifference(startDate, endDate);
  const country = currentCountry || "all";

  loadHistoricalData(country, days);
}

// Initialize Historical Chart
function initHistoricalChart(casesData, deathsData, recoveredData) {
  const ctx = document.getElementById("historicalChart").getContext("2d");

  const dates = Object.keys(casesData);
  const cases = Object.values(casesData);
  const deaths = Object.values(deathsData);
  const recovered = Object.values(recoveredData);

  // Format dates
  const formattedDates = dates.map((date) => {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
  });

  if (historicalChart) {
    historicalChart.destroy();
  }

  historicalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: formattedDates,
      datasets: [
        {
          label: "Kasus",
          data: cases,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#3b82f6",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
        {
          label: "Meninggal",
          data: deaths,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#ef4444",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
        {
          label: "Sembuh",
          data: recovered,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10b981",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 12,
          titleColor: "#e2e8f0",
          bodyColor: "#e2e8f0",
          titleFont: {
            size: 13,
            weight: "bold",
          },
          bodyFont: {
            size: 12,
          },
          cornerRadius: 8,
          displayColors: true,
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatNumber(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatNumber(value);
            },
            color: "#64748b",
            font: {
              size: 11,
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
            drawBorder: false,
          },
        },
        x: {
          ticks: {
            color: "#64748b",
            font: {
              size: 11,
            },
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            display: false,
          },
        },
      },
      animation: {
        duration: 750,
        easing: "easeInOutQuart",
      },
    },
  });
}

// Update Statistics
function updateStats(data) {
  document.getElementById("totalCases").textContent = formatNumber(data.cases);
  document.getElementById("totalDeaths").textContent = formatNumber(
    data.deaths
  );
  document.getElementById("totalRecovered").textContent = formatNumber(
    data.recovered
  );
  document.getElementById("activeCases").textContent = formatNumber(
    data.active
  );

  document.getElementById(
    "todayCases"
  ).textContent = `Hari ini: +${formatNumber(data.todayCases)}`;
  document.getElementById(
    "todayDeaths"
  ).textContent = `Hari ini: +${formatNumber(data.todayDeaths)}`;
  document.getElementById(
    "todayRecovered"
  ).textContent = `Hari ini: +${formatNumber(data.todayRecovered)}`;
  document.getElementById("critical").textContent = `Kritis: ${formatNumber(
    data.critical
  )}`;
}

// Update Country Info
function updateCountryInfo(data) {
  const countryInfo = document.getElementById("countryInfo");
  const countryName = document.getElementById("countryName");
  const countryFlag = document.getElementById("countryFlag");

  countryInfo.classList.remove("hidden");
  countryName.textContent = data.country;
  countryFlag.src = data.countryInfo.flag;
  countryFlag.alt = `${data.country} flag`;
}

// Update Last Update
function updateLastUpdate(timestamp) {
  const date = new Date(timestamp);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  document.getElementById(
    "lastUpdate"
  ).textContent = `Terakhir diperbarui: ${date.toLocaleDateString(
    "id-ID",
    options
  )}`;
}

// Initialize Chart
function initChart(data) {
  const ctx = document.getElementById("covidChart").getContext("2d");

  covidChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Data COVID-19"],
      datasets: [
        {
          label: "Sembuh",
          data: [data.recovered],
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 0,
          borderRadius: 8,
        },
        {
          label: "Meninggal",
          data: [data.deaths],
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 0,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 12,
          titleColor: "#e2e8f0",
          bodyColor: "#e2e8f0",
          titleFont: {
            size: 13,
            weight: "bold",
          },
          bodyFont: {
            size: 12,
          },
          cornerRadius: 8,
          displayColors: true,
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatNumber(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatNumber(value);
            },
            color: "#64748b",
            font: {
              size: 11,
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
            drawBorder: false,
          },
        },
        x: {
          ticks: {
            color: "#64748b",
            font: {
              size: 12,
              weight: "bold",
            },
          },
          grid: {
            display: false,
          },
        },
      },
      animation: {
        duration: 750,
        easing: "easeInOutQuart",
      },
    },
  });
}

// Update Chart
function updateChart(data) {
  if (covidChart) {
    covidChart.data.labels = [data.country || "Global"];
    covidChart.data.datasets[0].data = [data.recovered];
    covidChart.data.datasets[1].data = [data.deaths];
    covidChart.update("active");
  }
}

// Real-time Update (every 5 minutes)
function startRealTimeUpdate() {
  setInterval(async () => {
    if (currentCountry) {
      try {
        const response = await fetch(`${API_BASE}/countries/${currentCountry}`);
        const data = await response.json();
        updateStats(data);
        updateChart(data);
        updateLastUpdate(data.updated);
      } catch (error) {
        console.error("Error updating data:", error);
      }
    } else {
      loadGlobalData();
    }
  }, 300000); // 5 minutes
}

// Helper: Format Number
function formatNumber(num) {
  if (num === undefined || num === null) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Helper: Show Error
function showError(message) {
  alert(message);
}
