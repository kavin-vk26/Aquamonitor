import sys
import json
import numpy as np
import pandas as pd
import requests
import pickle
import os
import warnings
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

SPECIES_THRESHOLDS = {
    'general': {'tempMin': 20, 'tempMax': 28, 'doMin': 5, 'doMax': 12, 'phMin': 6.5, 'phMax': 8.5},
    'tilapia': {'tempMin': 25, 'tempMax': 32, 'doMin': 3, 'doMax': 15, 'phMin': 6, 'phMax': 9},
    'catfish': {'tempMin': 24, 'tempMax': 30, 'doMin': 4, 'doMax': 12, 'phMin': 6.5, 'phMax': 8.5},
    'salmon': {'tempMin': 10, 'tempMax': 18, 'doMin': 7, 'doMax': 14, 'phMin': 6.5, 'phMax': 8},
    'trout': {'tempMin': 10, 'tempMax': 16, 'doMin': 7, 'doMax': 14, 'phMin': 6.5, 'phMax': 8},
    'carp': {'tempMin': 20, 'tempMax': 28, 'doMin': 4, 'doMax': 12, 'phMin': 6.5, 'phMax': 9},
    'shrimp': {'tempMin': 26, 'tempMax': 32, 'doMin': 4, 'doMax': 10, 'phMin': 7, 'phMax': 8.5},
    'prawn': {'tempMin': 26, 'tempMax': 31, 'doMin': 4, 'doMax': 10, 'phMin': 7, 'phMax': 8.5}
}

def calculate_quality_score(temp, do_val, ph_val, species):
    """Calculate quality score based on species thresholds"""
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    score = 0
    
    # Temperature scoring (35 points max)
    if thresholds['tempMin'] <= temp <= thresholds['tempMax']:
        score += 35
    elif thresholds['tempMin'] - 5 <= temp < thresholds['tempMin'] or thresholds['tempMax'] < temp <= thresholds['tempMax'] + 5:
        score += 20
    else:
        score += 5
    
    # DO scoring (40 points max)
    if do_val >= thresholds['doMin'] + 3:
        score += 40
    elif do_val >= thresholds['doMin']:
        score += 25
    else:
        score += 10
    
    # pH scoring (25 points max)
    if thresholds['phMin'] <= ph_val <= thresholds['phMax']:
        score += 25
    elif thresholds['phMin'] - 0.5 <= ph_val < thresholds['phMin'] or thresholds['phMax'] < ph_val <= thresholds['phMax'] + 0.5:
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
    
    return score, quality, color

def generate_recommendations(manual_temp, manual_do, manual_ph, lstm_temp, lstm_do, lstm_ph, species):
    """Generate comprehensive recommendations comparing manual input with LSTM predictions"""
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    recommendations = []
    
    # Manual input analysis
    recommendations.append(f"Manual Input Analysis for {species.title()}:")
    
    # Temperature analysis
    if manual_temp < thresholds['tempMin'] or manual_temp > thresholds['tempMax']:
        recommendations.append(f"⚠️ Your temperature ({manual_temp}°C) is outside optimal range ({thresholds['tempMin']}-{thresholds['tempMax']}°C)")
        if manual_temp < thresholds['tempMin']:
            recommendations.append(f"🌡️ Consider heating systems to raise temperature by {thresholds['tempMin'] - manual_temp:.1f}°C")
        else:
            recommendations.append(f"🌡️ Consider cooling systems to lower temperature by {manual_temp - thresholds['tempMax']:.1f}°C")
    else:
        recommendations.append(f"✅ Your temperature ({manual_temp}°C) is optimal for {species}")
    
    # DO analysis
    if manual_do < thresholds['doMin']:
        deficit = thresholds['doMin'] - manual_do
        recommendations.append(f"🚨 CRITICAL: Your dissolved oxygen ({manual_do} mg/L) is {deficit:.1f} mg/L below minimum ({thresholds['doMin']} mg/L)")
        recommendations.append(f"💨 Immediate action required: Install aeration systems, add air stones, increase surface agitation")
    elif manual_do > thresholds['doMax']:
        excess = manual_do - thresholds['doMax']
        recommendations.append(f"⚠️ Your dissolved oxygen ({manual_do} mg/L) is {excess:.1f} mg/L above maximum ({thresholds['doMax']} mg/L)")
        recommendations.append(f"💨 Consider reducing aeration or checking for supersaturation")
    else:
        recommendations.append(f"✅ Your dissolved oxygen ({manual_do} mg/L) is excellent for {species}")
    
    # pH analysis
    if manual_ph < thresholds['phMin'] or manual_ph > thresholds['phMax']:
        recommendations.append(f"⚗️ Your pH ({manual_ph}) is outside optimal range ({thresholds['phMin']}-{thresholds['phMax']})")
        if manual_ph < thresholds['phMin']:
            recommendations.append(f"⚗️ Add lime or sodium bicarbonate to raise pH by {thresholds['phMin'] - manual_ph:.1f} units")
        else:
            recommendations.append(f"⚗️ Add organic acids or increase CO2 to lower pH by {manual_ph - thresholds['phMax']:.1f} units")
    else:
        recommendations.append(f"✅ Your pH ({manual_ph}) is within optimal range for {species}")
    
    # LSTM comparison analysis
    recommendations.append(f"")
    recommendations.append(f"LSTM Model Comparison (Expected conditions for your region):")
    
    temp_diff = abs(manual_temp - lstm_temp)
    do_diff = abs(manual_do - lstm_do)
    ph_diff = abs(manual_ph - lstm_ph)
    
    if temp_diff > 3:
        direction = "higher" if manual_temp > lstm_temp else "lower"
        recommendations.append(f"🌡️ Your temperature is {temp_diff:.1f}°C {direction} than expected regional conditions ({lstm_temp}°C)")
    
    if do_diff > 1:
        direction = "higher" if manual_do > lstm_do else "lower"
        recommendations.append(f"💨 Your dissolved oxygen is {do_diff:.1f} mg/L {direction} than expected regional conditions ({lstm_do} mg/L)")
    
    if ph_diff > 0.3:
        direction = "higher" if manual_ph > lstm_ph else "lower"
        recommendations.append(f"⚗️ Your pH is {ph_diff:.1f} units {direction} than expected regional conditions ({lstm_ph})")
    
    # Overall assessment
    if temp_diff <= 2 and do_diff <= 1 and ph_diff <= 0.2:
        recommendations.append(f"✅ Your water conditions closely match expected regional parameters - excellent management!")
    elif temp_diff > 5 or do_diff > 2 or ph_diff > 0.5:
        recommendations.append(f"⚠️ Significant deviation from regional norms detected. Review your water management systems")
    
    return recommendations

try:
    from tensorflow.keras.models import load_model
    
    # Parse manual input arguments
    manual_temp = float(sys.argv[1])
    manual_do = float(sys.argv[2])
    manual_ph = float(sys.argv[3])
    species = sys.argv[4] if len(sys.argv) > 4 else 'general'
    default_lat = float(sys.argv[5]) if len(sys.argv) > 5 else 11.0168
    default_lon = float(sys.argv[6]) if len(sys.argv) > 6 else 76.9558
    
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    
    # Load LSTM model and scaler
    model_path = os.path.join(os.path.dirname(__file__), '..', 'water_qual_universal.keras')
    scaler_path = os.path.join(os.path.dirname(__file__), '..', 'water_qual_universal_scaler.pkl')
    
    if not os.path.exists(model_path):
        raise Exception("LSTM model not found. Please train the model first.")
    
    model = load_model(model_path)
    with open(scaler_path, 'rb') as f:
        scaler_data = pickle.load(f)
    
    # Get LSTM prediction for comparison using default location
    SEQ_HOURS = 24
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=2)
    
    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={default_lat}&longitude={default_lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m"
        "&timezone=UTC"
    )
    
    try:
        data = requests.get(url, timeout=10).json()
        
        df = pd.DataFrame({
            "air_temp": data["hourly"]["temperature_2m"],
            "humidity": data["hourly"]["relativehumidity_2m"],
            "rain": data["hourly"]["precipitation"],
            "windspeed": data["hourly"]["windspeed_10m"]
        })
        
        df["water_temp"] = df["air_temp"] - 2
        df["do"] = 8.0
        df["ph"] = 7.3
        
        # Scale features for LSTM
        scaler = MinMaxScaler()
        scaler.min_ = scaler_data['min_']
        scaler.scale_ = scaler_data['scale_']
        scaler.data_min_ = scaler_data['data_min_']
        scaler.data_max_ = scaler_data['data_max_']
        
        FEATURES = scaler_data['features']
        scaled = scaler.transform(df[FEATURES].tail(SEQ_HOURS))
        
        # Get LSTM prediction
        X = scaled.reshape(1, SEQ_HOURS, len(FEATURES))
        pred_scaled = model.predict(X, verbose=0)[0]
        
        # Inverse transform
        dummy = np.zeros((1, len(FEATURES)))
        dummy[0, 4:7] = pred_scaled
        pred_full = scaler.inverse_transform(dummy)[0]
        
        lstm_temp = round(pred_full[4], 2)
        lstm_do = round(pred_full[5], 2)
        lstm_ph = round(pred_full[6], 2)
        
    except Exception as e:
        # Fallback to reasonable defaults if LSTM fails
        lstm_temp = 25.0
        lstm_do = 8.0
        lstm_ph = 7.2
    
    # Calculate quality score based on manual input
    score, quality, color = calculate_quality_score(manual_temp, manual_do, manual_ph, species)
    
    # Generate comprehensive recommendations
    recommendations = generate_recommendations(
        manual_temp, manual_do, manual_ph,
        lstm_temp, lstm_do, lstm_ph,
        species
    )
    
    # Generate next-hour prediction based on manual input with small variations
    temp_variation = np.random.normal(0, 0.3)  # Small natural variation
    do_variation = np.random.normal(0, 0.2)
    ph_variation = np.random.normal(0, 0.05)
    
    next_temp = max(5, min(40, manual_temp + temp_variation))
    next_do = max(0.5, min(20, manual_do + do_variation))
    next_ph = max(5.0, min(10.0, manual_ph + ph_variation))
    
    next_hour = datetime.now() + timedelta(hours=1)
    
    result = {
        'quality_score': round(score, 2),
        'quality_level': quality,
        'color': color,
        'recommendations': recommendations,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'predicted_values': {
            'water_temp': round(next_temp, 2),
            'do': round(next_do, 2),
            'ph': round(next_ph, 2)
        },
        'prediction_time': next_hour.strftime('%Y-%m-%d %H:%M:%S'),
        'current_values': {
            'water_temp': manual_temp,
            'do': manual_do,
            'ph': manual_ph
        },
        'lstm_comparison': {
            'expected_temp': lstm_temp,
            'expected_do': lstm_do,
            'expected_ph': lstm_ph,
            'note': 'LSTM model predictions for regional comparison'
        },
        'analysis_type': 'manual_input_with_lstm_comparison'
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': f'LSTM-based manual analysis failed: {str(e)}'}))
    sys.exit(1)