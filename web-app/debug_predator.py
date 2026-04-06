import sys
import json
import os
import warnings
import contextlib
import io
import numpy as np
from PIL import Image

warnings.filterwarnings('ignore')

# Predefined predator class names
class_names = {
    0: 'egret',
    1: 'heron', 
    2: 'kingfisher',
    3: 'cormorant',
    4: 'duck',
    5: 'swan',
    6: 'goose',
    7: 'pelican',
    8: 'stork',
    9: 'ibis',
    10: 'spoonbill',
    11: 'crane',
    12: 'flamingo',
    13: 'tern',
    14: 'gull',
    15: 'albatross',
    16: 'penguin',
    17: 'osprey',
    18: 'eagle',
    19: 'hawk',
}

try:
    import tensorflow as tf
except:
    tf = None

def get_tf_interpreter(model_path):
    if tf is not None:
        try:
            return tf.lite.Interpreter(model_path=model_path)
        except Exception as e:
            pass
    try:
        from tflite_runtime.interpreter import Interpreter
        return Interpreter(model_path=model_path)
    except Exception as e:
        raise Exception(f"Failed to create TFLite interpreter: {e}")

def load_image(image_path, target_size, dtype):
    img = Image.open(image_path).convert('RGB')
    img_resized = img.resize(target_size, Image.BILINEAR)
    data = np.array(img_resized, dtype=np.float32)
    if dtype == np.uint8:
        data = data.astype(np.uint8)
    else:
        data = data / 255.0
    data = np.expand_dims(data, axis=0)
    return data

def main():
    try:
        if len(sys.argv) < 2:
            raise Exception('Image path not provided')

        img_path = sys.argv[1]
        if not os.path.exists(img_path):
            raise Exception(f'Image file not found: {img_path}')

        # Find model
        model_path = os.path.join(os.path.dirname(__file__), 'third_yolo.tflite')
        if not os.path.exists(model_path):
            raise Exception('third_yolo.tflite not found')

        # Run inference
        interpreter = get_tf_interpreter(model_path)
        interpreter.allocate_tensors()

        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Debug model structure
        print(f"Input shape: {input_details[0]['shape']}", file=sys.stderr)
        print(f"Output shape: {output_details[0]['shape']}", file=sys.stderr)
        print(f"Input dtype: {input_details[0]['dtype']}", file=sys.stderr)
        print(f"Output dtype: {output_details[0]['dtype']}", file=sys.stderr)

        input_shape = input_details[0]['shape']
        target_size = (int(input_shape[2]), int(input_shape[1])) if len(input_shape) == 4 else (640, 640)

        # Load and preprocess image
        input_data = load_image(img_path, target_size, input_details[0]['dtype'])
        
        # Run inference
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details[0]['index'])
        
        # Debug output
        print(f"Raw output shape: {output_data.shape}", file=sys.stderr)
        print(f"Output min/max: {np.min(output_data):.4f}/{np.max(output_data):.4f}", file=sys.stderr)
        
        # Simple approach - find the class with highest activation
        if output_data.ndim >= 2:
            # Flatten to 1D if needed
            flat_output = output_data.flatten()
            
            # Get top prediction
            max_idx = np.argmax(flat_output)
            max_conf = float(flat_output[max_idx])
            
            # Map to class (modulo the number of classes)
            class_id = max_idx % len(class_names)
            predator_name = class_names.get(class_id, f"Class_{class_id}")
            
            print(f"Max activation at index {max_idx}, class {class_id}, confidence {max_conf:.4f}", file=sys.stderr)
            
            # Normalize confidence to 0-1 range
            if max_conf > 1.0:
                max_conf = 1.0 / (1.0 + np.exp(-max_conf))  # Sigmoid
            
            result = {
                'predator': predator_name.title(),
                'confidence': min(max(max_conf, 0.1), 0.99)
            }
        else:
            result = {'predator': 'No Predator Detected', 'confidence': 0.95}
        
        print(json.dumps(result))

    except Exception as e:
        result = {'predator': 'Error', 'confidence': 0.0, 'error': str(e)}
        print(json.dumps(result))

if __name__ == '__main__':
    main()