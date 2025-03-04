from enum import Enum
from layers.layer import Layer
import os
class ConvolutionType(Enum):
    DEPTHWISE = "Depthwise"
    SEPARABLE = "Separable"
    TRANSPOSED = "Transposed"
    STANDARD = "Standard"
    PAIRWISE = "Pairwise"


class ConvolutionalLayer(Layer):
    path = os.path.join('.', 'assets', 'drawing.svg')

    def __init__(self, layer_type: ConvolutionType, filters: int, stride: int):
        super().__init__()
        self.layer_type = layer_type
        self.filters = filters
        self.stride = stride

    @classmethod
    def from_params(cls, params):
        conv_type_str = params.get('conv_type', 'VALID')
        try:
            conv_type = ConvolutionType[conv_type_str]
        except KeyError:
            conv_type = ConvolutionType.STANDARD
        #placeholder values
        filters = params.get('filters', 15)
        stride = params.get('stride', 2)
        return cls(conv_type, filters, stride)
    
    @staticmethod
    def load_svg():
        with open(ConvolutionalLayer.path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": ConvolutionalLayer.load_svg()
        }