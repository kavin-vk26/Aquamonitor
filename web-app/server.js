const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const { exec } = require('child_process');
const { Pool } = require('pg');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'aquamonitor',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Test database connection
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL Database connected successfully');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Make sure PostgreSQL is running and database "aquamonitor" exists');
        return false;
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: 'File upload error: ' + error.message
        });
    } else if (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
    next();
});

// Cache busting middleware
app.use((req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/home.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/data-reports.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'data-reports.html'));
});

app.get('/multi-location.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'multi-location.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/predator.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'predator.html'));
});

// Test endpoint for predator detection
app.get('/api/test-predator', (req, res) => {
    console.log('🧪 Testing predator detection endpoint');
    res.json({
        success: true,
        message: 'Predator detection API is working',
        timestamp: new Date().toISOString(),
        multer_available: typeof multer !== 'undefined',
        uploads_dir: 'uploads/'
    });
});

// Predator Detection API
app.post('/api/predict-predator', upload.single('image'), (req, res) => {
    console.log('🦈 Predator detection request received');
    
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No image file uploaded. Please select an image or video file.'
        });
    }
    
    console.log('📷 Processing uploaded file:', req.file.originalname);
    console.log('📁 File path:', req.file.path);
    
    // Use TensorFlow Lite model for prediction
    const python = spawn('python', [
        path.join(__dirname, 'debug_predator.py'),
        req.file.path
    ]);
    
    let result = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
        result += data.toString();
    });
    
    python.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('🐍 Python stderr:', data.toString());
    });
    
    python.on('close', (code) => {
        console.log('🔍 Python process completed with code:', code);
        console.log('📊 Raw Python output:', result);
        
        // Clean up uploaded file
        const fs = require('fs');
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('⚠️ Error deleting uploaded file:', err.message);
        });
        
        if (code !== 0) {
            console.error('❌ Python process failed with code:', code);
            console.error('❌ Error output:', errorOutput);
            return res.status(500).json({
                success: false,
                error: 'Predator detection failed',
                details: errorOutput || 'Python process failed'
            });
        }
        
        try {
            const prediction = JSON.parse(result);
            console.log('✅ Parsed prediction:', prediction);
            
            if (prediction.error) {
                console.error('❌ Prediction failed:', prediction.error);
                return res.status(500).json({
                    success: false,
                    error: prediction.error
                });
            }
            
            const response = {
                predator: prediction.predator,
                confidence: prediction.confidence,
                filename: req.file.originalname,
                filesize: `${(req.file.size / 1024).toFixed(1)} KB`,
                timestamp: new Date().toISOString()
            };
            
            console.log('🎯 Final response:', {
                predator: response.predator,
                confidence: `${(response.confidence * 100).toFixed(1)}%`
            });
            
            res.json(response);
            
        } catch (e) {
            console.error('❌ JSON parse error:', e.message);
            console.error('❌ Raw result:', result);
            res.status(500).json({
                success: false,
                error: 'Failed to parse prediction result',
                details: `Parse error: ${e.message}. Raw output: ${result}`
            });
        }
    });
});

// Helper function to generate predator-specific recommendations
function generatePredatorRecommendations(detection) {
    const recommendations = [];
    
    switch (detection.name) {
        case 'Bird (Heron)':
            recommendations.push('🚨 High threat detected! Install bird netting over ponds immediately');
            recommendations.push('🔊 Use sonic bird deterrents or reflective tape');
            recommendations.push('👥 Increase human presence during feeding times');
            recommendations.push('🌿 Remove perching spots near water bodies');
            break;
            
        case 'Snake (Water Snake)':
            recommendations.push('⚠️ Medium threat - Monitor snake activity patterns');
            recommendations.push('🏠 Install snake-proof fencing around pond perimeter');
            recommendations.push('🧹 Keep grass and vegetation trimmed near water');
            recommendations.push('🔍 Regular inspection for snake hiding spots');
            break;
            
        case 'Otter':
            recommendations.push('🚨 High threat! Otters can consume large quantities of fish');
            recommendations.push('🔒 Install otter-proof barriers and deeper water sections');
            recommendations.push('🌙 Increase nighttime monitoring (otters are nocturnal)');
            recommendations.push('📞 Contact local wildlife management for relocation');
            break;
            
        case 'Turtle':
            recommendations.push('ℹ️ Low threat - Turtles mainly eat vegetation and small fish');
            recommendations.push('🐢 Monitor turtle population to prevent overpopulation');
            recommendations.push('🥬 Ensure adequate vegetation to reduce fish predation');
            break;
            
        case 'Frog':
            recommendations.push('✅ Very low threat - Frogs are generally beneficial');
            recommendations.push('🦟 Frogs help control insect populations');
            recommendations.push('🌿 Maintain natural habitat balance');
            break;
            
        default:
            recommendations.push('✅ No immediate predator threat detected');
            recommendations.push('🔍 Continue regular monitoring for predator activity');
            recommendations.push('📋 Maintain predator prevention measures');
    }
    
    // Add general recommendations
    recommendations.push('📊 Log this detection for predator activity tracking');
    recommendations.push('⏰ Schedule follow-up monitoring in 24 hours');
    
    return recommendations;
}

// Water Quality Prediction API - ALL PREDICTIONS USE LSTM MODEL ONLY
app.post('/api/predict', (req, res) => {
    console.log('🤖 Prediction request received:', req.body);
    
    const { temperature, dissolved_oxygen, ph, latitude, longitude, species } = req.body;
    const selectedSpecies = species || 'general';

    let python;

    if (latitude && longitude) {
        // Location-based LSTM prediction
        console.log(`🌍 Using LSTM model for coordinates: ${latitude}, ${longitude}`);
        python = spawn('python', [
            path.join(__dirname, 'predict_universal.py'),
            latitude,
            longitude,
            selectedSpecies
        ]);
    } else if (temperature && dissolved_oxygen && ph) {
        // Manual input - Use LSTM model with default location for comparison
        console.log('📊 Manual input - Using LSTM model with default location for analysis');
        const defaultLat = 11.0168; // Coimbatore, India (central location)
        const defaultLon = 76.9558;
        
        python = spawn('python', [
            path.join(__dirname, 'predict_manual_lstm.py'),
            temperature,
            dissolved_oxygen,
            ph,
            selectedSpecies,
            defaultLat,
            defaultLon
        ]);
    } else {
        return res.status(400).json({ 
            error: 'Invalid input. Provide either coordinates (latitude, longitude) or manual values (temperature, dissolved_oxygen, ph)' 
        });
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
            console.log('✅ Prediction successful');
            res.json(parsed);
        } catch (e) {
            console.error('❌ JSON parse error:', e);
            res.status(500).json({ error: 'Prediction failed', details: result });
        }
    });
});

// Fetch historical data API
app.get('/api/fetch-data', (req, res) => {
    const lat = req.query.latitude || 10.98267;
    const lon = req.query.longitude || 76.97678;
    const startDate = req.query.start_date || '';
    const endDate = req.query.end_date || '';

    console.log(`📈 Fetching data for coordinates: ${lat}, ${lon}`);

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
    });

    python.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({
                error: 'Failed to fetch data',
                details: errorOutput
            });
        }

        try {
            const parsed = JSON.parse(result);
            res.json(parsed);
        } catch (e) {
            res.status(500).json({
                error: 'JSON parse error',
                details: result
            });
        }
    });
});

// Future prediction API
app.post('/api/predict-future', (req, res) => {
    const { latitude, longitude, target_datetime, species } = req.body;
    
    console.log('🔮 Future prediction request:', req.body);
    
    const python = spawn('python', [
        path.join(__dirname, 'predict_future_datetime.py'),
        latitude,
        longitude,
        target_datetime,
        species || 'general'
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
        }
    });

    python.on('close', (code) => {
        if (code !== 0 && errorOutput) {
            return res.status(500).json({ error: 'Future prediction failed', details: errorOutput });
        }
        
        try {
            const parsed = JSON.parse(result);
            res.json(parsed);
        } catch (e) {
            res.status(500).json({ error: 'Future prediction failed', details: result });
        }
    });
});

// Farm Management API Endpoints

// Register new farm
app.post('/api/farm/register', async (req, res) => {
    try {
        const { farmName, farmId, password, ownerName, contactEmail, contactPhone } = req.body;
        
        console.log('📝 Farm registration request:', { farmName, farmId, ownerName });
        
        if (!farmName || !farmId || !password) {
            return res.status(400).json({ success: false, error: 'Farm name, ID, and password are required' });
        }
        
        // Check if farm ID already exists
        const existingFarm = await pool.query('SELECT id FROM aquafarms WHERE farm_id = $1', [farmId]);
        if (existingFarm.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Farm ID already exists' });
        }
        
        const result = await pool.query(
            'INSERT INTO aquafarms (farm_name, farm_id, password, owner_name, contact_email, contact_phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [farmName, farmId, password, ownerName, contactEmail, contactPhone]
        );
        
        console.log('✅ Farm registered successfully:', farmId);
        res.json({ success: true, farm: result.rows[0] });
    } catch (error) {
        console.error('❌ Error registering farm:', error);
        res.status(500).json({ success: false, error: 'Failed to register farm: ' + error.message });
    }
});

// Authenticate farm login
app.post('/api/farm/login', async (req, res) => {
    try {
        const { farmName, farmId } = req.body;
        
        console.log('🔐 Farm login request:', { farmName, farmId });
        
        if (!farmName || !farmId) {
            return res.status(400).json({ success: false, error: 'Farm name and ID are required' });
        }
        
        const result = await pool.query(
            'SELECT * FROM aquafarms WHERE farm_id = $1 AND farm_name = $2',
            [farmId, farmName]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Invalid farm credentials');
            return res.status(401).json({ success: false, error: 'Invalid farm credentials' });
        }
        
        const farm = result.rows[0];
        
        console.log('✅ Farm authenticated successfully:', farmId);
        res.json({ 
            success: true, 
            farm: {
                id: farm.id,
                name: farm.farm_name,
                farmId: farm.farm_id,
                ownerName: farm.owner_name,
                contactEmail: farm.contact_email,
                contactPhone: farm.contact_phone,
                createdAt: farm.created_at
            }
        });
    } catch (error) {
        console.error('❌ Error authenticating farm:', error);
        res.status(500).json({ success: false, error: 'Authentication failed: ' + error.message });
    }
});

// Get farm locations
app.get('/api/farm/:farmId/locations', async (req, res) => {
    try {
        const { farmId } = req.params;
        
        console.log('📍 Getting locations for farm:', farmId);
        
        const result = await pool.query(
            'SELECT pl.*, af.farm_name FROM pond_locations pl JOIN aquafarms af ON pl.farm_id = af.farm_id WHERE pl.farm_id = $1 ORDER BY pl.pond_name',
            [farmId]
        );
        
        console.log(`✅ Found ${result.rows.length} locations for farm ${farmId}`);
        res.json({ success: true, locations: result.rows });
    } catch (error) {
        console.error('❌ Error getting farm locations:', error);
        res.status(500).json({ success: false, error: 'Failed to get locations: ' + error.message });
    }
});

// Add farm location
app.post('/api/farm/:farmId/locations', async (req, res) => {
    try {
        const { farmId } = req.params;
        const {
            locationName, latitude, longitude, primarySpecies,
            secondarySpecies, locationType, status, notes
        } = req.body;
        
        console.log('➕ Adding location for farm:', farmId, locationName);
        
        if (!locationName || !latitude || !longitude || !primarySpecies) {
            return res.status(400).json({ success: false, error: 'Location name, coordinates, and primary species are required' });
        }
        
        const result = await pool.query(
            'INSERT INTO pond_locations (farm_id, pond_name, latitude, longitude, species, secondary_species, pond_type, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [farmId, locationName, latitude, longitude, primarySpecies, secondarySpecies, locationType || 'pond', status || 'active', notes]
        );
        
        console.log('✅ Location added successfully:', locationName);
        res.json({ success: true, location: result.rows[0] });
    } catch (error) {
        console.error('❌ Error adding farm location:', error);
        res.status(500).json({ success: false, error: 'Failed to add location: ' + error.message });
    }
});

// Update farm location
app.put('/api/farm/:farmId/locations/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        const {
            locationName, latitude, longitude, primarySpecies,
            secondarySpecies, locationType, status, notes
        } = req.body;
        
        console.log('✏️ Updating location:', locationId);
        
        const result = await pool.query(
            'UPDATE pond_locations SET pond_name = $1, latitude = $2, longitude = $3, species = $4, secondary_species = $5, pond_type = $6, status = $7, notes = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
            [locationName, latitude, longitude, primarySpecies, secondarySpecies, locationType, status, notes, locationId]
        );
        
        console.log('✅ Location updated successfully');
        res.json({ success: true, location: result.rows[0] });
    } catch (error) {
        console.error('❌ Error updating farm location:', error);
        res.status(500).json({ success: false, error: 'Failed to update location: ' + error.message });
    }
});

// Delete farm location
app.delete('/api/farm/:farmId/locations/:locationId', async (req, res) => {
    try {
        const { farmId, locationId } = req.params;
        
        console.log('🗑️ Deleting location:', locationId);
        
        await pool.query('DELETE FROM pond_locations WHERE id = $1 AND farm_id = $2', [locationId, farmId]);
        
        console.log('✅ Location deleted successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting farm location:', error);
        res.status(500).json({ success: false, error: 'Failed to delete location: ' + error.message });
    }
});

// Fast analyze multiple locations with parallel processing
app.post('/api/farm/:farmId/analyze-enhanced', async (req, res) => {
    try {
        const { farmId } = req.params;
        const { locationIds } = req.body;
        
        console.log('🚀 Fast analysis for farm:', farmId, 'Locations:', locationIds);
        
        if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Location IDs are required' });
        }
        
        // Get selected locations
        const locationsResult = await pool.query(
            'SELECT * FROM pond_locations WHERE id = ANY($1) AND farm_id = $2',
            [locationIds, farmId]
        );
        
        const locations = locationsResult.rows;
        console.log(`📊 Found ${locations.length} locations to analyze`);
        
        const results = [];
        
        // Process each location individually for detailed analysis
        for (let i = 0; i < locations.length; i++) {
            const location = locations[i];
            console.log(`🔍 [${i+1}/${locations.length}] Analyzing: ${location.pond_name} (${location.latitude}, ${location.longitude})`);
            
            try {
                // Step 1: Get current prediction for THIS specific location
                console.log(`🤖 Getting current prediction for ${location.pond_name}`);
                
                const currentResponse = await fetch(`http://localhost:${PORT}/api/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        latitude: parseFloat(location.latitude),
                        longitude: parseFloat(location.longitude),
                        species: location.species
                    })
                });
                
                const currentPrediction = await currentResponse.json();
                
                if (currentPrediction.error) {
                    throw new Error(`Current prediction error: ${currentPrediction.error}`);
                }
                
                console.log(`✅ Current prediction for ${location.pond_name}:`, {
                    temp: currentPrediction.predicted_values?.water_temp,
                    do: currentPrediction.predicted_values?.do,
                    ph: currentPrediction.predicted_values?.ph,
                    score: currentPrediction.quality_score
                });
                
                // Step 2: Get next hour prediction for THIS specific location
                console.log(`🔮 Getting future prediction for ${location.pond_name}`);
                
                let futurePrediction = null;
                try {
                    const nextHourDate = new Date(Date.now() + 60 * 60 * 1000);
                    const futureResponse = await fetch(`http://localhost:${PORT}/api/predict-future`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            latitude: parseFloat(location.latitude),
                            longitude: parseFloat(location.longitude),
                            target_datetime: nextHourDate.toISOString(),
                            species: location.species
                        })
                    });
                    
                    futurePrediction = await futureResponse.json();
                    
                    if (futurePrediction.error) {
                        console.warn(`⚠️ Future prediction failed for ${location.pond_name}: ${futurePrediction.error}`);
                        futurePrediction = generateFallbackPrediction(currentPrediction, location.species);
                    } else {
                        console.log(`🔮 Future prediction for ${location.pond_name}:`, futurePrediction.predicted_values || futurePrediction);
                    }
                } catch (error) {
                    console.warn(`⚠️ Future prediction API error for ${location.pond_name}: ${error.message}`);
                    futurePrediction = generateFallbackPrediction(currentPrediction, location.species);
                }
                
                // Step 3: Generate enhanced AI recommendations
                const enhancedRecommendations = generateEnhancedRecommendations(
                    currentPrediction, 
                    futurePrediction, 
                    null, // Skip historical for speed but keep recommendations comprehensive
                    location.species,
                    location.pond_name
                );
                
                const result = {
                    location: location,
                    current_analysis: {
                        predicted_values: currentPrediction.predicted_values,
                        quality_score: currentPrediction.quality_score,
                        risk_level: currentPrediction.risk_level || calculateRiskLevel(currentPrediction, location.species),
                        timestamp: currentPrediction.timestamp
                    },
                    next_hour_prediction: {
                        predicted_values: futurePrediction?.predicted_values || futurePrediction || { error: 'Prediction unavailable' },
                        prediction_type: futurePrediction?.prediction_type || 'LSTM',
                        confidence: futurePrediction?.confidence || 'High'
                    },
                    ai_recommendations: enhancedRecommendations,
                    analysis_timestamp: new Date().toISOString()
                };
                
                results.push(result);
                
                console.log(`✅ [${i+1}/${locations.length}] Analysis completed for: ${location.pond_name}`);
                
                // Small delay to avoid overwhelming the system
                if (i < locations.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
            } catch (error) {
                console.error(`❌ Error analyzing ${location.pond_name}:`, error.message);
                results.push({
                    location: location,
                    error: `Analysis failed: ${error.message}`,
                    analysis_timestamp: new Date().toISOString()
                });
            }
        }
        
        console.log(`🎉 Enhanced analysis completed. Results: ${results.length}, Errors: ${results.filter(r => r.error).length}`);
        res.json({ success: true, results: results });
        
    } catch (error) {
        console.error('❌ Error in fast analysis:', error);
        res.status(500).json({ success: false, error: 'Failed to perform analysis: ' + error.message });
    }
});

// Direct prediction function (bypasses HTTP)
function getDirectPrediction(latitude, longitude, species) {
    return new Promise((resolve) => {
        const python = spawn('python', [
            path.join(__dirname, 'predict_universal.py'),
            latitude,
            longitude,
            species
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
            }
        });

        python.on('close', (code) => {
            if (code !== 0 && errorOutput) {
                resolve({ error: 'Prediction failed: ' + errorOutput });
                return;
            }
            
            try {
                const parsed = JSON.parse(result);
                resolve(parsed);
            } catch (e) {
                resolve({ error: 'JSON parse error: ' + result });
            }
        });
    });
}

// Direct future prediction function (uses LSTM)
function getDirectFuturePrediction(latitude, longitude, species) {
    return new Promise((resolve) => {
        const nextHourDate = new Date(Date.now() + 60 * 60 * 1000);
        const python = spawn('python', [
            path.join(__dirname, 'predict_future_datetime.py'),
            latitude,
            longitude,
            nextHourDate.toISOString(),
            species
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
            }
        });

        python.on('close', (code) => {
            if (code !== 0 && errorOutput) {
                // Fallback to trend-based prediction
                resolve(generateFallbackPrediction({ predicted_values: { water_temp: 25, do: 8, ph: 7.2 } }, species));
                return;
            }
            
            try {
                const parsed = JSON.parse(result);
                resolve(parsed);
            } catch (e) {
                resolve(generateFallbackPrediction({ predicted_values: { water_temp: 25, do: 8, ph: 7.2 } }, species));
            }
        });
    });
}

// Direct historical data function
function getDirectHistoricalData(latitude, longitude) {
    return new Promise((resolve) => {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const python = spawn('python', [
            path.join(__dirname, 'fetch_data_universal.py'),
            latitude,
            longitude,
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
        });

        python.on('close', (code) => {
            if (code !== 0) {
                resolve({ error: 'Historical data unavailable', data: [] });
                return;
            }

            try {
                const parsed = JSON.parse(result);
                resolve(parsed);
            } catch (e) {
                resolve({ error: 'Historical data parse error', data: [] });
            }
        });
    });
}

// Comprehensive recommendations function
function generateComprehensiveRecommendations(current, future, historical, species, locationName) {
    const recommendations = [];
    const thresholds = getSpeciesThresholds(species);
    
    if (!current.predicted_values) {
        return [`⚠️ Unable to generate recommendations - no current data available`];
    }
    
    const temp = current.predicted_values.water_temp;
    const do_val = current.predicted_values.do;
    const ph = current.predicted_values.ph;
    
    // Current condition analysis
    if (temp < thresholds.temperature.min) {
        const deficit = thresholds.temperature.min - temp;
        if (deficit > 5) {
            recommendations.push(`🚨 CRITICAL: Temperature is ${temp}°C, ${deficit.toFixed(1)}°C below minimum for ${species}. Immediate heating required!`);
        } else {
            recommendations.push(`🌡️ Temperature is ${temp}°C - Install heating system to reach optimal ${thresholds.temperature.min}-${thresholds.temperature.max}°C range`);
        }
    } else if (temp > thresholds.temperature.max) {
        const excess = temp - thresholds.temperature.max;
        if (excess > 5) {
            recommendations.push(`🚨 CRITICAL: Temperature is ${temp}°C, ${excess.toFixed(1)}°C above maximum for ${species}. Emergency cooling needed!`);
        } else {
            recommendations.push(`🌡️ Temperature is ${temp}°C - Implement cooling measures: increase water circulation, add shade, or use chillers`);
        }
    } else {
        recommendations.push(`✅ Temperature (${temp}°C) is optimal for ${species} cultivation`);
    }
    
    // Dissolved Oxygen analysis
    if (do_val < thresholds.do.min) {
        const deficit = thresholds.do.min - do_val;
        recommendations.push(`🚨 CRITICAL: Dissolved oxygen at ${do_val} mg/L is ${deficit.toFixed(1)} mg/L below minimum (${thresholds.do.min} mg/L). Install emergency aeration immediately!`);
        recommendations.push(`💨 Recommended actions: Add air stones, increase surface agitation, reduce feeding temporarily`);
    } else if (do_val < thresholds.do.min + 2) {
        recommendations.push(`⚠️ Dissolved oxygen at ${do_val} mg/L is adequate but monitor closely. Consider increasing aeration during peak hours`);
    } else {
        recommendations.push(`✅ Dissolved oxygen (${do_val} mg/L) levels are excellent for ${species}`);
    }
    
    // pH analysis
    if (ph < thresholds.ph.min) {
        const deficit = thresholds.ph.min - ph;
        recommendations.push(`⚗️ pH is ${ph}, ${deficit.toFixed(1)} units below optimal range (${thresholds.ph.min}-${thresholds.ph.max}). Add lime or sodium bicarbonate to raise pH`);
    } else if (ph > thresholds.ph.max) {
        const excess = ph - thresholds.ph.max;
        recommendations.push(`⚗️ pH is ${ph}, ${excess.toFixed(1)} units above optimal range (${thresholds.ph.min}-${thresholds.ph.max}). Add organic acids or increase CO2 to lower pH`);
    } else {
        recommendations.push(`✅ pH (${ph}) is within optimal range for ${species}`);
    }
    
    // Future prediction analysis
    if (future && future.predicted_values) {
        const futureTemp = future.predicted_values.water_temp;
        const futureDO = future.predicted_values.do;
        const futurePH = future.predicted_values.ph;
        
        const tempChange = futureTemp - temp;
        const doChange = futureDO - do_val;
        const phChange = futurePH - ph;
        
        if (Math.abs(tempChange) > 1.5) {
            const direction = tempChange > 0 ? 'rise' : 'drop';
            const action = tempChange > 0 ? 'cooling systems' : 'heating systems';
            recommendations.push(`🔮 Next hour prediction: Temperature will ${direction} by ${Math.abs(tempChange).toFixed(1)}°C to ${futureTemp}°C. Prepare ${action}`);
        }
        
        if (doChange < -0.5) {
            recommendations.push(`🔮 Warning: Dissolved oxygen predicted to drop by ${Math.abs(doChange).toFixed(1)} mg/L to ${futureDO} mg/L. Increase aeration now`);
        } else if (doChange > 0.5) {
            recommendations.push(`🔮 Good news: Dissolved oxygen predicted to increase by ${doChange.toFixed(1)} mg/L to ${futureDO} mg/L`);
        }
        
        if (Math.abs(phChange) > 0.2) {
            const direction = phChange > 0 ? 'increase' : 'decrease';
            recommendations.push(`🔮 pH predicted to ${direction} by ${Math.abs(phChange).toFixed(1)} units to ${futurePH}. Monitor water chemistry`);
        }
    }
    
    // Historical trend analysis
    if (historical && historical.data && historical.data.length > 0) {
        const dataPoints = historical.data.length;
        recommendations.push(`📊 Historical analysis: Based on ${dataPoints} data points from the past week`);
        
        // Calculate trend
        const recentData = historical.data.slice(-3);
        const earlierData = historical.data.slice(0, 3);
        
        if (recentData.length > 0 && earlierData.length > 0) {
            const recentAvgTemp = recentData.reduce((sum, r) => sum + parseFloat(r.water_temp), 0) / recentData.length;
            const earlierAvgTemp = earlierData.reduce((sum, r) => sum + parseFloat(r.water_temp), 0) / earlierData.length;
            
            const tempTrend = recentAvgTemp - earlierAvgTemp;
            if (Math.abs(tempTrend) > 1) {
                const direction = tempTrend > 0 ? 'increasing' : 'decreasing';
                recommendations.push(`📈 Temperature trend: ${direction} by ${Math.abs(tempTrend).toFixed(1)}°C over the past week`);
            }
        }
    }
    
    // Species-specific advice
    const speciesAdvice = getSpeciesSpecificAdvice(species, current.predicted_values, locationName);
    recommendations.push(...speciesAdvice);
    
    return recommendations.length > 0 ? recommendations : [`✅ All parameters are optimal for ${species} cultivation in ${locationName}`];
}

// Helper function to analyze historical data
function analyzeHistoricalData(data, species) {
    if (!data || data.length === 0) {
        return { error: 'No historical data available' };
    }
    
    const thresholds = getSpeciesThresholds(species);
    const analysis = {
        totalDays: data.length,
        temperature: { optimal: 0, warning: 0, critical: 0 },
        dissolvedOxygen: { optimal: 0, warning: 0, critical: 0 },
        ph: { optimal: 0, warning: 0, critical: 0 }
    };
    
    data.forEach(record => {
        // Temperature analysis
        const temp = parseFloat(record.water_temp);
        if (temp >= thresholds.temperature.min && temp <= thresholds.temperature.max) {
            analysis.temperature.optimal++;
        } else if (temp >= thresholds.temperature.min - 3 && temp <= thresholds.temperature.max + 3) {
            analysis.temperature.warning++;
        } else {
            analysis.temperature.critical++;
        }
        
        // DO analysis
        const do_val = parseFloat(record.do);
        if (do_val >= thresholds.do.min + 2) {
            analysis.dissolvedOxygen.optimal++;
        } else if (do_val >= thresholds.do.min) {
            analysis.dissolvedOxygen.warning++;
        } else {
            analysis.dissolvedOxygen.critical++;
        }
        
        // pH analysis
        const ph = parseFloat(record.ph);
        if (ph >= thresholds.ph.min && ph <= thresholds.ph.max) {
            analysis.ph.optimal++;
        } else if (ph >= thresholds.ph.min - 0.5 && ph <= thresholds.ph.max + 0.5) {
            analysis.ph.warning++;
        } else {
            analysis.ph.critical++;
        }
    });
    
    // Calculate percentages and trends
    analysis.temperature.optimalDays = analysis.temperature.optimal;
    analysis.dissolvedOxygen.optimalDays = analysis.dissolvedOxygen.optimal;
    analysis.ph.optimalDays = analysis.ph.optimal;
    
    // Determine overall trend
    const recentData = data.slice(-7); // Last 7 days
    const earlierData = data.slice(0, 7); // First 7 days
    
    if (recentData.length > 0 && earlierData.length > 0) {
        const recentAvg = recentData.reduce((sum, r) => sum + parseFloat(r.water_temp), 0) / recentData.length;
        const earlierAvg = earlierData.reduce((sum, r) => sum + parseFloat(r.water_temp), 0) / earlierData.length;
        
        if (Math.abs(recentAvg - earlierAvg) < 1) {
            analysis.trend = 'stable';
        } else if (recentAvg > earlierAvg) {
            analysis.trend = 'improving';
        } else {
            analysis.trend = 'declining';
        }
    }
    
    return analysis;
}

// Helper function to generate fallback prediction
function generateFallbackPrediction(currentPrediction, species) {
    if (!currentPrediction?.predicted_values) {
        return { error: 'No current data available for prediction' };
    }
    
    const current = currentPrediction.predicted_values;
    const thresholds = getSpeciesThresholds(species);
    
    // Generate simple trend-based prediction with small variations
    const tempVariation = (Math.random() - 0.5) * 1.0; // ±0.5°C variation
    const doVariation = (Math.random() - 0.5) * 0.5; // ±0.25 mg/L variation
    const phVariation = (Math.random() - 0.5) * 0.2; // ±0.1 pH variation
    
    return {
        predicted_values: {
            water_temp: Math.round((current.water_temp + tempVariation) * 100) / 100,
            do: Math.max(0.5, Math.round((current.do + doVariation) * 100) / 100),
            ph: Math.max(5.0, Math.min(10.0, Math.round((current.ph + phVariation) * 100) / 100))
        },
        prediction_type: 'fallback',
        note: 'Prediction based on current conditions with expected variations'
    };
}

// Helper function to generate enhanced recommendations
function generateEnhancedRecommendations(current, future, historical, species, locationName) {
    const recommendations = [];
    const thresholds = getSpeciesThresholds(species);
    
    // Current condition recommendations
    if (current.predicted_values) {
        const temp = current.predicted_values.water_temp;
        const do_val = current.predicted_values.do;
        const ph = current.predicted_values.ph;
        
        // Temperature recommendations
        if (temp < thresholds.temperature.min) {
            const deficit = thresholds.temperature.min - temp;
            if (deficit > 5) {
                recommendations.push(`🚨 CRITICAL: Temperature is ${temp}°C, ${deficit.toFixed(1)}°C below minimum for ${species}. Immediate heating required!`);
            } else {
                recommendations.push(`🌡️ Temperature is ${temp}°C - Install heating system to reach optimal ${thresholds.temperature.min}-${thresholds.temperature.max}°C range`);
            }
        } else if (temp > thresholds.temperature.max) {
            const excess = temp - thresholds.temperature.max;
            if (excess > 5) {
                recommendations.push(`🚨 CRITICAL: Temperature is ${temp}°C, ${excess.toFixed(1)}°C above maximum for ${species}. Emergency cooling needed!`);
            } else {
                recommendations.push(`🌡️ Temperature is ${temp}°C - Implement cooling measures: increase water circulation, add shade, or use chillers`);
            }
        } else {
            recommendations.push(`✅ Temperature (${temp}°C) is optimal for ${species} cultivation`);
        }
        
        // Dissolved Oxygen recommendations
        if (do_val < thresholds.do.min) {
            const deficit = thresholds.do.min - do_val;
            recommendations.push(`🚨 CRITICAL: Dissolved oxygen at ${do_val} mg/L is ${deficit.toFixed(1)} mg/L below minimum (${thresholds.do.min} mg/L). Install emergency aeration immediately!`);
            recommendations.push(`💨 Recommended actions: Add air stones, increase surface agitation, reduce feeding temporarily`);
        } else if (do_val < thresholds.do.min + 2) {
            recommendations.push(`⚠️ Dissolved oxygen at ${do_val} mg/L is adequate but monitor closely. Consider increasing aeration during peak hours`);
        } else {
            recommendations.push(`✅ Dissolved oxygen (${do_val} mg/L) levels are excellent for ${species}`);
        }
        
        // pH recommendations
        if (ph < thresholds.ph.min) {
            const deficit = thresholds.ph.min - ph;
            recommendations.push(`⚗️ pH is ${ph}, ${deficit.toFixed(1)} units below optimal range (${thresholds.ph.min}-${thresholds.ph.max}). Add lime or sodium bicarbonate to raise pH`);
        } else if (ph > thresholds.ph.max) {
            const excess = ph - thresholds.ph.max;
            recommendations.push(`⚗️ pH is ${ph}, ${excess.toFixed(1)} units above optimal range (${thresholds.ph.min}-${thresholds.ph.max}). Add organic acids or increase CO2 to lower pH`);
        } else {
            recommendations.push(`✅ pH (${ph}) is within optimal range for ${species}`);
        }
    }
    
    // Future prediction recommendations
    if (future && future.predicted_values) {
        const futureTemp = future.predicted_values.water_temp;
        const futureDO = future.predicted_values.do;
        const futurePH = future.predicted_values.ph;
        const currentTemp = current.predicted_values?.water_temp;
        const currentDO = current.predicted_values?.do;
        const currentPH = current.predicted_values?.ph;
        
        if (currentTemp && futureTemp) {
            const tempChange = futureTemp - currentTemp;
            if (Math.abs(tempChange) > 1.5) {
                const direction = tempChange > 0 ? 'rise' : 'drop';
                const action = tempChange > 0 ? 'cooling systems' : 'heating systems';
                recommendations.push(`🔮 Next hour prediction: Temperature will ${direction} by ${Math.abs(tempChange).toFixed(1)}°C to ${futureTemp}°C. Prepare ${action}`);
            }
        }
        
        if (currentDO && futureDO) {
            const doChange = futureDO - currentDO;
            if (doChange < -0.5) {
                recommendations.push(`🔮 Warning: Dissolved oxygen predicted to drop by ${Math.abs(doChange).toFixed(1)} mg/L to ${futureDO} mg/L. Increase aeration now`);
            } else if (doChange > 0.5) {
                recommendations.push(`🔮 Good news: Dissolved oxygen predicted to increase by ${doChange.toFixed(1)} mg/L to ${futureDO} mg/L`);
            }
        }
        
        if (currentPH && futurePH) {
            const phChange = futurePH - currentPH;
            if (Math.abs(phChange) > 0.2) {
                const direction = phChange > 0 ? 'increase' : 'decrease';
                recommendations.push(`🔮 pH predicted to ${direction} by ${Math.abs(phChange).toFixed(1)} units to ${futurePH}. Monitor water chemistry`);
            }
        }
    } else if (future && future.prediction_type === 'fallback') {
        recommendations.push(`🔮 Next hour: Conditions expected to remain stable with minor natural variations`);
    }
    
    // Historical trend recommendations
    if (historical && historical.analysis) {
        const analysis = historical.analysis;
        
        if (analysis.trend === 'declining') {
            recommendations.push(`📉 Historical trend shows declining conditions over past 30 days. Implement preventive measures and increase monitoring frequency`);
            recommendations.push(`🔧 Suggested actions: Review feeding schedules, check filtration systems, test water source quality`);
        } else if (analysis.trend === 'improving') {
            recommendations.push(`📈 Excellent! Conditions have been improving over the past 30 days. Continue current management practices`);
        } else {
            recommendations.push(`📊 Water conditions have remained stable over the past 30 days`);
        }
        
        // Specific historical insights
        if (analysis.temperature && analysis.temperature.optimalDays < analysis.totalDays * 0.7) {
            recommendations.push(`🌡️ Historical insight: Temperature was suboptimal ${Math.round((1 - analysis.temperature.optimalDays/analysis.totalDays) * 100)}% of the time. Consider thermal management improvements`);
        }
        
        if (analysis.dissolvedOxygen && analysis.dissolvedOxygen.optimalDays < analysis.totalDays * 0.8) {
            recommendations.push(`💨 Historical insight: Dissolved oxygen levels were concerning. Consider upgrading aeration systems`);
        }
    }
    
    // Species-specific recommendations
    const speciesAdvice = getSpeciesSpecificAdvice(species, current.predicted_values, locationName);
    recommendations.push(...speciesAdvice);
    
    // Location-specific recommendations based on name
    if (locationName.toLowerCase().includes('pond')) {
        recommendations.push(`🏞️ Pond management: Monitor algae growth and consider beneficial bacteria supplements`);
    } else if (locationName.toLowerCase().includes('tank')) {
        recommendations.push(`🏭 Tank system: Ensure proper filtration and regular water changes (10-15% weekly)`);
    } else if (locationName.toLowerCase().includes('cage')) {
        recommendations.push(`🌊 Cage farming: Monitor current flow and check net integrity regularly`);
    }
    
    // Seasonal recommendations
    const month = new Date().getMonth();
    if (month >= 5 && month <= 8) { // Summer months
        recommendations.push(`☀️ Summer season: Increase monitoring frequency during hot weather, ensure adequate shade`);
    } else if (month >= 11 || month <= 1) { // Winter months
        recommendations.push(`❄️ Winter season: Monitor for temperature drops, reduce feeding if water is too cold`);
    }
    
    return recommendations.length > 0 ? recommendations : [`✅ All parameters are optimal for ${species} cultivation in ${locationName}`];
}

// Helper function for species-specific advice
function getSpeciesSpecificAdvice(species, values, locationName) {
    const advice = [];
    
    switch (species) {
        case 'salmon':
        case 'trout':
            advice.push(`🐟 Cold-water species management: Maintain excellent water circulation, monitor for temperature spikes above 18°C`);
            advice.push(`🌊 Ensure high dissolved oxygen levels (>7 mg/L) as cold-water fish have higher oxygen demands`);
            if (values.water_temp > 16) {
                advice.push(`⚠️ Temperature approaching stress levels for ${species}. Consider cooling measures`);
            }
            break;
            
        case 'tilapia':
            advice.push(`🐟 Warm-water species: Tilapia are hardy but ensure adequate dissolved oxygen during high temperature periods`);
            advice.push(`🌡️ Optimal temperature range is 25-32°C. Tilapia can tolerate temperature fluctuations better than most species`);
            if (values.do < 4) {
                advice.push(`💨 Tilapia can survive low oxygen but growth will be affected. Increase aeration for optimal production`);
            }
            break;
            
        case 'catfish':
            advice.push(`🐟 Catfish management: These bottom-dwellers are tolerant of lower oxygen but perform best with good aeration`);
            advice.push(`🌡️ Maintain temperature between 24-30°C for optimal growth and feeding`);
            break;
            
        case 'carp':
            advice.push(`🐟 Carp cultivation: Hardy species that can tolerate various conditions but thrive in well-managed environments`);
            advice.push(`🌱 Consider polyculture opportunities with other compatible species`);
            break;
            
        case 'shrimp':
        case 'prawn':
            advice.push(`🦐 Crustacean management: Monitor pH stability closely as ${species} are sensitive to pH fluctuations`);
            advice.push(`⚗️ Maintain alkalinity levels between 80-120 ppm for optimal shell development`);
            advice.push(`🌡️ Temperature stability is crucial - avoid rapid temperature changes`);
            if (values.ph < 7.5) {
                advice.push(`⚗️ pH is on the lower side for ${species}. Consider adding calcium carbonate to buffer pH`);
            }
            break;
            
        default:
            advice.push(`🐟 General aquaculture: Maintain stable water conditions and monitor all parameters regularly`);
            advice.push(`📊 Regular water testing (2-3 times per week) is recommended for optimal fish health`);
    }
    
    return advice;
}

// Helper function to get species thresholds
function getSpeciesThresholds(species) {
    const thresholds = {
        tilapia: { temperature: { min: 25, max: 32 }, do: { min: 3 }, ph: { min: 6, max: 9 } },
        salmon: { temperature: { min: 10, max: 18 }, do: { min: 7 }, ph: { min: 6.5, max: 8 } },
        catfish: { temperature: { min: 24, max: 30 }, do: { min: 4 }, ph: { min: 6.5, max: 8.5 } },
        carp: { temperature: { min: 20, max: 28 }, do: { min: 4 }, ph: { min: 6.5, max: 9 } },
        shrimp: { temperature: { min: 26, max: 32 }, do: { min: 4 }, ph: { min: 7, max: 8.5 } },
        prawn: { temperature: { min: 26, max: 31 }, do: { min: 4 }, ph: { min: 7, max: 8.5 } },
        trout: { temperature: { min: 10, max: 16 }, do: { min: 7 }, ph: { min: 6.5, max: 8 } },
        general: { temperature: { min: 20, max: 28 }, do: { min: 5 }, ph: { min: 6.5, max: 8.5 } }
    };
    
    return thresholds[species] || thresholds.general;
}

// Add the missing function after the existing getSpeciesThresholds function

// Helper function to calculate risk level
function calculateRiskLevel(prediction, species) {
    if (!prediction.predicted_values) return 'UNKNOWN';
    
    const thresholds = getSpeciesThresholds(species);
    let riskScore = 0;
    
    // Temperature risk
    const temp = prediction.predicted_values.water_temp;
    if (temp < thresholds.temperature.min - 3 || temp > thresholds.temperature.max + 3) {
        riskScore += 3;
    } else if (temp < thresholds.temperature.min || temp > thresholds.temperature.max) {
        riskScore += 1;
    }
    
    // DO risk
    const do_val = prediction.predicted_values.do;
    if (do_val < thresholds.do.min) {
        riskScore += 3;
    } else if (do_val < thresholds.do.min + 1) {
        riskScore += 1;
    }
    
    // pH risk
    const ph = prediction.predicted_values.ph;
    if (ph < thresholds.ph.min - 0.5 || ph > thresholds.ph.max + 0.5) {
        riskScore += 2;
    } else if (ph < thresholds.ph.min || ph > thresholds.ph.max) {
        riskScore += 1;
    }
    
    if (riskScore >= 5) return 'HIGH';
    if (riskScore >= 2) return 'MODERATE';
    return 'LOW';
}

// Get analysis history
app.get('/api/farm/:farmId/history', async (req, res) => {
    // Analysis History feature disabled
    res.json({ success: false, error: 'Analysis History feature has been disabled' });
});

// Test database connection on startup
testConnection();

// Start server
app.listen(PORT, () => {
    console.log(`🌍 AquaMonitor Server running at http://localhost:${PORT}`);
    console.log('🔗 Available pages:');
    console.log(`   Home: http://localhost:${PORT}/home.html`);
    console.log(`   Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`   Analytics: http://localhost:${PORT}/analytics.html`);
    console.log(`   Farm Management: http://localhost:${PORT}/multi-location.html`);
    console.log(`   Predator Detection: http://localhost:${PORT}/predator.html`);
    console.log(`   About: http://localhost:${PORT}/about.html`);
    console.log('');
    console.log('🏭 Farm Management Demo:');
    console.log('   Farm Name: Blue Ocean Aquaculture');
    console.log('   Farm ID: BOA2024');
    
    // Auto-open browser
    const homeUrl = `http://localhost:${PORT}/home.html`;
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