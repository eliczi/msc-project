import NetworkModel from '../../models/NetworkModel.js';
import LayerFactory from '../LayerFactory.js';
import CanvasEventHandler from './CanvasEventHandler.js';
import SelectionManager from './SelectionManager.js';
import LayerPanelManager from './LayerPanelManager.js';
import PreviewManager from './PreviewManager.js';
import LayerManager from './LayerManager.js';
import CanvasUtils from './CanvasUtils.js';
import ConnectionVisualizer from '../connection/ConnectionVisualizer.js';
import GroupManager from './GroupManager.js';
import DomUtils from '../../utils/DomUtils.js';
import ConnectionModel from '../../models/ConnectionModel.js';
import TransformManager from './TransformManager.js';
import EventManager from './EventManager.js';
import ContextMenu from './ContextMenu.js';
class Canvas {
    constructor(canvasElement, layerPanel) {
      this.canvas = canvasElement;
      this.layerPanel = layerPanel;
      
      // Initialize panning state
      this.panX = 0;
      this.panY = 0;
      
      // Initialize zoom state
      this.scale = 1.0;
      this.minScale = 0.2;  
      this.maxScale = 2.0;  
      this.zoomStep = 0.1; 
      
      this.initializeStyles();
      this.initializePanningEvents();
      
      // Initialize managers
      this.canvasUtils = new CanvasUtils(this.canvas, this);
      this.selectionManager = new SelectionManager(this.canvas, this.canvasUtils);
      this.layerPanelManager = new LayerPanelManager(NetworkModel);
      this.previewManager = new PreviewManager(this);
      this.layerManager = new LayerManager(this.canvas, NetworkModel, LayerFactory, this);
      this.groupManager = new GroupManager(this.canvas, this.selectionManager, this.layerManager, this);
      this.contextMenu = new ContextMenu(this);

      // Initialize event handler with dependencies
      this.eventHandler = new CanvasEventHandler(
        this.canvas,
        this.selectionManager,
        this.layerPanelManager,
        this.previewManager,
        this.layerManager,
        this.canvasUtils,
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
          border: 1px dashed rgb(0, 0, 0);
          background-color:rgba(236, 106, 86, 0.22);
          pointer-events: none;
          z-index: 1000;
        }
        

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
        const groupNodes = Array.from(group.querySelectorAll('.layer-node'));
        groupNodes.forEach(node => {      
          node.style.transform = `scale(${1})`;

        });
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
      this.panXIndicator.textContent = `${Math.round(this.panX)}`;
      this.panYIndicator.textContent = `${Math.round(this.panY)}`;
      // Update position of each node
      nodes.forEach(node => {
        if (node.dataset.groupId) return;
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


    getNetworkState() {
      const layers = Array.from(this.canvas.querySelectorAll('.layer-node')).map(node => {
        return {
          id: node.dataset.id,
          type: node.dataset.type,
          x: parseInt(node.style.left),
          y: parseInt(node.style.top),
          properties: this.getNodeProperties(node),
          groupId: node.dataset.groupId || null
        };
      });
    
      const connections = NetworkModel.connections.map(conn => {
        return {
          id: conn.id,
          sourceId: conn.sourceId,
          targetId: conn.targetId
        };
      });
    
      const groups = this.groupManager.groups.map(group => {
        const groupElement = group.element;
        return {
          id: group.id,
          name: groupElement.dataset.name || `Group`,
          x: parseInt(groupElement.style.left),
          y: parseInt(groupElement.style.top),
          width: parseInt(groupElement.style.width),
          height: parseInt(groupElement.style.height),
          expanded: group.expanded,
          nodeIds: Array.from(groupElement.querySelectorAll('.layer-node')).map(node => node.dataset.id)
        };
      });
    
      return {
        layers,
        connections,
        groups
      };
    
    }

    getNodeProperties(node) {
      const properties = {};
      
      for (const key in node.dataset) {
        // Skip attributes we don't want to copy
        if (['id', 'groupId', 'originalX', 'originalY'].includes(key)) continue;
        properties[key] = node.dataset[key];
      }
      return properties;
    }
    
    deleteGroup(groupId) {
      this.groupManager.deleteGroup(groupId);
    }

    handleLoadButtonClick() {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      // Add event listener for when a file is selected
      input.addEventListener('change', async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const jsonData = JSON.parse(e.target.result);
              await this.loadNetworkState(jsonData);
            } catch (error) {
              console.error("Error parsing network file:", error);
              alert("Failed to parse network file: " + error.message);
            }
          };
          
          reader.readAsText(file);
        } catch (error) {
          console.error("Error loading network:", error);
          alert("Failed to load network: " + error.message);
        }
      });
      
      // Trigger the file input dialog
      input.click();
    }
    
    /**
     * Loads a network state from parsed JSON data
     * @param {Object} networkState - The network state object
     * @returns {Promise<boolean>} - True if loaded successfully
     */
    async loadNetworkState(networkState) {
      if (!networkState || typeof networkState !== 'object') {
        throw new Error("Invalid network state data");
      }
      
      try {
        // Clear the current network first
        this.clearNetwork();
        
        // Create a mapping from old IDs to new IDs (for layers)
        const idMapping = {};
        
        // Step 1: Create all layers first
        if (networkState.layers && Array.isArray(networkState.layers)) {
          for (const layerData of networkState.layers) {
            const layer = await this.createLayerFromData(layerData);
            if (layer) {
              // Store mapping from old ID to new ID
              idMapping[layerData.id] = layer.id;
            }
          }
        }
        
        // Step 2: Create all groups
        if (networkState.groups && Array.isArray(networkState.groups)) {
          for (const groupData of networkState.groups) {
            await this.createGroupFromData(groupData, idMapping);
          }
        }
        
        // Step 3: Create all connections (after nodes and groups exist)
        if (networkState.connections && Array.isArray(networkState.connections)) {
          for (const connectionData of networkState.connections) {
            // Map old IDs to new IDs
            const sourceId = idMapping[connectionData.sourceId] || connectionData.sourceId;
            const targetId = idMapping[connectionData.targetId] || connectionData.targetId;
            
            // Create connection
            await this.createConnectionFromData(sourceId, targetId);
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error loading network state:", error);
        throw error;
      }
    }
    
    /**
     * Clears the current network
     */
    clearNetwork() {
      // Clear all nodes
      const nodes = Array.from(this.canvas.querySelectorAll('.layer-node'));
      nodes.forEach(node => node.remove());
      
      // Clear all groups
      const groups = Array.from(this.canvas.querySelectorAll('.layer-group'));
      groups.forEach(group => group.remove());
      
      // Clear all connections
      const visualizer = ConnectionVisualizer.getInstance();
      if (visualizer) {
        visualizer.removeAllConnections();
      }
      
      NetworkModel.reset();
      
      this.groupManager.groups = [];
      this.groupManager.groupCounter = 0;
      this.groupManager.selectedGroup = null;
    }
    
    /**
     * Creates a layer from saved data
     * @param {Object} layerData - The layer data object
     * @returns {Promise<Object>} - The created layer
     */
    async createLayerFromData(layerData) {
      try {
        // Create layer using LayerFactory
        const layer = await this.layerManager.createLayer(
          layerData.type,
          layerData.x,
          layerData.y,
          this.scale || 1
        );
        
        if (!layer) return null;
        
        const element = layer.getElement();
        
        // Apply properties
        if (layerData.properties) {
          for (const [key, value] of Object.entries(layerData.properties)) {
            element.dataset[key] = value;
          }
        }
        
        return layer;
      } catch (error) {
        console.error("Error creating layer:", error);
        return null;
      }
    }
    
    /**
     * Creates a group from saved data
     * @param {Object} groupData - The group data object
     * @param {Object} idMapping - Mapping from old IDs to new IDs
     * @returns {Promise<HTMLElement>} - The created group element
     */
    async createGroupFromData(groupData, idMapping) {
      try {
        // Clear current selection
        this.selectionManager.clearSelection();
        
        // Select all nodes that belong to this group
        const nodeIds = groupData.nodeIds || [];
        for (const oldId of nodeIds) {
          const newId = idMapping[oldId];
          if (newId) {
            const node = document.querySelector(`.layer-node[data-id="${newId}"]`);
            if (node) {
              this.selectionManager.addNodeToSelection(node.dataset.id);
            }
          }
        }
        
        // Create group using existing method
        const groupElement = this.createGroup();
        
        if (!groupElement) return null;
        
        // Set group properties
        groupElement.dataset.name = groupData.name || "Group";
        const titleElement = groupElement.querySelector('.group-title');
        if (titleElement) {
          titleElement.textContent = groupData.name || "Group";
        }
        
        // Set group position
        groupElement.style.left = `${groupData.x}px`;
        groupElement.style.top = `${groupData.y}px`;
        
        // Set group dimensions
        if (groupData.width) groupElement.style.width = `${groupData.width}px`;
        if (groupData.height) groupElement.style.height = `${groupData.height}px`;
        
        // Set expanded state
        const group = this.groupManager.groups.find(g => g.element === groupElement);
        if (group) {
          if (groupData.expanded === false) {
            // Collapse the group
            this.groupManager.toggleGroup(group.id);
          }
        }
        
        return groupElement;
      } catch (error) {
        console.error("Error creating group:", error);
        return null;
      }
    }
    
    /**
     * Creates a connection from saved data
     * @param {string} sourceId - The source node ID
     * @param {string} targetId - The target node ID
     * @returns {Promise<Object>} - The created connection
     */
    async createConnectionFromData(sourceId, targetId) {
      try {
        // Find source and target elements
        const sourceNode = document.querySelector(`.layer-node[data-id="${sourceId}"]`);
        const targetNode = document.querySelector(`.layer-node[data-id="${targetId}"]`) || 
                            document.querySelector(`.layer-group[data-id="${targetId}"]`);
        
        if (!sourceNode || !targetNode) {
          console.warn(`Cannot create connection: node(s) not found (${sourceId} -> ${targetId})`);
          return null;
        }
        
        // Create the connection
        const visualizer = ConnectionVisualizer.getInstance();
        const connectionElement = visualizer.createPermanentConnection(String(sourceId), String(targetId));
        
        if (connectionElement) {
          const id = NetworkModel.getConnectionId();
          const connection = new ConnectionModel(id, String(sourceId), String(targetId), sourceNode, targetNode, connectionElement);
          NetworkModel.addConnection(connection);
        }
        if (ConnectionVisualizer.getInstance) {
          ConnectionVisualizer.getInstance().updateAllConnections();
        }
        
        return null;
      } catch (error) {
        console.error("Error creating connection:", error);
        return null;
      }
    }
  }
  
export default Canvas;

