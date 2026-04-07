# Render Deployment Guide - UPDATED

## Quick Deploy Steps:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Fixed Render deployment"
   git push
   ```

2. **Deploy on Render:**
   - Go to https://render.com
   - Sign up with GitHub
   - Click "New Web Service"
   - Connect your repository
   - Use these EXACT settings:
     - **Build Command**: `npm run render-build`
     - **Start Command**: `npm start`
     - **Environment**: `Node`
     - **Node Version**: `18`
     - **Python Version**: `3.10` (auto-detected from runtime.txt)

3. **Add Database:**
   - Click "New PostgreSQL"
   - Name: `aquamonitor-db`
   - Copy the DATABASE_URL

4. **Set Environment Variables:**
   - Add `DATABASE_URL` (from step 3)
   - Add `NODE_ENV` = `production`

5. **Deploy:**
   - Click "Create Web Service"
   - Wait 10-15 minutes for ML packages to install

## If build still fails:

**Option 1: Node-only deployment (Quick fix)**
- Change build command to: `npm install`
- This will deploy the web interface only
- LSTM predictions will show errors but UI works

**Option 2: Separate ML service**
- Deploy Node.js app on Render
- Deploy Python LSTM on separate service
- Connect via API calls

## Your app will be live at:
`https://your-app-name.onrender.com`

## Features that work:
✅ Web interface and navigation
✅ Database operations (farm management)
✅ Weather API data fetching
✅ LSTM predictions (if build succeeds)
✅ CSV data export

## Troubleshooting:
- Build taking too long? Normal for ML packages (10-15 min)
- Out of memory? Upgrade to paid plan ($7/month)
- Python errors? Use Node-only deployment first

## Performance Notes:
- Free tier: LSTM predictions take 30-60 seconds
- Paid tier: LSTM predictions take 5-10 seconds
- App sleeps after 15 minutes of inactivity (free tier)