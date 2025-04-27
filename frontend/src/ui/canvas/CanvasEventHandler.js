class CanvasEventHandler {
  constructor(canvas, selectionManager, layerPanelManager, previewManager, layerManager, utils, layerPanel, groupManager, parent) {
    this.canvas = canvas;
    this.selectionManager = selectionManager;
    this.layerPanelManager = layerPanelManager;
    this.previewManager = previewManager;
    this.layerManager = layerManager;
    this.utils = utils;
    this.layerPanel = layerPanel;
    this.groupManager = groupManager;
    this.parent = parent;
    // Connection state
    this.isConnecting = false;
    this.sourceNodeId = null;
    
    // Selection state tracking
    this.justFinishedSelecting = false;
  }
  
  initializeEventHandlers() {
    this.setupDropZone();
    this.setupSelectionEvents();
    this.setupCanvasEvents();
    this.setupKeyboardEvents();
  }
  
  // ===== Event Setup Methods =====
  
  setupDropZone() {
    this.canvas.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
    this.canvas.addEventListener('drop', this.handleDrop.bind(this));
    this.canvas.addEventListener('dragleave', this.handleDragLeave.bind(this));
  }
  
  setupSelectionEvents() {
    this.canvas.addEventListener('mousedown', this.handleSelectionStart.bind(this));
    document.addEventListener('mousemove', this.handleSelectionMove.bind(this));
    document.addEventListener('mouseup', this.handleSelectionEnd.bind(this));
  }
  
  setupCanvasEvents() {
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    this.canvas.addEventListener('node-clicked', this.handleNodeClicked.bind(this));
  }
  
  handleNodeClicked(e) {
    const { nodeId } = e.detail;
    this.selectionManager.selectNode(nodeId);
    this.layerPanelManager.showLayerPanel(nodeId);
    this.groupManager.deselectAllGroups()
  }

  setupKeyboardEvents() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  // ===== Event Handlers =====
  
  handleDragEnter(e) {
    e.preventDefault();
    this.canvas.classList.add('canvas-drag-active');
  }
  
  handleDragOver(e) {
    e.preventDefault();
    const position = this.utils.getCanvasPosition(e, true);
    this.previewManager.updatePreviewElement(position.x, position.y, this.layerPanel.currentDraggedLayerType);

    // Check if the dragged item is a function layer
    if (this.layerPanel.currentDraggedLayerType && this.layerPanel.currentDraggedLayerType.includes('Function')) {
      const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
      const nodeUnderCursor = elementsUnderCursor.find(element => 
        element.classList.contains('layer-node')
      );
      if (nodeUnderCursor) {
        const nodeId = nodeUnderCursor.dataset.id;
        if (nodeId && (!this.selectionManager.isNodeSelected(nodeId))) {
          this.selectionManager.selectNode(nodeId);
          nodeUnderCursor.classList.add('function-drop-target');
        }
      } else {
        this.selectionManager.clearSelection();
        document.querySelectorAll('.function-drop-target').forEach(node => {
          node.classList.remove('function-drop-target');
        });
      }
    }
  }
  
  async handleDrop(e) {
    e.preventDefault();
    if (this.layerPanel.currentDraggedLayerType && this.layerPanel.currentDraggedLayerType.includes('Function')) {
      const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
      const nodeUnderCursor = elementsUnderCursor.find(element =>
        element.classList.contains('layer-node')
      );
      if (nodeUnderCursor) {
        // Get the target node's ID and position
        const nodeId = nodeUnderCursor.dataset.id;
        const nodeType = nodeUnderCursor.dataset.type;
        this.previewManager.removePreviewElement();
        
        // Get the dimensions and position of the target node
        const targetRect = nodeUnderCursor.getBoundingClientRect();
        
        // Calculate the position for the function layer (top right corner)
        // Convert from client coordinates to canvas coordinates
        const targetPos = this.utils.getCanvasPosition({
          clientX: targetRect.right, 
          clientY: targetRect.top
        }, true);
        
        // Create the function layer at the calculated position
        const functionLayer = await this.layerManager.createLayer(
          this.layerPanel.currentDraggedLayerType, 
          targetPos.x + 10, // Offset a bit from the corner (adjust as needed)
          targetPos.y + 10,
          this.parent.scale
        );
        nodeUnderCursor.dataset.activation_fuction = functionLayer;
        if (functionLayer) {
          // Link the function layer to the target node (if you need to establish a relationship)
          functionLayer.element.dataset.attachedTo = nodeId;
        }
      }
    } else {
      const layerType = e.dataTransfer.getData('text/plain');
      const position = this.utils.getCanvasPosition(e, true);
      this.previewManager.removePreviewElement();
      const layer = await this.layerManager.createLayer(layerType, position.x, position.y, this.parent.scale);
      if (layer) {
        this.selectionManager.selectNode(layer.id);
        this.layerPanelManager.showLayerPanel(layer.id);
      }
    }

    this.previewManager.removePreviewElement();

    document.querySelectorAll('.function-drop-target').forEach(node => {
      node.classList.remove('function-drop-target');
    });
  }
  
  handleDragLeave(e) {
    if (!this.canvas.contains(e.relatedTarget)) {
      this.previewManager.removePreviewElement();
    }
  }
  
  handleSelectionStart(e) {
    if (e.target === this.canvas) {
      this.selectionManager.startSelection(this.utils.getCanvasPosition(e, false));
    }
  }
  
  handleSelectionMove(e) {
    if (this.selectionManager.isSelecting) {
      this.selectionManager.updateSelection(this.utils.getCanvasPosition(e, false));
    }
  }
  
  handleSelectionEnd(e) {
    if (this.selectionManager.isSelecting) {
      const didSelect = this.selectionManager.endSelection(this.utils.getCanvasPosition(e, false));
      
      if (didSelect) {
        this.justFinishedSelecting = true;
        setTimeout(() => {
          this.justFinishedSelecting = false;
        }, 200);
      }
    }
  }
  
  handleCanvasClick(e) {
    // Handle clicks on the canvas background
    if (e.target === this.canvas && !this.selectionManager.isSelecting && !this.justFinishedSelecting) {
      this.selectionManager.clearSelection();
      this.layerPanelManager.hideLayerPanel();
      return;
    }
    
    // Handle clicks on layer nodes
    let target = e.target;
    while (target && target !== this.canvas) {
      if (target.classList.contains('layer-node')) {
        const nodeId = target.dataset.id;
        this.selectionManager.clearSelection();
        this.selectionManager.addNodeToSelection(nodeId);
        this.layerPanelManager.showLayerPanel(nodeId);
        break;
      }
      target = target.parentElement;
    }
  }
  
  handleKeyDown(e) {
    if (e.key === 'Backspace' && this.selectionManager.hasSelectedNodes()) {
      this.layerManager.deleteSelectedNodes(this.selectionManager.getSelectedNodeIds());
      this.selectionManager.clearSelection();
    }
  }
}

export default CanvasEventHandler;