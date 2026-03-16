# 🌊 AquaMonitor - AI-Powered Water Quality Prediction System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 14+](https://img.shields.io/badge/node.js-14+-green.svg)](https://nodejs.org/)
[![TensorFlow 2.15](https://img.shields.io/badge/tensorflow-2.15-orange.svg)](https://tensorflow.org/)

> **Revolutionary LSTM-based water quality prediction system for aquaculture using climate-agnostic modeling**

## 🚀 Features

- **🤖 Universal LSTM Model** - Single model works globally without location-specific training
- **🐟 Multi-Species Support** - 8 aquaculture species with optimized thresholds
- **📍 Location-Based Predictions** - GPS coordinates or preset locations
- **📊 Real-Time Visualization** - Interactive charts with species-specific thresholds
- **⚠️ Risk Assessment** - Predictive health risk analysis for aquatic species
- **📈 Historical Analysis** - Date range filtering and CSV export
- **🌍 Global Coverage** - Works anywhere with internet connection
- **📱 Responsive Design** - Modern web interface with mobile support

## 🎯 Supported Species

| Species | Temperature (°C) | Dissolved Oxygen (mg/L) | pH Range |
|---------|------------------|-------------------------|----------|
| **General Fish** | 20-28 | 5-12 | 6.5-8.5 |
| **Tilapia** | 25-32 | 3-15 | 6.0-9.0 |
| **Catfish** | 24-30 | 4-12 | 6.5-8.5 |
| **Salmon** | 10-18 | 7-14 | 6.5-8.0 |
| **Trout** | 10-16 | 7-14 | 6.5-8.0 |
| **Carp** | 20-28 | 4-12 | 6.5-9.0 |
| **Shrimp** | 26-32 | 4-10 | 7.0-8.5 |
| **Prawn** | 26-31 | 4-10 | 7.0-8.5 |

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **AI/ML**: Python + TensorFlow/Keras (LSTM)
- **Frontend**: Vanilla JavaScript + Chart.js
- **Data Source**: Open-Meteo Weather API
- **Styling**: Modern CSS Grid/Flexbox

## 📋 Prerequisites

- **Python 3.8+** with pip
- **Node.js 14+** with npm
- **Internet connection** for weather data API

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/aquamonitor.git
cd aquamonitor
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Train LSTM Model (First Time Only)
```bash
python train_model_universal.py
```
*This will take 5-10 minutes and create the model files*

### 4. Install Node.js Dependencies
```bash
cd web-app
npm install
```

### 5. Start Server
```bash
node server.js
```
**OR** use the batch file (Windows):
```bash
cd ..
start.bat
```

### 6. Access Application
Open your browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
aquamonitor/
├── 📄 README.md                    # This file
├── 📄 requirements.txt            # Python dependencies
├── 🔧 start.bat                   # Windows quick start
├── 🤖 train_model_universal.py    # LSTM model training
├── 🧠 water_qual_universal.keras  # Trained model (generated)
├── 📊 water_qual_universal_scaler.pkl # Data scaler (generated)
└── web-app/                       # Web application
    ├── 🌐 server.js               # Express server
    ├── 📦 package.json           # Node dependencies
    ├── 🐍 predict_universal.py   # LSTM prediction script
    ├── 🐍 predict.py             # Manual prediction script
    ├── 🐍 fetch_data_universal.py # Data fetcher
    └── public/                    # Frontend files
        ├── 🏠 home.html          # Landing page
        ├── 📊 dashboard.html     # Main dashboard
        ├── 📈 analytics.html     # Data analysis
        ├── ℹ️ about.html         # Information page
        ├── 🗂️ indexold.html      # Single-page backup
        ├── 🎨 styles.css         # Modern CSS
        └── ⚡ script.js          # Frontend logic
```

## 🔬 How It Works

### 1. **Universal Climate-Agnostic Formulas**
```python
# Water Temperature (Thermal Inertia Model)
water_temp = 0.75 * previous_temp + 0.25 * (air_temp - 2)

# Dissolved Oxygen (Henry's Law + Environmental Factors)
do_saturation = 14.652 - 0.41022*temp + 0.007991*temp² - 0.000077774*temp³
do_actual = do_sat * (1 + (humidity-50)/400) * (1 - windspeed/100)

# pH (Diurnal + Temperature + Precipitation Model)
ph = 7.3 + 0.4*sin(2π*hour/24) - 0.015*(temp-25) - 0.1*log(1+rain)
```

### 2. **LSTM Neural Network Architecture**
- **Input**: 24-hour meteorological data sequences
- **Architecture**: 64 LSTM units → Dropout (0.2) → Dense (32) → Output (3 parameters)
- **Training**: 365 days historical weather data
- **Output**: Next-hour water quality predictions

### 3. **Species-Specific Risk Assessment**
```javascript
function calculateRisk(temp, do, ph, species) {
    let riskScore = 0;
    // Critical DO assessment (highest priority)
    if (do < thresholds.doMin) riskScore += 60; // HIGH RISK
    // pH and temperature assessments...
    return classifyRisk(riskScore); // LOW/MODERATE/HIGH
}
```

## 🎮 Usage

### **Dashboard Mode**
1. **Manual Input**: Enter water parameters directly
2. **GPS Coordinates**: Use location-based LSTM predictions
3. **Preset Locations**: Select from 100+ Indian cities

### **Analytics Mode**
1. Select date ranges for historical analysis
2. View data tables with filtering
3. Export CSV reports for record keeping

### **Prediction Modes**
- **Real-time**: Instant quality assessment
- **Forecasting**: Next-hour predictions
- **Historical**: Trend analysis with date ranges

## 🌍 Example Coordinates

- **Kerala, India**: `10.98267, 76.97678`
- **California, USA**: `36.7783, -119.4179`
- **Tokyo, Japan**: `35.6762, 139.6503`
- **London, UK**: `51.5074, -0.1278`

## 🔧 API Endpoints

### POST `/api/predict`
**Manual Input:**
```json
{
  "temperature": 25.5,
  "dissolved_oxygen": 8.5,
  "ph": 7.2,
  "species": "tilapia"
}
```

**Location-Based:**
```json
{
  "latitude": 10.98267,
  "longitude": 76.97678,
  "species": "salmon"
}
```

### GET `/api/fetch-data`
```
GET /api/fetch-data?latitude=10.98267&longitude=76.97678
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 3000 in use** | Change PORT in server.js or kill existing process |
| **Model not found** | Run `python train_model_universal.py` |
| **Python errors** | Install requirements: `pip install -r requirements.txt` |
| **Charts not loading** | Clear browser cache (Ctrl+F5) |
| **GPS not working** | Use HTTPS or enter coordinates manually |

## 📊 Performance Metrics

- **Training Time**: 5-10 minutes on standard hardware
- **Prediction Speed**: <2 seconds per location
- **Memory Usage**: ~50MB for loaded model
- **Global Coverage**: Any latitude/longitude coordinate
- **Concurrent Users**: Multi-user web interface support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Open-Meteo API** for global weather data
- **TensorFlow Team** for the ML framework
- **Chart.js** for visualization capabilities
- **Express.js** for the web framework

## 📞 Contact

- **Email**: your.email@example.com
- **LinkedIn**: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- **GitHub**: [@yourusername](https://github.com/yourusername)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/aquamonitor&type=Date)](https://star-history.com/#yourusername/aquamonitor&Date)

---

**Made with ❤️ for the aquaculture industry**

> *Revolutionizing fish farming through AI-powered water quality monitoring*