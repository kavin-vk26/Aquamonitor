import sys
import json
import pandas as pd
import numpy as np
import requests
import os
import pickle
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
import warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    from tensorflow.keras.models import load_model
    
    # Get parameters from command line
    lat = float(sys.argv[1])
    lon = float(sys.argv[2])
    target_datetime = sys.argv[3]  # Format: "2024-12-25 14:30"
    species = sys.argv[4] if len(sys.argv) > 4 else 'general'
    
    # Species thresholds for risk assessment
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
    
    thresholds = SPECIES_THRESHOLDS.get(species, SPECIES_THRESHOLDS['general'])
    
    # Check if we have the universal model (fallback to creating a simple model)
    model_path = os.path.join(os.path.dirname(__file__), '..', 'water_qual_universal.keras')
    scaler_path = os.path.join(os.path.dirname(__file__), '..', 'water_qual_universal_scaler.pkl')
    
    # If universal model doesn't exist, create training data and simple model
    if not os.path.exists(model_path):
        # Fetch training data
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=365)
        
        url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&hourly=temperature_2m,relativehumidity_2m,precipitation&timezone=UTC"
        
        response = requests.get(url).json()
        df = pd.DataFrame({
            "datetime": pd.to_datetime(response["hourly"]["time"]),
            "air_temp": response["hourly"]["temperature_2m"],
            "humidity": response["hourly"]["relativehumidity_2m"],
            "rain": response["hourly"]["precipitation"]
        })
        
        # Generate water quality parameters using soft-sensing
        wt, do, ph, prev_tw = [], [], [], None
        for _, r in df.iterrows():
            tw = r.air_temp - 1 if prev_tw is None else 0.7 * prev_tw + 0.3 * (r.air_temp - 1)
            d = np.clip((14.6 - 0.2 * tw) * (1 + (r.humidity - 50) / 500), 2, 14)
            p = np.clip(7.4 + 0.3 * np.sin(2 * np.pi * r.datetime.hour / 24) - 0.01 * (tw - 26), 6.5, 9.0)
            wt.append(round(tw, 2))
            do.append(round(d, 2))
            ph.append(round(p, 2))
            prev_tw = tw
        
        df["water_temp"], df["do"], df["ph"] = wt, do, ph
        
    else:
        # Use existing universal model approach
        SEQ_HOURS = 24
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=2)
        
        url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m&timezone=UTC"
        
        response = requests.get(url).json()
        df = pd.DataFrame({
            "air_temp": response["hourly"]["temperature_2m"],
            "humidity": response["hourly"]["relativehumidity_2m"],
            "rain": response["hourly"]["precipitation"],
            "windspeed": response["hourly"]["windspeed_10m"]
        })
        
        # Apply universal formulas
        df["water_temp"] = df["air_temp"] - 2
        df["do"] = 8.0
        df["ph"] = 7.3
        
        # Load model and scaler
        model = load_model(model_path)
        with open(scaler_path, 'rb') as f:
            scaler_data = pickle.load(f)
        
        scaler = MinMaxScaler()
        scaler.min_ = scaler_data['min_']
        scaler.scale_ = scaler_data['scale_']
        scaler.data_min_ = scaler_data['data_min_']
        scaler.data_max_ = scaler_data['data_max_']
        
        FEATURES = scaler_data['features']
    
    # Parse target datetime
    target_dt = pd.to_datetime(target_datetime)
    current_dt = datetime.now()
    
    if target_dt <= current_dt:
        raise Exception("Target date must be in the future")
    
    hours_to_predict = int((target_dt - current_dt).total_seconds() // 3600)
    
    if hours_to_predict > 8760:  # More than 1 year
        raise Exception("Cannot predict more than 1 year into the future")
    
    # Simple prediction logic (can be enhanced with actual LSTM)
    # For now, using trend-based prediction
    if os.path.exists(model_path):
        # Use LSTM model for prediction
        scaled = scaler.transform(df[FEATURES].tail(SEQ_HOURS))
        X = scaled.reshape(1, SEQ_HOURS, len(FEATURES))
        pred_scaled = model.predict(X, verbose=0)[0]
        
        # Inverse transform
        dummy = np.zeros((1, len(FEATURES)))
        dummy[0, 4:7] = pred_scaled
        pred_full = scaler.inverse_transform(dummy)[0]
        
        # Add some variation based on time distance
        time_factor = min(hours_to_predict / 24, 30) / 30  # Max 30 days influence
        variation = np.random.normal(0, time_factor * 0.5, 3)
        
        water_temp = round(pred_full[4] + variation[0], 2)
        do_val = round(max(0.5, pred_full[5] + variation[1]), 2)
        ph_val = round(np.clip(pred_full[6] + variation[2], 5.0, 10.0), 2)
    else:
        # Fallback: Simple trend-based prediction
        recent_temp = df["water_temp"].tail(24).mean()
        recent_do = df["do"].tail(24).mean()
        recent_ph = df["ph"].tail(24).mean()
        
        # Add seasonal and time-based variations
        days_ahead = hours_to_predict / 24
        seasonal_temp_change = 2 * np.sin(2 * np.pi * (target_dt.dayofyear - current_dt.dayofyear) / 365)
        
        water_temp = round(recent_temp + seasonal_temp_change + np.random.normal(0, 0.5), 2)
        do_val = round(max(0.5, recent_do + np.random.normal(0, 0.3)), 2)
        ph_val = round(np.clip(recent_ph + np.random.normal(0, 0.1), 5.0, 10.0), 2)
    
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
    
    # Generate recommendations
    recommendations = []
    if water_temp < thresholds['tempMin'] or water_temp > thresholds['tempMax']:
        recommendations.append(f"Temperature ({water_temp}°C) predicted outside optimal range ({thresholds['tempMin']}-{thresholds['tempMax']}°C) for {species}")
    if do_val < thresholds['doMin']:
        recommendations.append(f"Dissolved oxygen ({do_val} mg/L) predicted below minimum ({thresholds['doMin']} mg/L) for {species}. Plan aeration systems.")
    if ph_val < thresholds['phMin'] or ph_val > thresholds['phMax']:
        recommendations.append(f"pH ({ph_val}) predicted outside optimal range ({thresholds['phMin']}-{thresholds['phMax']}) for {species}")
    if not recommendations:
        recommendations.append(f"All parameters predicted within optimal range for {species}")
    
    # Calculate days ahead for display
    days_ahead = round(hours_to_predict / 24, 1)
    
    result = {
        'success': True,
        'target_datetime': target_datetime,
        'days_ahead': days_ahead,
        'hours_ahead': hours_to_predict,
        'predicted_values': {
            'water_temp': water_temp,
            'do': do_val,
            'ph': ph_val
        },
        'quality_score': round(score, 2),
        'quality_level': quality,
        'color': color,
        'recommendations': recommendations,
        'species': species,
        'location': {'latitude': lat, 'longitude': lon},
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }))
    sys.exit(1)