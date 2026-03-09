import numpy as np
import pandas as pd
import requests
import sys
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import pickle
import math

def fetch_and_train(latitude, longitude, model_name="water_qual_universal.keras"):
    """Train a universal water quality prediction model for any region"""
    
    PAST_DAYS = 365
    SEQ_HOURS = 24
    RANDOM_SEED = 42
    np.random.seed(RANDOM_SEED)
    
    print(f"Fetching weather data for coordinates: {latitude}, {longitude}")
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=PAST_DAYS)
    
    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={latitude}&longitude={longitude}"
        f"&start_date={start_date}&end_date={end_date}"
        "&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m"
        "&timezone=UTC"
    )
    
    data = requests.get(url).json()
    
    df = pd.DataFrame({
        "datetime": pd.to_datetime(data["hourly"]["time"]),
        "air_temp": data["hourly"]["temperature_2m"],
        "humidity": data["hourly"]["relativehumidity_2m"],
        "rain": data["hourly"]["precipitation"],
        "windspeed": data["hourly"]["windspeed_10m"]
    })
    
    print("Computing water quality parameters using universal formulas...")
    wt, do, ph = [], [], []
    prev_tw = None
    
    # Universal formulas (climate-agnostic)
    for _, r in df.iterrows():
        # Water temp follows air temp with thermal inertia
        tw = r.air_temp - 2 if prev_tw is None else 0.75 * prev_tw + 0.25 * (r.air_temp - 2)
        
        # DO based on temperature and humidity (Henry's law approximation)
        do_sat = 14.652 - 0.41022 * tw + 0.007991 * tw**2 - 0.000077774 * tw**3
        do_val = do_sat * (1 + (r.humidity - 50) / 400) * (1 - r.windspeed / 100)
        do_val = np.clip(do_val, 2, 15)
        
        # pH based on diurnal cycle, temperature, and precipitation
        hour = r.datetime.hour
        ph_val = (
            7.3
            + 0.4 * math.sin(2 * math.pi * hour / 24)
            - 0.015 * (tw - 25)
            - 0.1 * math.log1p(r.rain)
            + np.random.normal(0, 0.08)
        )
        ph_val = np.clip(ph_val, 6.0, 9.5)
        
        wt.append(round(tw, 2))
        do.append(round(do_val, 2))
        ph.append(round(ph_val, 2))
        prev_tw = tw
    
    df["water_temp"] = wt
    df["do"] = do
    df["ph"] = ph
    
    print("Preparing training data...")
    FEATURES = ["air_temp", "humidity", "rain", "windspeed", "water_temp", "do", "ph"]
    TARGETS = ["water_temp", "do", "ph"]
    
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df[FEATURES])
    
    X, y = [], []
    for i in range(len(scaled) - SEQ_HOURS):
        X.append(scaled[i:i + SEQ_HOURS])
        y.append(scaled[i + SEQ_HOURS][4:])  # water_temp, do, ph indices
    
    X, y = np.array(X), np.array(y)
    
    train_end = int(0.7 * len(X))
    val_end = int(0.85 * len(X))
    
    X_train, y_train = X[:train_end], y[:train_end]
    X_val, y_val = X[train_end:val_end], y[train_end:val_end]
    
    print("Building LSTM model...")
    model = Sequential([
        LSTM(64, input_shape=(SEQ_HOURS, X.shape[2])),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(3)
    ])
    
    model.compile(optimizer="adam", loss="mse")
    
    print("Training model...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=40,
        batch_size=32,
        callbacks=[EarlyStopping(patience=5, restore_best_weights=True)],
        verbose=1
    )
    
    print(f"Saving model as {model_name}...")
    model.save(model_name)
    
    # Save scaler with metadata
    scaler_name = model_name.replace('.keras', '_scaler.pkl')
    with open(scaler_name, 'wb') as f:
        pickle.dump({
            'min_': scaler.min_,
            'scale_': scaler.scale_,
            'data_min_': scaler.data_min_,
            'data_max_': scaler.data_max_,
            'features': FEATURES,
            'latitude': latitude,
            'longitude': longitude,
            'trained_date': datetime.now().isoformat()
        }, f)
    
    print(f"✓ Universal model trained successfully!")
    print(f"✓ Model: {model_name}")
    print(f"✓ Scaler: {scaler_name}")
    return model, scaler

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        lat = float(sys.argv[1])
        lon = float(sys.argv[2])
        model_name = sys.argv[3] if len(sys.argv) > 3 else "water_qual_universal.keras"
    else:
        # Default: Kerala, India
        lat, lon = 10.98267, 76.97678
        model_name = "water_qual_universal.keras"
    
    fetch_and_train(lat, lon, model_name)
