import NetworkModel from '../../models/NetworkModel.js';
import LayerFactory from '../LayerFactory.js';
import CanvasEventHandler from './CanvasEventHandler.js';
import SelectionManager from './SelectionManager.js';
import LayerPanelManager from './LayerPanelManager.js';
import PreviewManager from './PreviewManager.js';
import LayerManager from './LayerManager.js';
import CanvasUtils from './CanvasUtils.js';
// import ConnectionVisualizer from '../ConnectionVisualizer.js';
import ConnectionVisualizer from '../connection/ConnectionVisualizer.js';
import GroupManager from './GroupManager.js';
import DomUtils from '../../utils/DomUtils.js';

class Canvas {
    constructor(canvasElement, layerPanel) {
      this.canvas = canvasElement;
      this.layerPanel = layerPanel;
      
      // Initialize panning state
      this.panX = 0;
      this.panY = 0;
      
      // Initialize zoom state
      this.scale = 1.0;
      this.minScale = 0.2;  // Minimum zoom level (50%)
      this.maxScale = 2.0;  // Maximum zoom level (200%)
      this.zoomStep = 0.1;  // Zoom increment per key press
      
      this.initializeStyles();
      this.initializePanningEvents();
      
      // Initialize managers
      this.utils = new CanvasUtils(this.canvas, this);
      this.selectionManager = new SelectionManager(this.canvas, this.utils);
      this.layerPanelManager = new LayerPanelManager(NetworkModel);
      this.previewManager = new PreviewManager(this);
      this.layerManager = new LayerManager(this.canvas, NetworkModel, LayerFactory, this);
      this.groupManager = new GroupManager(this.canvas, this.selectionManager, this);
      
      // Initialize event handler with dependencies
      this.eventHandler = new CanvasEventHandler(
        this.canvas,
        this.selectionManager,
        this.layerPanelManager,
        this.previewManager,
        this.layerManager,
        this.utils,
        this.layerPanel,
        this.groupManager,
        this
      );
      
      // Setup event handlers
      this.eventHandler.initializeEventHandlers();
    }
    
    initializeStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .selection-area {
          position: absolute;
          border: 1px dashed #3498db;
          background-color: rgba(52, 152, 219, 0.1);
          pointer-events: none;
          z-index: 1000;
        }
        
        .layer-node.selected {
          outline: 2px solid #3498db !important;
          box-shadow: 0 0 8px rgba(52, 152, 219, 0.6) !important;
        }        
      `;
      document.head.appendChild(style);
      
      // Add zoom indicator
      this.zoomIndicator = document.createElement('div');
      this.zoomIndicator.className = 'zoom-indicator';
      this.zoomIndicator.textContent = '100%';
      document.body.appendChild(this.zoomIndicator);

      this.panXIndicator = document.createElement('div');
      this.panXIndicator.className = 'panx-indicator';
      this.panXIndicator.textContent = '0';
      document.body.appendChild(this.panXIndicator);
      
      this.panYIndicator = document.createElement('div');
      this.panYIndicator.className = 'pany-indicator';
      this.panYIndicator.textContent = '0';
      document.body.appendChild(this.panYIndicator);
    }
    
    initializePanningEvents() {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      
      // Add wheel event for mouse wheel and touchpad zoom
      this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }
    
    handleWheel(e) {
      e.preventDefault();  
      if (e.ctrlKey) {
        const zoomAmount = -e.deltaY * 0.005;
        this.zoom(zoomAmount, e.clientX, e.clientY);
      } else {
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this.updateElementPositions();
      }
    }
    
    zoom(amount, centerX, centerY) {

      const newScale = Math.min(Math.max(this.scale + amount, this.minScale), this.maxScale);
      if (newScale !== this.scale) {
        const rect = this.canvas.getBoundingClientRect();
        const zoomPointX = centerX - rect.left;
        const zoomPointY = centerY - rect.top;
        
        // Store the current pan values
        const currentPanX = this.panX || 0;
        const currentPanY = this.panY || 0;
        
        // Calculate the world position under the mouse before zoom
        const worldX = (zoomPointX - currentPanX) / this.scale;
        const worldY = (zoomPointY - currentPanY) / this.scale;        
        this.scale = newScale;
        
        // Adjust pan to keep the world position under the mouse stable
        this.panX = zoomPointX - worldX * this.scale;
        this.panY = zoomPointY - worldY * this.scale;
        
        this.updateElementZoom();
      }
    }
    
    handleKeyDown(e) {
      if (!(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement) && 
          !(e.target instanceof HTMLSelectElement)) {
        
        // arrow key panning
        const panSpeed = 20; // Pixels per keypress
        switch (e.key) {
          case 'ArrowLeft':
            this.offsetX += panSpeed;
            this.updateElementPositions();
            e.preventDefault();
            break;
          case 'ArrowRight':
            this.offsetX -= panSpeed;
            this.updateElementPositions();
            e.preventDefault();
            break;
          case 'ArrowUp':
            this.offsetY += panSpeed;
            this.updateElementPositions();
            e.preventDefault();
            break;
          case 'ArrowDown':
            this.offsetY -= panSpeed;
            this.updateElementPositions();
            e.preventDefault();
            break;
          case 'Home':
            // Reset to center and reset zoom
            this.resetView();
            e.preventDefault();
            break;
        }
      }
    }
    
    updateElementZoom() {
      // Update the zoom indicator
      if (this.zoomIndicator) {
        this.zoomIndicator.textContent = `${Math.round(this.scale * 100)}%`;
        this.panXIndicator.textContent = `${Math.round(this.panX)}`;
        this.panYIndicator.textContent = `${Math.round(this.panY)}`;
      }
      //const nodes = this.canvas.querySelectorAll('.layer-node');
      const nodes = this.canvas.querySelectorAll('.layer-node:not([data-group-id])');
      nodes.forEach(node => {
        if (!node.dataset.originalX) {
          node.dataset.originalX = parseFloat(node.style.left);
          node.dataset.originalY = parseFloat(node.style.top);
        }
        
        if (!node.dataset.attachedTo){
          const originalX = parseFloat(node.dataset.originalX);
          const originalY = parseFloat(node.dataset.originalY);
          // Apply both pan and zoom transformations
          const transformedX = originalX * this.scale + this.panX;
          const transformedY = originalY * this.scale + this.panY;

          const attachedFunctionLayers = document.querySelectorAll(`.layer-node[data-attached-to="${node.dataset.id}"]`);
          attachedFunctionLayers.forEach(functionLayer => {
            const functionLeft = transformedX + node.offsetWidth * this.scale - 22 * this.scale;
            const functionTop = transformedY - 22 * this.scale;

            functionLayer.style.transformOrigin = '0 0'; 
            functionLayer.style.transform = `scale(${this.scale})`;
            
            functionLayer.style.left = `${functionLeft}px`;
            functionLayer.style.top = `${functionTop}px`;
            
            // functionLayer.dataset.originalX = functionLeft;
            // functionLayer.dataset.originalY = functionTop;
         });

        node.style.transformOrigin = '0 0'; 
        node.style.transform = `scale(${this.scale})`;
        node.style.left = `${transformedX}px`;
        node.style.top = `${transformedY}px`;
        }
        
      });
      
      // Similarly, update group elements
      const groups = this.canvas.querySelectorAll('.layer-group');
      groups.forEach(group => {
        if (!group.dataset.originalX) {
          group.dataset.originalX = parseFloat(group.style.left);
          group.dataset.originalY = parseFloat(group.style.top);
        }
        const originalX = parseFloat(group.dataset.originalX);
        const originalY = parseFloat(group.dataset.originalY);
        const transformedX = originalX * this.scale + this.panX;
        const transformedY = originalY * this.scale + this.panY;
        
        group.style.transformOrigin = '0 0'; 
        group.style.transform = `scale(${this.scale})`;
        group.style.left = `${transformedX}px`;
        group.style.top = `${transformedY}px`;
      });

      // Update connections
      if (ConnectionVisualizer.getInstance) {
        ConnectionVisualizer.getInstance().updateAllConnections();
      }
    }
    
    updateElementPositions() {       
      const nodes = DomUtils.getNodes(this.canvas);
      this.panXIndicator.textContent = `${Math.round(this.panX)}%`;
      this.panYIndicator.textContent = `${Math.round(this.panY)}`;
      // Update position of each node
      nodes.forEach(node => {
        // Skip nodes that are inside groups
        if (node.dataset.groupId) return;
        // Initialize original positions if not set
        if (!node.dataset.originalX) {
          node.dataset.originalX = parseFloat(node.style.left);
          node.dataset.originalY = parseFloat(node.style.top);
        }
        if (!node.dataset.attachedTo){
          const originalX = parseFloat(node.dataset.originalX);
          const originalY = parseFloat(node.dataset.originalY);
          // Apply both pan and zoom transformations
          const transformedX = originalX * this.scale + this.panX;
          const transformedY = originalY * this.scale + this.panY;
          node.style.left = `${transformedX}px`;
          node.style.top = `${transformedY}px`;
          
          const attachedFunctionLayers = document.querySelectorAll(`.layer-node[data-attached-to="${node.dataset.id}"]`);
          attachedFunctionLayers.forEach(functionLayer => {
            const functionLeft = transformedX + node.offsetWidth * this.scale - 22 * this.scale;
            const functionTop = transformedY - 22 * this.scale;

            functionLayer.style.transformOrigin = '0 0'; 
            functionLayer.style.transform = `scale(${this.scale})`;
            
            functionLayer.style.left = `${functionLeft}px`;
            functionLayer.style.top = `${functionTop}px`;
            
            // functionLayer.dataset.originalX = functionLeft;
            // functionLayer.dataset.originalY = functionTop;
         });
        
        }
       
      });
    
      // Update group positions
      const groups = this.canvas.querySelectorAll('.layer-group');
      groups.forEach(group => {
        if (!group.dataset.originalX) {
          group.dataset.originalX = parseFloat(group.style.left);
          group.dataset.originalY = parseFloat(group.style.top);
        }
        const originalX = parseFloat(group.dataset.originalX);
        const originalY = parseFloat(group.dataset.originalY);
        const transformedX = originalX * this.scale + this.panX;
        const transformedY = originalY * this.scale + this.panY;

        group.style.left = `${transformedX}px`;
        group.style.top = `${transformedY}px`;
        
      });
      // Update connections
      if (ConnectionVisualizer.getInstance) {
        ConnectionVisualizer.getInstance().updateAllConnections();
      }
    }
    
    // Get position adjusted for panning and zooming
    getAdjustedCanvasPosition(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
    //   console.log(clientX - rect.left, clientY - rect.top)
      // Calculate position, accounting for element scaling
      return {
        x: (clientX - rect.left) / this.scale,
        y: (clientY - rect.top) / this.scale
      };
    }
    
    resetView() {
      // Store original positions before resetting
      const nodes = this.canvas.querySelectorAll('.layer-node');
      const groups = this.canvas.querySelectorAll('.layer-group');
      
      // Reset scale
      this.scale = 1.0;
      
      // Reset node transforms and positions
      nodes.forEach(node => {
        node.style.transform = 'scale(1)';
        if (node.dataset.originalLeft) {
          node.style.left = `${node.dataset.originalLeft}px`;
          node.style.top = `${node.dataset.originalTop}px`;
        }
      });
      
      // Reset group transforms and positions
      groups.forEach(group => {
        group.style.transform = 'scale(1)';
        if (group.dataset.originalLeft) {
          group.style.left = `${group.dataset.originalLeft}px`;
          group.style.top = `${group.dataset.originalTop}px`;
        }
      });
      
      // Reset offsets
      this.offsetX = 0;
      this.offsetY = 0;
      
      // Update connections
      if (ConnectionVisualizer.getInstance) {
        ConnectionVisualizer.getInstance().updateAllConnections();
      }
      
      // Update zoom indicator
      if (this.zoomIndicator) {
        this.zoomIndicator.textContent = '100%';
      }
    }
    
    clearCanvas() {
      this.layerManager.clearCanvas();
      this.selectionManager.clearSelection();
      
      // Also clear any groups
      const groups = this.canvas.querySelectorAll('.layer-group');
      groups.forEach(group => group.remove());
      
      this.resetView(); // Reset view when clearing canvas
    }
    
    createGroup() {
      return this.groupManager.createGroup();
    }
    
    deleteGroup(groupId) {
      this.groupManager.deleteGroup(groupId);
    }
  }
  
export default Canvas;


// import ElementUpdater from './ElementUpdater.js';
// import EventManager from './EventManager.js';
// import StyleManager from './StyleManager.js';
// import TransformManager from './TransformManager.js';

// import NetworkModel from '../../models/NetworkModel.js';
// import LayerFactory from '../LayerFactory.js';
// import CanvasEventHandler from './CanvasEventHandler.js';
// import SelectionManager from './SelectionManager.js';
// import LayerPanelManager from './LayerPanelManager.js';
// import PreviewManager from './PreviewManager.js';
// import LayerManager from './LayerManager.js';
// import CanvasUtils from './CanvasUtils.js';
// // import ConnectionVisualizer from '../ConnectionVisualizer.js';
// import ConnectionVisualizer from '../connection/ConnectionVisualizer.js';
// import GroupManager from './GroupManager.js';
// import DomUtils from '../../utils/DomUtils.js';

// class Canvas {
//   constructor(canvasElement, layerPanel) {
//     this.canvas = canvasElement;
//     this.layerPanel = layerPanel;
//     this.canvas.canvasInstance = this; // For external access
    
//     // Initialize core systems
//     this.styleManager = new StyleManager();
//     this.transformManager = new TransformManager(this.canvas);
//     this.elementUpdater = new ElementUpdater(
//       this.canvas, 
//       this.transformManager, 
//       this.styleManager.zoomIndicator
//     );
//     this.eventManager = new EventManager(
//       this.canvas, 
//       this.transformManager, 
//       this.elementUpdater
//     );
    
//     // Initialize managers for features
//     this.initializeManagers();
//   }
  
//   initializeManagers() {
//     this.utils = new CanvasUtils(this.canvas, this);
//     this.selectionManager = new SelectionManager(this.canvas, this.utils);
//     this.layerPanelManager = new LayerPanelManager(NetworkModel);
//     this.previewManager = new PreviewManager(this);
//     this.layerManager = new LayerManager(this.canvas, NetworkModel, LayerFactory, this);
//     this.groupManager = new GroupManager(this.canvas, this.selectionManager);
    
//     this.eventHandler = new CanvasEventHandler(
//       this.canvas,
//       this.selectionManager,
//       this.layerPanelManager,
//       this.previewManager,
//       this.layerManager,
//       this.utils,
//       this.layerPanel,
//       this.groupManager,
//       this
//     );
    
//     this.eventHandler.initializeEventHandlers();
//   }
  
//   // Public API methods
//   getAdjustedCanvasPosition(clientX, clientY) {
//     return this.transformManager.screenToWorld(clientX, clientY);
//   }
  
//   resetView() {
//     this.transformManager.reset();
//     this.elementUpdater.updateAll();
//   }
  
//   clearCanvas() {
//     this.layerManager.clearCanvas();
//     this.selectionManager.clearSelection();
    
//     const groups = this.canvas.querySelectorAll('.layer-group');
//     groups.forEach(group => group.remove());
    
//     this.resetView();
//   }
  
//   createGroup() {
//     return this.groupManager.createGroup();
//   }
  
//   deleteGroup(groupId) {
//     this.groupManager.deleteGroup(groupId);
//   }
// }

// export default Canvas;
