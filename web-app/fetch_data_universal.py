import json
import sys
import requests
import pandas as pd
from datetime import datetime, timedelta
import math
import numpy as np

try:
    latitude = float(sys.argv[1]) if len(sys.argv) > 1 else 10.98267
    longitude = float(sys.argv[2]) if len(sys.argv) > 2 else 76.97678
    
    url = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}"
        "&hourly=temperature_2m,relative_humidity_2m,precipitation,windspeed_10m"
        "&past_days=30"
        "&forecast_days=1"
        "&timezone=auto"
    )
    
    data = requests.get(url).json()
    
    df = pd.DataFrame({
        "datetime": pd.to_datetime(data["hourly"]["time"]),
        "air_temp": data["hourly"]["temperature_2m"],
        "humidity": data["hourly"]["relative_humidity_2m"],
        "rain": data["hourly"]["precipitation"],
        "windspeed": data["hourly"]["windspeed_10m"]
    })
    
    current_time = datetime.now()
    df = df[df['datetime'] <= current_time].dropna()
    
    # Universal water quality computation
    wt, do, ph = [], [], []
    prev_tw = None
    
    for _, r in df.iterrows():
        tw = r.air_temp - 2 if prev_tw is None else 0.75 * prev_tw + 0.25 * (r.air_temp - 2)
        
        do_sat = 14.652 - 0.41022 * tw + 0.007991 * tw**2 - 0.000077774 * tw**3
        d = do_sat * (1 + (r.humidity - 50) / 400) * (1 - r.windspeed / 100)
        d = np.clip(d, 2, 15)
        
        hour = r.datetime.hour
        p = (
            7.3
            + 0.4 * math.sin(2 * math.pi * hour / 24)
            - 0.015 * (tw - 25)
            - 0.1 * math.log1p(r.rain)
            + np.random.normal(0, 0.08)
        )
        p = np.clip(p, 6.0, 9.5)
        
        wt.append(round(tw, 2))
        do.append(round(d, 2))
        ph.append(round(p, 2))
        prev_tw = tw
    
    df["water_temp"] = wt
    df["do"] = do
    df["ph"] = ph
    
    df['datetime'] = df['datetime'].dt.strftime('%Y-%m-%d %H:%M:%S')
    csv_data = df.to_csv(index=False)
    
    result = {
        'csv': csv_data,
        'rows': len(df),
        'data': df.to_dict('records'),
        'end_time': current_time.strftime('%Y-%m-%d %H:%M:%S'),
        'location': {
            'latitude': latitude,
            'longitude': longitude
        }
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}))
