import ApiClient from './api/ApiClient.js';
import NetworkModel from './models/NetworkModel.js';
import UIManager from './ui/UIManager.js';

class App {
  constructor() {
    this.uiManager = null;
    this.neuralNetwork = null;
    this.sessionTimer = null;
    this.timersEnabled = true;

  }

  async init() {
    //document.querySelector('.app-container').style.display = 'none';
    
    try {
      const isApiConnected = await ApiClient.testConnection();
      if (!isApiConnected) {
        throw new Error('Could not connect to API.');
      }
      this.uiManager = new UIManager();
      await NetworkModel.initialize();
      this.uiManager.layerPanel.renderLayerTypes(NetworkModel.layerTypes)
      this.setupLogin();

      
    } catch (error) {
      console.error('App: Initialization failed:', error);
      alert(`Initialization failed: ${error.message}.`);
    }
  }

  setupLogin() {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.addEventListener('click', async () => {
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
  
      try {
        const res = await ApiClient.login(username, password);
        alert("Login successful!");
        document.querySelector('.login-container').style.display = 'none';
        document.querySelector('.app-container').style.display = 'flex';
      } catch (error) {
        alert(`Login failed: ${error.message}`);
      }
    });
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

window.app = app;