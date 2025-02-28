import { API_URL } from '../config.js';

class ApiClient {

  async fetchApi(endpoint, options = {}) {
    try {
      console.log(`Fetching: ${API_URL}/${endpoint}`);
      
      const response = await fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`API error: ${error.message}`);
      throw error;
    }
  }
  
  async createNetwork() {
    const result = await this.fetchApi('networks', {
      method: 'POST',
      body: JSON.stringify({})
    });
    return result.id;
  }

  async getLayerTypes() {
    try {
      const data = await this.fetchApi('layer-types');
      if (!data.layer_types) {
        console.warn('ApiClient: No layer_types property in response');
      }
      return data.layer_types || [];
    } catch (error) {
      console.error('ApiClient: Error getting layer types:', error);
      throw error;
    }
  }
  
  async addLayer(networkId, type, params) {
    const result = await this.fetchApi(`networks/${networkId}/layers`, {
      method: 'POST',
      body: JSON.stringify({
        type: type,
        params: params
      })
    });
    
    return result.id;
  }
  
  async connectLayers(networkId, sourceId, targetId) {
    const result = await this.fetchApi(`networks/${networkId}/connections`, {
      method: 'POST',
      body: JSON.stringify({
        source: sourceId,
        target: targetId
      })
    });
    
    return result.id;
  }
  
  async testConnection() {
    try {
      const response = await fetch(`${API_URL}/layer-types`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      });
      
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

export default new ApiClient();