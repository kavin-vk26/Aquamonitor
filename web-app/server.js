const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Generate version for cache busting
const VERSION = Date.now();

// Disable caching for all static files to prevent old code from being served
app.use(express.static('public', {
    etag: false,
    maxAge: 0,
    lastModified: false,
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
        res.set('X-Version', VERSION);
    }
}));

// Cache busting middleware for HTML files
app.use((req, res, next) => {
    if (req.url.endsWith('.html') || req.url === '/') {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

app.post('/api/predict', (req, res) => {
    const { temperature, dissolved_oxygen, ph, latitude, longitude, species } = req.body;
    const selectedSpecies = species || 'general';
    
    // If latitude/longitude provided, use universal LSTM model
    if (latitude && longitude) {
        const python = spawn('python', [
            path.join(__dirname, 'predict_universal.py'),
            latitude,
            longitude,
            selectedSpecies
        ]);
        
        let result = '';
        python.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            const msg = data.toString();
            if (!msg.includes('oneDNN') && !msg.includes('UserWarning') && !msg.includes('INFO:')) {
                console.error(`Python Error: ${msg}`);
            }
        });
        
        python.on('close', (code) => {
            try {
                const parsed = JSON.parse(result);
                if (parsed.error) {
                    res.status(500).json(parsed);
                } else {
                    res.json(parsed);
                }
            } catch (e) {
                res.status(500).json({ error: 'Prediction failed: ' + result });
            }
        });
    } else {
        // Manual input mode - use existing predict.py
        const python = spawn('python', [
            path.join(__dirname, 'predict.py'),
            temperature,
            dissolved_oxygen,
            ph,
            selectedSpecies
        ]);
        
        let result = '';
        python.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            const msg = data.toString();
            if (!msg.includes('oneDNN') && !msg.includes('UserWarning') && !msg.includes('INFO:')) {
                console.error(`Python Error: ${msg}`);
                result += msg;
            }
        });
        
        python.on('close', (code) => {
            try {
                const parsed = JSON.parse(result);
                if (parsed.error) {
                    res.status(500).json(parsed);
                } else {
                    res.json(parsed);
                }
            } catch (e) {
                res.status(500).json({ error: 'Prediction failed: ' + result });
            }
        });
    }
});

app.get('/api/fetch-data', (req, res) => {
    const lat = req.query.latitude || 10.98267;
    const lon = req.query.longitude || 76.97678;
    const startDate = req.query.start_date || '';
    const endDate = req.query.end_date || '';
    
    console.log(`Fetching data for coordinates: ${lat}, ${lon} | Range: ${startDate || 'default'} to ${endDate || 'today'}`);
    
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
        console.error(`Python stderr: ${data}`);
    });
    
    python.on('close', (code) => {
        console.log(`Python process exited with code: ${code}`);
        if (code !== 0) {
            console.error(`Error output: ${errorOutput}`);
            res.status(500).json({ error: 'Failed to fetch data', details: errorOutput });
            return;
        }
        
        try {
            const parsed = JSON.parse(result);
            console.log(`Successfully fetched ${parsed.rows || 0} data points`);
            res.json(parsed);
        } catch (e) {
            console.error(`JSON parse error: ${e.message}`);
            console.error(`Raw result: ${result}`);
            res.status(500).json({ error: 'Failed to parse data response', details: result });
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test_charts.html'));
});

app.listen(PORT, () => {
    console.log(`🌍 Water Quality Server running at http://localhost:${PORT}`);
    console.log(`🤖 LSTM Model: Universal (supports any location)`);
});