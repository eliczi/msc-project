// import ConnectionVisualizer from '../ConnectionVisualizer.js';
import ConnectionVisualizer from '../connection/ConnectionVisualizer.js';

class LayerManager {
  constructor(canvas, networkModel, layerFactory, parent) {
    this.canvas = canvas;
    this.networkModel = networkModel;
    this.layerFactory = layerFactory;
    this.parent = parent
  }
  
  // ===== Layer Creation/Deletion Methods =====
  
  async createLayer(layerType, x, y, scale) {
    const layerTypeDef = this.networkModel.getLayerType(layerType);
    if (!layerTypeDef) return null;
    
    const params = this.createDefaultParams(layerTypeDef);
    
    try {
      const layer = await this.networkModel.addLayer(layerType, params, x, y);
      if (!layer) throw new Error('Failed to create layer');
      const clickHandler = (nodeId) => {
        this.canvas.dispatchEvent(new CustomEvent('node-clicked', { 
          detail: { nodeId }, 
          bubbles: true 
        }));
      };

      const nodeElement = this.layerFactory.createNodeElement(
        layer.id,
        layerType,
        x,
        y,
        clickHandler,
        layerTypeDef,
        scale
      );
      
      this.canvas.appendChild(nodeElement);
      layer.setElement(nodeElement);
      return layer;
      
    } catch (error) {
      console.error('Failed to create layer:', error);
      return null;
    }
  }
  
  createDefaultParams(layerTypeDef) {
    const params = {};
    if (layerTypeDef.params && Array.isArray(layerTypeDef.params)) {
      layerTypeDef.params.forEach(param => {
        if (param.type === 'number') {
          params[param.name] = 1;
        } else if (param.type === 'enum' && param.enum_values && param.enum_values.length > 0) {
          params[param.name] = param.enum_values[0];
        } else {
          params[param.name] = '';
        }
      });
    }
    
    return params;
  }
  
  deleteNodeById(nodeId) {
    ConnectionVisualizer.getInstance().removeConnectionsForNode(nodeId);
    const nodeElement = document.querySelector(`.layer-node[data-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.remove();
    }
    this.networkModel.removeLayer(nodeId);
  }
  
  deleteSelectedNodes(selectedNodeIds) {
    selectedNodeIds.forEach(nodeId => {
      this.deleteNodeById(nodeId);
    });
  }
  
  clearCanvas() {
    const nodes = this.canvas.querySelectorAll('.layer-node');
    nodes.forEach(node => node.remove());
    ConnectionVisualizer.getInstance().removeAllConnections();
    this.networkModel.clear();
  }
}

export default LayerManager;