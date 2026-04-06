// Loading progress management
function showLoading(title = 'Processing Request') {
    const loading = document.getElementById('loading');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingStep = document.getElementById('loadingStep');
    const progressBar = document.getElementById('loadingProgressBar');
    
    if (loading && loadingTitle && loadingStep && progressBar) {
        loadingTitle.textContent = title;
        loadingStep.textContent = 'Initializing...';
        progressBar.style.width = '0%';
        loading.style.display = 'flex';
    }
}

function updateLoadingStep(step, progress = 0) {
    const loadingStep = document.getElementById('loadingStep');
    const progressBar = document.getElementById('loadingProgressBar');
    
    if (loadingStep && progressBar) {
        loadingStep.textContent = step;
        progressBar.style.width = progress + '%';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// LSTM Modal Functions
let currentModalMode = 'current';

function openLSTMModal() {
    const modal = document.getElementById('lstmModal');
    if (modal) {
        modal.style.display = 'block';
        resetModalPrediction();
        initializeModalDatetime();
        
        // Copy species selection from main form
        const mainSpecies = document.getElementById('species-select');
        const modalSpecies = document.getElementById('modalSpecies');
        if (mainSpecies && modalSpecies) {
            modalSpecies.value = mainSpecies.value;
        }
    }
}

function closeLSTMModal() {
    const modal = document.getElementById('lstmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function switchModalMode(mode) {
    currentModalMode = mode;
    
    // Update tab appearance
    document.getElementById('modalCurrentTab').classList.toggle('active', mode === 'current');
    document.getElementById('modalManualTab').classList.toggle('active', mode === 'manual');
    document.getElementById('modalFutureTab').classList.toggle('active', mode === 'future');
    
    // Show/hide mode sections
    document.getElementById('modalCurrentMode').style.display = mode === 'current' ? 'block' : 'none';
    document.getElementById('modalManualMode').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('modalFutureMode').style.display = mode === 'future' ? 'block' : 'none';
}

function resetModalPrediction() {
    // Show input section, hide loading and results
    document.getElementById('modalInputSection').style.display = 'block';
    document.getElementById('modalLoadingSection').style.display = 'none';
    document.getElementById('modalResultsSection').style.display = 'none';
    
    // Reset to current mode
    switchModalMode('current');
    
    // Clear all inputs
    const inputs = ['modalLatitude', 'modalLongitude', 'modalTemperature', 'modalDO', 'modalPH', 
                   'modalFutureLatitude', 'modalFutureLongitude', 'modalFutureDateTime'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}

function initializeModalDatetime() {
    const futureDateTime = document.getElementById('modalFutureDateTime');
    if (futureDateTime) {
        const now = new Date();
        const minDateTime = new Date(now.getTime() + 60 * 60 * 1000);
        const minDateTimeString = minDateTime.toISOString().slice(0, 16);
        futureDateTime.min = minDateTimeString;
        
        const maxDateTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        const maxDateTimeString = maxDateTime.toISOString().slice(0, 16);
        futureDateTime.max = maxDateTimeString;
    }
}

function getModalLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('modalLatitude').value = pos.coords.latitude.toFixed(5);
                document.getElementById('modalLongitude').value = pos.coords.longitude.toFixed(5);
            },
            err => alert('Unable to get location: ' + err.message)
        );
    } else {
        alert('Geolocation not supported by this browser.');
    }
}

function getModalFutureLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('modalFutureLatitude').value = pos.coords.latitude.toFixed(5);
                document.getElementById('modalFutureLongitude').value = pos.coords.longitude.toFixed(5);
            },
            err => alert('Unable to get location: ' + err.message)
        );
    } else {
        alert('Geolocation not supported by this browser.');
    }
}

function showModalLoading(title = 'Processing LSTM Prediction') {
    document.getElementById('modalInputSection').style.display = 'none';
    document.getElementById('modalLoadingSection').style.display = 'block';
    document.getElementById('modalResultsSection').style.display = 'none';
    
    document.getElementById('modalLoadingTitle').textContent = title;
    document.getElementById('modalLoadingStep').textContent = 'Initializing...';
    document.getElementById('modalLoadingProgressBar').style.width = '0%';
}

function updateModalLoadingStep(step, progress = 0) {
    const loadingStep = document.getElementById('modalLoadingStep');
    const progressBar = document.getElementById('modalLoadingProgressBar');
    
    if (loadingStep && progressBar) {
        loadingStep.textContent = step;
        progressBar.style.width = progress + '%';
    }
}

function showModalResults() {
    document.getElementById('modalInputSection').style.display = 'none';
    document.getElementById('modalLoadingSection').style.display = 'none';
    document.getElementById('modalResultsSection').style.display = 'block';
}

function runModalCurrentPrediction() {
    const lat = parseFloat(document.getElementById('modalLatitude').value);
    const lon = parseFloat(document.getElementById('modalLongitude').value);
    const species = document.getElementById('modalSpecies').value;
    
    if (!lat || !lon) {
        alert('Please enter latitude and longitude coordinates');
        return;
    }
    
    showModalLoading('LSTM Current Analysis');
    updateModalLoadingStep('Connecting to weather API...', 20);
    
    fetch(addCacheBuster('/api/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            species: species
        })
    })
    .then(response => {
        updateModalLoadingStep('Processing LSTM model...', 60);
        return response.json();
    })
    .then(result => {
        updateModalLoadingStep('Generating results...', 90);
        setTimeout(() => {
            handleModalPredictionResponse(result, `Current Analysis (${lat}, ${lon})`);
        }, 500);
    })
    .catch(error => {
        alert('LSTM prediction failed: ' + error.message);
        resetModalPrediction();
    });
}

function runModalManualPrediction() {
    const temperature = parseFloat(document.getElementById('modalTemperature').value);
    const do_val = parseFloat(document.getElementById('modalDO').value);
    const ph = parseFloat(document.getElementById('modalPH').value);
    const species = document.getElementById('modalSpecies').value;
    
    if (!temperature || !do_val || !ph) {
        alert('Please fill in all water parameter fields');
        return;
    }
    
    showModalLoading('Manual Analysis Processing');
    updateModalLoadingStep('Analyzing water parameters...', 40);
    
    fetch(addCacheBuster('/api/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            temperature: temperature,
            dissolved_oxygen: do_val,
            ph: ph,
            species: species
        })
    })
    .then(response => {
        updateModalLoadingStep('Calculating quality score...', 80);
        return response.json();
    })
    .then(result => {
        updateModalLoadingStep('Finalizing results...', 100);
        setTimeout(() => {
            handleModalPredictionResponse(result, `Manual Input Analysis`);
        }, 300);
    })
    .catch(error => {
        alert('Manual analysis failed: ' + error.message);
        resetModalPrediction();
    });
}

function runModalFuturePrediction() {
    const lat = parseFloat(document.getElementById('modalFutureLatitude').value);
    const lon = parseFloat(document.getElementById('modalFutureLongitude').value);
    const datetime = document.getElementById('modalFutureDateTime').value;
    const species = document.getElementById('modalSpecies').value;
    
    if (!lat || !lon) {
        alert('Please enter latitude and longitude coordinates');
        return;
    }
    
    if (!datetime) {
        alert('Please select a future date and time');
        return;
    }
    
    const targetDate = new Date(datetime);
    const now = new Date();
    if (targetDate <= now) {
        alert('Please select a future date and time');
        return;
    }
    
    showModalLoading('LSTM Future Prediction');
    updateModalLoadingStep('Fetching future weather data...', 30);
    
    fetch(addCacheBuster('/api/predict-future'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            target_datetime: datetime,
            species: species
        })
    })
    .then(response => {
        updateModalLoadingStep('Running LSTM forecast model...', 70);
        return response.json();
    })
    .then(result => {
        updateModalLoadingStep('Generating forecast...', 95);
        if (result.success) {
            setTimeout(() => {
                const modalResult = {
                    quality_score: result.quality_score,
                    quality_level: result.quality_level,
                    color: result.color,
                    recommendations: result.recommendations,
                    timestamp: result.timestamp,
                    predicted_values: result.predicted_values,
                    prediction_time: result.target_datetime
                };
                handleModalPredictionResponse(modalResult, `Future Forecast (${lat}, ${lon})`);
            }, 500);
        } else {
            throw new Error(result.error || 'Future prediction failed');
        }
    })
    .catch(error => {
        alert('LSTM future prediction failed: ' + error.message);
        resetModalPrediction();
    });
}

function handleModalPredictionResponse(data, locationInfo) {
    if (data.error) {
        alert('Error: ' + data.error);
        resetModalPrediction();
        return;
    }
    
    // Update location info
    document.getElementById('modalLocationInfo').textContent = locationInfo;
    
    // Update quality score
    document.getElementById('modalScoreValue').textContent = data.quality_score;
    document.getElementById('modalScoreLabel').textContent = data.quality_level;
    document.getElementById('modalTimestamp').textContent = data.timestamp;
    
    const scoreDisplay = document.querySelector('#modalResultsSection .score-display-enhanced');
    if (scoreDisplay) {
        scoreDisplay.style.background = data.color;
    }
    
    // Update parameters
    if (data.predicted_values) {
        document.getElementById('modalPredTemp').textContent = data.predicted_values.water_temp + ' °C';
        document.getElementById('modalPredDO').textContent = data.predicted_values.do + ' mg/L';
        document.getElementById('modalPredPH').textContent = data.predicted_values.ph;
        
        // Calculate and display risk
        const risk = calculateFishHealthRisk(data.predicted_values.water_temp, data.predicted_values.do, data.predicted_values.ph);
        document.getElementById('modalRiskDisplay').className = 'risk-display-enhanced ' + risk.class;
        document.getElementById('modalRiskLevel').textContent = risk.level;
        document.getElementById('modalRiskMessage').textContent = risk.message;
    } else {
        // For manual input, show the input values
        document.getElementById('modalPredTemp').textContent = data.temperature + ' °C (Input)';
        document.getElementById('modalPredDO').textContent = data.dissolved_oxygen + ' mg/L (Input)';
        document.getElementById('modalPredPH').textContent = data.ph + ' (Input)';
        
        const risk = calculateFishHealthRisk(data.temperature, data.dissolved_oxygen, data.ph);
        document.getElementById('modalRiskDisplay').className = 'risk-display-enhanced ' + risk.class;
        document.getElementById('modalRiskLevel').textContent = risk.level;
        document.getElementById('modalRiskMessage').textContent = risk.message;
    }
    
    // Update recommendations
    const recList = document.getElementById('modalRecommendationsList');
    recList.innerHTML = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recList.appendChild(li);
    });
    
    showModalResults();
}

// Make modal functions globally available
window.openLSTMModal = openLSTMModal;
window.closeLSTMModal = closeLSTMModal;
window.switchModalMode = switchModalMode;
window.resetModalPrediction = resetModalPrediction;
window.getModalLocation = getModalLocation;
window.getModalFutureLocation = getModalFutureLocation;
window.runModalCurrentPrediction = runModalCurrentPrediction;
window.runModalManualPrediction = runModalManualPrediction;
window.runModalFuturePrediction = runModalFuturePrediction;

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('lstmModal');
    if (event.target === modal) {
        closeLSTMModal();
    }
});

// Cache busting for API requests
function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}&_r=${Math.random()}`;
}

// New unified interface functions
let currentLocationMode = 'coords';
let currentPredictionMode = null;

function switchLocationMode(mode) {
    currentLocationMode = mode;
    
    // Update tab appearance
    document.getElementById('coordsTab').classList.toggle('active', mode === 'coords');
    document.getElementById('cityTab').classList.toggle('active', mode === 'city');
    
    // Show/hide location inputs
    document.getElementById('coordsLocation').style.display = mode === 'coords' ? 'block' : 'none';
    document.getElementById('cityLocation').style.display = mode === 'city' ? 'block' : 'none';
    
    saveState();
}

function switchPredictionMode(mode) {
    currentPredictionMode = mode;
    
    // Update tab appearance
    document.getElementById('currentTab').classList.toggle('active', mode === 'current');
    document.getElementById('manualTab').classList.toggle('active', mode === 'manual');
    document.getElementById('futureTab').classList.toggle('active', mode === 'future');
    
    // Show/hide prediction inputs
    document.getElementById('currentPrediction').style.display = mode === 'current' ? 'block' : 'none';
    document.getElementById('manualPrediction').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('futurePrediction').style.display = mode === 'future' ? 'block' : 'none';
    
    // Initialize future datetime picker when future mode is selected
    if (mode === 'future') {
        const futureDateTime = document.getElementById('futureDateTime');
        if (futureDateTime) {
            const now = new Date();
            const minDateTime = new Date(now.getTime() + 60 * 60 * 1000);
            const minDateTimeString = minDateTime.toISOString().slice(0, 16);
            futureDateTime.min = minDateTimeString;
            
            const maxDateTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            const maxDateTimeString = maxDateTime.toISOString().slice(0, 16);
            futureDateTime.max = maxDateTimeString;
            
            futureDateTime.value = '';
        }
    }
    
    saveState();
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('mainLatitude').value = pos.coords.latitude.toFixed(5);
                document.getElementById('mainLongitude').value = pos.coords.longitude.toFixed(5);
            },
            err => alert('Unable to get location: ' + err.message)
        );
    } else {
        alert('Geolocation not supported by this browser.');
    }
}

function filterMainLocations() {
    const searchText = document.getElementById('mainLocationSearch').value.toLowerCase();
    const dropdown = document.getElementById('mainLocationDropdown');
    if (!searchText) { dropdown.classList.remove('show'); return; }
    const filtered = indianCities.filter(c => c.name.toLowerCase().includes(searchText));
    if (!filtered.length) {
        dropdown.innerHTML = '<div class="location-item">No locations found</div>';
    } else {
        dropdown.innerHTML = filtered.map(c =>
            `<div class="location-item" onclick="selectMainLocation('${c.name}',${c.lat},${c.lon})">${c.name}</div>`
        ).join('');
    }
    dropdown.classList.add('show');
}

function selectMainLocation(name, lat, lon) {
    document.getElementById('mainLocationSearch').value = name;
    document.getElementById('mainLatitude').value = lat;
    document.getElementById('mainLongitude').value = lon;
    document.getElementById('mainLocationHint').textContent = `Selected: ${name} (${lat}, ${lon})`;
    document.getElementById('mainLocationDropdown').classList.remove('show');
}

function getLocationCoordinates() {
    if (currentLocationMode === 'coords') {
        const lat = parseFloat(document.getElementById('mainLatitude').value);
        const lon = parseFloat(document.getElementById('mainLongitude').value);
        return { lat, lon };
    } else {
        const lat = parseFloat(document.getElementById('mainLatitude').value);
        const lon = parseFloat(document.getElementById('mainLongitude').value);
        return { lat, lon };
    }
}

function runCurrentPrediction() {
    const coords = getLocationCoordinates();
    if (!coords.lat || !coords.lon) {
        alert('Please set location coordinates first');
        return;
    }
    
    currentLocation = { latitude: coords.lat, longitude: coords.lon };
    saveState();
    
    showLoading('LSTM Water Quality Analysis');
    
    fetch(addCacheBuster('/api/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            latitude: coords.lat,
            longitude: coords.lon,
            species: document.getElementById('species-select').value
        })
    })
    .then(response => response.json())
    .then(result => {
        // Location-based predictions use full LSTM analysis with next-hour forecasting
        handleLSTMPredictionResponse(result);
        
        // Show chart controls after successful prediction
        const chartControls = document.getElementById('chartDataControls');
        if (chartControls) {
            chartControls.style.display = 'block';
            const hint = document.getElementById('selectedLocationHint');
            if (hint) hint.textContent = `Charts will show data for coordinates: ${coords.lat}, ${coords.lon}`;
        }
    })
    .catch(error => alert('LSTM prediction failed: ' + error.message))
    .finally(() => hideLoading());
}

function handleLSTMPredictionResponse(data) {
    if (data.error) { alert('Error: ' + data.error); return; }
    lastPrediction = data;
    saveState();
    
    // Update quality score from LSTM analysis
    document.getElementById('scoreValue').textContent = data.quality_score;
    document.getElementById('scoreLabel').textContent = data.quality_level;
    document.getElementById('timestamp').textContent = 'LSTM Analysis: ' + data.timestamp;
    document.getElementById('scoreDisplay').style.background = data.color;
    
    // Update LSTM-generated recommendations
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li'); 
        li.textContent = rec; 
        recList.appendChild(li);
    });
    
    // LSTM predictions include next-hour forecasting
    if (data.predicted_values) {
        document.getElementById('predictionTime').textContent = 'LSTM Next-Hour Forecast: ' + data.prediction_time;
        document.getElementById('predTemp').textContent = data.predicted_values.water_temp + ' °C';
        document.getElementById('predDO').textContent = data.predicted_values.do + ' mg/L';
        document.getElementById('predPH').textContent = data.predicted_values.ph;
        
        // Fish health risk from LSTM predicted values
        const risk = calculateFishHealthRisk(data.predicted_values.water_temp, data.predicted_values.do, data.predicted_values.ph);
        document.getElementById('riskDisplay').className = 'risk-display-enhanced ' + risk.class;
        document.getElementById('riskLevel').textContent = risk.level;
        document.getElementById('riskMessage').textContent = risk.message;
    }
    
    // Generate smart advisory from LSTM analysis
    generateSmartAdvisory();
}

function runManualPrediction() {
    const temperature = parseFloat(document.getElementById('manualTemperature').value);
    const do_val = parseFloat(document.getElementById('manualDO').value);
    const ph = parseFloat(document.getElementById('manualPH').value);
    
    if (!temperature || !do_val || !ph) {
        alert('Please fill in all water parameter fields');
        return;
    }
    
    showLoading('LSTM Manual Analysis');
    
    fetch(addCacheBuster('/api/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            temperature: temperature,
            dissolved_oxygen: do_val,
            ph: ph,
            species: document.getElementById('species-select').value
        })
    })
    .then(response => response.json())
    .then(result => {
        // Manual input now uses LSTM model for analysis and predictions
        handleManualPredictionResponse(result);
    })
    .catch(error => alert('LSTM manual analysis failed: ' + error.message))
    .finally(() => hideLoading());
}

function handleManualPredictionResponse(data) {
    if (data.error) { alert('Error: ' + data.error); return; }
    lastPrediction = data;
    saveState();
    
    // Update quality score
    document.getElementById('scoreValue').textContent = data.quality_score;
    document.getElementById('scoreLabel').textContent = data.quality_level;
    document.getElementById('timestamp').textContent = 'LSTM Analysis: ' + data.timestamp;
    document.getElementById('scoreDisplay').style.background = data.color;
    
    // Update recommendations
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li'); 
        li.textContent = rec; 
        recList.appendChild(li);
    });
    
    // For manual input - show LSTM-based next hour prediction
    document.getElementById('predictionTime').textContent = 'LSTM Next-Hour Forecast: ' + data.prediction_time;
    document.getElementById('predTemp').textContent = data.predicted_values.water_temp + ' °C';
    document.getElementById('predDO').textContent = data.predicted_values.do + ' mg/L';
    document.getElementById('predPH').textContent = data.predicted_values.ph;
    
    // Calculate fish health risk from LSTM predicted values
    const risk = calculateFishHealthRisk(data.predicted_values.water_temp, data.predicted_values.do, data.predicted_values.ph);
    document.getElementById('riskDisplay').className = 'risk-display-enhanced ' + risk.class;
    document.getElementById('riskLevel').textContent = risk.level;
    document.getElementById('riskMessage').textContent = risk.message;
    
    // Generate smart advisory for manual input
    generateSmartAdvisory();
}

function runFuturePrediction() {
    const coords = getLocationCoordinates();
    const datetime = document.getElementById('futureDateTime').value;
    
    if (!coords.lat || !coords.lon) {
        alert('Please set location coordinates first');
        return;
    }
    
    if (!datetime) {
        alert('Please select a future date and time');
        return;
    }
    
    // Validate future date
    const targetDate = new Date(datetime);
    const now = new Date();
    if (targetDate <= now) {
        alert('Please select a future date and time');
        return;
    }
    
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    if (targetDate > oneYearFromNow) {
        alert('Cannot predict more than 1 year into the future');
        return;
    }
    
    showLoading('LSTM Future Prediction Analysis');
    
    fetch(addCacheBuster('/api/predict-future'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            latitude: coords.lat,
            longitude: coords.lon,
            target_datetime: datetime,
            species: document.getElementById('species-select').value
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Future predictions use specialized LSTM future forecasting
            handleLSTMPredictionResponse({
                quality_score: result.quality_score,
                quality_level: result.quality_level,
                color: result.color,
                recommendations: result.recommendations,
                timestamp: result.timestamp,
                predicted_values: result.predicted_values,
                prediction_time: result.target_datetime
            });
        } else {
            throw new Error(result.error || 'Future prediction failed');
        }
    })
    .catch(error => alert('LSTM future prediction failed: ' + error.message))
    .finally(() => hideLoading());
}

// Make functions globally available
window.switchLocationMode = switchLocationMode;
window.switchPredictionMode = switchPredictionMode;
window.getCurrentLocation = getCurrentLocation;
window.filterMainLocations = filterMainLocations;
window.selectMainLocation = selectMainLocation;
window.runCurrentPrediction = runCurrentPrediction;
window.runManualPrediction = runManualPrediction;
window.runFuturePrediction = runFuturePrediction;
function getAnalyticsLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('analyticsLatitude').value = pos.coords.latitude.toFixed(5);
                document.getElementById('analyticsLongitude').value = pos.coords.longitude.toFixed(5);
            },
            err => alert('Unable to get location: ' + err.message)
        );
    } else alert('Geolocation not supported.');
}

function filterAnalyticsLocations() {
    const searchText = document.getElementById('analyticsLocationSearch').value.toLowerCase();
    const dropdown = document.getElementById('analyticsLocationDropdown');
    if (!searchText) { dropdown.classList.remove('show'); return; }
    const filtered = indianCities.filter(c => c.name.toLowerCase().includes(searchText));
    if (!filtered.length) {
        dropdown.innerHTML = '<div class="location-item">No locations found</div>';
    } else {
        dropdown.innerHTML = filtered.map(c =>
            `<div class="location-item" onclick="selectAnalyticsLocation('${c.name}',${c.lat},${c.lon})">${c.name}</div>`
        ).join('');
    }
    dropdown.classList.add('show');
}

function selectAnalyticsLocation(name, lat, lon) {
    document.getElementById('analyticsLocationSearch').value = name;
    document.getElementById('analyticsSelectedLat').value = lat;
    document.getElementById('analyticsSelectedLon').value = lon;
    document.getElementById('analyticsLatitude').value = lat;
    document.getElementById('analyticsLongitude').value = lon;
    document.getElementById('analyticsPresetCoords').textContent = `Lat: ${lat}, Lon: ${lon}`;
    document.getElementById('analyticsLocationDropdown').classList.remove('show');
}

function loadAnalyticsData() {
    const lat = document.getElementById('analyticsLatitude').value || document.getElementById('analyticsSelectedLat').value;
    const lon = document.getElementById('analyticsLongitude').value || document.getElementById('analyticsSelectedLon').value;
    const fromDate = document.getElementById('analyticsFromDate')?.value || '';
    const toDate = document.getElementById('analyticsToDate')?.value || '';
    
    // Show coordinate preview
    const preview = document.getElementById('coordinatePreview');
    const previewCoords = document.getElementById('previewCoords');
    if (preview && previewCoords && lat && lon) {
        const manualLat = document.getElementById('analyticsLatitude').value;
        const manualLon = document.getElementById('analyticsLongitude').value;
        const selectedLocation = document.getElementById('analyticsLocationSearch').value;
        
        if (manualLat && manualLon) {
            previewCoords.textContent = `Manual coordinates (${lat}, ${lon})`;
        } else if (selectedLocation) {
            previewCoords.textContent = `${selectedLocation} (${lat}, ${lon})`;
        } else {
            previewCoords.textContent = `Coordinates (${lat}, ${lon})`;
        }
        preview.style.display = 'block';
    }
    
    if (!lat || !lon) {
        alert('Please enter coordinates or select a location');
        return;
    }
    
    if (!fromDate || !toDate) {
        alert('Please select both From and To dates');
        return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
        alert('From date cannot be later than To date');
        return;
    }
    
    showLoading('Loading Analytics Data');
    updateLoadingStep('Fetching historical data...', 30);
    
    // Update current location for data fetching
    currentLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    saveState();
    
    loadHistoricalDataForAnalytics(lat, lon, fromDate, toDate)
        .then(() => {
            updateLoadingStep('Data loaded successfully!', 100);
            setTimeout(() => hideLoading(), 500);
        })
        .catch(err => {
            alert('Failed to load data: ' + err.message);
            hideLoading();
        });
}

window.getAnalyticsLocation = getAnalyticsLocation;
window.filterAnalyticsLocations = filterAnalyticsLocations;
window.selectAnalyticsLocation = selectAnalyticsLocation;
window.loadAnalyticsData = loadAnalyticsData;

// Remove all old functions that are no longer needed
// Keep only essential functions for the unified interface

async function loadHistoricalDataForAnalytics(lat, lon, startDate, endDate) {
    const latitude = lat || currentLocation.latitude || 11.0168;
    const longitude = lon || currentLocation.longitude || 76.9558;
    
    try {
        updateLoadingStep('Connecting to weather data API...', 30);
        await new Promise(resolve => setTimeout(resolve, 400));
        
        updateLoadingStep('Fetching historical weather data...', 50);
        const res = await fetch(addCacheBuster(`/api/fetch-data?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}`));
        
        updateLoadingStep('Processing weather data...', 70);
        const csvData = await res.json();
        
        if (csvData.error) { alert('Error loading data: ' + csvData.error); return; }
        
        if (csvData.data && csvData.data.length > 0) {
            updateLoadingStep('Preparing analytics table...', 85);
            
            // Store analytics data
            window.analyticsData = csvData.data;
            window.analyticsCsvData = csvData.csv;
            
            // Update analytics table
            const tbody = document.getElementById('dataTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                csvData.data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${row.datetime}</td><td>${row.air_temp}</td><td>${row.humidity}</td><td>${row.rain}</td><td>${row.water_temp}</td><td>${row.do}</td><td>${row.ph}</td>`;
                    tbody.appendChild(tr);
                });
            }
            
            // Save analytics data to session storage
            saveState();
            
            updateLoadingStep('Analytics ready!', 95);
        } else {
            alert('No data available for this location and date range.');
        }
    } catch (err) {
        alert('Failed to load data: ' + err.message);
    }
}

function restoreAnalyticsTable() {
    if (!window.analyticsData) return;
    
    const tbody = document.getElementById('dataTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        window.analyticsData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.datetime}</td><td>${row.air_temp}</td><td>${row.humidity}</td><td>${row.rain}</td><td>${row.water_temp}</td><td>${row.do}</td><td>${row.ph}</td>`;
            tbody.appendChild(tr);
        });
    }
}

let currentMode = 'manual';
let currentLocation = { latitude: 11.0168, longitude: 76.9558 };
let allChartData = null;
let charts = [null, null, null, null];
let lastPrediction = null;

const speciesThresholds = {
    general: { tempMin: 20, tempMax: 28, doMin: 5, doMax: 12, phMin: 6.5, phMax: 8.5, cultivationStart: 'March', cultivationEnd: 'October', startMonth: 3, endMonth: 10 },
    tilapia: { tempMin: 25, tempMax: 32, doMin: 3, doMax: 15, phMin: 6, phMax: 9, cultivationStart: 'April', cultivationEnd: 'September', startMonth: 4, endMonth: 9 },
    catfish: { tempMin: 24, tempMax: 30, doMin: 4, doMax: 12, phMin: 6.5, phMax: 8.5, cultivationStart: 'May', cultivationEnd: 'September', startMonth: 5, endMonth: 9 },
    salmon: { tempMin: 10, tempMax: 18, doMin: 7, doMax: 14, phMin: 6.5, phMax: 8, cultivationStart: 'October', cultivationEnd: 'April', startMonth: 10, endMonth: 4 },
    trout: { tempMin: 10, tempMax: 16, doMin: 7, doMax: 14, phMin: 6.5, phMax: 8, cultivationStart: 'October', cultivationEnd: 'March', startMonth: 10, endMonth: 3 },
    carp: { tempMin: 20, tempMax: 28, doMin: 4, doMax: 12, phMin: 6.5, phMax: 9, cultivationStart: 'April', cultivationEnd: 'October', startMonth: 4, endMonth: 10 },
    shrimp: { tempMin: 26, tempMax: 32, doMin: 4, doMax: 10, phMin: 7, phMax: 8.5, cultivationStart: 'May', cultivationEnd: 'August', startMonth: 5, endMonth: 8 },
    prawn: { tempMin: 26, tempMax: 31, doMin: 4, doMax: 10, phMin: 7, phMax: 8.5, cultivationStart: 'June', cultivationEnd: 'September', startMonth: 6, endMonth: 9 }
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
        
        // Save analytics data if it exists
        if (window.analyticsData) sessionStorage.setItem('aq_analytics_data', JSON.stringify(window.analyticsData));
        if (window.analyticsCsvData) sessionStorage.setItem('aq_analytics_csv', window.analyticsCsvData);
        
        // Save form values
        const formFields = {
            temperature: document.getElementById('temperature')?.value,
            dissolved_oxygen: document.getElementById('dissolved_oxygen')?.value,
            ph: document.getElementById('ph')?.value,
            latitude: document.getElementById('latitude')?.value,
            longitude: document.getElementById('longitude')?.value,
            locationSearch: document.getElementById('locationSearch')?.value,
            selectedLat: document.getElementById('selectedLat')?.value,
            selectedLon: document.getElementById('selectedLon')?.value,
            commonFromDate: document.getElementById('commonFromDate')?.value,
            commonToDate: document.getElementById('commonToDate')?.value,
            // Analytics form values
            analyticsLatitude: document.getElementById('analyticsLatitude')?.value,
            analyticsLongitude: document.getElementById('analyticsLongitude')?.value,
            analyticsLocationSearch: document.getElementById('analyticsLocationSearch')?.value,
            analyticsSelectedLat: document.getElementById('analyticsSelectedLat')?.value,
            analyticsSelectedLon: document.getElementById('analyticsSelectedLon')?.value,
            analyticsFromDate: document.getElementById('analyticsFromDate')?.value,
            analyticsToDate: document.getElementById('analyticsToDate')?.value
        };
        sessionStorage.setItem('aq_form_values', JSON.stringify(formFields));
        
        // Save chart controls visibility
        const chartControls = document.getElementById('chartDataControls');
        if (chartControls) {
            sessionStorage.setItem('aq_chart_controls_visible', chartControls.style.display !== 'none');
            const hint = document.getElementById('selectedLocationHint');
            if (hint) sessionStorage.setItem('aq_location_hint', hint.textContent);
        }
    } catch (e) { console.error('Save state error:', e); }
}

function loadSavedState() {
    try {
        const savedLocation = sessionStorage.getItem('aq_location');
        const savedData = sessionStorage.getItem('aq_data');
        const savedPrediction = sessionStorage.getItem('aq_prediction');
        const savedMode = sessionStorage.getItem('aq_mode');
        const savedSpecies = sessionStorage.getItem('aq_species');
        const savedFormValues = sessionStorage.getItem('aq_form_values');
        const chartControlsVisible = sessionStorage.getItem('aq_chart_controls_visible');
        const savedLocationHint = sessionStorage.getItem('aq_location_hint');
        const savedAnalyticsData = sessionStorage.getItem('aq_analytics_data');
        const savedAnalyticsCsv = sessionStorage.getItem('aq_analytics_csv');
        
        if (savedLocation) currentLocation = JSON.parse(savedLocation);
        if (savedData) allChartData = JSON.parse(savedData);
        if (savedMode) currentMode = savedMode;
        
        // Restore analytics data
        if (savedAnalyticsData) window.analyticsData = JSON.parse(savedAnalyticsData);
        if (savedAnalyticsCsv) window.analyticsCsvData = savedAnalyticsCsv;
        
        if (savedSpecies) {
            const speciesSelect = document.getElementById('species-select');
            if (speciesSelect) speciesSelect.value = savedSpecies;
        }
        
        // Restore form values
        if (savedFormValues) {
            const formFields = JSON.parse(savedFormValues);
            Object.keys(formFields).forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element && formFields[fieldId]) {
                    element.value = formFields[fieldId];
                }
            });
            
            // Update preset coordinates display if available
            const selectedLat = formFields.selectedLat;
            const selectedLon = formFields.selectedLon;
            if (selectedLat && selectedLon) {
                const coordsDisplay = document.getElementById('presetCoords');
                if (coordsDisplay) {
                    coordsDisplay.textContent = `Lat: ${selectedLat}, Lon: ${selectedLon}`;
                }
            }
            
            // Update analytics preset coordinates display if available
            const analyticsSelectedLat = formFields.analyticsSelectedLat;
            const analyticsSelectedLon = formFields.analyticsSelectedLon;
            if (analyticsSelectedLat && analyticsSelectedLon) {
                const analyticsPresetCoords = document.getElementById('analyticsPresetCoords');
                if (analyticsPresetCoords) {
                    analyticsPresetCoords.textContent = `Lat: ${analyticsSelectedLat}, Lon: ${analyticsSelectedLon}`;
                }
            }
        }
        
        // Restore chart controls visibility
        if (chartControlsVisible === 'true') {
            const chartControls = document.getElementById('chartDataControls');
            if (chartControls) {
                chartControls.style.display = 'block';
                const hint = document.getElementById('selectedLocationHint');
                if (hint && savedLocationHint) {
                    hint.textContent = savedLocationHint;
                }
            }
        }
        
        if (savedPrediction) {
            lastPrediction = JSON.parse(savedPrediction);
            setTimeout(() => restorePredictionUI(lastPrediction), 100);
        }
        
        if (savedMode) switchMode(savedMode);
        else {
            // Default to no mode selected - all forms hidden
            currentMode = null;
            const forms = ['predictionForm', 'locationForm', 'presetForm', 'futureForm'];
            forms.forEach(formId => {
                const form = document.getElementById(formId);
                if (form) form.style.display = 'none';
            });
            const buttons = ['manualBtn', 'locationBtn', 'presetBtn', 'futureBtn'];
            buttons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) btn.classList.remove('active');
            });
        }
        
        // Restore analytics table if on analytics page and data exists
        if (window.analyticsData && (window.location.pathname.includes('analytics') || window.location.href.includes('analytics'))) {
            setTimeout(() => restoreAnalyticsTable(), 100);
        }
        
        // Only restore charts if data exists and user is on dashboard - but don't trigger loading
        if (allChartData && allChartData.length > 0 && document.getElementById('chart1')) {
            // Just update the charts with existing data, no loading
            setTimeout(() => {
                for (let i = 1; i <= 4; i++) {
                    const emptyState = document.getElementById(`chart${i}EmptyState`);
                    if (emptyState) emptyState.style.display = 'none';
                    updateChart(i);
                }
            }, 100);
        }
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

// Old switchMode function removed - now using unified interface with switchLocationMode and switchPredictionMode

function clearChartsOnModeSwitch(mode) {
    // Destroy existing charts
    for (let i = 0; i < 4; i++) {
        if (charts[i]) {
            charts[i].destroy();
            charts[i] = null;
        }
    }
    
    // Show empty states for all charts
    for (let i = 1; i <= 4; i++) {
        const canvas = document.getElementById(`chart${i}`);
        const emptyState = document.getElementById(`chart${i}EmptyState`);
        if (canvas) canvas.style.display = 'block';
        if (emptyState) emptyState.style.display = 'block';
    }
    
    // Clear chart data if switching to manual mode
    if (mode === 'manual') {
        allChartData = null;
        // Clear chart-specific data
        for (let i = 1; i <= 4; i++) {
            delete window[`chart${i}Data`];
        }
        saveState();
    }
}

function updateChartEmptyStates(mode) {
    const emptyStates = {
        manual: {
            chart1: { title: 'Historical Trends Chart', message: 'This shows location-based historical trends. Your manual analysis appears in the sidebar panels.' },
            chart2: { title: 'Temperature History', message: 'Historical temperature trends require location data. Your current temperature analysis is in the sidebar.' },
            chart3: { title: 'Oxygen Level History', message: 'Historical dissolved oxygen trends require location data. Your current DO analysis is in the sidebar.' },
            chart4: { title: 'pH Level History', message: 'Historical pH trends require location data. Your current pH analysis is in the sidebar.' }
        },
        location: {
            chart1: { title: 'Historical Trends Chart', message: 'Select a location and date range, then click "Load Data" to view historical trends.' },
            chart2: { title: 'Temperature Trends', message: 'Click "Load Data" to view temperature history for your selected location.' },
            chart3: { title: 'Oxygen Level Trends', message: 'Click "Load Data" to view dissolved oxygen history for your selected location.' },
            chart4: { title: 'pH Level Trends', message: 'Click "Load Data" to view pH history for your selected location.' }
        }
    };
    
    const states = emptyStates[mode];
    for (let i = 1; i <= 4; i++) {
        const emptyState = document.getElementById(`chart${i}EmptyState`);
        if (emptyState && states[`chart${i}`]) {
            emptyState.innerHTML = `
                <p>${states[`chart${i}`].title}</p>
                <p>${states[`chart${i}`].message}</p>
            `;
            emptyState.style.display = 'block';
        }
    }
}

// Removed old functions - using unified interface now

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
    // Only update charts if data already exists, don't fetch new data
    if (allChartData && allChartData.length > 0) {
        for (let i = 1; i <= 4; i++) updateChart(i);
    }
    // Save state after date range change
    saveState();
}
window.applyCommonDateRange = applyCommonDateRange;

function refreshChartsData() {
    const btn = document.querySelector('button[onclick="refreshChartsData()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    
    showLoading('Loading Chart Data');
    
    // Use current location from the forms
    const lat = currentLocation.latitude || 11.0168;
    const lon = currentLocation.longitude || 76.9558;
    
    updateLoadingStep('Preparing data request...', 20);
    
    loadHistoricalData(lat, lon)
        .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = 'Load Chart Data'; }
            hideLoading();
        });
}
window.refreshChartsData = refreshChartsData;

function loadChartData(chartNum) {
    const fromDate = document.getElementById(`fromDate${chartNum}`)?.value;
    const toDate = document.getElementById(`toDate${chartNum}`)?.value;
    
    if (!fromDate || !toDate) {
        alert('Please select both From and To dates for the chart');
        return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
        alert('From date cannot be later than To date');
        return;
    }
    
    if (!currentLocation.latitude || !currentLocation.longitude) {
        alert('Please select a location first using GPS Coordinates or Select Location');
        return;
    }
    
    const btn = document.querySelector(`button[onclick="loadChartData(${chartNum})"]`);
    if (btn) { 
        btn.disabled = true; 
        btn.textContent = 'Loading...'; 
    }
    
    // Get chart-specific loading message
    const chartNames = {
        1: 'Combined Trends Chart',
        2: 'Temperature Chart', 
        3: 'Dissolved Oxygen Chart',
        4: 'pH Level Chart'
    };
    
    showLoading(`Loading ${chartNames[chartNum]} Data`);
    updateLoadingStep('Fetching data for selected date range...', 30);
    
    // Load data specifically for this chart's date range
    loadHistoricalDataForChart(currentLocation.latitude, currentLocation.longitude, fromDate, toDate, chartNum)
        .then(() => {
            updateLoadingStep('Data loaded successfully!', 100);
            setTimeout(() => hideLoading(), 500);
        })
        .catch(err => {
            alert('Failed to load data: ' + err.message);
            hideLoading();
        })
        .finally(() => {
            if (btn) { 
                btn.disabled = false; 
                btn.textContent = 'Load Data'; 
            }
        });
}
window.loadChartData = loadChartData;

async function loadHistoricalDataForChart(lat, lon, startDate, endDate, chartNum) {
    const latitude = lat || currentLocation.latitude || 11.0168;
    const longitude = lon || currentLocation.longitude || 76.9558;
    
    try {
        updateLoadingStep('Connecting to weather data API...', 30);
        await new Promise(resolve => setTimeout(resolve, 400));
        
        updateLoadingStep('Fetching historical weather data...', 50);
        const res = await fetch(addCacheBuster(`/api/fetch-data?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}`));
        
        updateLoadingStep('Processing weather data...', 70);
        const csvData = await res.json();
        
        if (csvData.error) { alert('Error loading data: ' + csvData.error); return; }
        
        if (csvData.data && csvData.data.length > 0) {
            updateLoadingStep('Preparing chart visualization...', 85);
            
            // Store chart-specific data
            const chartDataKey = `chart${chartNum}Data`;
            window[chartDataKey] = csvData.data;
            
            // Update only the specific chart
            updateLoadingStep('Rendering chart...', 95);
            setTimeout(() => updateSingleChart(chartNum, csvData.data), 100);
        } else {
            alert('No data available for this location and date range.');
        }
    } catch (err) {
        alert('Failed to load data: ' + err.message);
    }
}

function updateSingleChart(chartNum, data) {
    // Temporarily store the chart-specific data
    const originalData = allChartData;
    allChartData = data;
    
    // Update only the specific chart
    updateChart(chartNum);
    
    // Restore original data for other charts
    allChartData = originalData;
    
    // Store chart-specific data for future reference
    const chartDataKey = `chart${chartNum}Data`;
    window[chartDataKey] = data;
}

function updateAllCharts() {
    // Only update charts if data already exists, don't load new data
    if (allChartData && allChartData.length > 0) {
        for (let i = 1; i <= 4; i++) {
            updateChart(i);
        }
    }
    // Generate smart advisory when species changes
    generateSmartAdvisory();
    // Save state after species change
    saveState();
}
window.updateAllCharts = updateAllCharts;

function findCultivationPeriods(data, thresholds) {
    // This function now finds seasonal cultivation periods based on months
    const periods = [];
    const startMonth = thresholds.startMonth;
    const endMonth = thresholds.endMonth;
    
    // Find all years in the data
    const years = [...new Set(data.map(point => new Date(point.datetime).getFullYear()))];
    
    years.forEach(year => {
        let startDate, endDate;
        
        if (startMonth <= endMonth) {
            // Normal season (e.g., April to September)
            startDate = new Date(year, startMonth - 1, 1);
            endDate = new Date(year, endMonth, 0); // Last day of end month
        } else {
            // Cross-year season (e.g., October to April)
            startDate = new Date(year, startMonth - 1, 1);
            endDate = new Date(year + 1, endMonth, 0); // Last day of end month next year
        }
        
        // Find corresponding indices in the data
        const startIndex = data.findIndex(point => new Date(point.datetime) >= startDate);
        const endIndex = data.findIndex(point => new Date(point.datetime) > endDate);
        
        if (startIndex !== -1) {
            periods.push({
                start: startIndex,
                end: endIndex !== -1 ? endIndex - 1 : data.length - 1,
                year: year,
                season: `${thresholds.cultivationStart} - ${thresholds.cultivationEnd}`
            });
        }
    });
    
    return periods;
}

function createCultivationAnnotations(periods, labels, species) {
    // Create seasonal cultivation period indicators as additional datasets
    const cultivationDatasets = [];
    
    if (periods.length > 0) {
        // Create one combined dataset for all cultivation periods
        const cultivationData = labels.map((label, labelIndex) => {
            // Check if this label index falls within any cultivation period
            const isInCultivationPeriod = periods.some(period => 
                labelIndex >= period.start && labelIndex <= period.end
            );
            return isInCultivationPeriod ? 1 : null;
        });
        
        // Get season info from first period (they're all the same)
        const seasonInfo = periods[0].season;
        
        cultivationDatasets.push({
            label: `${species.charAt(0).toUpperCase() + species.slice(1)} Cultivation Season (${seasonInfo})`,
            data: cultivationData,
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            borderColor: 'rgba(34, 197, 94, 0.4)',
            borderWidth: 1,
            fill: true,
            stepped: true,
            pointRadius: 0,
            yAxisID: 'cultivation',
            order: 10 // Put behind main data
        });
    }
    
    return cultivationDatasets;
}

function generateSmartAdvisory() {
    const speciesSelect = document.getElementById('species-select');
    const species = speciesSelect ? speciesSelect.value : 'general';
    const thresholds = speciesThresholds[species];
    const advisoryDiv = document.getElementById('smartAdvisory');
    
    if (!advisoryDiv) return;
    
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    let messages = [];
    
    // Check if we're in cultivation season
    const isInSeason = isCurrentlyInCultivationSeason(currentMonth, thresholds);
    const daysUntilSeason = getDaysUntilCultivationSeason(today, thresholds);
    const daysUntilSeasonEnd = getDaysUntilSeasonEnd(today, thresholds);
    
    // Season-based advice
    if (isInSeason) {
        if (daysUntilSeasonEnd <= 30) {
            messages.push({
                type: 'warning',
                text: `⚠️ HARVEST ALERT: ${species.charAt(0).toUpperCase() + species.slice(1)} cultivation season ends in ${daysUntilSeasonEnd} days. Plan your harvest soon!`
            });
        } else {
            messages.push({
                type: 'optimal',
                text: `✅ OPTIMAL SEASON: Perfect time for ${species} cultivation! Season runs until ${thresholds.cultivationEnd}.`
            });
        }
    } else {
        if (daysUntilSeason <= 60) {
            messages.push({
                type: 'info',
                text: `📅 PREPARE: ${species.charAt(0).toUpperCase() + species.slice(1)} cultivation season starts in ${daysUntilSeason} days (${thresholds.cultivationStart}). Start preparing your ponds!`
            });
        } else {
            messages.push({
                type: 'warning',
                text: `❄️ OFF-SEASON: Not ideal time for ${species} cultivation. Best season: ${thresholds.cultivationStart} - ${thresholds.cultivationEnd}.`
            });
        }
    }
    
    // Water quality advice based on latest prediction
    if (lastPrediction && lastPrediction.predicted_values) {
        const temp = lastPrediction.predicted_values.water_temp;
        const do_val = lastPrediction.predicted_values.do;
        const ph = lastPrediction.predicted_values.ph;
        
        const tempOK = temp >= thresholds.tempMin && temp <= thresholds.tempMax;
        const doOK = do_val >= thresholds.doMin && do_val <= thresholds.doMax;
        const phOK = ph >= thresholds.phMin && ph <= thresholds.phMax;
        
        if (tempOK && doOK && phOK) {
            messages.push({
                type: 'optimal',
                text: `🌊 WATER QUALITY: Excellent! All parameters optimal for ${species} (Temp: ${temp}°C, DO: ${do_val} mg/L, pH: ${ph})`
            });
        } else {
            let issues = [];
            if (!tempOK) issues.push(`Temperature ${temp}°C (need ${thresholds.tempMin}-${thresholds.tempMax}°C)`);
            if (!doOK) issues.push(`DO ${do_val} mg/L (need ${thresholds.doMin}-${thresholds.doMax} mg/L)`);
            if (!phOK) issues.push(`pH ${ph} (need ${thresholds.phMin}-${thresholds.phMax})`);
            
            messages.push({
                type: 'critical',
                text: `⚠️ WATER ISSUES: ${issues.join(', ')}. Consider water treatment before stocking.`
            });
        }
    }
    
    // Location-based advice
    if (currentLocation.latitude && currentLocation.longitude) {
        const climate = getClimateAdvice(currentLocation.latitude);
        messages.push({
            type: 'info',
            text: `🌍 LOCATION: ${climate} Monitor weather patterns for optimal cultivation timing.`
        });
    }
    
    // Market timing advice
    const marketAdvice = getMarketTimingAdvice(species, currentMonth);
    if (marketAdvice) {
        messages.push({
            type: 'info',
            text: marketAdvice
        });
    }
    
    // Render messages
    let html = `<div style="margin-bottom: 0.5rem; font-weight: 600; color: var(--primary-color);">Advisory for ${currentDate}</div>`;
    
    messages.forEach(msg => {
        html += `<div class="advisory-message advisory-${msg.type}">${msg.text}</div>`;
    });
    
    advisoryDiv.innerHTML = html;
}

function isCurrentlyInCultivationSeason(currentMonth, thresholds) {
    const start = thresholds.startMonth;
    const end = thresholds.endMonth;
    
    if (start <= end) {
        return currentMonth >= start && currentMonth <= end;
    } else {
        // Cross-year season (e.g., Oct-Apr)
        return currentMonth >= start || currentMonth <= end;
    }
}

function getDaysUntilCultivationSeason(today, thresholds) {
    const currentYear = today.getFullYear();
    const startMonth = thresholds.startMonth;
    
    let nextSeasonStart = new Date(currentYear, startMonth - 1, 1);
    if (nextSeasonStart <= today) {
        nextSeasonStart = new Date(currentYear + 1, startMonth - 1, 1);
    }
    
    return Math.ceil((nextSeasonStart - today) / (1000 * 60 * 60 * 24));
}

function getDaysUntilSeasonEnd(today, thresholds) {
    const currentYear = today.getFullYear();
    const endMonth = thresholds.endMonth;
    
    let seasonEnd = new Date(currentYear, endMonth, 0); // Last day of end month
    if (seasonEnd <= today) {
        seasonEnd = new Date(currentYear + 1, endMonth, 0);
    }
    
    return Math.ceil((seasonEnd - today) / (1000 * 60 * 60 * 24));
}

function getClimateAdvice(latitude) {
    if (latitude > 23.5) return "Temperate climate - seasonal variations affect cultivation timing.";
    if (latitude > -23.5) return "Tropical/subtropical climate - year-round cultivation possible with proper management.";
    return "Southern climate - consider seasonal temperature variations.";
}

function getMarketTimingAdvice(species, currentMonth) {
    const marketTiming = {
        tilapia: { peak: [6, 7, 8], advice: "Peak demand in summer months" },
        salmon: { peak: [11, 12, 1], advice: "High demand during winter holidays" },
        catfish: { peak: [5, 6, 7], advice: "Popular during BBQ season" },
        shrimp: { peak: [11, 12, 1, 2], advice: "Premium prices during holiday season" },
        prawn: { peak: [11, 12, 1, 2], advice: "Festive season brings higher prices" },
        carp: { peak: [10, 11, 12], advice: "Traditional harvest season" }
    };
    
    const timing = marketTiming[species];
    if (timing && timing.peak.includes(currentMonth)) {
        return `💰 MARKET: ${timing.advice} - excellent timing for harvest!`;
    }
    return null;
}

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
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minDate = '2000-01-01';
    for (let i = 1; i <= 4; i++) {
        const f = document.getElementById(`fromDate${i}`);
        const t = document.getElementById(`toDate${i}`);
        if (f && t) { f.value = oneYearAgo; f.min = minDate; f.max = todayStr; t.value = todayStr; t.min = minDate; t.max = todayStr; }
    }
    ['csvFromDate','commonFromDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = oneYearAgo; el.min = minDate; el.max = todayStr; }
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
        updateLoadingStep('Connecting to weather data API...', 30);
        await new Promise(resolve => setTimeout(resolve, 400));
        
        updateLoadingStep('Fetching historical weather data...', 50);
        const res = await fetch(addCacheBuster(`/api/fetch-data?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}`));
        
        updateLoadingStep('Processing weather data...', 70);
        const csvData = await res.json();
        
        if (csvData.error) { alert('Error loading data: ' + csvData.error); return; }
        
        if (csvData.data && csvData.data.length > 0) {
            updateLoadingStep('Preparing chart visualizations...', 85);
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
            
            updateLoadingStep('Rendering charts...', 95);
            setTimeout(() => { for (let i = 1; i <= 4; i++) updateChart(i); }, 100);
        } else {
            alert('No data available for this location.');
        }
    } catch (err) {
        alert('Failed to load data: ' + err.message);
    }
}

function updateChart(chartNum) {
    // Check if chart has its own specific data
    const chartDataKey = `chart${chartNum}Data`;
    const chartSpecificData = window[chartDataKey];
    const dataToUse = chartSpecificData || allChartData;
    
    if (!dataToUse || !dataToUse.length) {
        // Show empty state if no data
        const emptyState = document.getElementById(`chart${chartNum}EmptyState`);
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    // Hide empty state when showing chart
    const emptyState = document.getElementById(`chart${chartNum}EmptyState`);
    if (emptyState) emptyState.style.display = 'none';

    const fromInput = document.getElementById(`fromDate${chartNum}`);
    const toInput = document.getElementById(`toDate${chartNum}`);
    const canvas = document.getElementById(`chart${chartNum}`);
    if (!canvas) return;

    let filtered = [...dataToUse];
    if (fromInput && toInput && fromInput.value && toInput.value) {
        const from = new Date(fromInput.value + 'T00:00:00');
        const to = new Date(toInput.value + 'T23:59:59');
        filtered = dataToUse.filter(r => {
            const d = new Date(r.datetime);
            return d >= from && d <= to;
        });
    }
    if (!filtered.length) { 
        console.warn(`No data for chart ${chartNum} in selected range`);
        // Show empty state if no data in range
        const emptyState = document.getElementById(`chart${chartNum}EmptyState`);
        if (emptyState) emptyState.style.display = 'block';
        return; 
    }

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
    
    // Find optimal cultivation periods (when all parameters are within range)
    const cultivationPeriods = findCultivationPeriods(sampled, th);

    if (chartNum === 1) {
        // Combined chart with multiple parameters and cultivation periods
        const cultivationDatasets = createCultivationAnnotations(cultivationPeriods, labels, species);
        
        charts[0] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    ...cultivationDatasets,
                    { label: 'Water Temp (°C)', data: sampled.map(r => r.water_temp), borderColor: '#FF6384', backgroundColor: 'rgba(255,99,132,0.1)', yAxisID: 'y', tension: 0.4, pointRadius: 0 },
                    { label: 'DO (mg/L)', data: sampled.map(r => r.do), borderColor: '#36A2EB', backgroundColor: 'rgba(54,162,235,0.1)', yAxisID: 'y1', tension: 0.4, pointRadius: 0 },
                    { label: 'pH', data: sampled.map(r => r.ph), borderColor: '#FFCE56', backgroundColor: 'rgba(255,206,86,0.1)', yAxisID: 'y2', tension: 0.4, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: false,
                plugins: { 
                    legend: { 
                        position: 'top',
                        labels: {
                            filter: function(legendItem, chartData) {
                                // Show cultivation periods in legend but make them distinguishable
                                return true;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
                    y: { position: 'left', title: { display: true, text: 'Temp (°C)' } },
                    y1: { position: 'right', title: { display: true, text: 'DO (mg/L)' }, grid: { drawOnChartArea: false } },
                    y2: { position: 'right', title: { display: true, text: 'pH' }, grid: { drawOnChartArea: false } },
                    cultivation: { display: false, min: 0, max: 1 }
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
        
        // Get cultivation period datasets
        const cultivationDatasets = createCultivationAnnotations(cultivationPeriods, labels, species);
        
        // Create datasets with main data, threshold lines, and cultivation periods
        const datasets = [
            ...cultivationDatasets,
            { label: c.label, data: c.data, borderColor: c.color, backgroundColor: c.bg, tension: 0.4, fill: true, pointRadius: 0 },
            { label: `Min (${c.min})`, data: Array(labels.length).fill(c.min), borderColor: c.color, backgroundColor: 'transparent', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
            { label: `Max (${c.max})`, data: Array(labels.length).fill(c.max), borderColor: c.color, backgroundColor: 'transparent', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false }
        ];
        
        charts[chartNum - 1] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: datasets
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: false,
                plugins: { 
                    legend: { 
                        position: 'top',
                        labels: {
                            filter: function(legendItem, chartData) {
                                // Hide threshold lines from legend but show cultivation periods
                                return !legendItem.text.includes('Min (') && !legendItem.text.includes('Max (');
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
                    y: {
                        title: { display: true, text: c.axis },
                        suggestedMin: Math.min(Math.min(...c.data), c.min) - (chartNum === 4 ? 0.5 : 1),
                        suggestedMax: Math.max(Math.max(...c.data), c.max) + (chartNum === 4 ? 0.5 : 1)
                    },
                    cultivation: { display: false, min: 0, max: 1 }
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
    // Generate smart advisory after prediction
    generateSmartAdvisory();
}

window.addEventListener('load', () => {
    console.log('Dashboard page loaded - unified interface');
    
    loadSavedState();
    initializeDateInputs();
    
    // Initialize the unified interface
    switchLocationMode('coords'); // Default to coordinates
    // No prediction mode selected by default - user must choose
    
    // Initialize empty states for charts
    for (let i = 1; i <= 4; i++) {
        const emptyState = document.getElementById(`chart${i}EmptyState`);
        if (emptyState && (!allChartData || !allChartData.length)) {
            emptyState.style.display = 'block';
        }
    }
    
    // Generate initial smart advisory
    setTimeout(() => generateSmartAdvisory(), 500);
    
    // Initialize future datetime picker with proper min value
    const futureDatetime = document.getElementById('futureDatetime');
    if (futureDatetime) {
        const now = new Date();
        // Add 1 hour to current time as minimum
        const minDateTime = new Date(now.getTime() + 60 * 60 * 1000);
        const minDateTimeString = minDateTime.toISOString().slice(0, 16);
        futureDatetime.min = minDateTimeString;
        
        // Set max to 1 year from now
        const maxDateTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        const maxDateTimeString = maxDateTime.toISOString().slice(0, 16);
        futureDatetime.max = maxDateTimeString;
        
        console.log('Future datetime picker initialized:', minDateTimeString, 'to', maxDateTimeString);
    }
    // Initialize empty states for charts
    for (let i = 1; i <= 4; i++) {
        const emptyState = document.getElementById(`chart${i}EmptyState`);
        if (emptyState && (!allChartData || !allChartData.length)) {
            emptyState.style.display = 'block';
        }
    }
    
    // Generate initial smart advisory
    setTimeout(() => generateSmartAdvisory(), 500);

    // All predictions now use the unified interface - no old form listeners needed

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Check if we're on analytics page and use analytics data
            const isAnalyticsPage = window.location.pathname.includes('analytics') || window.location.href.includes('analytics');
            
            console.log('Download CSV clicked');
            console.log('Current URL:', window.location.href);
            console.log('Current pathname:', window.location.pathname);
            console.log('Is analytics page:', isAnalyticsPage);
            console.log('window.analyticsData:', window.analyticsData);
            console.log('allChartData:', allChartData);
            
            const dataToDownload = isAnalyticsPage ? window.analyticsData : allChartData;
            
            if (!dataToDownload || !dataToDownload.length) { 
                console.log('No data available for download');
                alert(isAnalyticsPage ? 'No analytics data available. Please load data first.' : 'No data available.'); 
                return; 
            }
            
            console.log('Data to download:', dataToDownload.length, 'rows');
            
            // For analytics page, use the loaded date range; for dashboard, use CSV date inputs
            let data = dataToDownload;
            let fromDate = '', toDate = '';
            
            if (isAnalyticsPage) {
                // Analytics page - data is already filtered by the selected date range
                fromDate = document.getElementById('analyticsFromDate')?.value || 'all';
                toDate = document.getElementById('analyticsToDate')?.value || 'data';
                console.log('Analytics date range:', fromDate, 'to', toDate);
            } else {
                // Dashboard page - apply CSV date filter if specified
                const from = document.getElementById('csvFromDate') ? document.getElementById('csvFromDate').value : '';
                const to = document.getElementById('csvToDate') ? document.getElementById('csvToDate').value : '';
                if (from && to) {
                    const f = new Date(from), t = new Date(to);
                    t.setHours(23,59,59,999);
                    data = allChartData.filter(r => { const d = new Date(r.datetime); return d >= f && d <= t; });
                }
                fromDate = from || 'all';
                toDate = to || 'data';
            }
            
            if (!data || !data.length) { 
                console.log('No data after filtering');
                alert('No data for selected range.'); 
                return; 
            }
            
            console.log('Final data for CSV:', data.length, 'rows');
            
            let csv = 'DateTime,Air Temp,Humidity,Rain,Water Temp,DO,pH\n';
            data.forEach(r => { csv += `${r.datetime},${r.air_temp},${r.humidity},${r.rain},${r.water_temp},${r.do},${r.ph}\n`; });
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `water_quality_${fromDate}_to_${toDate}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            
            console.log('CSV download initiated');
        });
    }

    // Dashboard and analytics pages - no automatic data loading
    // Data will only load when user clicks Fetch/Predict buttons
});
