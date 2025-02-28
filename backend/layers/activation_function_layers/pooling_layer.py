from enum import Enum
from layers.layer import Layer

class PoolingType(Enum):
    MAX = "Max"
    AVG = "Avg"

class PoolingLayer(Layer):
    path = '/Users/adamkasperski/Documents/msc/minimal_example/drawing.svg'
    def __init__(self, pooling_type: PoolingType):
        super().__init__()
        self.pooling_type = pooling_type
        
    
    @classmethod
    def from_params(cls, params):
        pooling_type_str = params.get('pooling_type', 'MAX')
        try:
            pooling_type = PoolingType[pooling_type_str]
        except KeyError:
            pooling_type = PoolingType.MAX            
        return cls(pooling_type)
    
   
    @staticmethod
    def load_svg():
        with open(PoolingLayer.path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": PoolingLayer.load_svg()
            }