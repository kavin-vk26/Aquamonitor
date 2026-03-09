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
    from tensorflow.keras.models import load_model
    
    lat = float(sys.argv[1])
    lon = float(sys.argv[2])
    species = sys.argv[3] if len(sys.argv) > 3 else 'general'
    
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    
    model_path = os.path.join(os.path.dirname(__file__), '..', 'water_qual_universal.keras')
    scaler_path = os.path.join(os.path.dirname(__file__), '..', 'water_qual_universal_scaler.pkl')
    
    if not os.path.exists(model_path):
        raise Exception("Model not found. Please train the model first.")
    
    # Load model and scaler
    model = load_model(model_path)
    with open(scaler_path, 'rb') as f:
        scaler_data = pickle.load(f)
    
    SEQ_HOURS = 24
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=2)
    
    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m"
        "&timezone=UTC"
    )
    
    data = requests.get(url).json()
    
    df = pd.DataFrame({
        "air_temp": data["hourly"]["temperature_2m"],
        "humidity": data["hourly"]["relativehumidity_2m"],
        "rain": data["hourly"]["precipitation"],
        "windspeed": data["hourly"]["windspeed_10m"]
    })
    
    df["water_temp"] = df["air_temp"] - 2
    df["do"] = 8.0
    df["ph"] = 7.3
    
    # Scale features
    scaler = MinMaxScaler()
    scaler.min_ = scaler_data['min_']
    scaler.scale_ = scaler_data['scale_']
    scaler.data_min_ = scaler_data['data_min_']
    scaler.data_max_ = scaler_data['data_max_']
    
    FEATURES = scaler_data['features']
    scaled = scaler.transform(df[FEATURES].tail(SEQ_HOURS))
    
    # Predict
    X = scaled.reshape(1, SEQ_HOURS, len(FEATURES))
    pred_scaled = model.predict(X, verbose=0)[0]
    
    # Inverse transform
    dummy = np.zeros((1, len(FEATURES)))
    dummy[0, 4:7] = pred_scaled
    pred_full = scaler.inverse_transform(dummy)[0]
    
    water_temp = round(pred_full[4], 2)
    do_val = round(pred_full[5], 2)
    ph_val = round(pred_full[6], 2)
    
    # Calculate quality score
    score = 0
    if thresholds['tempMin'] <= water_temp <= thresholds['tempMax']:
        score += 35
    elif thresholds['tempMin'] - 5 <= water_temp < thresholds['tempMin'] or thresholds['tempMax'] < water_temp <= thresholds['tempMax'] + 5:
        score += 20
    else:
        score += 5
    
    if do_val >= thresholds['doMin'] + 3:
        score += 40
    elif do_val >= thresholds['doMin']:
        score += 25
    else:
        score += 10
    
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
    
    recommendations = []
    if water_temp < thresholds['tempMin'] or water_temp > thresholds['tempMax']:
        recommendations.append(f"Temperature ({water_temp}°C) outside optimal range ({thresholds['tempMin']}-{thresholds['tempMax']}°C) for {species}")
    if do_val < thresholds['doMin']:
        recommendations.append(f"Dissolved oxygen ({do_val} mg/L) below minimum ({thresholds['doMin']} mg/L) for {species}. Consider aeration.")
    if ph_val < thresholds['phMin'] or ph_val > thresholds['phMax']:
        recommendations.append(f"pH ({ph_val}) outside optimal range ({thresholds['phMin']}-{thresholds['phMax']}) for {species}")
    if not recommendations:
        recommendations.append(f"All parameters are within optimal range for {species}")
    
    next_hour = datetime.now() + timedelta(hours=1)
    
    result = {
        'quality_score': round(score, 2),
        'quality_level': quality,
        'color': color,
        'recommendations': recommendations,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'predicted_values': {
            'water_temp': water_temp,
            'do': do_val,
            'ph': ph_val
        },
        'prediction_time': next_hour.strftime('%Y-%m-%d %H:%M:%S'),
        'location': {'latitude': lat, 'longitude': lon}
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
