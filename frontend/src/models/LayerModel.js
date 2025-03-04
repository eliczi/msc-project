class LayerModel {
  static LAYER_DIMENSIONS = {
    DEFAULT: { width: 64, height: 64 },
    
    InputLayer: { width: 64, height: 64 },
    ConvolutionalLayer: { width: 64, height: 64 },
    PoolingLayer: { width: 112, height: 64 },
    DenseLayer: { width: 64, height: 64 },
    DropoutLayer: { width: 64, height: 64 },
    FlattenLayer: { width: 64, height: 64 },
    OutputLayer: { width: 64, height: 64 }
  };

  constructor(id, backendId, type, params, x, y) {
    this.id = id;
    this.backendId = backendId;
    this.type = type;
    this.params = params;
    this.x = x;
    this.y = y;
    this.element = null;
    
    const dimensions = this.getDimensions();
    this.width = dimensions.width;
    this.height = dimensions.height;
  }
  
  updatePosition(x, y) {
    this.x = x;
    this.y = y;
  }
  
  getDisplayName() {
    return this.type;
  }
  
  setElement(element) {
    this.element = element;
  }
  
  getDimensions() {
    if (LayerModel.LAYER_DIMENSIONS[this.type]) {
      return LayerModel.LAYER_DIMENSIONS[this.type];
    }
    return LayerModel.LAYER_DIMENSIONS.DEFAULT;
  }
  
  static getDimensionsForType(layerType) {
    return LayerModel.LAYER_DIMENSIONS[layerType] || LayerModel.LAYER_DIMENSIONS.DEFAULT;
  }
}

export default LayerModel;