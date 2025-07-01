from layers.layer import Layer
import os


class DropoutLayer(Layer):
    path = os.path.join('.', 'assets', 'dropout_layer.svg')
    
    def __init__(self, target_shape=None):
        super().__init__()
        self.target_shape = target_shape
        self.input_shape = None
        self.output_shape = None
    
    @classmethod
    def from_params(cls, params):
        return cls()
    
    @staticmethod
    def load_svg():
        with open(DropoutLayer.path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": DropoutLayer.load_svg()
        }
    
    