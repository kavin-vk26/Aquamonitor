const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
    
    const python = spawn('python', [
        path.join(__dirname, 'fetch_data_universal.py'),
        lat,
        lon
    ]);
    
    let result = '';
    python.stdout.on('data', (data) => {
        result += data.toString();
    });
    
    python.on('close', (code) => {
        try {
            res.json(JSON.parse(result));
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch data' });
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.listen(PORT, () => {
    console.log(`🌍 Water Quality Server running at http://localhost:${PORT}`);
    console.log(`🤖 LSTM Model: Universal (supports any location)`);
});