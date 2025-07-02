import ApiClient from '../api/ApiClient.js';
import NetworkModel from '../models/NetworkModel.js';
import UIManager from '../ui/UIManager.js';
// Timer Classes
class SessionTimer {
  constructor() {
    this.startTime = Date.now();
    this.timerElement = null;
    this.intervalId = null;
    this.isVisible = false;
  }

  init(elementId = 'session-timer') {
    this.timerElement = document.getElementById(elementId);
    if (!this.timerElement) {
      this.timerElement = document.createElement('div');
      this.timerElement.id = elementId;
      this.timerElement.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 5px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        z-index: 1000;
        display: none;
        user-select: none;
        cursor: default;
      `;
      document.body.appendChild(this.timerElement);
    }
    
    this.startDisplay();
  }

  show() {
    if (this.timerElement) {
      this.timerElement.style.display = 'block';
      this.isVisible = true;
    }
  }

  hide() {
    if (this.timerElement) {
      this.timerElement.style.display = 'none';
      this.isVisible = false;
    }
  }

  startDisplay() {
    this.updateDisplay();
    this.intervalId = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  updateDisplay() {
    const elapsed = Date.now() - this.startTime;
    const formatted = this.formatTime(elapsed);
    if (this.timerElement) {
      this.timerElement.textContent = `Session: ${formatted}`;
    }
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0')
    ].join(':');
  }

  getElapsedSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.startTime = Date.now();
    this.updateDisplay();
  }
}


