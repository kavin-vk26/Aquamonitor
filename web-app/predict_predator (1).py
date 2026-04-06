#!/usr/bin/env python3
"""
Threat Detection using TensorFlow Lite Model  
Detects threats including: cormorant, egret, heron, tortoise, snake, human intruder
"""

import sys
import json
import os
import warnings
import numpy as np
from PIL import Image
import io
import contextlib

warnings.filterwarnings('ignore')

# Class names mapping - your 6 threat classes
CLASS_NAMES = {
    0: 'cormorant',
    1: 'egret',
    2: 'heron',
    3: 'snake',
    4: 'tortoise',
    5: 'human intruder',
}

def get_interpreter(model_path):
    """Load TensorFlow Lite interpreter"""
    try:
        import tensorflow as tf
        return tf.lite.Interpreter(model_path=model_path)
    except:
        try:
            from tflite_runtime.interpreter import Interpreter
            return Interpreter(model_path=model_path)
        except Exception as e:
            raise Exception(f"Failed to load TFLite model: {e}")

def load_and_prepare_image(image_path, target_size=(640, 640)):
    """Load and prepare image for inference"""
    img = Image.open(image_path).convert('RGB')
    img = img.resize(target_size, Image.BILINEAR)
    img_array = np.array(img, dtype=np.float32) / 255.0  # Normalize to 0-1
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def run_inference(model_path, image_path):
    """Run inference and return detections"""
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            interpreter = get_interpreter(model_path)
            interpreter.allocate_tensors()
            
            # Get input and output details
            input_details = interpreter.get_input_details()
            output_details = interpreter.get_output_details()
            
            # Prepare image
            input_shape = input_details[0]['shape']
            target_size = (int(input_shape[2]), int(input_shape[1])) if len(input_shape) == 4 else (640, 640)
            image_data = load_and_prepare_image(image_path, target_size)
            
            # Run inference
            interpreter.set_tensor(input_details[0]['index'], image_data)
            interpreter.invoke()
            
            # Get output
            output_data = interpreter.get_tensor(output_details[0]['index'])
            
        return output_data
        
    except Exception as e:
        raise Exception(f"Inference failed: {e}")

def parse_detections(output, confidence_threshold=0.25):
    """
    Parse TFLite YOLO output to extract detections.
    Output shape: (1, 9, 8400) where:
    - Batch: 1
    - 9 channels: [x, y, w, h, class_0, class_1, class_2, class_3, class_4]
    - 8400 anchors: YOLO grid (80x80 + 40x40 + 20x20)
    
    Note: Channels 4-8 are class scores for 5 classes. Objectness = max(class_scores).
    """
    detections = []
    
    try:
        # Handle shape (1, 9, 8400) - YOLO format
        if output.ndim == 3 and output.shape[1] == 9 and output.shape[2] == 8400:
            # Remove batch dimension: (9, 8400)
            output = output[0]
            
            # Extract components
            bbox = output[:4]  # Channels 0-3: x, y, w, h (4, 8400)
            class_scores = output[4:]  # Channels 4-8: class probabilities (5, 8400)
            
            # Objectness = maximum class score for each anchor
            objectness = np.max(class_scores, axis=0)  # (8400,)
            
            # Find detections where objectness > threshold
            high_conf_mask = objectness > confidence_threshold
            high_conf_indices = np.where(high_conf_mask)[0]
            
            # Extract detections
            for idx in high_conf_indices:
                # Get class with highest probability
                class_probs = class_scores[:, idx]
                class_id = int(np.argmax(class_probs))
                confidence = float(objectness[idx])
                
                detections.append({
                    'class_id': class_id,
                    'confidence': confidence
                })
        
        # Alternative: handle 2D or other formats
        elif output.ndim == 2:
            # Multiple detections: check if last dimension has enough features
            if output.shape[1] >= 5:
                for detection in output:
                    # Assume format: [x, y, w, h, conf, ...class_scores]
                    conf = float(detection[4])
                    if conf >= confidence_threshold:
                        class_id = int(detection[5]) if len(detection) > 5 else 0
                        detections.append({'class_id': class_id, 'confidence': conf})
    
    except Exception as e:
        print(f"DEBUG parse_detections error: {e}", file=sys.stderr)
        pass
    
    return detections

def main():
    try:
        # Validate input
        if len(sys.argv) < 2:
            result = {'predator': 'Error', 'confidence': 0.0}
            print(json.dumps(result))
            return
        
        image_path = sys.argv[1]
        
        # Check image exists
        if not os.path.exists(image_path):
            result = {'predator': 'Error', 'confidence': 0.0}
            print(json.dumps(result))
            return
        
        # Validate image
        try:
            with Image.open(image_path) as img:
                img.verify()
        except:
            result = {'predator': 'Error', 'confidence': 0.0}
            print(json.dumps(result))
            return
        
        # Find model
        model_path = os.path.join(os.path.dirname(__file__), 'third_yolo.tflite')
        
        if not os.path.exists(model_path):
            result = {'predator': 'Error', 'confidence': 0.0}
            print(json.dumps(result))
            return
        
        # Run inference
        output = run_inference(model_path, image_path)
        
        # Parse detections
        detections = parse_detections(output, confidence_threshold=0.25)
        
        # Get top detection
        if not detections:
            result = {'predator': 'No Threat Detected', 'confidence': 0.0}
        else:
            top = max(detections, key=lambda x: x['confidence'])
            class_id = top['class_id']
            confidence = float(top['confidence'])
            
            # Get class name - your 6 classes or generic class
            if class_id in CLASS_NAMES:
                class_name = CLASS_NAMES[class_id]
            else:
                class_name = f"Class {class_id}"
            
            result = {
                'predator': class_name,
                'confidence': round(confidence, 4)
            }
        
        print(json.dumps(result))
        
    except Exception as e:
        result = {'predator': 'Error', 'confidence': 0.0}
        print(json.dumps(result))

if __name__ == '__main__':
    main()

