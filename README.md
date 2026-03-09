# Water Quality Predictor - LSTM Web App

AI-powered water quality prediction using LSTM neural networks with Node.js/Express.

## 🚀 Quick Start

### 1. Train Model (First Time)
```bash
cd d:\mini project\app
python train_model_universal.py
```

### 2. Install Dependencies
```bash
cd web-app
npm install
```

### 3. Run Server
```bash
node server.js
```

### 4. Open Browser
**http://localhost:3000**

---

## 📁 Project Structure

```
app/
├── web-app/
│   ├── public/
│   │   ├── index.html          # Main UI
│   │   ├── script.js           # Frontend logic
│   │   └── style.css           # Styles
│   ├── server.js               # Express server
│   ├── predict_universal.py    # LSTM prediction
│   ├── fetch_data_universal.py # Data fetcher
│   ├── package.json            # Node dependencies
│   └── INTEGRATION_GUIDE.md    # Detailed docs
├── train_model_universal.py    # Model training
├── water_qual_universal.keras  # Trained model
└── water_qual_universal_scaler.pkl  # Scaler
```

---

## ✨ Features

- **Manual Input** - Enter water parameters directly
- **Location-Based** - LSTM predictions using GPS coordinates
- **Universal Model** - Works for any location worldwide
- **Real-time Charts** - Historical data visualization
- **Data Export** - Download CSV reports

---

## 🔧 Requirements

- Python 3.8+ with: `tensorflow numpy pandas scikit-learn requests`
- Node.js 14+
- Internet connection (for weather data API)

---

## 📖 Usage

1. **Manual Mode**: Enter temperature, DO, pH → Get quality score
2. **Location Mode**: Enter coordinates → Get AI predictions

---

## 🌍 Example Coordinates

- Kerala, India: `10.98267, 76.97678`
- California, USA: `36.7783, -119.4179`
- Tokyo, Japan: `35.6762, 139.6503`

---

## 🐛 Troubleshooting

**Model not found**: Run training script first  
**Port in use**: Change PORT in server.js  
**Python errors**: Install required packages
