const API_BASE = "https://disease.sh/v3/covid-19"; //API base URL
let covidChart = null;
let dailyTrendChart = null;
let currentCountry = null;

document.addEventListener("DOMContentLoaded", () => {
  loadGlobalData();
  loadGlobalRanking();
  setupEventListeners();
  startRealTimeUpdate();
});

function setupEventListeners() {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  searchBtn.addEventListener("click", searchCountry);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchCountry();
    }
  });
}

async function loadGlobalData() {
  try {
    const response = await fetch(`${API_BASE}/all`);
    const data = await response.json();

    updateStats(data);
    updateLastUpdate(data.updated);
    initChart(data);
    loadHistoricalDailyData("all");
  } catch (error) {
    console.error("Error loading global data:", error);
    showError("Gagal memuat data global");
  }
}

async function loadGlobalRanking() {
  const rankingList = document.getElementById("ranking-list");
  const loader = document.getElementById("ranking-loader");
  rankingList.innerHTML = "";

  if (loader) loader.style.display = "block";

  try {
    const response = await fetch(
      `${API_BASE}/countries?sort=cases&allowNull=false` // Fetch countries sorted by total cases
    );
    const data = await response.json();

    if (loader) loader.style.display = "none";

    if (data && data.length > 0) {
      const topCountries = data.slice(0, 10);

      topCountries.forEach((country, index) => {
        const item = document.createElement("div");
        item.className = "ranking-item";
        item.innerHTML = `
						<span class="rank-number">${index + 1}</span>
						<span class="rank-country">${country.country}</span>
						<span class="rank-cases">${formatNumber(country.cases)}</span>
					`;
        rankingList.appendChild(item);
      });
    }
  } catch (error) {
    console.error("Error loading global ranking:", error);
    if (loader) {
      loader.textContent = "Gagal memuat peringkat global.";
      loader.style.display = "block";
    }
  }
}

async function searchCountry() {
  const searchInput = document.getElementById("searchInput");
  const countryName = searchInput.value.trim();

  if (!countryName) {
    alert("Silakan masukkan nama negara");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/countries/${countryName}`); // Fetch country data

    if (!response.ok) {
      throw new Error("Negara tidak ditemukan");
    }

    const data = await response.json();
    currentCountry = countryName;

    updateStats(data);
    updateCountryInfo(data);
    updateLastUpdate(data.updated);
    updateChart(data);

    loadHistoricalDailyData(countryName);
  } catch (error) {
    console.error("Error searching country:", error);
    alert(
      "Negara tidak ditemukan. Coba gunakan nama dalam bahasa Inggris (contoh: Indonesia, United States, India)"
    );
  }
}

async function loadHistoricalDailyData(country) {
  const loader = document.getElementById("dailyChartLoader");
  const canvas = document.getElementById("dailyTrendChart");

  loader.style.display = "flex";
  canvas.style.display = "none";

  try {
    const endpoint =
      country === "all"
        ? `${API_BASE}/historical/all?lastdays=30` //API endpoint for global historical data
        : `${API_BASE}/historical/${country}?lastdays=30`; //API endpoint for country historical data

    const response = await fetch(endpoint);
    const data = await response.json();

    let casesData;

    if (country === "all") {
      casesData = data.cases;
    } else {
      casesData = data.timeline.cases;
    }

    const dates = Object.keys(casesData);
    const cumulativeCases = Object.values(casesData);
    const dailyNewCases = [];

    for (let i = 1; i < cumulativeCases.length; i++) {
      const dailyDiff = cumulativeCases[i] - cumulativeCases[i - 1];
      dailyNewCases.push(Math.max(0, dailyDiff));
    }

    const dailyDates = dates.slice(1);

    initDailyTrendChart(dailyDates, dailyNewCases);
  } catch (error) {
    console.error("Error loading daily trend data:", error);
    loader.innerHTML =
      '<p style="color: #ef4444;">Gagal memuat data tren harian.</p>';
  } finally {
    loader.style.display = "none";
    canvas.style.display = "block";
  }
}

function initDailyTrendChart(dates, dailyNewCases) {
  const ctx = document.getElementById("dailyTrendChart").getContext("2d");

  const formattedDates = dates.map((date) => {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
  });

  if (dailyTrendChart) {
    dailyTrendChart.destroy();
  }

  dailyTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: formattedDates,
      datasets: [
        {
          label: "Kasus Baru Harian",
          data: dailyNewCases,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 8,
          pointBackgroundColor: "#3b82f6",
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
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: 12,
          titleColor: "#1e293b",
          bodyColor: "#1e293b",
          titleFont: {
            size: 13,
            weight: "bold",
          },
          bodyFont: {
            size: 12,
          },
          cornerRadius: 8,
          displayColors: true,
          borderColor: "rgba(0, 0, 0, 0.1)",
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
            color: "#475569",
            font: {
              size: 11,
            },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
            drawBorder: false,
          },
        },
        x: {
          ticks: {
            color: "#475569",
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

function updateStats(data) {
  const totalCases = data.cases || 0;
  const totalDeaths = data.deaths || 0;
  const totalRecovered = data.recovered || 0;

  const cfr = totalCases > 0 ? (totalDeaths / totalCases) * 100 : 0;
  const recoveryRate = totalCases > 0 ? (totalRecovered / totalCases) * 100 : 0;

  document.getElementById("totalCases").textContent = formatNumber(totalCases);
  document.getElementById("totalDeaths").textContent =
    formatNumber(totalDeaths);
  document.getElementById("totalRecovered").textContent =
    formatNumber(totalRecovered);
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

  document.getElementById("caseFatalityRate").textContent = `${cfr.toFixed(
    2
  )}%`;
  document.getElementById("recoveryRate").textContent = `${recoveryRate.toFixed(
    2
  )}%`;
}

function updateCountryInfo(data) {
  const countryInfo = document.getElementById("countryInfo");
  const countryName = document.getElementById("countryName");
  const countryFlag = document.getElementById("countryFlag");

  countryInfo.classList.remove("hidden");
  countryName.textContent = data.country;
  countryFlag.src = data.countryInfo.flag;
  countryFlag.alt = `${data.country} flag`;
}

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

function initChart(data) {
  const ctx = document.getElementById("covidChart").getContext("2d");

  covidChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Data COVID-19"],
      datasets: [
        {
          label: "Total Kasus",
          data: [data.cases],
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 0,
          borderRadius: 8,
        },
        {
          label: "Kasus Aktif",
          data: [data.active],
          backgroundColor: "rgba(245, 158, 11, 0.8)",
          borderColor: "rgba(245, 158, 11, 1)",
          borderWidth: 0,
          borderRadius: 8,
        },
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
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: 12,
          titleColor: "#1e293b",
          bodyColor: "#1e293b",
          titleFont: {
            size: 13,
            weight: "bold",
          },
          bodyFont: {
            size: 12,
          },
          cornerRadius: 8,
          displayColors: true,
          borderColor: "rgba(0, 0, 0, 0.1)",
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
            color: "#475569",
            font: {
              size: 11,
            },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
            drawBorder: false,
          },
        },
        x: {
          ticks: {
            color: "#475569",
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

function updateChart(data) {
  if (covidChart) {
    covidChart.data.labels = [data.country || "Global"];
    covidChart.data.datasets[0].data = [data.cases];
    covidChart.data.datasets[1].data = [data.active];
    covidChart.data.datasets[2].data = [data.recovered];
    covidChart.data.datasets[3].data = [data.deaths];
    covidChart.update("active");
  }
}

function startRealTimeUpdate() {
  setInterval(async () => {
    if (!currentCountry) {
      loadGlobalData();
      loadGlobalRanking();
    } else {
      try {
        const response = await fetch(`${API_BASE}/countries/${currentCountry}`);
        const data = await response.json();
        updateStats(data);
        updateChart(data);
        updateLastUpdate(data.updated);
        loadHistoricalDailyData(currentCountry);
      } catch (error) {
        console.error("Error updating data:", error);
      }
    }
  }, 300000);
}

function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showError(message) {
  console.error("Dashboard Error:", message);
}
