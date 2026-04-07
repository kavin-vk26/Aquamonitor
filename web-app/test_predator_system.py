#!/usr/bin/env python3
"""
Test script for predator detection functionality
"""

import os
import sys
import json

def test_predator_detection():
    print("🧪 Testing Predator Detection System")
    print("=" * 50)
    
    # Check if model file exists
    model_path = os.path.join(os.path.dirname(__file__), 'third_yolo.tflite')
    print(f"📁 Model path: {model_path}")
    print(f"📋 Model exists: {os.path.exists(model_path)}")
    
    if os.path.exists(model_path):
        model_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
        print(f"📏 Model size: {model_size:.2f} MB")
    
    # Check Python dependencies
    print("\n🐍 Checking Python Dependencies:")
    
    try:
        import numpy as np
        print("✅ NumPy available")
    except ImportError:
        print("❌ NumPy not available")
        return False
    
    try:
        from PIL import Image
        print("✅ PIL (Pillow) available")
    except ImportError:
        print("❌ PIL (Pillow) not available")
        return False
    
    try:
        import tensorflow as tf
        print(f"✅ TensorFlow available (version: {tf.__version__})")
    except ImportError:
        try:
            from tflite_runtime.interpreter import Interpreter
            print("✅ TensorFlow Lite Runtime available")
        except ImportError:
            print("❌ Neither TensorFlow nor TensorFlow Lite Runtime available")
            return False
    
    # Test model loading
    print("\n🤖 Testing Model Loading:")
    try:
        if 'tensorflow' in sys.modules:
            interpreter = tf.lite.Interpreter(model_path=model_path)
        else:
            from tflite_runtime.interpreter import Interpreter
            interpreter = Interpreter(model_path=model_path)
        
        interpreter.allocate_tensors()
        
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        print("✅ Model loaded successfully")
        print(f"📊 Input shape: {input_details[0]['shape']}")
        print(f"📊 Output shape: {output_details[0]['shape']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return False

def test_class_mapping():
    print("\n🏷️ Testing Class Mapping:")
    
    class_names = {
        0: 'cormorant',
        1: 'egret', 
        2: 'heron',
        3: 'snake',
        4: 'tortoise',
        5: 'human intruder',
    }
    
    print("📋 Available threat classes:")
    for class_id, class_name in class_names.items():
        print(f"   {class_id}: {class_name}")
    
    return True

def main():
    print("🦈 AquaMonitor Predator Detection Test")
    print("=" * 60)
    
    # Run tests
    model_test = test_predator_detection()
    class_test = test_class_mapping()
    
    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print(f"🤖 Model Test: {'✅ PASS' if model_test else '❌ FAIL'}")
    print(f"🏷️ Class Test: {'✅ PASS' if class_test else '❌ FAIL'}")
    
    if model_test and class_test:
        print("\n🎉 All tests passed! Predator detection system is ready.")
        print("🌐 You can now test the web interface at: http://localhost:3000/predator.html")
        return True
    else:
        print("\n⚠️ Some tests failed. Please check the requirements:")
        print("   - Install required packages: pip install tensorflow pillow numpy")
        print("   - Or install TensorFlow Lite: pip install tflite-runtime")
        print("   - Ensure third_yolo.tflite model file exists")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)