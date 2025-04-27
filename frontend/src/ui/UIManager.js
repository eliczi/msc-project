import LayerPanel from './LayerPanel.js';
// import Canvas from './Canvas.js';
import Canvas from './canvas/Canvas.js'
class UIManager {
  constructor() {
    this.elements = {
      layerTypesContainer: document.getElementById('layer-types-container'),
      drawingArea: document.getElementById('drawing-area'),
      clearBtn: document.getElementById('clear-btn'),
      groupBtn: document.getElementById('group-btn')

      //connectionsSvg: document.getElementById('connections')
    };
    
    this.layerPanel = new LayerPanel(this.elements.layerTypesContainer);
    this.canvas = new Canvas(this.elements.drawingArea, this.layerPanel);
    //this.connectionVisualizer = new ConnectionVisualizer(this.elements.connectionsSvg);
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.elements.clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        this.canvas.clearCanvas();
      }
    });
    this.elements.groupBtn.addEventListener('click', () => {
      this.handleGroupButtonClick();
    });

  }

  handleGroupButtonClick() {
    const group = this.canvas.createGroup();
    
    if (!group) {
      alert('Please select at least two nodes to create a group.');
    }
  }

}

export default UIManager;