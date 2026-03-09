// Add this function after the existing prediction handlers

function updateFishHealthRisk(data) {
    if (data.predicted_values) {
        const risk = calculateFishHealthRisk(
            data.predicted_values.water_temp,
            data.predicted_values.do,
            data.predicted_values.ph
        );
        
        const riskDisplay = document.getElementById('riskDisplay');
        riskDisplay.className = 'risk-display ' + risk.class;
        document.getElementById('riskLevel').textContent = risk.level;
        document.getElementById('riskMessage').textContent = risk.message;
    }
}

// Call this function after displaying prediction results in all three form handlers:
// updateFishHealthRisk(data);
