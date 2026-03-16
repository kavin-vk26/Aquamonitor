let currentMode = 'manual';
let currentLocation = { latitude: 11.0168, longitude: 76.9558 };
let allChartData = null;
let charts = [null, null, null, null];
let lastPrediction = null;

const speciesThresholds = {
    general: { tempMin: 20, tempMax: 28, doMin: 5, doMax: 12, phMin: 6.5, phMax: 8.5 },
    tilapia: { tempMin: 25, tempMax: 32, doMin: 3, doMax: 15, phMin: 6, phMax: 9 },
    catfish: { tempMin: 24, tempMax: 30, doMin: 4, doMax: 12, phMin: 6.5, phMax: 8.5 },
    salmon: { tempMin: 10, tempMax: 18, doMin: 7, doMax: 14, phMin: 6.5, phMax: 8 },
    trout: { tempMin: 10, tempMax: 16, doMin: 7, doMax: 14, phMin: 6.5, phMax: 8 },
    carp: { tempMin: 20, tempMax: 28, doMin: 4, doMax: 12, phMin: 6.5, phMax: 9 },
    shrimp: { tempMin: 26, tempMax: 32, doMin: 4, doMax: 10, phMin: 7, phMax: 8.5 },
    prawn: { tempMin: 26, tempMax: 31, doMin: 4, doMax: 10, phMin: 7, phMax: 8.5 }
};

const indianCities = [
    { name: "Thiruvananthapuram, Kerala (Coastal)", lat: 8.5241, lon: 76.9366 },
    { name: "Kochi, Kerala (Coastal)", lat: 9.9312, lon: 76.2673 },
    { name: "Kozhikode, Kerala (Coastal)", lat: 11.2588, lon: 75.7804 },
    { name: "Alappuzha, Kerala (Coastal)", lat: 9.4981, lon: 76.3388 },
    { name: "Kollam, Kerala (Coastal)", lat: 8.8932, lon: 76.6141 },
    { name: "Kannur, Kerala (Coastal)", lat: 11.8745, lon: 75.3704 },
    { name: "Kasaragod, Kerala (Coastal)", lat: 12.4996, lon: 74.9869 },
    { name: "Thrissur, Kerala", lat: 10.5276, lon: 76.2144 },
    { name: "Palakkad, Kerala", lat: 10.7867, lon: 76.6548 },
    { name: "Malappuram, Kerala", lat: 11.0510, lon: 76.0711 },
    { name: "Kottayam, Kerala", lat: 9.5916, lon: 76.5222 },
    { name: "Chennai, Tamil Nadu (Coastal)", lat: 13.0827, lon: 80.2707 },
    { name: "Kanyakumari, Tamil Nadu (Coastal)", lat: 8.0883, lon: 77.5385 },
    { name: "Tuticorin, Tamil Nadu (Coastal)", lat: 8.7642, lon: 78.1348 },
    { name: "Rameswaram, Tamil Nadu (Coastal)", lat: 9.2876, lon: 79.3129 },
    { name: "Nagapattinam, Tamil Nadu (Coastal)", lat: 10.7672, lon: 79.8449 },
    { name: "Pondicherry (Coastal)", lat: 11.9416, lon: 79.8083 },
    { name: "Coimbatore, Tamil Nadu", lat: 11.0168, lon: 76.9558 },
    { name: "Madurai, Tamil Nadu", lat: 9.9252, lon: 78.1198 },
    { name: "Tiruchirappalli, Tamil Nadu", lat: 10.7905, lon: 78.7047 },
    { name: "Salem, Tamil Nadu", lat: 11.6643, lon: 78.1460 },
    { name: "Mangalore, Karnataka (Coastal)", lat: 12.9141, lon: 74.8560 },
    { name: "Udupi, Karnataka (Coastal)", lat: 13.3409, lon: 74.7421 },
    { name: "Bangalore, Karnataka", lat: 12.9716, lon: 77.5946 },
    { name: "Mumbai, Maharashtra (Coastal)", lat: 19.0760, lon: 72.8777 },
    { name: "Pune, Maharashtra", lat: 18.5204, lon: 73.8567 },
    { name: "Panaji, Goa (Coastal)", lat: 15.4909, lon: 73.8278 },
    { name: "Surat, Gujarat (Coastal)", lat: 21.1702, lon: 72.8311 },
    { name: "Ahmedabad, Gujarat", lat: 23.0225, lon: 72.5714 },
    { name: "Visakhapatnam, Andhra Pradesh (Coastal)", lat: 17.6868, lon: 83.2185 },
    { name: "Hyderabad, Telangana", lat: 17.3850, lon: 78.4867 },
    { name: "Bhubaneswar, Odisha (Coastal)", lat: 20.2961, lon: 85.8245 },
    { name: "Kolkata, West Bengal (Coastal)", lat: 22.5726, lon: 88.3639 },
    { name: "New Delhi, Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Jaipur, Rajasthan", lat: 26.9124, lon: 75.7873 },
    { name: "Lucknow, Uttar Pradesh", lat: 26.8467, lon: 80.9462 },
    { name: "Patna, Bihar", lat: 25.5941, lon: 85.1376 },
    { name: "Guwahati, Assam", lat: 26.1445, lon: 91.7362 },
    { name: "Port Blair, Andaman (Coastal)", lat: 11.6234, lon: 92.7265 }
];

function saveState() {
    try {
        sessionStorage.setItem('aq_location', JSON.stringify(currentLocation));
        sessionStorage.setItem('aq_mode', currentMode);
        const speciesSelect = document.getElementById('species-select');
        if (speciesSelect) sessionStorage.setItem('aq_species', speciesSelect.value);
        if (allChartData) sessionStorage.setItem('aq_data', JSON.stringify(allChartData));
        if (lastPrediction) sessionStorage.setItem('aq_prediction', JSON.stringify(lastPrediction));
    } catch (e) { console.error('Save state error:', e); }
}

function loadSavedState() {
    try {
        const savedLocation = sessionStorage.getItem('aq_location');
        const savedData = sessionStorage.getItem('aq_data');
        const savedPrediction = sessionStorage.getItem('aq_prediction');
        const savedMode = sessionStorage.getItem('aq_mode');
        const savedSpecies = sessionStorage.getItem('aq_species');
        if (savedLocation) currentLocation = JSON.parse(savedLocation);
        if (savedData) allChartData = JSON.parse(savedData);
        if (savedMode) currentMode = savedMode;
        if (savedSpecies) {
            const speciesSelect = document.getElementById('species-select');
            if (speciesSelect) speciesSelect.value = savedSpecies;
        }
        if (savedPrediction) {
            lastPrediction = JSON.parse(savedPrediction);
            setTimeout(() => restorePredictionUI(lastPrediction), 100);
        }
        if (savedMode) switchMode(savedMode);
    } catch (e) { console.error('Load state error:', e); }
}

function restorePredictionUI(data) {
    const scoreValue = document.getElementById('scoreValue');
    if (!scoreValue) return;
    document.getElementById('scoreValue').textContent = data.quality_score;
    document.getElementById('scoreLabel').textContent = data.quality_level;
    document.getElementById('timestamp').textContent = 'Updated: ' + data.timestamp;
    document.getElementById('scoreDisplay').style.background = data.color;
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recList.appendChild(li);
    });
    if (data.predicted_values) {
        document.getElementById('predictionTime').textContent = 'Prediction for: ' + data.prediction_time;
        document.getElementById('predTemp').textContent = data.predicted_values.water_temp + ' °C';
        document.getElementById('predDO').textContent = data.predicted_values.do + ' mg/L';
        document.getElementById('predPH').textContent = data.predicted_values.ph;
        const risk = calculateFishHealthRisk(data.predicted_values.water_temp, data.predicted_values.do, data.predicted_values.ph);
        document.getElementById('riskDisplay').className = 'risk-display ' + risk.class;
        document.getElementById('riskLevel').textContent = risk.level;
        document.getElementById('riskMessage').textContent = risk.message;
    }
}

function calculateFishHealthRisk(temp, do_val, ph) {
    const speciesSelect = document.getElementById('species-select');
    const species = speciesSelect ? speciesSelect.value : 'general';
    const thresholds = speciesThresholds[species];
    let riskLevel = 'LOW', riskClass = 'risk-low', messages = [];
    if (do_val < thresholds.doMin) {
        riskLevel = 'HIGH'; riskClass = 'risk-high';
        messages.push(`Critical: DO (${do_val} mg/L) below ${thresholds.doMin} mg/L for ${species}.`);
    }
    if (ph < thresholds.phMin || ph > thresholds.phMax) {
        if (riskLevel !== 'HIGH') { riskLevel = 'MODERATE'; riskClass = 'risk-moderate'; }
        messages.push(`Warning: pH (${ph}) outside ${thresholds.phMin}-${thresholds.phMax} for ${species}.`);
    }
    if (temp < thresholds.tempMin || temp > thresholds.tempMax) {
        if (riskLevel !== 'HIGH') { riskLevel = 'MODERATE'; riskClass = 'risk-moderate'; }
        messages.push(`Warning: Temp (${temp}°C) outside ${thresholds.tempMin}-${thresholds.tempMax}°C for ${species}.`);
    }
    if (messages.length === 0) messages.push(`All parameters optimal for ${species}.`);
    return { level: riskLevel, class: riskClass, message: messages.join(' ') };
}

function switchMode(mode) {
    currentMode = mode;
    const formMap = { manual: 'predictionForm', location: 'locationForm', preset: 'presetForm' };
    const btnMap = { manual: 'manualBtn', location: 'locationBtn', preset: 'presetBtn' };
    Object.keys(formMap).forEach(m => {
        const btn = document.getElementById(btnMap[m]);
        const form = document.getElementById(formMap[m]);
        if (btn) btn.classList.toggle('active', m === mode);
        if (form) form.style.display = m === mode ? 'block' : 'none';
    });
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('latitude').value = pos.coords.latitude.toFixed(5);
                document.getElementById('longitude').value = pos.coords.longitude.toFixed(5);
            },
            err => alert('Unable to get location: ' + err.message)
        );
    } else alert('Geolocation not supported.');
}

function filterLocations() {
    const searchText = document.getElementById('locationSearch').value.toLowerCase();
    const dropdown = document.getElementById('locationDropdown');
    if (!searchText) { dropdown.classList.remove('show'); return; }
    const filtered = indianCities.filter(c => c.name.toLowerCase().includes(searchText));
    if (!filtered.length) {
        dropdown.innerHTML = '<div class="location-item">No locations found</div>';
    } else {
        dropdown.innerHTML = filtered.map(c =>
            `<div class="location-item" onclick="selectLocation('${c.name}',${c.lat},${c.lon})">${c.name}</div>`
        ).join('');
    }
    dropdown.classList.add('show');
}

function selectLocation(name, lat, lon) {
    document.getElementById('locationSearch').value = name;
    document.getElementById('selectedLat').value = lat;
    document.getElementById('selectedLon').value = lon;
    document.getElementById('presetCoords').textContent = `Lat: ${lat}, Lon: ${lon}`;
    document.getElementById('locationDropdown').classList.remove('show');
}

document.addEventListener('click', function(e) {
    const search = document.getElementById('locationSearch');
    const dropdown = document.getElementById('locationDropdown');
    if (search && dropdown && !search.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

function applyCommonDateRange() {
    const fromDate = document.getElementById('commonFromDate').value;
    const toDate = document.getElementById('commonToDate').value;
    if (!fromDate || !toDate) { alert('Please select both From and To dates'); return; }
    if (new Date(fromDate) > new Date(toDate)) { alert('From date cannot be later than To date'); return; }
    for (let i = 1; i <= 4; i++) {
        const f = document.getElementById(`fromDate${i}`);
        const t = document.getElementById(`toDate${i}`);
        if (f && t) { f.value = fromDate; t.value = toDate; }
    }
    if (!allChartData || !allChartData.length) {
        loadHistoricalData(currentLocation.latitude || 11.0168, currentLocation.longitude || 76.9558);
    } else {
        // Check if requested range is outside fetched data range
        const fetchedDates = allChartData.map(r => new Date(r.datetime));
        const fetchedMin = new Date(Math.min(...fetchedDates));
        const fetchedMax = new Date(Math.max(...fetchedDates));
        const reqFrom = new Date(fromDate);
        const reqTo = new Date(toDate);
        if (reqFrom < fetchedMin || reqTo > fetchedMax) {
            loadHistoricalData(currentLocation.latitude || 11.0168, currentLocation.longitude || 76.9558);
        } else {
            for (let i = 1; i <= 4; i++) updateChart(i);
        }
    }
}
window.applyCommonDateRange = applyCommonDateRange;

function refreshChartsData() {
    const btn = document.querySelector('button[onclick="refreshChartsData()"]');
    if (btn) { btn.disabled = true; btn.textContent = '🔄 Loading...'; }
    loadHistoricalData(currentLocation.latitude || 11.0168, currentLocation.longitude || 76.9558)
        .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = '🔄 Refresh Chart Data'; }
        });
}
window.refreshChartsData = refreshChartsData;

function resetChartDateRange(chartNum) {
    const today = new Date();
    const f = document.getElementById(`fromDate${chartNum}`);
    const t = document.getElementById(`toDate${chartNum}`);
    if (f && t) {
        f.value = new Date(today - 30*24*60*60*1000).toISOString().split('T')[0];
        t.value = today.toISOString().split('T')[0];
        updateChart(chartNum);
    }
}
window.resetChartDateRange = resetChartDateRange;

function initializeDateInputs() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minDate = '2000-01-01';
    for (let i = 1; i <= 4; i++) {
        const f = document.getElementById(`fromDate${i}`);
        const t = document.getElementById(`toDate${i}`);
        if (f && t) { f.value = fiveYearsAgo; f.min = minDate; f.max = todayStr; t.value = todayStr; t.min = minDate; t.max = todayStr; }
    }
    ['csvFromDate','commonFromDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = fiveYearsAgo; el.min = minDate; el.max = todayStr; }
    });
    ['csvToDate','commonToDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = todayStr; el.min = minDate; el.max = todayStr; }
    });
}

async function loadHistoricalData(lat, lon) {
    const latitude = lat || currentLocation.latitude || 11.0168;
    const longitude = lon || currentLocation.longitude || 76.9558;
    const startDate = document.getElementById('commonFromDate')?.value || '';
    const endDate = document.getElementById('commonToDate')?.value || '';
    try {
        const res = await fetch(`/api/fetch-data?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}`);
        const csvData = await res.json();
        if (csvData.error) { alert('Error loading data: ' + csvData.error); return; }
        if (csvData.data && csvData.data.length > 0) {
            allChartData = csvData.data;
            saveState();
            const tbody = document.getElementById('dataTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                csvData.data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${row.datetime}</td><td>${row.air_temp}</td><td>${row.humidity}</td><td>${row.rain}</td><td>${row.water_temp}</td><td>${row.do}</td><td>${row.ph}</td>`;
                    tbody.appendChild(tr);
                });
            }
            window.csvData = csvData.csv;
            // Sync per-chart date inputs with the common date range
            const syncFrom = document.getElementById('commonFromDate')?.value;
            const syncTo = document.getElementById('commonToDate')?.value;
            for (let i = 1; i <= 4; i++) {
                const f = document.getElementById(`fromDate${i}`);
                const t = document.getElementById(`toDate${i}`);
                if (f && t && syncFrom && syncTo) { f.value = syncFrom; t.value = syncTo; }
            }
            setTimeout(() => { for (let i = 1; i <= 4; i++) updateChart(i); }, 100);
        } else {
            alert('No data available for this location.');
        }
    } catch (err) {
        alert('Failed to load data: ' + err.message);
    }
}

function updateChart(chartNum) {
    if (!allChartData || !allChartData.length) return;

    const fromInput = document.getElementById(`fromDate${chartNum}`);
    const toInput = document.getElementById(`toDate${chartNum}`);
    const canvas = document.getElementById(`chart${chartNum}`);
    if (!canvas) return;

    let filtered = [...allChartData];
    if (fromInput && toInput && fromInput.value && toInput.value) {
        const from = new Date(fromInput.value + 'T00:00:00');
        const to = new Date(toInput.value + 'T23:59:59');
        filtered = allChartData.filter(r => {
            const d = new Date(r.datetime);
            return d >= from && d <= to;
        });
    }
    if (!filtered.length) { console.warn(`No data for chart ${chartNum} in selected range`); return; }

    const first = new Date(filtered[0].datetime);
    const last = new Date(filtered[filtered.length - 1].datetime);
    const days = (last - first) / 86400000;
    const rate = days <= 1 ? 1 : days <= 3 ? 2 : days <= 7 ? 4 : days <= 30 ? 8 : days <= 90 ? 24 : 48;
    const sampled = filtered.filter((_, i) => i % rate === 0);

    const labels = sampled.map(r => {
        const d = new Date(r.datetime);
        if (days <= 1) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (days <= 7) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    });

    if (charts[chartNum - 1]) { charts[chartNum - 1].destroy(); charts[chartNum - 1] = null; }

    const speciesSelect = document.getElementById('species-select');
    const species = speciesSelect ? speciesSelect.value : 'general';
    const th = speciesThresholds[species];

    if (chartNum === 1) {
        charts[0] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Water Temp (°C)', data: sampled.map(r => r.water_temp), borderColor: '#FF6384', backgroundColor: 'rgba(255,99,132,0.1)', yAxisID: 'y', tension: 0.4, pointRadius: 0 },
                    { label: 'DO (mg/L)', data: sampled.map(r => r.do), borderColor: '#36A2EB', backgroundColor: 'rgba(54,162,235,0.1)', yAxisID: 'y1', tension: 0.4, pointRadius: 0 },
                    { label: 'pH', data: sampled.map(r => r.ph), borderColor: '#FFCE56', backgroundColor: 'rgba(255,206,86,0.1)', yAxisID: 'y2', tension: 0.4, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
                    y: { position: 'left', title: { display: true, text: 'Temp (°C)' } },
                    y1: { position: 'right', title: { display: true, text: 'DO (mg/L)' }, grid: { drawOnChartArea: false } },
                    y2: { position: 'right', title: { display: true, text: 'pH' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    } else {
        const cfgs = [null,
            { label: 'Water Temp (°C)', data: sampled.map(r => r.water_temp), color: '#FF6384', bg: 'rgba(255,99,132,0.1)', axis: 'Temp (°C)', min: th.tempMin, max: th.tempMax },
            { label: 'DO (mg/L)', data: sampled.map(r => r.do), color: '#36A2EB', bg: 'rgba(54,162,235,0.1)', axis: 'DO (mg/L)', min: th.doMin, max: th.doMax },
            { label: 'pH', data: sampled.map(r => r.ph), color: '#FFCE56', bg: 'rgba(255,206,86,0.1)', axis: 'pH', min: th.phMin, max: th.phMax }
        ];
        const c = cfgs[chartNum - 1];
        charts[chartNum - 1] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{ label: c.label, data: c.data, borderColor: c.color, backgroundColor: c.bg, tension: 0.4, fill: true, pointRadius: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
                    y: {
                        title: { display: true, text: c.axis },
                        suggestedMin: Math.min(...c.data) - (chartNum === 4 ? 0.5 : 1),
                        suggestedMax: Math.max(...c.data) + (chartNum === 4 ? 0.5 : 1)
                    }
                }
            }
        });
    }
}

async function handlePredictionResponse(data) {
    if (data.error) { alert('Error: ' + data.error); return; }
    lastPrediction = data;
    saveState();
    document.getElementById('scoreValue').textContent = data.quality_score;
    document.getElementById('scoreLabel').textContent = data.quality_level;
    document.getElementById('timestamp').textContent = 'Updated: ' + data.timestamp;
    document.getElementById('scoreDisplay').style.background = data.color;
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li'); li.textContent = rec; recList.appendChild(li);
    });
    if (data.predicted_values) {
        document.getElementById('predictionTime').textContent = 'Prediction for: ' + data.prediction_time;
        document.getElementById('predTemp').textContent = data.predicted_values.water_temp + ' °C';
        document.getElementById('predDO').textContent = data.predicted_values.do + ' mg/L';
        document.getElementById('predPH').textContent = data.predicted_values.ph;
        const risk = calculateFishHealthRisk(data.predicted_values.water_temp, data.predicted_values.do, data.predicted_values.ph);
        document.getElementById('riskDisplay').className = 'risk-display ' + risk.class;
        document.getElementById('riskLevel').textContent = risk.level;
        document.getElementById('riskMessage').textContent = risk.message;
    }
}

window.addEventListener('load', () => {
    loadSavedState();
    initializeDateInputs();

    // Attach prediction form listeners only if they exist
    const predForm = document.getElementById('predictionForm');
    if (predForm) {
        predForm.addEventListener('submit', async e => {
            e.preventDefault();
            document.getElementById('loading').style.display = 'flex';
            try {
                const res = await fetch('/api/predict', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        temperature: parseFloat(document.getElementById('temperature').value),
                        dissolved_oxygen: parseFloat(document.getElementById('dissolved_oxygen').value),
                        ph: parseFloat(document.getElementById('ph').value),
                        species: document.getElementById('species-select').value
                    })
                });
                await handlePredictionResponse(await res.json());
                await loadHistoricalData(currentLocation.latitude, currentLocation.longitude);
            } catch (err) { alert('Error: ' + err.message); }
            finally { document.getElementById('loading').style.display = 'none'; }
        });
    }

    const locForm = document.getElementById('locationForm');
    if (locForm) {
        locForm.addEventListener('submit', async e => {
            e.preventDefault();
            const lat = parseFloat(document.getElementById('latitude').value);
            const lon = parseFloat(document.getElementById('longitude').value);
            if (!lat || !lon) { alert('Please enter valid latitude and longitude.'); return; }
            currentLocation = { latitude: lat, longitude: lon };
            saveState();
            document.getElementById('loading').style.display = 'flex';
            try {
                const res = await fetch('/api/predict', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude: lat, longitude: lon, species: document.getElementById('species-select').value })
                });
                await handlePredictionResponse(await res.json());
                await loadHistoricalData(lat, lon);
            } catch (err) { alert('Error: ' + err.message); }
            finally { document.getElementById('loading').style.display = 'none'; }
        });
    }

    const presetForm = document.getElementById('presetForm');
    if (presetForm) {
        presetForm.addEventListener('submit', async e => {
            e.preventDefault();
            const lat = parseFloat(document.getElementById('selectedLat').value);
            const lon = parseFloat(document.getElementById('selectedLon').value);
            if (!lat || !lon) { alert('Please select a location from the dropdown'); return; }
            currentLocation = { latitude: lat, longitude: lon };
            saveState();
            document.getElementById('loading').style.display = 'flex';
            try {
                const res = await fetch('/api/predict', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude: lat, longitude: lon, species: document.getElementById('species-select').value })
                });
                await handlePredictionResponse(await res.json());
                await loadHistoricalData(lat, lon);
            } catch (err) { alert('Error: ' + err.message); }
            finally { document.getElementById('loading').style.display = 'none'; }
        });
    }

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!allChartData) { alert('No data available.'); return; }
            const from = document.getElementById('csvFromDate') ? document.getElementById('csvFromDate').value : '';
            const to = document.getElementById('csvToDate') ? document.getElementById('csvToDate').value : '';
            let data = allChartData;
            if (from && to) {
                const f = new Date(from), t = new Date(to);
                t.setHours(23,59,59,999);
                data = allChartData.filter(r => { const d = new Date(r.datetime); return d >= f && d <= t; });
            }
            if (!data.length) { alert('No data for selected range.'); return; }
            let csv = 'DateTime,Air Temp,Humidity,Rain,Water Temp,DO,pH\n';
            data.forEach(r => { csv += `${r.datetime},${r.air_temp},${r.humidity},${r.rain},${r.water_temp},${r.do},${r.ph}\n`; });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `water_quality_${from||'all'}_to_${to||'data'}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        });
    }

    // If on dashboard, load data
    if (document.getElementById('chart1')) {
        if (allChartData && allChartData.length) {
            setTimeout(() => { for (let i = 1; i <= 4; i++) updateChart(i); }, 300);
        } else {
            loadHistoricalData(currentLocation.latitude, currentLocation.longitude);
        }
    }
});
