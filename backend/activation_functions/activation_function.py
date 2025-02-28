from layers.layer import Layer

class ActivationFunction(Layer):
    def __init__(self):
        super().__init__()


class ReLUFunction(ActivationFunction):
    def __init__(self):
        super().__init__()
        
        
    @classmethod
    def from_params(cls, params):
        #placeholder values
        return cls()
        
    @staticmethod
    def load_svg():
        svg_path = '/Users/adamkasperski/Documents/msc/minimal_example/relu.svg'
        with open(svg_path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": ReLUFunction.load_svg()
        }

class SoftMaxFunction(ActivationFunction):
    pass

class SigmoidFunction(ActivationFunction):
    pass

class TanhFunction(ActivationFunction):
    def __init__(self):
        super().__init__()
        
        
    @classmethod
    def from_params(cls, params):
        #placeholder values
        return cls()
        
    @staticmethod
    def load_svg():
        svg_path = '/Users/adamkasperski/Documents/msc/minimal_example/tanh.svg'
        with open(svg_path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": TanhFunction.load_svg()
        }

class IdentityFunction(ActivationFunction):
    pass

class LeakyReLUFunction(ActivationFunction):
    def __init__(self):
        super().__init__()
        
        
    @classmethod
    def from_params(cls, params):
        #placeholder values
        return cls()
        
    @staticmethod
    def load_svg():
        svg_path = '/Users/adamkasperski/Documents/msc/minimal_example/leaky_relu.svg'
        with open(svg_path, 'r') as svg_file:
            return svg_file.read()
    
    @staticmethod
    def get_svg_representation():
        return {
            "svg_content": LeakyReLUFunction.load_svg()
        }