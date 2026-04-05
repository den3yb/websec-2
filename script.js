import { cities } from './citys.js';

const WEATHER_API_KEY = '65186e2b65ebe57833a77ec14b1ac47e';
const FORECAST_ENDPOINT = 'https://api.openweathermap.org/data/2.5/forecast';

const weatherMap = L.map('mapContainer').setView([55.75, 37.61], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(weatherMap);

const chartInstances = {
  temp: null,
  precip: null,
  wind: null
};

cities.forEach(cityData => {
  const mapMarker = L.marker([cityData.lat, cityData.lon]).addTo(weatherMap);
  mapMarker.bindPopup(`<b>${cityData.name}</b><br>Население: ${cityData.population}<br><small>Нажмите для прогноза</small>`);
  mapMarker.on('click', () => loadWeatherData(cityData));
});

document.getElementById('findBtn').addEventListener('click', processSearch);
document.getElementById('cityInput').addEventListener('keypress', (evt) => {
  if (evt.key === 'Enter') processSearch();
});

function processSearch() {
  const query = document.getElementById('cityInput').value.trim();
  if (!query) return;

  const match = cities.find(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  if (match) {
    weatherMap.flyTo([match.lat, match.lon], 10);
    loadWeatherData(match);
  } else {
    alert('Город не найден в списке. Попробуйте "Москва" или "Санкт-Петербург".');
  }
}

const modalEl = document.getElementById('weatherModal');
const closeIcon = document.querySelector('.closeIcon');

closeIcon.addEventListener('click', () => {
  modalEl.classList.add('hidden');
  cleanupCharts();
});

modalEl.addEventListener('click', (evt) => {
  if (evt.target === modalEl) {
    modalEl.classList.add('hidden');
    cleanupCharts();
  }
});

function cleanupCharts() {
  Object.values(chartInstances).forEach(chart => chart?.destroy());
}

async function loadWeatherData(cityData) {
  const loadingEl = document.getElementById('loadingIndicator');
  const titleEl = document.getElementById('modalTitle');

  titleEl.textContent = cityData.name;
  modalEl.classList.remove('hidden');
  if (loadingEl) loadingEl.classList.add('active');
  cleanupCharts();

  try {
    const requestUrl = `${FORECAST_ENDPOINT}?lat=${cityData.lat}&lon=${cityData.lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ru`;
    const response = await fetch(requestUrl);

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorDetails}`);
    }

    const forecastData = await response.json();

    if (!forecastData.list || forecastData.list.length === 0) {
      throw new Error('Нет данных прогноза');
    }

    if (loadingEl) loadingEl.classList.remove('active');
    drawCharts(cityData.name, forecastData.list);

  } catch (err) {
    if (loadingEl) loadingEl.classList.remove('active');
    alert('Не удалось загрузить прогноз. Проверьте интернет или ключ API.\nОшибка: ' + err.message);
    modalEl.classList.add('hidden');
  }
}

function drawCharts(cityName, forecastList) {
  const timeLabels = forecastList.map(item => {
    const dt = new Date(item.dt * 1000);
    return `${dt.getDate()}.${dt.getMonth()+1} ${String(dt.getHours()).padStart(2,'0')}:00`;
  });

  const tempValues = forecastList.map(item => item.main.temp);
  chartInstances.temp = buildChart('chartTemp', 'Температура (°C)', tempValues, timeLabels, 'rgb(255, 99, 132)');

  const precipValues = forecastList.map(item => item.pop ? item.pop * 100 : 0);
  chartInstances.precip = buildChart('chartPrecip', 'Осадки (вероятность, %)', precipValues, timeLabels, 'rgb(54, 162, 235)');

  const windValues = forecastList.map(item => item.wind.speed);
  chartInstances.wind = buildChart('chartWind', 'Ветер (м/с)', windValues, timeLabels, 'rgb(75, 192, 192)');
}

function buildChart(canvasId, labelText, dataValues, labels, strokeColor) {
  const context = document.getElementById(canvasId).getContext('2d');
  return new Chart(context, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: labelText,
        data: dataValues,
        borderColor: strokeColor,
        backgroundColor: strokeColor + '20',
        tension: 0.3,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: labelText.includes('Осадки') || labelText.includes('Ветер'),
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      },
      plugins: {
        legend: { display: true, position: 'top'},
        tooltip: { mode: 'index', intersect: false }
      }
    }
  });
}