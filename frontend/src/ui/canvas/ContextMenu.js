class ContextMenu {
    constructor(canvas) {
      this.canvas = canvas;
      this.contextMenu = null;
      this.targetElement = null;
      this.isVisible = false;
      
      this.createContextMenu();
      this.bindEvents();
    }
    
    createContextMenu() {
      this.contextMenu = document.createElement('div');
      this.contextMenu.className = 'context-menu';
      this.contextMenu.innerHTML = `
        <div class="context-menu-item" data-action="group">
          <span class="menu-icon">📁</span>
          Group Selected Layers
        </div>
        <div class="context-menu-item" data-action="ungroup">
          <span class="menu-icon">📂</span>
          Ungroup Layers
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="delete">
          <span class="menu-icon">🗑️</span>
          Delete Selected
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="select-all">
          <span class="menu-icon">☑️</span>
          Select All
        </div>
        <div class="context-menu-item" data-action="clear-selection">
          <span class="menu-icon">❌</span>
          Clear Selection
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="reset-view">
          <span class="menu-icon">🏠</span>
          Reset View
        </div>
      `;
      
      // Add styles
      this.addStyles();
      
      // Initially hidden
      this.contextMenu.style.display = 'none';
      document.body.appendChild(this.contextMenu);
    }
    
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .context-menu {
          position: fixed;
          background: white;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          min-width: 180px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          padding: 4px 0;
        }
        
        .context-menu-item {
          padding: 8px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #333;
          transition: background-color 0.15s ease;
        }
        
        .context-menu-item:hover {
          background-color: #f0f0f0;
        }
        
        .context-menu-item.disabled {
          color: #999;
          cursor: not-allowed;
        }
        
        .context-menu-item.disabled:hover {
          background-color: transparent;
        }
        
        .context-menu-separator {
          height: 1px;
          background-color: #e0e0e0;
          margin: 4px 0;
        }
        
        .menu-icon {
          margin-right: 8px;
          font-size: 16px;
          width: 20px;
          text-align: center;
        }
      `;
      document.head.appendChild(style);
    }
    
    bindEvents() {
      // Right-click event on canvas
      this.canvas.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY, e.target);
      });
      
      // Click on context menu items
      this.contextMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.context-menu-item');
        if (menuItem && !menuItem.classList.contains('disabled')) {
          const action = menuItem.dataset.action;
          this.executeAction(action);
          this.hideContextMenu();
        }
      });
      
      // Hide context menu on outside click
      document.addEventListener('click', (e) => {
        if (this.isVisible && !this.contextMenu.contains(e.target)) {
          this.hideContextMenu();
        }
      });
      
      // Hide context menu on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          this.hideContextMenu();
        }
      });
      
      // Hide context menu on scroll
      this.canvas.canvas.addEventListener('wheel', () => {
        if (this.isVisible) {
          this.hideContextMenu();
        }
      });
    }
    
    showContextMenu(x, y, targetElement) {
      this.targetElement = targetElement;
      this.updateMenuState();
      
      // Position the menu
      this.contextMenu.style.left = `${x}px`;
      this.contextMenu.style.top = `${y}px`;
      this.contextMenu.style.display = 'block';
      this.isVisible = true;
      
      // Adjust position if menu goes off screen
      this.adjustMenuPosition();
    }
    
    hideContextMenu() {
      this.contextMenu.style.display = 'none';
      this.isVisible = false;
      this.targetElement = null;
    }
    
    adjustMenuPosition() {
      const rect = this.contextMenu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        this.contextMenu.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      
      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        this.contextMenu.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
    
    updateMenuState() {
      const selectedNodes = this.canvas.selectionManager.getSelectedNodeIds();
      const hasSelection = selectedNodes.length > 0;
      const hasMultipleSelection = selectedNodes.length > 1;
      console.log(selectedNodes )
      
      // Check if any selected nodes are in groups
      const hasGroupedNodes = selectedNodes.some(nodeId => {
        const node = document.querySelector(`.layer-node[data-id="${nodeId}"]`);
        return node && node.dataset.groupId;
      });
      
      // Check if clicked on a group
      const clickedOnGroup = this.targetElement && 
                            (this.targetElement.classList.contains('layer-group') || 
                             this.targetElement.closest('.layer-group'));
      
      // Update menu items based on current state
      const menuItems = this.contextMenu.querySelectorAll('.context-menu-item');
      
      menuItems.forEach(item => {
        const action = item.dataset.action;
        item.classList.remove('disabled');
        
        switch (action) {
          case 'group':
            if (!hasMultipleSelection) {
              item.classList.add('disabled');
            }
            break;
          case 'ungroup':
            if (!hasGroupedNodes && !clickedOnGroup) {
              item.classList.add('disabled');
            }
            break;
          case 'delete':
            if (!hasSelection && !clickedOnGroup) {
              item.classList.add('disabled');
            }
            break;
          case 'clear-selection':
            if (!hasSelection) {
              item.classList.add('disabled');
            }
            break;
        }
      });
    }
    
    executeAction(action) {
      switch (action) {
        case 'group':
          this.groupSelectedLayers();
          break;
        case 'ungroup':
          this.ungroupLayers();
          break;
        case 'delete':
          this.deleteSelected();
          break;
        case 'select-all':
          this.selectAllLayers();
          break;
        case 'clear-selection':
          this.clearSelection();
          break;
        case 'reset-view':
          this.resetView();
          break;
      }
    }
    
    groupSelectedLayers() {
      const selectedNodes = this.canvas.selectionManager.getSelectedNodeIds();
      if (selectedNodes.length > 1) {
        console.log('Grouping selected layers:', selectedNodes);
        this.canvas.createGroup();
      }
    }
    
    ungroupLayers() {
      const selectedNodes = this.canvas.selectionManager.getSelectedNodeIds();
      console.log("Ungrouping layers:", selectedNodes);
      // Check if any selected nodes are in groups
      const groupIds = new Set();
      selectedNodes.forEach(nodeId => {
        const node = document.querySelector(`.layer-node[data-id="${nodeId}"]`);
        if (node && node.dataset.groupId) {
          groupIds.add(node.dataset.groupId);
        }
      });
      
      // Also check if clicked directly on a group
      if (this.targetElement) {
        const group = this.targetElement.closest('.layer-group');
        if (group && group.dataset.id) {
          groupIds.add(group.dataset.id);
        }
      }
      
      // Ungroup all identified groups
      groupIds.forEach(groupId => {
        this.canvas.deleteGroup(groupId);
      });
    }
    
    deleteSelected() {
      const selectedNodes = this.canvas.selectionManager.getSelectedNodeIds();
      
      // Delete selected nodes
    //   selectedNodes.forEach(nodeId => {
    //     const node = document.querySelector(`.layer-node[data-id="${nodeId}"]`);
    //     if (node) {
    //       // Remove connections first
    //       this.canvas.layerManager.removeNodeConnections(nodeId);
    //       // Remove the node
    //       node.remove();
    //     }
    //   });
      
      // Check if clicked on a group and delete it
      if (this.targetElement) {
        const group = this.targetElement.closest('.layer-group');
        if (group && group.dataset.id) {
          this.canvas.deleteGroup(group.dataset.id);
        }
      }
      
      // Clear selection after deletion
      this.canvas.selectionManager.clearSelection();
    }
    
    selectAllLayers() {
      const allNodes = this.canvas.canvas.querySelectorAll('.layer-node');
      this.canvas.selectionManager.clearSelection();
      
      allNodes.forEach(node => {
        if (node.dataset.id) {
          this.canvas.selectionManager.addNodeToSelection(node.dataset.id);
        }
      });
    }
    
    clearSelection() {
      this.canvas.selectionManager.clearSelection();
    }
    
    resetView() {
      this.canvas.resetView();
    }
    
    destroy() {
      if (this.contextMenu && this.contextMenu.parentNode) {
        this.contextMenu.parentNode.removeChild(this.contextMenu);
      }
    }
  }
  
  export default ContextMenu;