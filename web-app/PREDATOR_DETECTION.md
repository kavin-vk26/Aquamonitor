# Predator Detection System

## Overview
The AquaMonitor Predator Detection system uses a trained YOLO (You Only Look Once) model to identify potential threats to aquaculture operations. The system can detect 6 different threat classes that commonly affect fish farms.

## Supported Threat Classes
1. **Cormorant** - Large diving bird, high threat to fish stocks
2. **Egret** - Wading bird, moderate threat to smaller fish
3. **Heron** - Large wading bird, high threat to fish stocks
4. **Snake** - Water snakes, moderate threat depending on species
5. **Tortoise** - Generally low threat, mainly vegetation eaters
6. **Human Intruder** - Unauthorized personnel, security concern

## Technical Details

### Model Information
- **Model Type**: YOLO (TensorFlow Lite)
- **Model File**: `third_yolo.tflite`
- **Input Size**: 640x640 pixels
- **Framework**: TensorFlow Lite for optimized inference

### API Endpoint
```
POST /api/predict-predator
Content-Type: multipart/form-data
```

**Request:**
- Upload image or video file (max 10MB)
- Supported formats: JPG, PNG, GIF, MP4, AVI, MOV

**Response:**
```json
{
  "predator": "heron",
  "confidence": 0.8542,
  "filename": "pond_image.jpg",
  "filesize": "245.3 KB",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Usage

### Web Interface
1. Navigate to `http://localhost:3000/predator.html`
2. Click "Choose File" or drag and drop an image
3. Click "Detect Predator" to analyze
4. View results with confidence score

### Testing
Run the test script to verify system functionality:
```bash
python test_predator_system.py
```

## Installation Requirements

### Python Dependencies
```bash
pip install tensorflow==2.15.0
pip install pillow==10.0.0
pip install numpy==1.24.3
```

### Alternative (Lightweight)
For production environments, you can use TensorFlow Lite Runtime instead:
```bash
pip install tflite-runtime
pip install pillow==10.0.0
pip install numpy==1.24.3
```

## File Structure
```
web-app/
├── predict_predator_working.py    # Main prediction script
├── third_yolo.tflite             # Trained YOLO model
├── test_predator_system.py       # System test script
├── uploads/                       # Temporary upload directory
└── public/predator.html          # Web interface
```

## Error Handling
The system includes comprehensive error handling for:
- Invalid file formats
- Corrupted images
- Model loading failures
- Inference errors
- File size limits (10MB max)

## Performance
- **Inference Time**: ~1-3 seconds per image
- **Memory Usage**: ~100MB during inference
- **Supported Concurrent Users**: Multiple (files processed sequentially)

## Security Features
- Automatic file cleanup after processing
- File type validation
- Size limits to prevent abuse
- Secure temporary file handling

## Troubleshooting

### Common Issues
1. **"Model not found"**: Ensure `third_yolo.tflite` exists in web-app directory
2. **"TensorFlow not available"**: Install TensorFlow or TensorFlow Lite Runtime
3. **"File too large"**: Reduce image size to under 10MB
4. **"Invalid file format"**: Use supported image/video formats

### Debug Mode
Enable debug logging by checking server console output for detailed error messages.

## Integration
The predator detection system is fully integrated with the AquaMonitor web application and can be accessed through the main navigation menu.