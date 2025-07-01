import SVGGenerator from '../ui/SVGGenerator.js';
import LayerFactory from '../ui/LayerFactory.js';
import NetworkModel from './NetworkModel.js';

class LayerModel {
  static LAYER_DIMENSIONS = {
    DEFAULT: { width: 64, height: 64 },
    InputLayer: { width: 64, height: 64 },
    ConvolutionalLayer: { width: 64, height: 64 },
    PoolingLayer: { width: 112, height: 64 },
    DenseLayer: { width: 64, height: 64 },
    EmbeddingLayer: { width: 64, height: 64 },
    DropoutLayer: { width: 64, height: 64 },
    FlatteningLayer: { width: 64, height: 64 },
    AttentionLayer: { width: 64, height: 64 },
    OutputLayer: { width: 64, height: 64 },
    ReLUFunction:{width: 40, height:40},
    LeakyReLUFunction:{width: 40, height:40},
    SoftMaxFunction:{width: 40, height:40},
    TanhFunction:{width: 40, height:40},
  };


  static VISUAL_PARAMETERS = {
    ConvolutionalLayer: ['kernelSize', 'kernel_size', 'filters', 'stride', 'padding'],
    PoolingLayer: ['pooling_type'],
    BaseInputLayer: ['input_type']
  };

  /**
   * Create a new layer model
   * @param {string} id - UI identifier
   * @param {string} backendId - Backend identifier
   * @param {string} type - Layer type 
   * @param {Object} params - Layer parameters
   * @param {number} x - X position
   * @param {number} y - Y position
   */
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
  
  getElement() {
    return this.element 
  }

  setElement(element) {
    this.element = element;
    
    // Store reference to the SVG container for easier access later
    if (element) {
      element._svgContainer = element.querySelector('.node-svg-container');
      
      // Store initial kernel size for comparison in updates
      if (this.type === 'ConvolutionalLayer') {
        element._kernelSize = this.params.kernelSize || this.params.kernel_size || 3;
      }
    }
  }
  
  getDimensions() {
    if (LayerModel.LAYER_DIMENSIONS[this.type]) {
      return LayerModel.LAYER_DIMENSIONS[this.type];
    }
    return LayerModel.LAYER_DIMENSIONS.DEFAULT;
  }

  getParameters() {
    return this.params; 
  }

  /**
   * Get a specific parameter with fallback
   * @param {string} key - Parameter key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parameter value
   * @private
   */
  getLayerParameter(key, defaultValue) {
    if (key in this.params) return this.params[key];
    return defaultValue;
  }

  updateParameter(key, value) {
    if (!(key in this.params)) return;
    const oldValue = this.params[key];
    this.params[key] = value;
    const visualParams = LayerModel.VISUAL_PARAMETERS[this.type] || [];
    if (visualParams.includes(key)) {
      this.updateVisualization();
    }
  }

  updateVisualization() {
    if (!this.element) return;
    switch (this.type) {
      case 'ConvolutionalLayer':
        this.updateConvLayerVisualization();
        break;
      case 'PoolingLayer':
        const poolingType = this.getLayerParameter('pooling_type', 'max');
        LayerFactory.updatePoolingTypeText(this.element, poolingType);
        break;
      case 'BaseInputLayer':
          let inputType = this.getLayerParameter('input_type', 'IMAGE');
          inputType = inputType.charAt(0).toUpperCase() + inputType.slice(1).toLowerCase();
          const layer = NetworkModel.getLayerType(`${inputType}InputLayer`);
          let newParams = {}
          layer.params.forEach(param => {
            if (param.name === 'input_type')// Check if the parameter is 'input_type'
            {
              newParams[param.name] = inputType.toUpperCase();
              return;// Skip setting default value for 'input_type'
            }
            newParams[param.name] = param.default           
          });
          this.params = newParams

          const svgContent = layer.svg_representation.all_representations[inputType.toUpperCase()] || 
                             layer.svg_representation.all_representations.IMAGE;
          this.element._svgContainer.innerHTML = svgContent;
          const svgElement = this.element._svgContainer.querySelector('svg');
          if (svgElement) {
              svgElement.setAttribute('width', '64px');
              svgElement.setAttribute('height', '64px');
          }
          break;
    }
  }

  updateConvLayerVisualization() {
    const svgContainer = this.element._svgContainer;
    if (!svgContainer) return;

    const kernelSize = this.getLayerParameter('kernel_size', 3);
    const filters = this.getLayerParameter('filters', 32);
    const stride = this.getLayerParameter('stride', 1);
        
    const scaledKernelSize = this.calculateKernelDisplaySize(kernelSize);
    
    
    const kernelX = 5  * 2;
    const kernelY = 5  * 2;
    
    const kernelOptions = {
      kernelWidth: scaledKernelSize,
      kernelHeight: scaledKernelSize,
      kernelX: kernelX,
      kernelY: kernelY,
    };

    const numberOptions = {
      numberValue: kernelSize,
    };
    
    const bottomNumberOptions = {
      bottomNumberValue: kernelSize,
    };
    
    const success = SVGGenerator.replaceKernelSVG(
      svgContainer, 
      kernelOptions,
      numberOptions,
      bottomNumberOptions
    );
    
    if (success) {
      this.element._kernelSize = kernelSize;
    } else {
      console.warn('Failed to update kernel visualization');
    }
  }
  
  /**
   * Calculates a display size for the kernel based on the kernel size parameter
   */
  calculateKernelDisplaySize(kernelSize) {
    const size = parseInt(kernelSize);
    if (isNaN(size) || size < 1) return 21;
  
    return Math.min(15 + size * 3, 35);
  }
  
  /**
   * Get dimensions for a specified layer type
   * @param {string} layerType - Layer type
   * @returns {Object} Width and height
   */
  static getDimensionsForType(layerType) {
    return LayerModel.LAYER_DIMENSIONS[layerType] || 
           LayerModel.LAYER_DIMENSIONS.DEFAULT;
  }
}

export default LayerModel;