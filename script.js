import { cities } from './citys.js';

const API_KEY = '65186e2b65ebe57833a77ec14b1ac47e'; 
const API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

const map = L.map('map').setView([55.75, 37.61], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const charts = {
    temp: null,
    precip: null,
    wind: null
};

cities.forEach(city => {
    const marker = L.marker([city.lat, city.lon]).addTo(map);
    marker.bindPopup(`<b>${city.name}</b><br>Население: ${city.population}<br><small>Нажмите для прогноза</small>`);
    marker.on('click', () => fetchAndShowWeather(city));
});

document.getElementById('search-btn').addEventListener('click', handleSearch);
document.getElementById('city-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
    const cityName = document.getElementById('city-search').value.trim();
    if (!cityName) return;
    
    const found = cities.find(c => 
        c.name.toLowerCase().includes(cityName.toLowerCase())
    );
    
    if (found) {
        map.flyTo([found.lat, found.lon], 10);
        fetchAndShowWeather(found);
    } else {
        alert('Город не найден в списке. Попробуйте "Москва" или "Санкт-Петербург".');
    }
}

const modal = document.getElementById('weather-modal');
const closeBtn = document.querySelector('.close-btn');

closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    destroyCharts();
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        destroyCharts();
    }
});

function destroyCharts() {
    Object.values(charts).forEach(chart => chart?.destroy());
}

async function fetchAndShowWeather(city) {
    const loader = document.getElementById('loader');
    const cityNameEl = document.getElementById('modal-city-name');

    console.log('Загрузка погоды для города:', city.name, city.lat, city.lon);

    cityNameEl.textContent = city.name;
    modal.classList.remove('hidden');
    if (loader) loader.classList.add('active');
    destroyCharts();

    try {
        const apiUrl = `${API_URL}?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric&lang=ru`;
        console.log('Запрос к API:', apiUrl);

        const response = await fetch(apiUrl);

        console.log('Статус ответа:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка API:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Полученные данные:', data);

        if (!data.list || data.list.length === 0) {
            throw new Error('Нет данных прогноза');
        }

        if (loader) loader.classList.remove('active');
        renderCharts(city.name, data.list);

    } catch (error) {
        console.error('Ошибка загрузки погоды:', error);
        if (loader) loader.classList.remove('active');
        alert('Не удалось загрузить прогноз. Проверьте интернет или ключ API.\nОшибка: ' + error.message);
        modal.classList.add('hidden');
    }
}

function renderCharts(cityName, weatherData) {
    const labels = weatherData.map(item => {
        const date = new Date(item.dt * 1000);
        return `${date.getDate()}.${date.getMonth()+1} ${String(date.getHours()).padStart(2,'0')}:00`;
    });

    const temps = weatherData.map(item => item.main.temp);
    charts.temp = createChart('temp-chart', 'Температура (°C)', temps, labels, 'rgb(255, 99, 132)');

    const precip = weatherData.map(item => item.pop ? item.pop * 100 : 0); // вероятность в %
    charts.precip = createChart('precip-chart', 'Осадки (вероятность, %)', precip, labels, 'rgb(54, 162, 235)');

    const wind = weatherData.map(item => item.wind.speed);
    charts.wind = createChart('wind-chart', 'Ветер (м/с)', wind, labels, 'rgb(75, 192, 192)');
}

function createChart(canvasId, label, data, labels, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: color + '20', // прозрачный фон
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
                    beginAtZero: label.includes('Осадки') || label.includes('Ветер'),
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}