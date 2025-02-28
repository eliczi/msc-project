import apiClient from '../api/ApiClient.js';
import LayerModel from './LayerModel.js';
import ConnectionModel from './ConnectionModel.js';
import LayerPanel from '../ui/LayerPanel.js';


class NetworkModel {
  constructor() {
    this.id = null;
    this.layers = []; 
    this.connections = []; 
    this.layerTypes = [];
    this.nextNodeId = 1;
  }
  
  async initialize() {
    try {
      this.id = await apiClient.createNetwork();
      const layerTypes = await apiClient.getLayerTypes();
      this.layerTypes = layerTypes;
      return true;
      
    } catch (error) {
      console.error('Failed to initialize network:', error);
      return false;
    }
  }
  
  async addLayer(type, params, x, y) {
    try {
      if (!this.id) {
        throw new Error('No active network');
      }
      const backendId = await apiClient.addLayer(this.id, type, params);
      const nodeId = this.nextNodeId++;
      const layer = new LayerModel(nodeId, backendId, type, params, x, y);
      this.layers.push(layer);
      return layer;

    } catch (error) {
      console.error('Failed to add layer:', error);
      return null;
    }
  }
    
  getLayerType(typeName) {
    return this.layerTypes.find(lt => lt.name === typeName) || null;
  }
  
  clear() {
    this.layers = [];
    this.connections = [];
    this.nextNodeId = 1;
  }
}

export default new NetworkModel();