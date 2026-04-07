# AquaMonitor - AI-Powered Water Quality Prediction System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 14+](https://img.shields.io/badge/node.js-14+-green.svg)](https://nodejs.org/)
[![TensorFlow 2.15](https://img.shields.io/badge/tensorflow-2.15-orange.svg)](https://tensorflow.org/)

> **Professional LSTM-based water quality prediction system for aquaculture with comprehensive farm management**

## Key Features

- **LSTM Neural Networks** - Advanced deep learning models for accurate water quality predictions
- **Multi-Species Support** - 8 aquaculture species with species-specific optimal ranges
- **Real-Time Analysis** - Instant water quality assessment with AI-powered recommendations
- **Global Coverage** - Works worldwide using GPS coordinates or city selection
- **Farm Management** - Multi-location analysis system with PostgreSQL database
- **Data Export** - Comprehensive reporting with CSV export functionality
- **Predator Detection** - TensorFlow Lite-based aquatic predator identification system
- **Mobile Responsive** - Professional interface optimized for all devices

## Supported Species

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

## Technology Stack

- **Backend**: Node.js + Express.js
- **AI/ML**: Python + TensorFlow/Keras (LSTM)
- **Frontend**: Vanilla JavaScript + Chart.js
- **Database**: PostgreSQL (for farm management)
- **Data Source**: Open-Meteo Weather API
- **Styling**: Modern CSS Grid/Flexbox

## Prerequisites

- **Python 3.8+** with pip
- **Node.js 14+** with npm
- **PostgreSQL 12+** (for farm management system)
- **Internet connection** for weather data API

## Quick Start

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

### 4. Setup Database (For Farm Management)
```bash
cd web-app
npm install

# Setup PostgreSQL database
node setup-database.js

# Test database connection
node test-connection.js
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

**Available Pages:**
- **Home**: `http://localhost:3000/home.html`
- **Dashboard**: `http://localhost:3000/dashboard.html` (Individual analysis)
- **Data Reports**: `http://localhost:3000/data-reports.html` (Historical analysis & export)
- **Farm Management**: `http://localhost:3000/multi-location.html` (Multi-location system)
- **Predator Detection**: `http://localhost:3000/predator.html` (AI-powered predator identification)
- **About**: `http://localhost:3000/about.html`

## Project Structure

```
aquamonitor/
├── README.md                       # This file
├── LICENSE                         # MIT License
├── .gitignore                      # Git ignore rules
├── requirements.txt               # Python dependencies
├── start.bat                      # Windows quick start
├── train_model_universal.py       # LSTM model training
├── water_qual_universal.keras     # Trained LSTM model (generated)
├── water_qual_universal_scaler.pkl # Data scaler (generated)
└── web-app/                          # Web application
    ├── server.js                  # Express server with PostgreSQL
    ├── package.json              # Node dependencies
    ├── setup-database.js         # Database setup script
    ├── test-connection.js        # Database connection test
    ├── predict_universal.py      # Location-based LSTM predictions
    ├── predict_manual_lstm.py    # Manual input LSTM analysis
    ├── predict_future_datetime.py # Future date/time predictions
    ├── predict_predator_working.py # Predator detection system
    ├── fetch_data_universal.py   # Weather data fetcher
    ├── test_predator_system.py   # Predator system test
    ├── PREDATOR_DETECTION.md     # Predator detection documentation
    └── public/                       # Frontend files
        ├── home.html             # Landing page
        ├── dashboard.html        # Main dashboard with unified interface
        ├── data-reports.html     # Historical analysis & export
        ├── about.html            # Information page
        ├── multi-location.html   # Farm management system
        ├── predator.html         # Predator detection interface
        ├── multi-location.js     # Farm management logic
        ├── styles.css            # Professional responsive CSS
        └── script.js             # Main frontend logic
```

## System Architecture

### 1. LSTM Neural Network
- **Model Type**: Long Short-Term Memory (LSTM) deep learning network
- **Input**: 24-hour meteorological data sequences from Open-Meteo API
- **Architecture**: 64 LSTM units → Dropout (0.2) → Dense (32) → Output (3 parameters)
- **Training Data**: 365 days of global weather patterns
- **Output**: Water temperature, dissolved oxygen, and pH predictions

### 2. Climate-Agnostic Modeling
```python
# Universal formulas work globally without location-specific training
water_temp = 0.75 * previous_temp + 0.25 * (air_temp - 2)
do_saturation = 14.652 - 0.41022*temp + 0.007991*temp² - 0.000077774*temp³
ph = 7.3 + 0.4*sin(2π*hour/24) - 0.015*(temp-25) - 0.1*log(1+rain)
```

### 3. Intelligent Analysis System
- **Species-Specific Thresholds**: Optimal ranges for 8 aquaculture species
- **Risk Assessment**: AI-powered health risk analysis with recommendations
- **Seasonal Intelligence**: Cultivation period awareness for timing recommendations
- **Quality Scoring**: Comprehensive water quality assessment (0-100 scale)

### 4. Predator Detection
- **Technology**: TensorFlow Lite with YOLO object detection
- **Capability**: Real-time identification of aquatic predators
- **Integration**: Seamless web interface with image upload functionality

## Usage Guide

### Dashboard Interface
**Unified Location Setup:**
- **GPS Coordinates**: Enter latitude/longitude for precise location analysis
- **City Selection**: Choose from 100+ preset locations worldwide

**Prediction Types:**
- **Current Analysis**: Real-time water quality assessment using LSTM predictions
- **Manual Input**: Direct parameter entry with LSTM-based regional comparison
- **Future Prediction**: Forecast water quality for any date/time up to 1 year ahead

### Data Reports
- **Historical Analysis**: Date range selection with interactive charts
- **Species-Specific Visualization**: Optimal ranges displayed as reference lines
- **Cultivation Seasons**: Visual indicators for species-specific farming periods
- **CSV Export**: Comprehensive data export for record keeping

### Farm Management System
- **Multi-Farm Support**: Register and manage multiple aquaculture operations
- **Location Management**: Add ponds, tanks, cages with GPS coordinates
- **Batch Analysis**: Simultaneous analysis of multiple locations
- **Analysis History**: Track water quality trends over time

### Predator Detection
- **Image Upload**: Upload photos for AI-powered predator identification
- **Real-Time Analysis**: Instant species identification with confidence scores
- **Integration**: Seamless workflow with water quality monitoring

## Advanced Features

### Smart Recommendation System
- **Species Intelligence**: Recommendations based on selected aquaculture species
- **Seasonal Awareness**: Considers optimal cultivation periods for each species
- **Location Context**: Regional climate patterns influence recommendations
- **Risk Prioritization**: Critical parameters (dissolved oxygen) get highest priority
- **Actionable Advice**: Specific steps for water quality improvement

### Professional Interface
- **Modern Design**: Clean, gradient-based professional styling
- **Mobile Responsive**: Optimized for tablets and smartphones
- **Cache Management**: Automatic cache-busting for consistent updates
- **Interactive Charts**: Chart.js-powered visualizations with species thresholds
- **User Experience**: Logical workflow with explicit data loading controls

### Database Integration
- **PostgreSQL Backend**: Robust database for farm management
- **Data Persistence**: Session storage for seamless navigation
- **Multi-User Support**: Concurrent access for team collaboration
- **Export Capabilities**: CSV download for external analysis

## Example Coordinates

- **Kerala, India**: `10.98267, 76.97678`
- **California, USA**: `36.7783, -119.4179`
- **Tokyo, Japan**: `35.6762, 139.6503`
- **London, UK**: `51.5074, -0.1278`

## API Endpoints

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

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 3000 in use** | Change PORT in server.js or kill existing process |
| **Model not found** | Run `python train_model_universal.py` |
| **Python errors** | Install requirements: `pip install -r requirements.txt` |
| **Charts not loading** | Clear browser cache (Ctrl+F5) |
| **GPS not working** | Use HTTPS or enter coordinates manually |

## Technical Specifications

### Performance
- **LSTM Training**: 5-10 minutes on standard hardware
- **Prediction Speed**: <2 seconds per location analysis
- **Memory Usage**: ~50MB for loaded LSTM model
- **Global Coverage**: Any latitude/longitude coordinate worldwide
- **Concurrent Users**: Multi-user web interface with session management

### Compatibility
- **Browsers**: Chrome, Firefox, Safari, Edge (modern versions)
- **Mobile**: iOS Safari, Android Chrome with responsive design
- **Operating Systems**: Windows, macOS, Linux
- **Database**: PostgreSQL 12+ for farm management features

### Security
- **Data Privacy**: No sensitive data stored permanently
- **API Security**: Rate limiting and input validation
- **Database Security**: Parameterized queries prevent SQL injection
- **File Upload**: Secure image processing for predator detection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Open-Meteo API** for global weather data
- **TensorFlow Team** for the ML framework
- **Chart.js** for visualization capabilities
- **Express.js** for the web framework

## Support & Contact

- **Phone**: 8870958705
- **Email**: info@aquamonitor.com
- **Documentation**: Comprehensive guides included in project
- **Issues**: GitHub issue tracker for bug reports and feature requests

## Recent Updates

- **v2.1**: Added predator detection system with TensorFlow Lite
- **v2.0**: Implemented comprehensive farm management with PostgreSQL
- **v1.9**: Enhanced mobile responsiveness and professional UI design
- **v1.8**: Integrated future date/time prediction capabilities
- **v1.7**: Added intelligent recommendation system with seasonal awareness
- **v1.6**: Implemented unified dashboard interface with improved UX

---

**Professional AI-powered aquaculture monitoring solution**

> *Advanced LSTM neural networks meet practical aquaculture management*