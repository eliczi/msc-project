import ApiClient from './api/ApiClient.js';
import NetworkModel from './models/NetworkModel.js';
import UIManager from './ui/UIManager.js';

class App {
  constructor() {
    this.uiManager = null;
  }

  async init() {
    try {
      const isApiConnected = await ApiClient.testConnection();
      if (!isApiConnected) {
        throw new Error('Could not connect to API.');
      }
      this.uiManager = new UIManager();
      await NetworkModel.initialize();
      this.uiManager.layerPanel.renderLayerTypes(NetworkModel.layerTypes)

      
    } catch (error) {
      console.error('App: Initialization failed:', error);
      alert(`Initialization failed: ${error.message}.`);
    }
  }
  
  handleError(errorMessage) {
    if (this.uiManager) {
      this.uiManager.showError(errorMessage);
    } else {
      alert(errorMessage);
    }
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

window.app = app;