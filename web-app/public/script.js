let currentMode = 'manual';
let currentLocation = { latitude: 11.0168, longitude: 76.9558 };
let allChartData = null;
let charts = [null, null, null, null]; // Store 4 chart instances
let lastPrediction = null;

// Save state to sessionStorage
function saveState() {
    try {
        sessionStorage.setItem('aq_location', JSON.stringify(currentLocation));
        sessionStorage.setItem('aq_mode', currentMode);
        
        const speciesSelect = document.getElementById('species-select');
        if (speciesSelect) {
            sessionStorage.setItem('aq_species', speciesSelect.value);
        }
        
        if (allChartData) {
            sessionStorage.setItem('aq_data', JSON.stringify(allChartData));
        }
        
        if (lastPrediction) {
            sessionStorage.setItem('aq_prediction', JSON.stringify(lastPrediction));
        }
    } catch (e) {
        console.error('Save state error:', e);
    }
}

function restorePredictionUI(data) {

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

        document.getElementById('predictionTime').textContent =
            'Prediction for: ' + data.prediction_time;

        document.getElementById('predTemp').textContent =
            data.predicted_values.water_temp + ' °C';

        document.getElementById('predDO').textContent =
            data.predicted_values.do + ' mg/L';

        document.getElementById('predPH').textContent =
            data.predicted_values.ph;

        const risk = calculateFishHealthRisk(
            data.predicted_values.water_temp,
            data.predicted_values.do,
            data.predicted_values.ph
        );

        document.getElementById('riskDisplay').className =
            'risk-display ' + risk.class;

        document.getElementById('riskLevel').textContent = risk.level;
        document.getElementById('riskMessage').textContent = risk.message;
    }
}

// Load saved state from sessionStorage
function loadSavedState() {
    try {
        const savedLocation = sessionStorage.getItem('aq_location');
        const savedData = sessionStorage.getItem('aq_data');
        const savedPrediction = sessionStorage.getItem('aq_prediction');
        const savedMode = sessionStorage.getItem('aq_mode');
        const savedSpecies = sessionStorage.getItem('aq_species');

        if (savedLocation) {
            currentLocation = JSON.parse(savedLocation);
        }

        if (savedData) {
            allChartData = JSON.parse(savedData);
        }
        
        if (savedMode) {
            currentMode = savedMode;
        }
        
        if (savedSpecies) {
            const speciesSelect = document.getElementById('species-select');
            if (speciesSelect) {
                speciesSelect.value = savedSpecies;
            }
        }

        if (savedPrediction) {
            lastPrediction = JSON.parse(savedPrediction);
            setTimeout(() => restorePredictionUI(lastPrediction), 100);
        }

    } catch (e) {
        console.error('Load state error:', e);
    }
}

loadSavedState();

function updateAllCharts() {
    for (let i = 1; i <= 4; i++) {
        updateChart(i);
    }
}

function switchMode(mode) {
    currentMode = mode;
    document.getElementById('manualBtn').classList.toggle('active', mode === 'manual');
    document.getElementById('locationBtn').classList.toggle('active', mode === 'location');
    document.getElementById('presetBtn').classList.toggle('active', mode === 'preset');
    document.getElementById('predictionForm').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('locationForm').style.display = mode === 'location' ? 'block' : 'none';
    document.getElementById('presetForm').style.display = mode === 'preset' ? 'block' : 'none';
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(5);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(5);
            },
            (error) => alert('Unable to get location: ' + error.message)
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// Species-specific thresholds
const speciesThresholds = {
    general: { tempMin: 20, tempMax: 28, doMin: 5, phMin: 6.5, phMax: 8.5 },
    tilapia: { tempMin: 25, tempMax: 32, doMin: 3, phMin: 6, phMax: 9 },
    catfish: { tempMin: 24, tempMax: 30, doMin: 4, phMin: 6.5, phMax: 8.5 },
    salmon: { tempMin: 10, tempMax: 18, doMin: 7, phMin: 6.5, phMax: 8 },
    trout: { tempMin: 10, tempMax: 16, doMin: 7, phMin: 6.5, phMax: 8 },
    carp: { tempMin: 20, tempMax: 28, doMin: 4, phMin: 6.5, phMax: 9 },
    shrimp: { tempMin: 26, tempMax: 32, doMin: 4, phMin: 7, phMax: 8.5 },
    prawn: { tempMin: 26, tempMax: 31, doMin: 4, phMin: 7, phMax: 8.5 }
};

function calculateFishHealthRisk(temp, do_val, ph) {
    const species = document.getElementById('species-select').value;
    const thresholds = speciesThresholds[species];
    
    let riskLevel = 'LOW';
    let riskClass = 'risk-low';
    let messages = [];
    
    // Critical DO
    if (do_val < thresholds.doMin) {
        riskLevel = 'HIGH';
        riskClass = 'risk-high';
        messages.push(`Critical: DO (${do_val} mg/L) below ${thresholds.doMin} mg/L for ${species}.`);
    }
    
    // pH range
    if (ph < thresholds.phMin || ph > thresholds.phMax) {
        if (riskLevel !== 'HIGH') riskLevel = 'MODERATE';
        if (riskClass === 'risk-low') riskClass = 'risk-moderate';
        messages.push(`Warning: pH (${ph}) outside ${thresholds.phMin}-${thresholds.phMax} range for ${species}.`);
    }
    
    // Temperature range
    if (temp < thresholds.tempMin || temp > thresholds.tempMax) {
        if (riskLevel !== 'HIGH') riskLevel = 'MODERATE';
        if (riskClass === 'risk-low') riskClass = 'risk-moderate';
        messages.push(`Warning: Temperature (${temp}°C) outside ${thresholds.tempMin}-${thresholds.tempMax}°C range for ${species}.`);
    }
    
    if (messages.length === 0) {
        messages.push(`All parameters optimal for ${species}.`);
    }
    
    return {
        level: riskLevel,
        class: riskClass,
        message: messages.join(' ')
    };
}

// Indian cities database with coastal regions
const indianCities = [
    // Kerala Coastal
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
    
    // Tamil Nadu Coastal
    { name: "Chennai, Tamil Nadu (Coastal)", lat: 13.0827, lon: 80.2707 },
    { name: "Kanyakumari, Tamil Nadu (Coastal)", lat: 8.0883, lon: 77.5385 },
    { name: "Tuticorin, Tamil Nadu (Coastal)", lat: 8.7642, lon: 78.1348 },
    { name: "Rameswaram, Tamil Nadu (Coastal)", lat: 9.2876, lon: 79.3129 },
    { name: "Nagapattinam, Tamil Nadu (Coastal)", lat: 10.7672, lon: 79.8449 },
    { name: "Cuddalore, Tamil Nadu (Coastal)", lat: 11.7480, lon: 79.7714 },
    { name: "Pondicherry (Coastal)", lat: 11.9416, lon: 79.8083 },
    { name: "Coimbatore, Tamil Nadu", lat: 11.0168, lon: 76.9558 },
    { name: "Madurai, Tamil Nadu", lat: 9.9252, lon: 78.1198 },
    { name: "Tiruchirappalli, Tamil Nadu", lat: 10.7905, lon: 78.7047 },
    { name: "Salem, Tamil Nadu", lat: 11.6643, lon: 78.1460 },
    { name: "Tirunelveli, Tamil Nadu", lat: 8.7139, lon: 77.7567 },
    
    // Karnataka Coastal
    { name: "Mangalore, Karnataka (Coastal)", lat: 12.9141, lon: 74.8560 },
    { name: "Udupi, Karnataka (Coastal)", lat: 13.3409, lon: 74.7421 },
    { name: "Karwar, Karnataka (Coastal)", lat: 14.8137, lon: 74.1290 },
    { name: "Bangalore, Karnataka", lat: 12.9716, lon: 77.5946 },
    { name: "Mysore, Karnataka", lat: 12.2958, lon: 76.6394 },
    { name: "Hubli, Karnataka", lat: 15.3647, lon: 75.1240 },
    
    // Maharashtra Coastal
    { name: "Mumbai, Maharashtra (Coastal)", lat: 19.0760, lon: 72.8777 },
    { name: "Ratnagiri, Maharashtra (Coastal)", lat: 16.9902, lon: 73.3120 },
    { name: "Sindhudurg, Maharashtra (Coastal)", lat: 16.0222, lon: 73.5003 },
    { name: "Pune, Maharashtra", lat: 18.5204, lon: 73.8567 },
    { name: "Nagpur, Maharashtra", lat: 21.1458, lon: 79.0882 },
    
    // Goa Coastal
    { name: "Panaji, Goa (Coastal)", lat: 15.4909, lon: 73.8278 },
    { name: "Margao, Goa (Coastal)", lat: 15.2832, lon: 73.9667 },
    { name: "Vasco da Gama, Goa (Coastal)", lat: 15.3983, lon: 73.8115 },
    
    // Gujarat Coastal
    { name: "Surat, Gujarat (Coastal)", lat: 21.1702, lon: 72.8311 },
    { name: "Porbandar, Gujarat (Coastal)", lat: 21.6417, lon: 69.6293 },
    { name: "Dwarka, Gujarat (Coastal)", lat: 22.2394, lon: 68.9678 },
    { name: "Jamnagar, Gujarat (Coastal)", lat: 22.4707, lon: 70.0577 },
    { name: "Bhavnagar, Gujarat (Coastal)", lat: 21.7645, lon: 72.1519 },
    { name: "Ahmedabad, Gujarat", lat: 23.0225, lon: 72.5714 },
    { name: "Vadodara, Gujarat", lat: 22.3072, lon: 73.1812 },
    { name: "Rajkot, Gujarat", lat: 22.3039, lon: 70.8022 },
    
    // Andhra Pradesh Coastal
    { name: "Visakhapatnam, Andhra Pradesh (Coastal)", lat: 17.6868, lon: 83.2185 },
    { name: "Vijayawada, Andhra Pradesh (Coastal)", lat: 16.5062, lon: 80.6480 },
    { name: "Kakinada, Andhra Pradesh (Coastal)", lat: 16.9891, lon: 82.2475 },
    { name: "Nellore, Andhra Pradesh (Coastal)", lat: 14.4426, lon: 79.9865 },
    { name: "Machilipatnam, Andhra Pradesh (Coastal)", lat: 16.1875, lon: 81.1389 },
    
    // Odisha Coastal
    { name: "Bhubaneswar, Odisha (Coastal)", lat: 20.2961, lon: 85.8245 },
    { name: "Puri, Odisha (Coastal)", lat: 19.8135, lon: 85.8312 },
    { name: "Cuttack, Odisha (Coastal)", lat: 20.4625, lon: 85.8828 },
    { name: "Paradip, Odisha (Coastal)", lat: 20.3150, lon: 86.6094 },
    { name: "Gopalpur, Odisha (Coastal)", lat: 19.2571, lon: 84.9127 },
    
    // West Bengal Coastal
    { name: "Kolkata, West Bengal (Coastal)", lat: 22.5726, lon: 88.3639 },
    { name: "Digha, West Bengal (Coastal)", lat: 21.6765, lon: 87.5286 },
    { name: "Haldia, West Bengal (Coastal)", lat: 22.0255, lon: 88.0583 },
    { name: "Siliguri, West Bengal", lat: 26.7271, lon: 88.3953 },
    
    // Andaman & Nicobar
    { name: "Port Blair, Andaman (Coastal)", lat: 11.6234, lon: 92.7265 },
    
    // Lakshadweep
    { name: "Kavaratti, Lakshadweep (Coastal)", lat: 10.5669, lon: 72.6369 },
    
    // Daman & Diu
    { name: "Daman (Coastal)", lat: 20.4140, lon: 72.8328 },
    { name: "Diu (Coastal)", lat: 20.7144, lon: 70.9873 },
    
    // Delhi & NCR
    { name: "New Delhi, Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Gurgaon, Haryana", lat: 28.4595, lon: 77.0266 },
    { name: "Noida, Uttar Pradesh", lat: 28.5355, lon: 77.3910 },
    
    // Telangana
    { name: "Hyderabad, Telangana", lat: 17.3850, lon: 78.4867 },
    
    // Rajasthan
    { name: "Jaipur, Rajasthan", lat: 26.9124, lon: 75.7873 },
    { name: "Jodhpur, Rajasthan", lat: 26.2389, lon: 73.0243 },
    { name: "Udaipur, Rajasthan", lat: 24.5854, lon: 73.7125 },
    
    // Punjab
    { name: "Chandigarh, Punjab", lat: 30.7333, lon: 76.7794 },
    { name: "Ludhiana, Punjab", lat: 30.9010, lon: 75.8573 },
    { name: "Amritsar, Punjab", lat: 31.6340, lon: 74.8723 },
    
    // Uttar Pradesh
    { name: "Lucknow, Uttar Pradesh", lat: 26.8467, lon: 80.9462 },
    { name: "Kanpur, Uttar Pradesh", lat: 26.4499, lon: 80.3319 },
    { name: "Agra, Uttar Pradesh", lat: 27.1767, lon: 78.0081 },
    { name: "Varanasi, Uttar Pradesh", lat: 25.3176, lon: 82.9739 },
    
    // Madhya Pradesh
    { name: "Bhopal, Madhya Pradesh", lat: 23.2599, lon: 77.4126 },
    { name: "Indore, Madhya Pradesh", lat: 22.7196, lon: 75.8577 },
    
    // Bihar & Jharkhand
    { name: "Patna, Bihar", lat: 25.5941, lon: 85.1376 },
    { name: "Ranchi, Jharkhand", lat: 23.3441, lon: 85.3096 },
    
    // Assam & Northeast
    { name: "Guwahati, Assam", lat: 26.1445, lon: 91.7362 },
    { name: "Imphal, Manipur", lat: 24.8170, lon: 93.9368 },
    { name: "Shillong, Meghalaya", lat: 25.5788, lon: 91.8933 }
];

function filterLocations() {
    const searchText = document.getElementById('locationSearch').value.toLowerCase();
    const dropdown = document.getElementById('locationDropdown');
    
    if (searchText.length === 0) {
        dropdown.classList.remove('show');
        return;
    }
    
    const filtered = indianCities.filter(city => 
        city.name.toLowerCase().includes(searchText)
    );
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="location-item">No locations found</div>';
        dropdown.classList.add('show');
        return;
    }
    
    dropdown.innerHTML = filtered.map(city => 
        `<div class="location-item" onclick="selectLocation('${city.name}', ${city.lat}, ${city.lon})">${city.name}</div>`
    ).join('');
    
    dropdown.classList.add('show');
}

function selectLocation(name, lat, lon) {
    document.getElementById('locationSearch').value = name;
    document.getElementById('selectedLat').value = lat;
    document.getElementById('selectedLon').value = lon;
    document.getElementById('presetCoords').textContent = `Lat: ${lat}, Lon: ${lon}`;
    document.getElementById('locationDropdown').classList.remove('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const searchInput = document.getElementById('locationSearch');
    const dropdown = document.getElementById('locationDropdown');
    if (searchInput && dropdown && !searchInput.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

function updatePresetCoords() {
    const coords = document.getElementById('presetLocation').value.split(',');
    document.getElementById('presetCoords').textContent = `Lat: ${coords[0]}, Lon: ${coords[1]}`;
}

document.getElementById('predictionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const temp = document.getElementById('temperature').value;
    const dissolvedOxygen = document.getElementById('dissolved_oxygen').value;
    const ph = document.getElementById('ph').value;
    const species = document.getElementById('species-select').value;
    
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                temperature: parseFloat(temp),
                dissolved_oxygen: parseFloat(dissolvedOxygen),
                ph: parseFloat(ph),
                species: species
            })
        });
        
        const data = await response.json();
        lastPrediction = data;
        saveState();
        
        if (data.error) {
            alert('Error: ' + data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }
        
        document.getElementById('scoreValue').textContent = data.quality_score;
        document.getElementById('scoreLabel').textContent = data.quality_level;
        document.getElementById('timestamp').textContent = 'Updated: ' + data.timestamp;
        
        const scoreDisplay = document.getElementById('scoreDisplay');
        scoreDisplay.style.background = data.color;
        
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
        
        await loadHistoricalData();
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

// Location-based prediction
document.getElementById('locationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lat = document.getElementById('latitude').value;
    const lon = document.getElementById('longitude').value;
    const species = document.getElementById('species-select').value;
    
    currentLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    saveState();
    
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                species: species
            })
        });
        
        const data = await response.json();
        lastPrediction = data;
        saveState();
        
        if (data.error) {
            alert('Error: ' + data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }
        
        document.getElementById('scoreValue').textContent = data.quality_score;
        document.getElementById('scoreLabel').textContent = data.quality_level;
        document.getElementById('timestamp').textContent = 'Updated: ' + data.timestamp;
        
        const scoreDisplay = document.getElementById('scoreDisplay');
        scoreDisplay.style.background = data.color;
        
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
        
        await loadHistoricalData(currentLocation.latitude, currentLocation.longitude);
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

// Preset location prediction
document.getElementById('presetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lat = parseFloat(document.getElementById('selectedLat').value);
    const lon = parseFloat(document.getElementById('selectedLon').value);
    const species = document.getElementById('species-select').value;
    
    if (!lat || !lon) {
        alert('Please select a location from the dropdown');
        return;
    }
    
    currentLocation = { latitude: lat, longitude: lon };
    saveState();
    
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                species: species
            })
        });
        
        const data = await response.json();
        lastPrediction = data;
        saveState();
        
        if (data.error) {
            alert('Error: ' + data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }
        
        document.getElementById('scoreValue').textContent = data.quality_score;
        document.getElementById('scoreLabel').textContent = data.quality_level;
        document.getElementById('timestamp').textContent = 'Updated: ' + data.timestamp;
        
        const scoreDisplay = document.getElementById('scoreDisplay');
        scoreDisplay.style.background = data.color;
        
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
        
        await loadHistoricalData(currentLocation.latitude, currentLocation.longitude);
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

async function loadHistoricalData(lat, lon) {
    const latitude = lat || currentLocation.latitude;
    const longitude = lon || currentLocation.longitude;
    
    try {
        const dataResponse = await fetch(`/api/fetch-data?latitude=${latitude}&longitude=${longitude}`);
        const csvData = await dataResponse.json();
        
        if (csvData.data) {
            allChartData = csvData.data;
            saveState(); // Save after loading data
            
            // Update table
            const tbody = document.getElementById('dataTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                csvData.data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${row.datetime}</td>
                        <td>${row.air_temp}</td>
                        <td>${row.humidity}</td>
                        <td>${row.rain}</td>
                        <td>${row.water_temp}</td>
                        <td>${row.do}</td>
                        <td>${row.ph}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            
            window.csvData = csvData.csv;
            
            // Update all 4 charts
            for (let i = 1; i <= 4; i++) {
                updateChart(i);
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function updateChart(chartNum) {
    if (!allChartData) return;
    
    const timeRange = parseInt(document.getElementById(`timeRange${chartNum}`).value);
    const totalHours = allChartData.length;
    
    let filteredData;
    if (timeRange >= totalHours) {
        filteredData = allChartData;
    } else {
        filteredData = allChartData.slice(-timeRange);
    }
    
    let sampleRate;
    if (timeRange === 24) {
        sampleRate = 1;
    } else if (timeRange === 168) {
        sampleRate = 3;
    } else if (timeRange === 720) {
        sampleRate = 6;
    } else {
        sampleRate = 24;
    }
    
    const sampledData = filteredData.filter((_, index) => index % sampleRate === 0);
    
    const labels = sampledData.map(row => {
        if (timeRange === 24) {
            return row.datetime.split(' ')[1].substring(0, 5);
        } else {
            return row.datetime.split(' ')[0];
        }
    });
    
    // Define chart configurations
    const chartConfigs = [
        null, // Chart 1 is combined (handled separately)
        {
            label: 'Water Temperature (°C)',
            data: sampledData.map(row => row.water_temp),
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            yAxisLabel: 'Temperature (°C)'
        },
        {
            label: 'Dissolved Oxygen (mg/L)',
            data: sampledData.map(row => row.do),
            borderColor: '#36A2EB',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            yAxisLabel: 'DO (mg/L)'
        },
        {
            label: 'pH Level',
            data: sampledData.map(row => row.ph),
            borderColor: '#FFCE56',
            backgroundColor: 'rgba(255, 206, 86, 0.1)',
            yAxisLabel: 'pH'
        }
    ];
    
    const ctx = document.getElementById(`chart${chartNum}`).getContext('2d');
    
    if (charts[chartNum - 1]) charts[chartNum - 1].destroy();
    
    // Chart 1 is the combined chart with all 3 parameters
    if (chartNum === 1) {
        charts[chartNum - 1] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Water Temperature (°C)',
                        data: sampledData.map(row => row.water_temp),
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Dissolved Oxygen (mg/L)',
                        data: sampledData.map(row => row.do),
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    },
                    {
                        label: 'pH Level',
                        data: sampledData.map(row => row.ph),
                        borderColor: '#FFCE56',
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        yAxisID: 'y2',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxTicksLimit: 20,
                            autoSkip: true
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'DO (mg/L)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    y2: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'pH'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    } else {
        // Individual charts (2, 3, 4)
        const config = chartConfigs[chartNum - 1];
        
        // Get selected species thresholds
        const speciesSelect = document.getElementById('species-select');
        const species = speciesSelect ? speciesSelect.value : 'general';
        const thresholds = speciesThresholds[species];
        
        // Define optimal ranges based on species
        let annotations = [];
        if (chartNum === 2) { // Water Temperature
            annotations = [
                { type: 'line', yMin: thresholds.tempMin, yMax: thresholds.tempMin, borderColor: config.borderColor, borderWidth: 1, label: { display: false } },
                { type: 'line', yMin: thresholds.tempMax, yMax: thresholds.tempMax, borderColor: config.borderColor, borderWidth: 1, label: { display: false } }
            ];
        } else if (chartNum === 3) { // Dissolved Oxygen
            annotations = [
                { type: 'line', yMin: thresholds.doMin, yMax: thresholds.doMin, borderColor: config.borderColor, borderWidth: 1, label: { display: false } }
            ];
        } else if (chartNum === 4) { // pH Level
            annotations = [
                { type: 'line', yMin: thresholds.phMin, yMax: thresholds.phMin, borderColor: config.borderColor, borderWidth: 1, label: { display: false } },
                { type: 'line', yMin: thresholds.phMax, yMax: thresholds.phMax, borderColor: config.borderColor, borderWidth: 1, label: { display: false } }
            ];
        }
        
        charts[chartNum - 1] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: config.label,
                    data: config.data,
                    borderColor: config.borderColor,
                    backgroundColor: config.backgroundColor,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    annotation: {
                        annotations: annotations
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxTicksLimit: 20,
                            autoSkip: true
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: config.yAxisLabel
                        },
                        suggestedMin: chartNum === 2 ? Math.min(...config.data, thresholds.tempMin) - 2 :
                                      chartNum === 3 ? Math.min(...config.data, thresholds.doMin) - 1 :
                                      Math.min(...config.data, thresholds.phMin) - 0.5,
                        suggestedMax: chartNum === 2 ? Math.max(...config.data, thresholds.tempMax) + 2 :
                                      chartNum === 3 ? Math.max(...config.data) + 1 :
                                      Math.max(...config.data, thresholds.phMax) + 0.5
                    }
                }
            }
        });
    }
}

window.addEventListener('load', () => {
    loadSavedState();
    const tbody = document.getElementById('dataTableBody');
    if (tbody && allChartData && allChartData.length > 0) {
        tbody.innerHTML = '';
        allChartData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.datetime}</td>
                <td>${row.air_temp}</td>
                <td>${row.humidity}</td>
                <td>${row.rain}</td>
                <td>${row.water_temp}</td>
                <td>${row.do}</td>
                <td>${row.ph}</td>
            `;
            tbody.appendChild(tr);
        });
        for (let i = 1; i <= 4; i++) {
            updateChart(i);
        }
    } else {
        loadHistoricalData();
    }
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!allChartData) {
        alert('No data available. Please wait for data to load.');
        return;
    }
    
    const timeRange = parseInt(document.getElementById('csvTimeRange').value);
    const totalHours = allChartData.length;
    
    let filteredData;
    if (timeRange >= totalHours) {
        filteredData = allChartData;
    } else {
        filteredData = allChartData.slice(-timeRange);
    }
    
    const headers = ['DateTime', 'Air Temp', 'Humidity', 'Rain', 'Water Temp', 'DO', 'pH'];
    let csvContent = headers.join(',') + '\n';
    
    filteredData.forEach(row => {
        csvContent += `${row.datetime},${row.air_temp},${row.humidity},${row.rain},${row.water_temp},${row.do},${row.ph}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let rangeLabel;
    if (timeRange === 24) rangeLabel = '24hours';
    else if (timeRange === 168) rangeLabel = '7days';
    else if (timeRange === 720) rangeLabel = '30days';
    else rangeLabel = '1year';
    
    a.download = `water_quality_${rangeLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
});
