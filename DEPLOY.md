# Render Deployment Guide

## Quick Deploy Steps:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push
   ```

2. **Deploy on Render:**
   - Go to https://render.com
   - Sign up with GitHub
   - Click "New Web Service"
   - Connect your repository
   - Use these settings:
     - **Build Command**: `npm install && pip install -r requirements.txt`
     - **Start Command**: `npm start`
     - **Environment**: `Node`

3. **Add Database:**
   - Click "New PostgreSQL"
   - Name: `aquamonitor-db`
   - Copy the DATABASE_URL

4. **Set Environment Variables:**
   - Add `DATABASE_URL` (from step 3)
   - Add `NODE_ENV` = `production`

5. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment

## Your app will be live at:
`https://your-app-name.onrender.com`

## Features that work:
✅ LSTM water quality predictions
✅ Weather API data fetching  
✅ Farm management system
✅ Predator detection
✅ CSV data export
✅ All database operations

## Note:
- Free tier sleeps after 15 minutes of inactivity
- First request after sleep takes 30 seconds to wake up
- LSTM predictions may take 10-30 seconds on free tier
- Upgrade to $7/month for always-on performance