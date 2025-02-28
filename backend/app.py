from typing import Dict, Type
from flask import Flask, request, jsonify
from flask_cors import CORS
from enum import Enum
from layers.activation_function_layers.convolutional_layer import ConvolutionalLayer, ConvolutionType
from layers.activation_function_layers.pooling_layer import PoolingLayer
from activation_functions.activation_function import ReLUFunction, LeakyReLUFunction, TanhFunction
from layers.misc_layers.input_layer import InputLayer
from layers.layer import Layer
import inspect
from neural_network import NeuralNetwork
from connection import Connection
app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}})

networks = []
current_id = 0

@app.route("/")
def hello_world():
    return "Hello, World!"

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"status": "success", "message": "API is working!"})
    
def get_class_info(cls):    
    if issubclass(cls, Layer):
        sig = inspect.signature(cls.__init__)
        params = []
        for name, param in sig.parameters.items():
            if name != 'self':
                param_type = param.annotation
                param_info = {
                    "name": name,
                    "type": "string" 
                }
                if param_type != inspect.Parameter.empty:
                    if issubclass(param_type, Enum):
                        param_info["type"] = "enum"
                        param_info["enum_type"] = param_type.__name__
                    elif param_type == int:
                        param_info["type"] = "number"
                    elif param_type == float:
                        param_info["type"] = "number"
                    elif param_type == bool:
                        param_info["type"] = "boolean"
                
                params.append(param_info)
                
        svg_data = None
        if hasattr(cls, 'get_svg_representation') and callable(getattr(cls, 'get_svg_representation')):
            svg_data = cls.get_svg_representation()

        
        return {
            "type": "layer",
            "name": cls.__name__,
            "params": params,
            "svg_representation": svg_data
        }
    
    return {"type": "unknown", "name": cls.__name__}

@app.route('/api/layer-types', methods=['GET'])
def get_layer_types():
    layer_types = [
        get_class_info(ConvolutionalLayer),
        get_class_info(PoolingLayer),
        get_class_info(ReLUFunction),
        get_class_info(LeakyReLUFunction),
        get_class_info(TanhFunction)
    ]

    return jsonify({
        "layer_types": layer_types
    })


@app.route('/api/networks', methods=['POST'])
def create_network():
    global current_id
    network_id = str(current_id)
    current_id += 1
    network = NeuralNetwork(network_id)
    networks.append(network)
    
    return jsonify({"id": network_id})

LAYER_TYPES : Dict[str, Type[Layer]] = {
    'ConvolutionalLayer': ConvolutionalLayer,
    'PoolingLayer': PoolingLayer,
    'ReLUFunction': ReLUFunction,
    'LeakyReLUFunction': LeakyReLUFunction,
    'TanhFunction': TanhFunction
}

@app.route('/api/networks/<network_id>/layers', methods=['POST'])
def add_layer(network_id):
    data = request.json
    layer_type = data.get('type')
    params = data.get('params', {})

    layer_class = LAYER_TYPES.get(layer_type)
    layer = layer_class.from_params(params)

    network = find_network_by_id(network_id)
    layer_id = len(network.layers)
    layer.id = layer_id
    network.add_layer(layer)

    return jsonify({"id": layer_id})

@app.route('/api/networks/<network_id>/connections', methods=['POST'])
def connect_layers(network_id):      
    data = request.json
    source_id = data.get('source')
    target_id = data.get('target')
    network = find_network_by_id(network_id)
    source_layer = network.find_layer(source_id)
    target_layer = network.find_layer(target_id)
   
    source_layer.connect_to(target_layer)
    
    connection_id = len(network.connections)
    connection = Connection(source_layer, target_layer)
    network.add_connection(connection)
    
    return jsonify({"id": connection_id})


def find_network_by_id(id) -> NeuralNetwork:
    for n in networks:
        if n.id == id:
            return n
        
if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5001")
    app.run(debug=True, port=5001)