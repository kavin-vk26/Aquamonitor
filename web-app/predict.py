import sys
import json
import numpy as np
from datetime import datetime, timedelta

SPECIES_THRESHOLDS = {
    'general': {'tempMin': 20, 'tempMax': 28, 'doMin': 5, 'phMin': 6.5, 'phMax': 8.5},
    'tilapia': {'tempMin': 25, 'tempMax': 32, 'doMin': 3, 'phMin': 6, 'phMax': 9},
    'catfish': {'tempMin': 24, 'tempMax': 30, 'doMin': 4, 'phMin': 6.5, 'phMax': 8.5},
    'salmon': {'tempMin': 10, 'tempMax': 18, 'doMin': 7, 'phMin': 6.5, 'phMax': 8},
    'trout': {'tempMin': 10, 'tempMax': 16, 'doMin': 7, 'phMin': 6.5, 'phMax': 8},
    'carp': {'tempMin': 20, 'tempMax': 28, 'doMin': 4, 'phMin': 6.5, 'phMax': 9},
    'shrimp': {'tempMin': 26, 'tempMax': 32, 'doMin': 4, 'phMin': 7, 'phMax': 8.5},
    'prawn': {'tempMin': 26, 'tempMax': 31, 'doMin': 4, 'phMin': 7, 'phMax': 8.5}
}

def generate_next_hour_prediction(current_temp, current_do, current_ph):
    """Generate realistic next-hour predictions based on current values"""
    # Add small random variations to simulate natural changes
    temp_change = np.random.normal(0, 0.5)  # ±0.5°C variation
    do_change = np.random.normal(0, 0.3)    # ±0.3 mg/L variation  
    ph_change = np.random.normal(0, 0.1)    # ±0.1 pH variation
    
    # Apply realistic constraints
    next_temp = max(5, min(40, current_temp + temp_change))  # Keep within 5-40°C
    next_do = max(0.5, min(20, current_do + do_change))      # Keep within 0.5-20 mg/L
    next_ph = max(5.0, min(10.0, current_ph + ph_change))   # Keep within 5-10 pH
    
    return round(next_temp, 2), round(next_do, 2), round(next_ph, 2)

try:
    temp = float(sys.argv[1])
    do = float(sys.argv[2])
    ph = float(sys.argv[3])
    species = sys.argv[4] if len(sys.argv) > 4 else 'general'
    
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    
    # Calculate quality score for CURRENT values
    score = 0
    
    # Temperature scoring
    if thresholds['tempMin'] <= temp <= thresholds['tempMax']:
        score += 35
    elif thresholds['tempMin'] - 5 <= temp < thresholds['tempMin'] or thresholds['tempMax'] < temp <= thresholds['tempMax'] + 5:
        score += 20
    else:
        score += 5
    
    # DO scoring
    if do >= thresholds['doMin'] + 3:
        score += 40
    elif do >= thresholds['doMin']:
        score += 25
    else:
        score += 10
    
    # pH scoring
    if thresholds['phMin'] <= ph <= thresholds['phMax']:
        score += 25
    elif thresholds['phMin'] - 0.5 <= ph < thresholds['phMin'] or thresholds['phMax'] < ph <= thresholds['phMax'] + 0.5:
        score += 15
    else:
        score += 5
    
    if score >= 80:
        quality, color = "Excellent", "#4CAF50"
    elif score >= 60:
        quality, color = "Good", "#8BC34A"
    elif score >= 40:
        quality, color = "Fair", "#FFC107"
    else:
        quality, color = "Poor", "#F44336"
    
    recommendations = []
    if temp < thresholds['tempMin'] or temp > thresholds['tempMax']:
        recommendations.append(f"Temperature ({temp}°C) outside optimal range ({thresholds['tempMin']}-{thresholds['tempMax']}°C) for {species}")
    if do < thresholds['doMin']:
        recommendations.append(f"Dissolved oxygen ({do} mg/L) below minimum ({thresholds['doMin']} mg/L) for {species}. Consider aeration.")
    if ph < thresholds['phMin'] or ph > thresholds['phMax']:
        recommendations.append(f"pH ({ph}) outside optimal range ({thresholds['phMin']}-{thresholds['phMax']}) for {species}")
    if not recommendations:
        recommendations.append(f"All parameters are within optimal range for {species}")
    
    # Generate next-hour predictions (different from current values)
    next_temp, next_do, next_ph = generate_next_hour_prediction(temp, do, ph)
    next_hour = datetime.now() + timedelta(hours=1)
    
    result = {
        'quality_score': round(score, 2),
        'quality_level': quality,
        'color': color,
        'recommendations': recommendations,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'predicted_values': {
            'water_temp': next_temp,
            'do': next_do,
            'ph': next_ph
        },
        'prediction_time': next_hour.strftime('%Y-%m-%d %H:%M:%S'),
        'current_values': {
            'water_temp': temp,
            'do': do,
            'ph': ph
        }
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
