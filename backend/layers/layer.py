class Layer:
    def __init__(self):
        self.connections = []
        self.id = None

    def connect_to(self, layer):
        self.connections.append(layer)
        
    @classmethod
    def from_params(cls, params):
        """Create a layer instance from parameters. Must be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement from_params")

