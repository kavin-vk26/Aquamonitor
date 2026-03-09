# Water Quality Predictor - Universal LSTM Integration

## Features
✅ **Manual Input Mode** - Enter water parameters directly  
✅ **Location-Based Mode** - AI predictions using GPS coordinates with LSTM  
✅ **Universal Model** - Works for any location worldwide  
✅ **Real-time Charts** - Historical data visualization  
✅ **Data Export** - Download CSV reports  

---

## Setup Instructions

### 1. Train the Universal Model (First Time Only)

```bash
cd d:\mini project\app
python train_model_universal.py
```

This will:
- Fetch 365 days of weather data
- Train LSTM model (takes ~5-10 minutes)
- Save `water_qual_universal.keras` and `water_qual_universal_scaler.pkl`

### 2. Install Dependencies

```bash
cd web-app
npm install
```

Python packages (if not installed):
```bash
pip install tensorflow numpy pandas scikit-learn requests
```

### 3. Run the Server

```bash
node server.js
```

### 4. Open Browser

Navigate to: **http://localhost:3000**

---

## Usage

### Manual Input Mode
1. Enter water temperature, dissolved oxygen, and pH
2. Click "🔍 Predict Quality"
3. View quality score and recommendations

### Location-Based Mode (LSTM)
1. Click "Location-Based" tab
2. Enter coordinates OR click "📍 Use My Location"
3. Click "🤖 Predict with LSTM"
4. View AI-predicted parameters and quality assessment

---

## API Endpoints

### POST /api/predict
**Manual Input:**
```json
{
  "temperature": 25.5,
  "dissolved_oxygen": 8.5,
  "ph": 7.2
}
```

**Location-Based:**
```json
{
  "latitude": 10.98267,
  "longitude": 76.97678
}
```

### GET /api/fetch-data
Query parameters: `?latitude=10.98267&longitude=76.97678`

---

## File Structure

```
web-app/
├── public/
│   ├── index.html      # Main UI (with mode toggle)
│   ├── script.js       # Frontend logic (updated)
│   └── style.css       # Styles (with mode buttons)
├── server.js           # Express server (updated)
├── predict.py          # Manual prediction
├── predict_universal.py # LSTM location-based prediction
├── fetch_data_universal.py # Universal data fetcher
└── package.json

../
├── water_qual_universal.keras        # Trained model
└── water_qual_universal_scaler.pkl   # Scaler parameters
```

---

## Model Details

- **Architecture:** LSTM (64 units) + Dense layers
- **Input:** 24-hour weather sequence (temp, humidity, rain, windspeed)
- **Output:** Water temperature, DO, pH
- **Training Data:** 365 days historical weather
- **Universal:** Climate-agnostic formulas work globally

---

## Troubleshooting

**Model not found error:**
```bash
cd d:\mini project\app
python train_model_universal.py
```

**Port already in use:**
Change PORT in server.js (line 7)

**Geolocation not working:**
Use HTTPS or manually enter coordinates

---

## Example Coordinates

- Kerala, India: `10.98267, 76.97678`
- California, USA: `36.7783, -119.4179`
- Tokyo, Japan: `35.6762, 139.6503`
- London, UK: `51.5074, -0.1278`

The universal model works for any location! 🌍
