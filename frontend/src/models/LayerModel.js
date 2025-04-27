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
    // Handle parameter naming variants (e.g. kernelSize vs kernel_size)
    if (key in this.params) return this.params[key];
    return defaultValue;
  }

  updateParameter(key, value) {
    if (!(key in this.params)) return;
    
    // Store old value in case we need it
    const oldValue = this.params[key];
    this.params[key] = value;
        
    // Get visual parameters for this layer type
    const visualParams = LayerModel.VISUAL_PARAMETERS[this.type] || [];
    
    // Update visualization if the parameter affects visuals
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
            console.log(`Parameter: ${param.name}, Type: ${param.type}, Default: ${param.default}`);
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

    // Get parameters that affect visualization
    const kernelSize = this.getLayerParameter('kernel_size', 3);
    const filters = this.getLayerParameter('filters', 32);
    const stride = this.getLayerParameter('stride', 1);
        
    // Scale kernel size for visualization (larger values for better visibility)
    const scaledKernelSize = this.calculateKernelDisplaySize(kernelSize);
    
    // Use filter count to adjust kernel color intensity
    
    // Calculate kernel position based on stride
    const kernelX = 5  * 2; // Small adjustment for stride
    const kernelY = 5  * 2;
    
    // Use SVGGenerator to update the kernel
    const kernelOptions = {
      kernelWidth: scaledKernelSize,
      kernelHeight: scaledKernelSize,
      kernelX: kernelX,
      kernelY: kernelY,
    };

   // Configure the left side number (kernel size)
    const numberOptions = {
      numberValue: kernelSize,
    };
    
    // Configure the bottom number (filters count)
    const bottomNumberOptions = {
      bottomNumberValue: kernelSize,
    };
    
    // Replace the SVG with the updated version
    const success = SVGGenerator.replaceKernelSVG(
      svgContainer, 
      kernelOptions,
      numberOptions,
      bottomNumberOptions
    );
    
    if (success) {
      // Store the current kernel size for comparison in future updates
      this.element._kernelSize = kernelSize;
    } else {
      console.warn('Failed to update kernel visualization');
    }
  }
  
  /**
   * Calculates a display size for the kernel based on the kernel size parameter
   */
  calculateKernelDisplaySize(kernelSize) {
    // Ensure kernel size is a number
    const size = parseInt(kernelSize);
    if (isNaN(size) || size < 1) return 21; // Default size (64/3)
    
    // Scale for visualization:
    // Base size of 15 + adjustment based on kernel size
    // This ensures even large kernel sizes remain visible without taking up the entire node
    return Math.min(15 + size * 3, 35); // Cap at 50px (most of the 64px node)
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