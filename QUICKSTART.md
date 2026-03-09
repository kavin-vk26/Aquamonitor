# 🚀 QUICK START GUIDE

## First Time Setup

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Train the Model (takes 5-10 minutes)
```bash
python train_model_universal.py
```

### Step 3: Install Node.js Dependencies
```bash
cd web-app
npm install
```

## Running the App

### Option 1: Use Batch File
```bash
start.bat
```

### Option 2: Manual Start
```bash
cd web-app
node server.js
```

## Access the App
Open browser: **http://localhost:3000**

---

## File Overview

**Essential Files:**
- `train_model_universal.py` - Train LSTM model
- `water_qual_universal.keras` - Trained model (generated)
- `water_qual_universal_scaler.pkl` - Scaler (generated)
- `web-app/server.js` - Express server
- `web-app/public/` - Frontend files (HTML/CSS/JS)
- `web-app/predict_universal.py` - LSTM prediction script
- `web-app/fetch_data_universal.py` - Data fetcher

**Helper Files:**
- `README.md` - Full documentation
- `requirements.txt` - Python packages
- `start.bat` - Quick start script
- `web-app/package.json` - Node packages

---

## That's It! 🎉

Your project is now clean and ready to run.
