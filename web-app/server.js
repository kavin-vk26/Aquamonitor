const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Generate unique session ID for this server instance
const SESSION_ID = Date.now();
const VERSION = `v${SESSION_ID}`;

console.log(`🚀 AquaMonitor starting with VERSION: ${VERSION}`);

// ULTRA-AGGRESSIVE cache prevention for ALL requests
app.use((req, res, next) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '-1',
        'X-Timestamp': timestamp,
        'X-Random': random,
        'X-Version': VERSION,
        'Vary': '*',
        'Last-Modified': new Date().toUTCString()
    });
    
    next();
});

// Function to create versioned page names
function createVersionedPages() {
    const pages = ['home', 'dashboard', 'analytics', 'about'];
    const versionedPages = {};
    
    pages.forEach(page => {
        versionedPages[page] = `${page}-${VERSION}.html`;
    });
    
    return versionedPages;
}

const VERSIONED_PAGES = createVersionedPages();

// Function to inject cache-busting and update navigation
function processHTMLContent(htmlContent, currentPage) {
    const currentTime = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    let modifiedData = htmlContent
        // Update CSS and JS with fresh timestamps
        .replace(/styles\.css(\?v=[^"\s]*)?/g, `styles.css?v=${currentTime}&r=${random}`)
        .replace(/script\.js(\?v=[^"\s]*)?/g, `script.js?v=${currentTime}&r=${random}`)
        // Update navigation links to versioned pages
        .replace(/href="home\.html"/g, `href="/${VERSIONED_PAGES.home}"`)
        .replace(/href="dashboard\.html"/g, `href="/${VERSIONED_PAGES.dashboard}"`)
        .replace(/href="analytics\.html"/g, `href="/${VERSIONED_PAGES.analytics}"`)
        .replace(/href="about\.html"/g, `href="/${VERSIONED_PAGES.about}"`)
        // Update active class
        .replace(/class="active"/g, '')
        .replace(new RegExp(`href="/${VERSIONED_PAGES[currentPage]}"`), `href="/${VERSIONED_PAGES[currentPage]}" class="active"`)
        // Replace version placeholders
        .replace(/{{VERSION}}/g, VERSION)
        .replace(/{{TIMESTAMP}}/g, currentTime);
    
    return modifiedData;
}

// Serve versioned pages
app.get(`/${VERSIONED_PAGES.home}`, (req, res) => {
    const filePath = path.join(__dirname, 'public', 'home.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).send('Page not found');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(processHTMLContent(data, 'home'));
    });
});

app.get(`/${VERSIONED_PAGES.dashboard}`, (req, res) => {
    const filePath = path.join(__dirname, 'public', 'dashboard.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).send('Page not found');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(processHTMLContent(data, 'dashboard'));
    });
});

app.get(`/${VERSIONED_PAGES.analytics}`, (req, res) => {
    const filePath = path.join(__dirname, 'public', 'analytics.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).send('Page not found');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(processHTMLContent(data, 'analytics'));
    });
});

app.get(`/${VERSIONED_PAGES.about}`, (req, res) => {
    const filePath = path.join(__dirname, 'public', 'about.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).send('Page not found');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(processHTMLContent(data, 'about'));
    });
});

// Root route redirects to versioned home page
app.get('/', (req, res) => {
    res.redirect(`/${VERSIONED_PAGES.home}`);
});

// Redirect old URLs to versioned URLs
app.get('/home.html', (req, res) => {
    res.redirect(301, `/${VERSIONED_PAGES.home}`);
});

app.get('/dashboard.html', (req, res) => {
    res.redirect(301, `/${VERSIONED_PAGES.dashboard}`);
});

app.get('/analytics.html', (req, res) => {
    res.redirect(301, `/${VERSIONED_PAGES.analytics}`);
});

app.get('/about.html', (req, res) => {
    res.redirect(301, `/${VERSIONED_PAGES.about}`);
});

// API Routes with cache busting
app.post('/api/predict', (req, res) => {
    console.log(`🤖 Prediction request received:`, req.body);
    
    const { temperature, dissolved_oxygen, ph, latitude, longitude, species } = req.body;
    const selectedSpecies = species || 'general';

    let python;

    if (latitude && longitude) {
        console.log(`🌍 Using LSTM model for coordinates: ${latitude}, ${longitude}`);
        python = spawn('python', [
            path.join(__dirname, 'predict_universal.py'),
            latitude,
            longitude,
            selectedSpecies
        ]);
    } else {
        console.log(`📊 Using manual input model`);
        python = spawn('python', [
            path.join(__dirname, 'predict.py'),
            temperature,
            dissolved_oxygen,
            ph,
            selectedSpecies
        ]);
    }

    let result = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
        result += data.toString();
    });

    python.stderr.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes('oneDNN') && !msg.includes('UserWarning') && !msg.includes('INFO:')) {
            errorOutput += msg;
            console.error(`❌ Python Error: ${msg}`);
        }
    });

    python.on('close', (code) => {
        console.log(`🔍 Python process completed with code: ${code}`);
        
        if (code !== 0 && errorOutput) {
            return res.status(500).json({ error: 'Prediction failed', details: errorOutput });
        }
        
        try {
            const parsed = JSON.parse(result);
            console.log(`✅ Prediction successful`);
            res.json(parsed);
        } catch (e) {
            console.error(`❌ JSON parse error:`, e);
            res.status(500).json({ error: 'Prediction failed', details: result });
        }
    });
});

// Future datetime prediction API
app.post('/api/predict-future', (req, res) => {
    console.log(`🔮 Future prediction request received:`, req.body);
    
    const { latitude, longitude, target_datetime, species } = req.body;
    const selectedSpecies = species || 'general';
    
    if (!latitude || !longitude || !target_datetime) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required parameters: latitude, longitude, target_datetime' 
        });
    }
    
    console.log(`🔮 Predicting for ${target_datetime} at coordinates: ${latitude}, ${longitude}`);
    
    const python = spawn('python', [
        path.join(__dirname, 'predict_future_datetime.py'),
        latitude,
        longitude,
        target_datetime,
        selectedSpecies
    ]);
    
    let result = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
        result += data.toString();
    });
    
    python.stderr.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes('oneDNN') && !msg.includes('UserWarning') && !msg.includes('INFO:')) {
            errorOutput += msg;
            console.error(`❌ Future Prediction Error: ${msg}`);
        }
    });
    
    python.on('close', (code) => {
        console.log(`🔮 Future prediction process completed with code: ${code}`);
        
        if (code !== 0 && errorOutput) {
            return res.status(500).json({ 
                success: false, 
                error: 'Future prediction failed', 
                details: errorOutput 
            });
        }
        
        try {
            const parsed = JSON.parse(result);
            console.log(`✅ Future prediction successful for ${target_datetime}`);
            res.json(parsed);
        } catch (e) {
            console.error(`❌ Future prediction JSON parse error:`, e);
            res.status(500).json({ 
                success: false, 
                error: 'Future prediction failed', 
                details: result 
            });
        }
    });
});

// Fetch data API with enhanced logging
app.get('/api/fetch-data', (req, res) => {
    const lat = req.query.latitude || 10.98267;
    const lon = req.query.longitude || 76.97678;
    const startDate = req.query.start_date || '';
    const endDate = req.query.end_date || '';

    console.log(`📈 Fetching data for coordinates: ${lat}, ${lon} | Range: ${startDate || 'default'} to ${endDate || 'today'}`);

    const python = spawn('python', [
        path.join(__dirname, 'fetch_data_universal.py'),
        lat,
        lon,
        startDate,
        endDate
    ]);

    let result = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
        result += data.toString();
    });

    python.stderr.on('data', (data) => {
        errorOutput += data.toString();
        const msg = data.toString();
        if (!msg.includes('oneDNN') && !msg.includes('UserWarning') && !msg.includes('INFO:')) {
            console.error(`❌ Python stderr: ${msg}`);
        }
    });

    python.on('close', (code) => {
        console.log(`📈 Data fetch completed with code: ${code}`);
        
        if (code !== 0) {
            console.error(`❌ Error output: ${errorOutput}`);
            return res.status(500).json({
                error: 'Failed to fetch data',
                details: errorOutput
            });
        }

        try {
            const parsed = JSON.parse(result);
            console.log(`✅ Successfully fetched ${parsed.data?.length || 0} data points`);
            res.json(parsed);
        } catch (e) {
            console.error(`❌ JSON parse error: ${e.message}`);
            console.error(`Raw result: ${result}`);
            res.status(500).json({
                error: 'JSON parse error',
                details: result
            });
        }
    });
});

// Serve static files (CSS, JS, images) with cache busting
app.get('*.css', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.path);
    res.set('Content-Type', 'text/css');
    res.sendFile(filePath);
});

app.get('*.js', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.path);
    res.set('Content-Type', 'application/javascript');
    res.sendFile(filePath);
});

// Test page route
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test_charts.html'));
});

// Start server and automatically open home page
app.listen(PORT, () => {
    console.log(`🌍 AquaMonitor Server running at http://localhost:${PORT}`);
    console.log(`🚀 Server Version: ${VERSION}`);
    console.log(`🔗 Versioned URLs (Cache-Free):`);
    console.log(`   Home: http://localhost:${PORT}/${VERSIONED_PAGES.home}`);
    console.log(`   Dashboard: http://localhost:${PORT}/${VERSIONED_PAGES.dashboard}`);
    console.log(`   Analytics: http://localhost:${PORT}/${VERSIONED_PAGES.analytics}`);
    console.log(`   About: http://localhost:${PORT}/${VERSIONED_PAGES.about}`);
    console.log(`✨ Auto-opening home page...`);
    
    // Automatically open the home page in default browser
    const homeUrl = `http://localhost:${PORT}/${VERSIONED_PAGES.home}`;
    
    // Cross-platform browser opening
    const start = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open';
    
    exec(`${start} ${homeUrl}`, (error) => {
        if (error) {
            console.log(`📝 Manual access: ${homeUrl}`);
        } else {
            console.log(`🌐 Browser opened automatically`);
        }
    });
});