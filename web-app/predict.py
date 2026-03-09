import sys
import json
from datetime import datetime

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

try:
    temp = float(sys.argv[1])
    do = float(sys.argv[2])
    ph = float(sys.argv[3])
    species = sys.argv[4] if len(sys.argv) > 4 else 'general'
    
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    
    # Calculate quality score
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
    
    result = {
        'quality_score': round(score, 2),
        'quality_level': quality,
        'color': color,
        'recommendations': recommendations,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'predicted_values': {
            'water_temp': temp,
            'do': do,
            'ph': ph
        },
        'prediction_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
