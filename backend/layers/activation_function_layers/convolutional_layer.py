from enum import Enum
from layers.layer import Layer
import os

class ConvolutionType(Enum):
    STANDARD = "Standard"
    TRANSPOSED = "Transposed"


class ConvolutionalLayer(Layer):
    path = os.path.join('.', 'assets', 'drawing.svg')
    
    DEFAULT_LAYER_TYPE = ConvolutionType.STANDARD
    DEFAULT_FILTERS = 32
    DEFAULT_STRIDE = 1
    DEFAULT_KERNEL_SIZE = 5
    

    def __init__(self, layer_type: ConvolutionType = DEFAULT_LAYER_TYPE, 
                 filters: int = DEFAULT_FILTERS, 
                 stride: int = DEFAULT_STRIDE, 
                 kernel_size: int = DEFAULT_KERNEL_SIZE):
        super().__init__()
        self.layer_type = layer_type
        self.filters = filters
        self.stride = stride
        self.kernel_size = kernel_size

    @classmethod
    def from_params(cls, params):
        # Use the class default values
        conv_type_str = params.get('conv_type', cls.DEFAULT_LAYER_TYPE.name)
        try:
            conv_type = ConvolutionType[conv_type_str]
        except KeyError:
            conv_type = cls.DEFAULT_LAYER_TYPE
            
        filters = params.get('filters', cls.DEFAULT_FILTERS)
        stride = params.get('stride', cls.DEFAULT_STRIDE)
        kernel_size = params.get('kernel_size', cls.DEFAULT_KERNEL_SIZE)
        
        return cls(conv_type, filters, stride, kernel_size)
    
    @staticmethod
    def load_svg():
        with open(ConvolutionalLayer.path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": ConvolutionalLayer.load_svg()
        }
        
    def set_filters(size):
        pass