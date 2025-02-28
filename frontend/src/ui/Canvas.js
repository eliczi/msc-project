import NetworkModel from '../models/NetworkModel.js';
import NodeFactory from './NodeFactory.js';


class Canvas {

  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.isConnecting = false;
    this.selectedNodeId = null;
    this.sourceNodeId = null;
    
    this.setupDropZone();
    this.setupEventListeners();
    this.setupKeyboardEvents();
  }
  
  setupDropZone() {
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      //copied elsewhere, not removed
      e.dataTransfer.dropEffect = 'copy';
    });
    
    this.canvas.addEventListener('drop', async (e) => {
      e.preventDefault();
      const layerType = e.dataTransfer.getData('text/plain');
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      await this.createLayer(layerType, x, y);
    });
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      if (e.target === this.canvas) {
        console.log('click')
        this.deselectCurrentNode();
      }
    });
  }

  setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && this.selectedNodeId !== null) {
        this.deleteNode(); 
      }
    });
  }
  
  async createLayer(layerType, x, y) {
    const layerTypeDef = NetworkModel.getLayerType(layerType);
    if (!layerTypeDef) return;

    const params = {};
    // if (layerTypeDef.params) {
    //   layerTypeDef.params.forEach(param => {
    //     params[param.name] = param.default || null;
    //   });
    // }
    
    try {
      const layer = await NetworkModel.addLayer(layerType, params, x, y);
      if (!layer) throw new Error('Failed to create layer');
      
      const nodeElement = NodeFactory.createNodeElement(
        layer.id,
        layerType,
        x,
        y,
        this.handleNodeClick.bind(this),
        layerTypeDef
      );
      
      this.canvas.appendChild(nodeElement);
      layer.setElement(nodeElement);
      this.selectNode(layer.id);
      
      return layer;
    } catch (error) {
      console.error('Failed to create layer:', error);
      return null;
    }
  }

  handleNodeClick(nodeId) {
    this.selectNode(nodeId);
  }
  
  selectNode(nodeId) {
    this.deselectCurrentNode();
    this.selectedNodeId = nodeId;
    const node = document.querySelector(`.layer-node[data-id="${nodeId}"]`);
    if (node) {
      node.classList.add('selected');
    }
  }
  
  deselectCurrentNode() {
    if (this.selectedNodeId) {
      const prevNode = document.querySelector(`.layer-node[data-id="${this.selectedNodeId}"]`);
      if (prevNode) {
        prevNode.classList.remove('selected');
      }
      this.selectedNodeId = null;      
    }
  }

  clearCanvas() {
    const nodes = this.canvas.querySelectorAll('.layer-node');
    nodes.forEach(node => node.remove());    
    NetworkModel.clear();
  }

  deleteNode(){
    const prevNode = document.querySelector(`.layer-node[data-id="${this.selectedNodeId}"]`);
    prevNode.remove();
  }
  
}

export default Canvas;