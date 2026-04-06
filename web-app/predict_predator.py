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

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h
    a1 = max(0, box1[2] - box1[0]) * max(0, box1[3] - box1[1])
    a2 = max(0, box2[2] - box2[0]) * max(0, box2[3] - box2[1])
    if a1 + a2 - inter_area <= 0:
        return 0
    return inter_area / (a1 + a2 - inter_area)

def nms(boxes, scores, iou_thresh=0.45):
    idxs = np.argsort(scores)[::-1]
    keep = []
    while len(idxs) > 0:
        i = idxs[0]
        keep.append(i)
        if len(idxs) == 1:
            break
        others = idxs[1:]
        keep_mask = np.array([iou(boxes[i], boxes[j]) < iou_thresh for j in others])
        idxs = np.concatenate(([idxs[0]], others[keep_mask]))
        idxs = idxs[1:]
    return keep

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

def parse_predictions(output, model_input_shape, score_thresh=0.25):
    # Handle different YOLO output formats
    if output.ndim == 3:
        # Standard YOLO format: [batch, detections, (x, y, w, h, conf, class_probs...)]
        detections = output[0]  # Remove batch dimension
        
        boxes = []
        scores = []
        classes = []
        
        for detection in detections:
            # Extract confidence (objectness score)
            if len(detection) >= 5:
                obj_conf = float(detection[4])
                
                # Skip low confidence detections
                if obj_conf < score_thresh:
                    continue
                
                # Extract class probabilities (if available)
                if len(detection) > 5:
                    class_probs = detection[5:]
                    class_id = int(np.argmax(class_probs))
                    class_conf = float(class_probs[class_id])
                    final_conf = obj_conf * class_conf
                else:
                    # If no class probabilities, use objectness as final confidence
                    class_id = 0  # Default class
                    final_conf = obj_conf
                
                # Skip if final confidence is too low
                if final_conf < score_thresh:
                    continue
                
                # Extract bounding box coordinates
                x, y, w, h = detection[:4]
                boxes.append([float(x), float(y), float(w), float(h)])
                scores.append(final_conf)
                classes.append(class_id)
        
        return boxes, scores, classes
    
    elif output.ndim == 2:
        # Flattened format: [detections, (x, y, w, h, conf, class_probs...)]
        boxes = []
        scores = []
        classes = []
        
        for detection in output:
            if len(detection) >= 5:
                obj_conf = float(detection[4])
                
                if obj_conf < score_thresh:
                    continue
                
                if len(detection) > 5:
                    class_probs = detection[5:]
                    class_id = int(np.argmax(class_probs))
                    class_conf = float(class_probs[class_id])
                    final_conf = obj_conf * class_conf
                else:
                    class_id = 0
                    final_conf = obj_conf
                
                if final_conf < score_thresh:
                    continue
                
                x, y, w, h = detection[:4]
                boxes.append([float(x), float(y), float(w), float(h)])
                scores.append(final_conf)
                classes.append(class_id)
        
        return boxes, scores, classes
    
    # If we can't parse the output, return empty lists
    return [], [], []

def main():
    try:
        if len(sys.argv) < 2:
            raise Exception('Image path not provided')

        img_path = sys.argv[1]
        if not os.path.exists(img_path):
            raise Exception(f'Image file not found: {img_path}')

        # Validate image
        try:
            with Image.open(img_path) as img:
                img.verify()
        except Exception as e:
            raise Exception(f'Invalid image file: {e}')

        # Find model
        model_candidates = [
            os.path.join(os.path.dirname(__file__), 'third_yolo.tflite'),
            os.path.join(os.path.dirname(__file__), 'model.pt'),
            os.path.join(os.path.dirname(__file__), 'best.pt', 'third_yolo.pt'),
        ]

        model_path = None
        for candidate in model_candidates:
            if os.path.exists(candidate):
                model_path = candidate
                break

        if not model_path:
            raise Exception(f'Model not found')

        # Run inference (suppress output)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            interpreter = get_tf_interpreter(model_path)
            interpreter.allocate_tensors()

            input_details = interpreter.get_input_details()
            output_details = interpreter.get_output_details()

            input_shape = input_details[0]['shape']
            target_size = (int(input_shape[2]), int(input_shape[1])) if len(input_shape) == 4 else (640, 640)

            input_data = load_image(img_path, target_size, input_details[0]['dtype'])
            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()

            output_data = interpreter.get_tensor(output_details[0]['index'])
            boxes, scores, classes = parse_predictions(output_data, input_shape, score_thresh=0.25)

        if not boxes:
            result = {'predator': 'No Predator Detected', 'confidence': 0.0}
            print(json.dumps(result))
            return

        keep = nms(np.array(boxes), np.array(scores), iou_thresh=0.45)
        if not keep:
            result = {'predator': 'No Predator Detected', 'confidence': 0.0}
            print(json.dumps(result))
            return

        top_idx = keep[0]
        top_cls = int(classes[top_idx])
        top_conf = float(scores[top_idx])

        predator_name = class_names.get(top_cls, f"Unknown Class {top_cls}")

        result = {'predator': predator_name.title(), 'confidence': top_conf}
        print(json.dumps(result))

    except Exception as e:
        result = {'predator': 'Error', 'confidence': 0.0, 'error': str(e)}
        print(json.dumps(result))

if __name__ == '__main__':
    main()