// Multi-Location Farm Management JavaScript

let currentFarm = null;
let currentLocations = [];
let analysisResults = [];
let chartData = {};
let modalChart = null;
let selectedLocationForChart = null;

// Farm Authentication
async function loginFarm() {
    const farmName = document.getElementById('farmName').value.trim();
    const farmId = document.getElementById('farmId').value.trim();
    
    if (!farmName || !farmId) {
        alert('Please enter both farm name and farm ID');
        return;
    }
    
    showLoading('Authenticating farm...');
    
    try {
        const response = await fetch('/api/farm/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ farmName, farmId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentFarm = result.farm;
            showFarmDashboard();
            loadFarmLocations();
        } else {
            alert('Login failed: ' + result.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    } finally {
        hideLoading();
    }
}

// Show farm dashboard
function showFarmDashboard() {
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('farmDashboard').style.display = 'block';
    
    document.getElementById('farmTitle').textContent = currentFarm.name;
    document.getElementById('farmDetails').textContent = 
        `Farm ID: ${currentFarm.farmId} | Owner: ${currentFarm.ownerName || 'N/A'}`;
}

// Load farm locations
async function loadFarmLocations() {
    try {
        const response = await fetch(`/api/farm/${currentFarm.farmId}/locations`);
        const result = await response.json();
        
        if (result.success) {
            currentLocations = result.locations;
            displayLocations(result.locations);
        } else {
            console.error('Failed to load locations:', result.error);
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Display locations in table
function displayLocations(locations) {
    const tbody = document.getElementById('locationsTableBody');
    const noLocations = document.getElementById('noLocations');
    
    if (locations.length === 0) {
        tbody.innerHTML = '';
        noLocations.style.display = 'block';
        return;
    }
    
    noLocations.style.display = 'none';
    
    tbody.innerHTML = locations.map(location => `
        <tr>
            <td><input type="checkbox" class="location-checkbox" value="${location.id}"></td>
            <td>${location.pond_name}</td>
            <td>${parseFloat(location.latitude).toFixed(4)}, ${parseFloat(location.longitude).toFixed(4)}</td>
            <td>${location.species.charAt(0).toUpperCase() + location.species.slice(1)}</td>
            <td><span class="status-badge status-${location.status}">${location.status}</span></td>
            <td>${new Date(location.updated_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editLocation(${location.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLocation(${location.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Select/Deselect all locations
function selectAllLocations() {
    document.querySelectorAll('.location-checkbox').forEach(cb => cb.checked = true);
}

function deselectAllLocations() {
    document.querySelectorAll('.location-checkbox').forEach(cb => cb.checked = false);
}

// Analyze selected locations (FAST VERSION)
async function analyzeSelectedLocations() {
    const selectedIds = Array.from(document.querySelectorAll('.location-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedIds.length === 0) {
        alert('Please select at least one location to analyze');
        return;
    }
    
    showLoading(`Analyzing ${selectedIds.length} locations...`);
    
    try {
        const response = await fetch(`/api/farm/${currentFarm.farmId}/analyze-enhanced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationIds: selectedIds })
        });
        
        const result = await response.json();
        
        if (result.success) {
            analysisResults = result.results;
            displayAnalysisResults(result.results);
            document.getElementById('analysisResultsPanel').style.display = 'block';
        } else {
            alert('Analysis failed: ' + result.error);
        }
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed. Please try again.');
    } finally {
        hideLoading();
    }
}

// Display analysis results in original detailed format
function displayAnalysisResults(results) {
    const grid = document.getElementById('resultsGrid');
    const analyzedCount = document.getElementById('analyzedCount');
    const analysisTime = document.getElementById('analysisTime');
    
    analyzedCount.textContent = `${results.length} locations analyzed`;
    analysisTime.textContent = `Analysis completed at: ${new Date().toLocaleTimeString()}`;
    
    grid.innerHTML = results.map(result => {
        if (result.error) {
            return `
                <div class="result-card error-card">
                    <h4>${result.location.pond_name}</h4>
                    <p class="error-message">${result.error}</p>
                </div>
            `;
        }
        
        const current = result.current_analysis || {};
        const prediction = result.next_hour_prediction || {};
        const recommendations = result.ai_recommendations || [];
        
        const currentValues = current.predicted_values || {};
        const nextHourValues = prediction.predicted_values || {};
        const score = current.quality_score || 0;
        const riskLevel = current.risk_level || (score >= 80 ? 'LOW' : score >= 60 ? 'MODERATE' : 'HIGH');
        const riskClass = riskLevel.toLowerCase();
        
        return `
            <div class="result-card detailed-card" onclick="showLocationDetails(${result.location.id})">
                <div class="result-header">
                    <h4>${result.location.pond_name}</h4>
                    <div class="risk-badge risk-${riskClass}">${riskLevel} RISK</div>
                </div>
                
                <div class="result-coordinates">
                    📍 ${parseFloat(result.location.latitude).toFixed(4)}, ${parseFloat(result.location.longitude).toFixed(4)}
                </div>
                
                <div class="result-species">
                    🐟 ${result.location.species.charAt(0).toUpperCase() + result.location.species.slice(1)}
                </div>
                
                <!-- Current Analysis Section -->
                <div class="analysis-section">
                    <h5>📊 Current Water Quality</h5>
                    <div class="current-metrics">
                        <div class="metric">
                            <span class="metric-label">🌡️ Temperature</span>
                            <span class="metric-value">${currentValues.water_temp || 'N/A'}°C</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">💨 Dissolved Oxygen</span>
                            <span class="metric-value">${currentValues.do || 'N/A'} mg/L</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">⚗️ pH Level</span>
                            <span class="metric-value">${currentValues.ph || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="quality-score">
                        <span class="score-label">Quality Score:</span>
                        <span class="score-value score-${riskClass}">${score}/100</span>
                    </div>
                </div>
                
                <!-- Next Hour Prediction Section -->
                <div class="analysis-section">
                    <h5>🔮 Next Hour Prediction</h5>
                    <div class="prediction-metrics">
                        <div class="metric">
                            <span class="metric-label">🌡️ Temperature</span>
                            <span class="metric-value">${nextHourValues.water_temp || 'N/A'}°C</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">💨 Dissolved Oxygen</span>
                            <span class="metric-value">${nextHourValues.do || 'N/A'} mg/L</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">⚗️ pH Level</span>
                            <span class="metric-value">${nextHourValues.ph || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="prediction-info">
                        <span class="prediction-type">${prediction.prediction_type || 'LSTM'} Model</span>
                        <span class="prediction-confidence">Confidence: ${prediction.confidence || 'High'}</span>
                    </div>
                </div>
                
                <!-- AI Recommendations Section -->
                <div class="analysis-section">
                    <h5>🤖 AI Recommendations</h5>
                    <div class="recommendations-list">
                        ${recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('')}
                        ${recommendations.length === 0 ? '<div class="recommendation-item">No specific recommendations at this time.</div>' : ''}
                    </div>
                </div>
                
                <div class="result-actions">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showLocationCharts(${result.location.id})">📊 Charts</button>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); exportLocationData(${result.location.id})">📄 Export</button>
                </div>
            </div>
        `;
    }).join('');
}

// Show location details
function showLocationDetails(locationId) {
    const result = analysisResults.find(r => r.location.id === locationId);
    if (!result) return;
    
    const location = result.location;
    const current = result.current_analysis || {};
    const prediction = result.next_hour_prediction || {};
    const recommendations = result.ai_recommendations || [];
    
    const currentValues = current.predicted_values || {};
    const nextHourValues = prediction.predicted_values || {};
    
    const detailsHtml = `
        <div class="location-details">
            <h4>${location.pond_name}</h4>
            <div class="details-grid">
                <div class="detail-item">
                    <label>Coordinates:</label>
                    <span>${location.latitude}, ${location.longitude}</span>
                </div>
                <div class="detail-item">
                    <label>Species:</label>
                    <span>${location.species.charAt(0).toUpperCase() + location.species.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <label>Current Temperature:</label>
                    <span>${currentValues.water_temp || 'N/A'}°C</span>
                </div>
                <div class="detail-item">
                    <label>Current Dissolved Oxygen:</label>
                    <span>${currentValues.do || 'N/A'} mg/L</span>
                </div>
                <div class="detail-item">
                    <label>Current pH:</label>
                    <span>${currentValues.ph || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Quality Score:</label>
                    <span>${current.quality_score || 'N/A'}/100</span>
                </div>
                <div class="detail-item">
                    <label>Next Hour Temperature:</label>
                    <span>${nextHourValues.water_temp || 'N/A'}°C</span>
                </div>
                <div class="detail-item">
                    <label>Next Hour DO:</label>
                    <span>${nextHourValues.do || 'N/A'} mg/L</span>
                </div>
                <div class="detail-item">
                    <label>Next Hour pH:</label>
                    <span>${nextHourValues.ph || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Prediction Model:</label>
                    <span>${prediction.prediction_type || 'LSTM'}</span>
                </div>
            </div>
            <div class="recommendations">
                <h5>AI Recommendations:</h5>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    ${recommendations.length === 0 ? '<li>No specific recommendations at this time.</li>' : ''}
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('analysisDetails').innerHTML = detailsHtml;
    document.getElementById('analysisModalTitle').textContent = `${location.pond_name} - Analysis Details`;
    
    // Store location for chart/export functions
    selectedLocationForChart = result;
    
    document.getElementById('analysisModal').style.display = 'block';
}

// Show location charts
function showLocationCharts(locationId) {
    const result = analysisResults.find(r => r.location.id === locationId);
    if (!result) return;
    
    selectedLocationForChart = result;
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    document.getElementById('chartStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('chartEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('chartModalTitle').textContent = `${result.location.pond_name} - Water Quality Charts`;
    
    document.getElementById('chartModal').style.display = 'block';
}

// Load chart data
async function loadChartData() {
    if (!selectedLocationForChart) return;
    
    const startDate = document.getElementById('chartStartDate').value;
    const endDate = document.getElementById('chartEndDate').value;
    const location = selectedLocationForChart.location;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    document.getElementById('chartLoadingIndicator').style.display = 'block';
    
    try {
        const response = await fetch(`/api/fetch-data?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${startDate}&end_date=${endDate}`);
        const result = await response.json();
        
        if (result.error) {
            alert('Failed to load chart data: ' + result.error);
            return;
        }
        
        chartData = result;
        createChart(result.data, location.species);
        
    } catch (error) {
        console.error('Chart data error:', error);
        alert('Failed to load chart data');
    } finally {
        document.getElementById('chartLoadingIndicator').style.display = 'none';
    }
}

// Create chart
function createChart(data, species) {
    const ctx = document.getElementById('multiLocationChart').getContext('2d');
    
    if (modalChart) {
        modalChart.destroy();
    }
    
    const labels = data.map(row => new Date(row.datetime).toLocaleDateString());
    const temperatures = data.map(row => parseFloat(row.water_temp));
    const dissolvedOxygen = data.map(row => parseFloat(row.do));
    const phValues = data.map(row => parseFloat(row.ph));
    
    // Get species thresholds for reference lines
    const thresholds = getSpeciesThresholds(species);
    
    modalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'Dissolved Oxygen (mg/L)',
                    data: dissolvedOxygen,
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    yAxisID: 'y1'
                },
                {
                    label: 'pH',
                    data: phValues,
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
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
                        text: 'Dissolved Oxygen (mg/L)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
                y2: {
                    type: 'linear',
                    display: false,
                    min: 0,
                    max: 14
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Water Quality Trends - ${selectedLocationForChart.location.pond_name}`
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Get species thresholds
function getSpeciesThresholds(species) {
    const thresholds = {
        tilapia: { tempMin: 25, tempMax: 32, doMin: 3, phMin: 6, phMax: 9 },
        salmon: { tempMin: 10, tempMax: 18, doMin: 7, phMin: 6.5, phMax: 8 },
        catfish: { tempMin: 24, tempMax: 30, doMin: 4, phMin: 6.5, phMax: 8.5 },
        carp: { tempMin: 20, tempMax: 28, doMin: 4, phMin: 6.5, phMax: 9 },
        shrimp: { tempMin: 26, tempMax: 32, doMin: 4, phMin: 7, phMax: 8.5 },
        prawn: { tempMin: 26, tempMax: 31, doMin: 4, phMin: 7, phMax: 8.5 },
        trout: { tempMin: 10, tempMax: 16, doMin: 7, phMin: 6.5, phMax: 8 },
        general: { tempMin: 20, tempMax: 28, doMin: 5, phMin: 6.5, phMax: 8.5 }
    };
    return thresholds[species] || thresholds.general;
}

// Export all results
function exportAllResults() {
    if (!analysisResults || analysisResults.length === 0) {
        alert('No analysis results to export');
        return;
    }
    
    const csvData = [
        ['Multi-Location Analysis Report'],
        ['Farm:', currentFarm?.name || 'Unknown'],
        ['Generated:', new Date().toLocaleString()],
        ['Total Locations:', analysisResults.length],
        [''],
        ['Location Name', 'Coordinates', 'Species', 'Current Temp (°C)', 'Current DO (mg/L)', 'Current pH', 'Quality Score', 'Risk Level', 'Next Hour Temp', 'Next Hour DO', 'Next Hour pH', 'Prediction Model', 'Top Recommendations']
    ];
    
    analysisResults.forEach(result => {
        if (result.error) {
            csvData.push([
                result.location.pond_name,
                `${result.location.latitude}, ${result.location.longitude}`,
                result.location.species,
                'ERROR',
                'ERROR',
                'ERROR',
                'ERROR',
                'ERROR',
                'ERROR',
                'ERROR',
                'ERROR',
                'ERROR',
                result.error
            ]);
        } else {
            const current = result.current_analysis || {};
            const prediction = result.next_hour_prediction || {};
            const recommendations = result.ai_recommendations || [];
            
            const currentValues = current.predicted_values || {};
            const nextHourValues = prediction.predicted_values || {};
            const score = current.quality_score || 0;
            const riskLevel = current.risk_level || (score >= 80 ? 'LOW' : score >= 60 ? 'MODERATE' : 'HIGH');
            const topRecommendations = recommendations.slice(0, 2).join('; ');
            
            csvData.push([
                result.location.pond_name,
                `${result.location.latitude}, ${result.location.longitude}`,
                result.location.species,
                currentValues.water_temp || 'N/A',
                currentValues.do || 'N/A',
                currentValues.ph || 'N/A',
                score,
                riskLevel,
                nextHourValues.water_temp || 'N/A',
                nextHourValues.do || 'N/A',
                nextHourValues.ph || 'N/A',
                prediction.prediction_type || 'LSTM',
                topRecommendations
            ]);
        }
    });
    
    // Add detailed recommendations section
    csvData.push([''], ['Detailed AI Recommendations by Location'], ['']);
    
    analysisResults.forEach(result => {
        if (!result.error && result.ai_recommendations) {
            csvData.push([`${result.location.pond_name} AI Recommendations:`]);
            result.ai_recommendations.forEach(rec => {
                csvData.push(['', rec]);
            });
            csvData.push(['']);
        }
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvData, `multi_location_analysis_${currentFarm?.farmId || 'farm'}_${timestamp}.csv`);
}

// Export location data
function exportLocationData(locationId) {
    const result = analysisResults.find(r => r.location.id === locationId);
    if (!result) {
        alert('Location data not found');
        return;
    }
    
    const location = result.location;
    const current = result.current_analysis || {};
    const prediction = result.next_hour_prediction || {};
    const recommendations = result.ai_recommendations || [];
    
    const currentValues = current.predicted_values || {};
    const nextHourValues = prediction.predicted_values || {};
    
    const csvData = [
        ['Location Analysis Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Location Details'],
        ['Name', location.pond_name],
        ['Coordinates', `${location.latitude}, ${location.longitude}`],
        ['Species', location.species],
        ['Type', location.pond_type || 'N/A'],
        ['Status', location.status],
        [''],
        ['Current Water Quality'],
        ['Temperature (°C)', currentValues.water_temp || 'N/A'],
        ['Dissolved Oxygen (mg/L)', currentValues.do || 'N/A'],
        ['pH', currentValues.ph || 'N/A'],
        ['Quality Score', current.quality_score || 'N/A'],
        ['Risk Level', current.risk_level || 'N/A'],
        [''],
        ['Next Hour Predictions'],
        ['Temperature (°C)', nextHourValues.water_temp || 'N/A'],
        ['Dissolved Oxygen (mg/L)', nextHourValues.do || 'N/A'],
        ['pH', nextHourValues.ph || 'N/A'],
        ['Prediction Model', prediction.prediction_type || 'LSTM'],
        ['Confidence', prediction.confidence || 'High'],
        [''],
        ['AI Recommendations']
    ];
    
    // Add recommendations
    recommendations.forEach(rec => {
        csvData.push([rec]);
    });
    
    if (recommendations.length === 0) {
        csvData.push(['No specific recommendations at this time.']);
    }
    
    downloadCSV(csvData, `${location.pond_name}_analysis_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export chart data
function exportChartData() {
    if (!chartData || !chartData.data) {
        alert('No chart data available to export');
        return;
    }
    
    const location = selectedLocationForChart.location;
    const csvData = [
        ['Water Quality Historical Data'],
        ['Location:', location.pond_name],
        ['Coordinates:', `${location.latitude}, ${location.longitude}`],
        ['Species:', location.species],
        ['Export Date:', new Date().toLocaleString()],
        [''],
        ['Date', 'Time', 'Temperature (°C)', 'Dissolved Oxygen (mg/L)', 'pH']
    ];
    
    chartData.data.forEach(row => {
        const date = new Date(row.datetime);
        csvData.push([
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            row.water_temp,
            row.do,
            row.ph
        ]);
    });
    
    const startDate = document.getElementById('chartStartDate').value;
    const endDate = document.getElementById('chartEndDate').value;
    downloadCSV(csvData, `${location.pond_name}_data_${startDate}_to_${endDate}.csv`);
}

// Download CSV helper
function downloadCSV(data, filename) {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Modal functions
function closeAnalysisModal() {
    document.getElementById('analysisModal').style.display = 'none';
}

function closeChartModal() {
    document.getElementById('chartModal').style.display = 'none';
    if (modalChart) {
        modalChart.destroy();
        modalChart = null;
    }
}

// Loading functions
function showLoading(message) {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingIndicator').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

// Show registration modal
function showRegistrationModal() {
    document.getElementById('registrationModal').style.display = 'block';
}

// Close registration modal
function closeRegistrationModal() {
    document.getElementById('registrationModal').style.display = 'none';
    document.getElementById('registrationForm').reset();
}

// Register new farm
async function registerNewFarm() {
    const farmName = document.getElementById('regFarmName').value.trim();
    const farmId = document.getElementById('regFarmId').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const ownerName = document.getElementById('regOwnerName').value.trim();
    const contactEmail = document.getElementById('regContactEmail').value.trim();
    const contactPhone = document.getElementById('regContactPhone').value.trim();
    
    if (!farmName || !farmId || !password) {
        alert('Please fill in all required fields (Farm Name, Farm ID, and Password)');
        return;
    }
    
    showLoading('Registering new farm...');
    
    try {
        const response = await fetch('/api/farm/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                farmName,
                farmId,
                password,
                ownerName,
                contactEmail,
                contactPhone
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Farm "${farmName}" registered successfully!\nFarm ID: ${farmId}\nYou can now login with these credentials.`);
            closeRegistrationModal();
            // Auto-fill login form
            document.getElementById('farmName').value = farmName;
            document.getElementById('farmId').value = farmId;
        } else {
            alert('Registration failed: ' + result.error);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    } finally {
        hideLoading();
    }
}

// Add location modal functions
function showAddLocationModal() {
    document.getElementById('modalTitle').textContent = 'Add New Location';
    document.getElementById('locationForm').reset();
    document.getElementById('saveLocationBtn').textContent = '💾 Save Location';
    
    // Remove any existing event listeners and set new one
    const saveBtn = document.getElementById('saveLocationBtn');
    saveBtn.replaceWith(saveBtn.cloneNode(true)); // Remove all event listeners
    document.getElementById('saveLocationBtn').addEventListener('click', saveLocation);
    
    document.getElementById('locationModal').style.display = 'block';
}

// Edit location function
function editLocation(locationId) {
    const location = currentLocations.find(l => l.id === locationId);
    if (!location) {
        alert('Location not found');
        return;
    }
    
    // Fill form with existing data
    document.getElementById('modalTitle').textContent = 'Edit Location';
    document.getElementById('locationName').value = location.pond_name;
    document.getElementById('locationLat').value = location.latitude;
    document.getElementById('locationLon').value = location.longitude;
    document.getElementById('locationSpecies').value = location.species;
    document.getElementById('locationSecondarySpecies').value = location.secondary_species || '';
    document.getElementById('locationType').value = location.pond_type || 'pond';
    document.getElementById('locationStatus').value = location.status || 'active';
    document.getElementById('locationNotes').value = location.notes || '';
    
    // Change button text and function
    document.getElementById('saveLocationBtn').textContent = '✏️ Update Location';
    
    // Remove any existing event listeners and set new one
    const saveBtn = document.getElementById('saveLocationBtn');
    saveBtn.replaceWith(saveBtn.cloneNode(true)); // Remove all event listeners
    document.getElementById('saveLocationBtn').addEventListener('click', () => updateLocation(locationId));
    
    document.getElementById('locationModal').style.display = 'block';
}

// Delete location function
async function deleteLocation(locationId) {
    const location = currentLocations.find(l => l.id === locationId);
    if (!location) {
        alert('Location not found');
        return;
    }
    
    const confirmDelete = confirm(`Are you sure you want to delete "${location.pond_name}"?\n\nThis action cannot be undone.`);
    if (!confirmDelete) {
        return;
    }
    
    showLoading(`Deleting ${location.pond_name}...`);
    
    try {
        const response = await fetch(`/api/farm/${currentFarm.farmId}/locations/${locationId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Location "${location.pond_name}" deleted successfully!`);
            loadFarmLocations(); // Reload the locations list
        } else {
            alert('Failed to delete location: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting location:', error);
        alert('Failed to delete location. Please try again.');
    } finally {
        hideLoading();
    }
}

function closeLocationModal() {
    document.getElementById('locationModal').style.display = 'none';
    document.getElementById('locationForm').reset();
    
    // Reset button to default state
    const saveBtn = document.getElementById('saveLocationBtn');
    saveBtn.textContent = '💾 Save Location';
    
    // Remove all event listeners and set default
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    document.getElementById('saveLocationBtn').addEventListener('click', saveLocation);
}

// Save location (for new locations)
async function saveLocation() {
    const formData = {
        locationName: document.getElementById('locationName').value,
        latitude: document.getElementById('locationLat').value,
        longitude: document.getElementById('locationLon').value,
        primarySpecies: document.getElementById('locationSpecies').value,
        secondarySpecies: document.getElementById('locationSecondarySpecies').value,
        locationType: document.getElementById('locationType').value,
        status: document.getElementById('locationStatus').value,
        notes: document.getElementById('locationNotes').value
    };
    
    if (!formData.locationName || !formData.latitude || !formData.longitude || !formData.primarySpecies) {
        alert('Please fill in all required fields');
        return;
    }
    
    showLoading('Adding new location...');
    
    try {
        const response = await fetch(`/api/farm/${currentFarm.farmId}/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeLocationModal();
            loadFarmLocations();
            alert('Location added successfully!');
        } else {
            alert('Failed to add location: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving location:', error);
        alert('Failed to save location');
    } finally {
        hideLoading();
    }
}

// Update location (for editing existing locations)
async function updateLocation(locationId) {
    const formData = {
        locationName: document.getElementById('locationName').value,
        latitude: document.getElementById('locationLat').value,
        longitude: document.getElementById('locationLon').value,
        primarySpecies: document.getElementById('locationSpecies').value,
        secondarySpecies: document.getElementById('locationSecondarySpecies').value,
        locationType: document.getElementById('locationType').value,
        status: document.getElementById('locationStatus').value,
        notes: document.getElementById('locationNotes').value
    };
    
    if (!formData.locationName || !formData.latitude || !formData.longitude || !formData.primarySpecies) {
        alert('Please fill in all required fields');
        return;
    }
    
    showLoading('Updating location...');
    
    try {
        const response = await fetch(`/api/farm/${currentFarm.farmId}/locations/${locationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeLocationModal();
            loadFarmLocations();
            alert('Location updated successfully!');
        } else {
            alert('Failed to update location: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating location:', error);
        alert('Failed to update location');
    } finally {
        hideLoading();
    }
}

// Logout
function logout() {
    currentFarm = null;
    currentLocations = [];
    analysisResults = [];
    document.getElementById('farmDashboard').style.display = 'none';
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('farmName').value = '';
    document.getElementById('farmId').value = '';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login and registration buttons
    document.getElementById('loginBtn').addEventListener('click', loginFarm);
    document.getElementById('registerFarmBtn').addEventListener('click', showRegistrationModal);
    document.getElementById('saveRegistrationBtn').addEventListener('click', registerNewFarm);
    
    // Location management buttons
    document.getElementById('addLocationBtn').addEventListener('click', showAddLocationModal);
    document.getElementById('selectAllBtn').addEventListener('click', selectAllLocations);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAllLocations);
    document.getElementById('analyzeSelectedBtn').addEventListener('click', analyzeSelectedLocations);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Modal buttons - Remove the saveLocationBtn listener from here since it's handled dynamically
    document.getElementById('viewChartsBtn').addEventListener('click', () => {
        if (selectedLocationForChart) {
            closeAnalysisModal();
            showLocationCharts(selectedLocationForChart.location.id);
        }
    });
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        if (selectedLocationForChart) {
            exportLocationData(selectedLocationForChart.location.id);
        }
    });
    document.getElementById('exportResultsBtn').addEventListener('click', exportAllResults);
    
    // Chart modal buttons
    document.getElementById('loadChartDataBtn').addEventListener('click', loadChartData);
    document.getElementById('exportChartDataBtn').addEventListener('click', exportChartData);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const analysisModal = document.getElementById('analysisModal');
        const chartModal = document.getElementById('chartModal');
        const locationModal = document.getElementById('locationModal');
        
        if (event.target === analysisModal) {
            closeAnalysisModal();
        }
        if (event.target === chartModal) {
            closeChartModal();
        }
        if (event.target === locationModal) {
            closeLocationModal();
        }
    });
});

// Make functions globally accessible
window.showRegistrationModal = showRegistrationModal;
window.closeRegistrationModal = closeRegistrationModal;
window.registerNewFarm = registerNewFarm;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;