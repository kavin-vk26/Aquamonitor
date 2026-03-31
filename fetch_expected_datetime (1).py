# import pandas as pd
# import numpy as np
# import requests
# import matplotlib.pyplot as plt
# import os
# from datetime import datetime, timedelta
# from sklearn.preprocessing import MinMaxScaler
# from tensorflow.keras.models import Sequential, load_model
# from tensorflow.keras.layers import LSTM, Dense, Dropout

# # ==============================================================================
# # 1. CONFIGURATION & PATHS
# # ==============================================================================
# DATA_FILE = "training_data.csv"
# MODEL_FILE = "water_model.keras"
# SEQ_HOURS = 24
# FEATURES = ["air_temp", "humidity", "rain", "water_temp", "do", "ph"]

# # ==============================================================================
# # 2. TRAINER LOGIC (Data Fetching & Training)
# # ==============================================================================
# def run_trainer():
#     print("\n--- 🛰️ DATA ACQUISITION STAGE ---")
#     lat = input("Enter Latitude (e.g., 11.01 for Coimbatore): ")
#     lon = input("Enter Longitude (e.g., 76.95): ")
    
#     end_date = datetime.utcnow().date()
#     start_date = end_date - timedelta(days=365)
    
#     url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&hourly=temperature_2m,relativehumidity_2m,precipitation&timezone=UTC"
    
#     print("📡 Fetching 1-year weather data...")
#     response = requests.get(url).json()
#     df = pd.DataFrame({
#         "datetime": pd.to_datetime(response["hourly"]["time"]),
#         "air_temp": response["hourly"]["temperature_2m"],
#         "humidity": response["hourly"]["relativehumidity_2m"],
#         "rain": response["hourly"]["precipitation"]
#     })

#     # Soft-sensing logic for biological parameters
#     wt, do, ph, prev_tw = [], [], [], None
#     for _, r in df.iterrows():
#         tw = r.air_temp - 1 if prev_tw is None else 0.7 * prev_tw + 0.3 * (r.air_temp - 1)
#         d = np.clip((14.6 - 0.2 * tw) * (1 + (r.humidity - 50) / 500), 2, 14)
#         p = np.clip(7.4 + 0.3 * np.sin(2 * np.pi * r.datetime.hour / 24) - 0.01 * (tw - 26), 6.5, 9.0)
#         wt.append(round(tw, 2)); do.append(round(d, 2)); ph.append(round(p, 2))
#         prev_tw = tw
    
#     df["water_temp"], df["do"], df["ph"] = wt, do, ph
#     df.to_csv(DATA_FILE, index=False)
    
#     print("\n--- 🧠 MODEL TRAINING STAGE ---")
#     scaler = MinMaxScaler()
#     scaled = scaler.fit_transform(df[FEATURES])
    
#     X, y = [], []
#     for i in range(len(scaled) - SEQ_HOURS):
#         X.append(scaled[i:i+SEQ_HOURS])
#         y.append(scaled[i+SEQ_HOURS, 3:]) 
    
#     X, y = np.array(X), np.array(y)
    
#     model = Sequential([
#         LSTM(64, input_shape=(SEQ_HOURS, len(FEATURES))),
#         Dropout(0.2),
#         Dense(32, activation="relu"),
#         Dense(3)
#     ])
    
#     model.compile(optimizer="adam", loss="mse")
#     model.fit(X, y, epochs=15, batch_size=32, verbose=1)
#     model.save(MODEL_FILE)
#     print(f"✅ Success! Data saved to {DATA_FILE} and Model to {MODEL_FILE}")

# # ==============================================================================
# # 3. PREDICTOR LOGIC (Recursive Forecasting)
# # ==============================================================================
# def run_predictor():
#     if not os.path.exists(MODEL_FILE):
#         print("❌ Error: Model not found. Please run the Trainer first.")
#         return

#     print("\n--- 🔮 TREND FORECAST STAGE ---")
#     print("Example format: 2026-03-30 14:00")
#     target_date_str = input("Enter target date and time: ")

#     try:
#         model = load_model(MODEL_FILE)
#         df = pd.read_csv(DATA_FILE, parse_dates=['datetime'])
        
#         scaler = MinMaxScaler()
#         scaler.fit(df[FEATURES])
        
#         target_dt = pd.to_datetime(target_date_str)
#         last_dt = df['datetime'].iloc[-1]
#         hours_to_predict = int((target_dt - last_dt).total_seconds() // 3600)

#         if hours_to_predict <= 0:
#             print("⚠️ Date is in the past. Enter a future date.")
#             return

#         trend_results, time_steps = [], []
#         current_seq = scaler.transform(df[FEATURES].tail(SEQ_HOURS)).reshape(1, SEQ_HOURS, len(FEATURES))

#         print(f"🔄 Calculating trend for {hours_to_predict} hours...")
#         for i in range(1, hours_to_predict + 1):
#             pred = model.predict(current_seq, verbose=0)
            
#             dummy = np.zeros((1, len(FEATURES)))
#             dummy[0, 3:] = pred[0]
#             real_vals = scaler.inverse_transform(dummy)[0, 3:]
            
#             trend_results.append(real_vals)
#             time_steps.append(last_dt + timedelta(hours=i))
            
#             # Recursive step
#             new_row = np.append(current_seq[0, -1, :3], pred[0]).reshape(1, 1, len(FEATURES))
#             current_seq = np.append(current_seq[:, 1:, :], new_row, axis=1)

#         # Plotting the Trend
#         res_df = pd.DataFrame(trend_results, columns=['Temp', 'DO', 'pH'], index=time_steps)
#         res_df.plot(subplots=True, figsize=(10, 8), title=f"Predicted Trend until {target_date_str}")
#         plt.tight_layout()
#         plt.show()
        
#     except Exception as e:
#         print(f"❌ Error during prediction: {e}")

# # ==============================================================================
# # 4. MAIN MENU
# # ==============================================================================
# if __name__ == "__main__":
#     while True:
#         print("\n" + "="*40)
#         print("🌊 SMART AQUACULTURE LSTM SYSTEM")
#         print("="*40)
#         print("1. Train Model (Fetch Data & Train)")
#         print("2. Predict Trend (Specify Future Date)")
#         print("3. Exit")
#         choice = input("\nSelect an option (1-3): ")

#         if choice == '1':
#             run_trainer()
#         elif choice == '2':
#             run_predictor()
#         elif choice == '3':
#             break
#         else:
#             print("Invalid selection.")

import pandas as pd
import numpy as np
import requests
import matplotlib.pyplot as plt
import os
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout

DATA_FILE = "training_data.csv"
MODEL_FILE = "water_model.keras"
SEQ_HOURS = 24
FEATURES = ["air_temp", "humidity", "rain", "water_temp", "do", "ph"]

def run_trainer():
    print("\n--- 🛰️ DATA ACQUISITION STAGE ---")
    lat = input("Enter Latitude (e.g., 11.01 for Coimbatore): ")
    lon = input("Enter Longitude (e.g., 76.95): ")
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=365)
    
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&hourly=temperature_2m,relativehumidity_2m,precipitation&timezone=UTC"
    
    print("📡 Fetching 1-year weather data...")
    response = requests.get(url).json()
    df = pd.DataFrame({
        "datetime": pd.to_datetime(response["hourly"]["time"]),
        "air_temp": response["hourly"]["temperature_2m"],
        "humidity": response["hourly"]["relativehumidity_2m"],
        "rain": response["hourly"]["precipitation"]
    })

    wt, do, ph, prev_tw = [], [], [], None
    for _, r in df.iterrows():
        tw = r.air_temp - 1 if prev_tw is None else 0.7 * prev_tw + 0.3 * (r.air_temp - 1)
        d = np.clip((14.6 - 0.2 * tw) * (1 + (r.humidity - 50) / 500), 2, 14)
        p = np.clip(7.4 + 0.3 * np.sin(2 * np.pi * r.datetime.hour / 24) - 0.01 * (tw - 26), 6.5, 9.0)
        wt.append(round(tw, 2)); do.append(round(d, 2)); ph.append(round(p, 2))
        prev_tw = tw
    
    df["water_temp"], df["do"], df["ph"] = wt, do, ph
    df.to_csv(DATA_FILE, index=False)
    
    print("\n--- 🧠 MODEL TRAINING STAGE ---")
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df[FEATURES])
    
    X, y = [], []
    for i in range(len(scaled) - SEQ_HOURS):
        X.append(scaled[i:i+SEQ_HOURS])
        y.append(scaled[i+SEQ_HOURS, 3:]) 
    
    X, y = np.array(X), np.array(y)
    
    model = Sequential([
        LSTM(64, input_shape=(SEQ_HOURS, len(FEATURES))),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(3)
    ])
    
    model.compile(optimizer="adam", loss="mse")
    model.fit(X, y, epochs=7, batch_size=32, verbose=1)
    model.save(MODEL_FILE)
    print(f"✅ Success! Data saved to {DATA_FILE} and Model to {MODEL_FILE}")

def run_predictor():
    if not os.path.exists(MODEL_FILE):
        print("❌ Error: Model not found. Please run the Trainer first.")
        return

    print("\n--- 🔮 TREND FORECAST STAGE ---")
    print("Example format: 2026-03-30 14:00")
    target_date_str = input("Enter target date and time: ")

    try:
        model = load_model(MODEL_FILE)
        df = pd.read_csv(DATA_FILE, parse_dates=['datetime'])
        
        scaler = MinMaxScaler()
        scaler.fit(df[FEATURES])
        
        target_dt = pd.to_datetime(target_date_str)
        last_dt = df['datetime'].iloc[-1]
        hours_to_predict = int((target_dt - last_dt).total_seconds() // 3600)

        if hours_to_predict <= 0:
            print("⚠️ Date is in the past. Enter a future date.")
            return

        trend_results, time_steps = [], []
        current_seq = scaler.transform(df[FEATURES].tail(SEQ_HOURS)).reshape(1, SEQ_HOURS, len(FEATURES))

        print(f"🔄 Calculating trend for {hours_to_predict} hours...")
        for i in range(1, hours_to_predict + 1):
            pred = model.predict(current_seq, verbose=0)
            
            dummy = np.zeros((1, len(FEATURES)))
            dummy[0, 3:] = pred[0]
            real_vals = scaler.inverse_transform(dummy)[0, 3:]
            
            trend_results.append(real_vals)
            time_steps.append(last_dt + timedelta(hours=i))
            
            new_row = np.append(current_seq[0, -1, :3], pred[0]).reshape(1, 1, len(FEATURES))
            current_seq = np.append(current_seq[:, 1:, :], new_row, axis=1)

        # Plotting the Trend
        res_df = pd.DataFrame(trend_results, columns=['Temp', 'DO', 'pH'], index=time_steps)
        res_df.plot(subplots=True, figsize=(10, 8), title=f"Predicted Trend until {target_date_str}")
        plt.tight_layout()
        plt.show()

        # --- EXTRACT AND PRINT VALUES FOR THE TARGET DATETIME ---
        final_prediction = trend_results[-1]
        print("\n" + "*"*50)
        print(f"📍 PREDICTED VALUES FOR: {target_dt}")
        print("*"*50)
        print(f"🌡️ Water Temperature : {final_prediction[0]:.2f} °C")
        print(f"🫧 Dissolved Oxygen  : {final_prediction[1]:.2f} mg/L")
        print(f"🧪 pH Level         : {final_prediction[2]:.2f}")
        print("*"*50)
        
    except Exception as e:
        print(f"❌ Error during prediction: {e}")

if __name__ == "__main__":
    while True:
        print("\n" + "="*40)
        print("🌊 SMART AQUACULTURE LSTM SYSTEM")
        print("="*40)
        print("1. Train Model (Fetch Data & Train)")
        print("2. Predict Trend (Specify Future Date)")
        print("3. Exit")
        choice = input("\nSelect an option (1-3): ")

        if choice == '1':
            run_trainer()
        elif choice == '2':
            run_predictor()
        elif choice == '3':
            break
        else:
            print("Invalid selection.")