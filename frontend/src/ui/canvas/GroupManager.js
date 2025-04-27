import DomUtils from '../../utils/DomUtils.js';
import ConnectionVisualizer from '../connection/ConnectionVisualizer.js';
import { InputPoint, OutputPoint } from '../connection/ConnectionPoint.js';
import LayerFactory from '../LayerFactory.js';
import NetworkModel from '../../models/NetworkModel.js';

class GroupManager {
  constructor(canvas, selectionManager, parent) {
    this.canvas = canvas;
    this.selectionManager = selectionManager;
    this.groups = [];
    this.groupCounter = 0;
    this.selectedGroup = null; 
    this.parent = parent

    // For copy/paste functionality
    this.clipboard = null;

    this.initializeKeyboardShortcuts();
  }

  createGroup() {
    const selectedNodeIds = this.selectionManager.getSelectedNodeIds();
    
    if (selectedNodeIds.length < 2) {
      console.warn('At least two nodes must be selected to create a group');
      return null;
    }
    const groupId = `group-${this.groupCounter++}`;
    
    const nodes = selectedNodeIds.map(id => 
      document.querySelector(`.layer-node[data-id="${id}"]`)
    ).filter(node => node !== null);
    
    if (nodes.length === 0) {
      console.warn('No valid nodes found for grouping');
      return null;
    }
    
    // Calculate the group's bounding box
    const boundingBox = this.calculateBoundingBox(nodes);
    // Create the group element
    const groupElement = this.createGroupElement(groupId, boundingBox);
    //nodes length
    //remove duplicated nodes
    const uniqueNodes = Array.from(new Set(nodes));    
    // Add nodes to the group
    uniqueNodes.forEach(node => {
      //poition before
      console.log(`Node ${node.dataset.id} position before: (${node.style.left}, ${node.style.top})`);
      // Store original position relative to group
      
      const originalLeft = parseInt(node.style.left) - boundingBox.left;
      const originalTop = parseInt(node.style.top) - boundingBox.top;      
      node.dataset.groupId = groupId;
      // Move the node to the group
      groupElement.appendChild(node);
      // Update node position relative to group
      
      node.style.left = `${originalLeft}px`;
      node.style.top = `${originalTop}px`;

      //keep untransformed and transform later
      node.style.transform = `scale(${1})`;
      //poition after
      console.log(`Node ${node.dataset.id} position after: (${node.style.left}, ${node.style.top})`);
    });
    
    // Add the group to the canvas
    this.canvas.appendChild(groupElement);
    
    // Create connection points for the group
    this.addConnectionPoints(groupElement);
    
    // Add to groups array
    this.groups.push({
      id: groupId,
      element: groupElement,
      nodes: nodes,
      expanded: true
    });
    
    // Clear selection
    this.selectionManager.clearSelection();
    
    // Update connections
    this.updateGroupConnections(groupId);
    
    return groupElement;
  }
  
  createGroupElement(groupId, boundingBox) {
    const groupElement = DomUtils.createElementWithClass('div', 'layer-group');
    groupElement.dataset.id = groupId;
    
    // Set position and size
    groupElement.style.left = `${boundingBox.left}px`;
    groupElement.style.top = `${boundingBox.top}px`;
    groupElement.style.width = `${boundingBox.width}px`;
    groupElement.style.height = `${boundingBox.height}px`;
    
    // Add padding for visual space
    const padding = 20;
    groupElement.style.paddingLeft = `${padding}px`;
    groupElement.style.paddingRight = `${padding}px`;
    groupElement.style.paddingTop = `${padding + 30}px`; // Extra space for header
    groupElement.style.paddingBottom = `${padding}px`;
    
    // Create a default group name
    const groupName = `Group ${this.groupCounter}`;
    
    // Add header
    const header = DomUtils.createElementWithClass('div', 'group-header');
    header.innerHTML = `
      <span class="group-title">${groupName}</span>
      <button class="group-toggle">−</button>
    `;
    groupElement.appendChild(header);
    
    // Store the original group name
    groupElement.dataset.name = groupName;
    groupElement.style.transformOrigin = '0 0'; 
    groupElement.style.transform = `scale(${this.parent.scale})`;
    
    // Add renaming functionality
    const titleElement = header.querySelector('.group-title');
    this.setupRenaming(titleElement, groupElement);
    
    // Add toggle functionality
    const toggleButton = header.querySelector('.group-toggle');
    toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGroup(groupId);
    });
    
    // Make the group draggable
    this.makeGroupDraggable(groupElement);
    
    // Add resize handles (always available)
    this.addResizeHandles(groupElement);
    
    // Add selection functionality
    this.addSelectionFunctionality(groupElement);
    
    return groupElement;
  }
  
  // New method to add selection functionality
  addSelectionFunctionality(groupElement) {
    groupElement.addEventListener('click', (e) => {
      // Only select if clicking on the group itself or header, not on nodes or when editing title
      if ((e.target === groupElement || 
           e.target.classList.contains('group-header') || 
           e.target.classList.contains('group-title')) && 
          !e.target.classList.contains('editing')) {
        
        // Select this group
        this.selectGroup(groupElement.dataset.id);
        e.stopPropagation();
      }
    });
    
    // Add click handler to canvas to deselect groups when clicking elsewhere
    if (!this.canvasClickHandlerAdded) {
      this.canvas.addEventListener('click', () => {
        this.deselectAllGroups();
      });
      this.canvasClickHandlerAdded = true;
    }
  }
  
  // New method to select a group
  selectGroup(groupId) {
    // Deselect currently selected group if any
    this.deselectAllGroups();
    
    // Find the group
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Apply visual selection style
    const groupElement = group.element;
    groupElement.classList.add('selected-group');
    
    // Store reference to selected group
    this.selectedGroup = groupId;
    
    // Optional: Dispatch a custom event for other components to react
    const event = new CustomEvent('group-selected', { 
      detail: { groupId: groupId } 
    });
    document.dispatchEvent(event);
    
  }
  
  // New method to deselect all groups
  deselectAllGroups() {
    if (this.selectedGroup) {
      // Find previously selected group and remove selection style
      const previousGroup = this.groups.find(g => g.id === this.selectedGroup);
      if (previousGroup && previousGroup.element) {
        previousGroup.element.classList.remove('selected-group');
      }
      
      // Clear selected group reference
      this.selectedGroup = null;
      
      // Optional: Dispatch a custom event
      const event = new CustomEvent('group-deselected');
      document.dispatchEvent(event);
    }
  }
  
  setupRenaming(titleElement, groupElement) {
    // Add edit icon and styling to indicate editability
    titleElement.style.cursor = 'text';
    titleElement.title = 'Click to rename group';
    
    titleElement.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Don't allow editing if already in edit mode
      if (titleElement.classList.contains('editing')) return;
      
      // Get current title
      const currentTitle = titleElement.textContent;
      
      // Create input field
      const inputField = document.createElement('input');
      inputField.type = 'text';
      inputField.value = currentTitle;
      inputField.className = 'group-title-edit';
      inputField.style.width = '100%';
      inputField.style.height = '22px';
      inputField.style.border = 'none';
      inputField.style.padding = '0 4px';
      inputField.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      inputField.style.borderRadius = '3px';
      inputField.style.fontSize = '14px';
      
      // Mark as editing
      titleElement.classList.add('editing');
      
      // Replace title with input
      titleElement.innerHTML = '';
      titleElement.appendChild(inputField);
      
      // Focus input and select all text
      inputField.focus();
      inputField.select();
      
      // Handle input blur (finish editing)
      const finishEditing = () => {
        const newTitle = inputField.value.trim() || currentTitle;
        titleElement.innerHTML = newTitle;
        titleElement.classList.remove('editing');
        groupElement.dataset.name = newTitle;
        
        // Remove event listeners
        inputField.removeEventListener('blur', finishEditing);
        inputField.removeEventListener('keydown', handleKeyDown);
      };
      
      // Handle key events
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          finishEditing();
          e.preventDefault();
        } else if (e.key === 'Escape') {
          titleElement.innerHTML = currentTitle;
          titleElement.classList.remove('editing');
          e.preventDefault();
        }
      };
      
      // Add event listeners
      inputField.addEventListener('blur', finishEditing);
      inputField.addEventListener('keydown', handleKeyDown);
    });
  }
  
  calculateBoundingBox(nodes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach(node => {
      const left = parseInt(node.style.left);
      const top = parseInt(node.style.top);
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
    });
    
    // Add padding
    const padding = 30;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  addConnectionPoints(groupElement) {
    // Create input and output connection points
    const inputPoint = new InputPoint(groupElement);
    const outputPoint = new OutputPoint(groupElement);
    
    // Position the points on the sides of the group
    const inputElement = inputPoint.getElement();
    const outputElement = outputPoint.getElement();
    
    // Style the connection points
    inputElement.classList.add('group-connection-point');
    outputElement.classList.add('group-connection-point');
    
    // Add them to the group
    groupElement.appendChild(inputElement);
    groupElement.appendChild(outputElement);
    
    // Store references
    groupElement._inputPoint = inputPoint;
    groupElement._outputPoint = outputPoint;
    
    // Add hover effect for connection visibility
    // Note: This is also handled in CSS, but adding these event listeners provides
    // a backup in case of CSS compatibility issues
    groupElement.addEventListener('mouseenter', () => {
      inputElement.style.opacity = '1';
      outputElement.style.opacity = '1';
    });
    
    groupElement.addEventListener('mouseleave', () => {
      inputElement.style.opacity = '0';
      outputElement.style.opacity = '0';
    });
  }
  
  makeGroupDraggable(groupElement) {
    let isDragging = false;
    let offsetX, offsetY;
    
    groupElement.addEventListener('mousedown', (e) => {
      // Only drag if clicking on the header or the group background
      // but not when clicking on title during editing
      if ((e.target.classList.contains('group-header') || 
          e.target.classList.contains('group-title') ||
          e.target === groupElement) && 
          !e.target.classList.contains('editing') &&
          !e.target.classList.contains('group-title-edit')) {
        
        // Select the group when starting to drag
        this.selectGroup(groupElement.dataset.id);
        
        isDragging = true;

         // Get the canvas and its properties
        const canvas = groupElement.closest('.drawing-area');
        const canvasRect = canvas.getBoundingClientRect();
        

        const panX = this.parent.panX;
        const panY = this.parent.panY;
        const scale = this.parent.scale;
        // Calculate offset in world coordinates
        const currentLeft = parseFloat(groupElement.style.left) || 0;
        const currentTop = parseFloat(groupElement.style.top) || 0;

        // Convert mouse position to canvas coordinates
        const worldX = (e.clientX - canvasRect.left - panX) / scale;
        const worldY = (e.clientY - canvasRect.top - panY) / scale;
        
          // Calculate offset from mouse to group's top-left corner
        offsetX = worldX - (currentLeft - panX) / scale;
        offsetY = worldY - (currentTop - panY) / scale;
      
        // Prevent propagation to avoid node selection
        e.stopPropagation();
        
        const moveHandler = (moveEvent) => {
          if (isDragging) {
          const canvasRect = canvas.getBoundingClientRect();
          const panX = this.parent.panX || 0;
          const panY = this.parent.panY || 0;
          const scale = this.parent.scale || 1;
          
          // Convert mouse position to world coordinates
          const worldX = (moveEvent.clientX - canvasRect.left - panX) / scale;
          const worldY = (moveEvent.clientY - canvasRect.top - panY) / scale;
          
          // Calculate new position
          const left = worldX - offsetX;
          const top = worldY - offsetY;
          
          // Update position
          const transformedX = left * scale + panX;
          const transformedY = top * scale + panY;
          
          groupElement.style.left = `${transformedX}px`;
          groupElement.style.top = `${transformedY}px`;
          
          // Update the original position (world coordinates)
          groupElement.dataset.originalX = left;
          groupElement.dataset.originalY = top;
          
          // Update connections
          this.updateGroupConnections(groupElement.dataset.id);
          }
        };
        
        const upHandler = () => {
          isDragging = false;
          document.removeEventListener('mousemove', moveHandler);
          document.removeEventListener('mouseup', upHandler);
        };
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
      }
    });
  }
  
  toggleGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const groupElement = group.element;
    const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
    const toggleButton = groupElement.querySelector('.group-toggle');
    const isExpanded = group.expanded;
    
    if (isExpanded) {
      // Collapse the group
      nodes.forEach(node => {
        node.style.display = 'none';
      });
      
      // Shrink the group to just the header
      const headerHeight = groupElement.querySelector('.group-header').offsetHeight;
      groupElement.style.height = `${headerHeight + 20}px`; // Add some padding
      groupElement.style.width = '150px';
      
      toggleButton.textContent = '+';
      group.expanded = false;
      groupElement.dataset.expanded = 'false';
      
      // Reposition connection points for collapsed state
      const inputPoint = groupElement._inputPoint.getElement();
      const outputPoint = groupElement._outputPoint.getElement();
      
      inputPoint.style.left = '-10px';
      inputPoint.style.top = '15px';
      
      outputPoint.style.right = '-10px';
      outputPoint.style.top = '15px';
      
    } else {
      // Expand the group
      nodes.forEach(node => {
        node.style.display = 'block';
      });
      
      // Restore the group's original size
      const boundingBox = this.calculateBoundingBox(nodes);
      groupElement.style.width = `${boundingBox.width}px`;
      groupElement.style.height = `${boundingBox.height + 40}px`; // Add space for header
      
      toggleButton.textContent = '−';
      group.expanded = true;
      groupElement.dataset.expanded = 'true';
      
      // Restore original connection point positions
      const inputPoint = groupElement._inputPoint;
      const outputPoint = groupElement._outputPoint;
      
      // Reset to default positions (let CSS handle this)
      const inputElement = inputPoint.getElement();
      const outputElement = outputPoint.getElement();
      
      inputElement.style.left = '';
      inputElement.style.top = '';
      
      outputElement.style.right = '';
      outputElement.style.top = '';
    }
    
    // Update connections
    //if collapsed, change target to group
    //if expanded, change target to nodes
    // Update connections for all nodes in the group
    this.updateGroupConnections(groupId);
  }
  
  addResizeHandles(groupElement) {
    // Remove any existing resize handles first
    this.removeResizeHandles(groupElement);
    
    // Create and add resize handles
    const positions = ['nw', 'ne', 'se', 'sw'];
    positions.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.dataset.position = pos;
      groupElement.appendChild(handle);
      
      handle.addEventListener('mousedown', this.handleResizeStart.bind(this, groupElement, pos));
    });
  }
  
  removeResizeHandles(groupElement) {
    const handles = groupElement.querySelectorAll('.resize-handle');
    handles.forEach(handle => handle.remove());
  }
  
  handleResizeStart(groupElement, position, e) {
    e.stopPropagation();
    e.preventDefault();
    
    // Select the group when starting to resize
    this.selectGroup(groupElement.dataset.id);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = parseInt(groupElement.style.width);
    const initialHeight = parseInt(groupElement.style.height);
    const initialLeft = parseInt(groupElement.style.left);
    const initialTop = parseInt(groupElement.style.top);
    
    const minWidth = 100;  // Minimum width
    const minHeight = 50;  // Minimum height
    
    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      // Calculate new dimensions based on resize handle position
      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newLeft = initialLeft;
      let newTop = initialTop;
      
      // Adjust dimensions based on which handle was dragged
      switch (position) {
        case 'nw': // Top-left handle
          newWidth = Math.max(minWidth, initialWidth - dx);
          newHeight = Math.max(minHeight, initialHeight - dy);
          newLeft = initialLeft + initialWidth - newWidth;
          newTop = initialTop + initialHeight - newHeight;
          break;
        case 'ne': // Top-right handle
          newWidth = Math.max(minWidth, initialWidth + dx);
          newHeight = Math.max(minHeight, initialHeight - dy);
          newTop = initialTop + initialHeight - newHeight;
          break;
        case 'se': // Bottom-right handle
          newWidth = Math.max(minWidth, initialWidth + dx);
          newHeight = Math.max(minHeight, initialHeight + dy);
          break;
        case 'sw': // Bottom-left handle
          newWidth = Math.max(minWidth, initialWidth - dx);
          newHeight = Math.max(minHeight, initialHeight + dy);
          newLeft = initialLeft + initialWidth - newWidth;
          break;
      }
      
      // Apply new dimensions
      groupElement.style.width = `${newWidth}px`;
      groupElement.style.height = `${newHeight}px`;
      groupElement.style.left = `${newLeft}px`;
      groupElement.style.top = `${newTop}px`;
      
      // Update connections
      this.updateGroupConnections();
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  updateGroupConnections() {
    const visualizer = ConnectionVisualizer.getInstance();
    if (visualizer) {
      visualizer.updateAllConnections();
    }
  }
  
  // Method to handle deleting a group
  deleteGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    // If this is the selected group, deselect it
    if (this.selectedGroup === groupId) {
      this.deselectAllGroups();
    }
    
    const groupElement = group.element;
    const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
    
    // Move nodes back to canvas with adjusted positions
    const groupLeft = parseInt(groupElement.style.left);
    const groupTop = parseInt(groupElement.style.top);
    
    nodes.forEach(node => {
      // Calculate absolute position
      const left = groupLeft + parseInt(node.style.left);
      const top = groupTop + parseInt(node.style.top);
      
      // Remove group reference
      delete node.dataset.groupId;
      
      // Move to canvas
      this.canvas.appendChild(node);
      
      // Set position
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
    });
    
    // Remove group element
    groupElement.remove();
    
    // Remove from groups array
    this.groups = this.groups.filter(g => g.id !== groupId);
    
    // Update connections
    const visualizer = ConnectionVisualizer.getInstance();
    if (visualizer) {
      visualizer.updateAllConnections();
    }
  }
  
  // Get currently selected group (if any)
  getSelectedGroup() {
    return this.selectedGroup;
  }
  
  // Check if a group is selected
  hasSelectedGroup() {
    return this.selectedGroup !== null;
  }
  deleteSelectedGroupWithNodes() {
    // Check if there's a selected group
    if (!this.selectedGroup) {
      console.warn('No group selected to delete');
      return false;
    }
    
    const groupId = this.selectedGroup;
    const group = this.groups.find(g => g.id === groupId);
    
    if (!group) {
      console.warn(`Selected group ${groupId} not found`);
      return false;
    }
    
    // Get the group element and all nodes inside
    const groupElement = group.element;
    const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
    
    // Delete all nodes from the NetworkModel and DOM
    nodes.forEach(node => {
      const nodeId = node.dataset.id;
      
      // Remove from NetworkModel if it exists
      if (window.NetworkModel && window.NetworkModel.removeLayer) {
        window.NetworkModel.removeLayer(nodeId);
      }
      
      // Remove any connections
      const visualizer = ConnectionVisualizer.getInstance();
      if (visualizer) {
        visualizer.removeConnectionsForNode(nodeId);
      }
      
      // Remove the node from DOM
      node.remove();
    });
    
    // Delete the group element itself
    groupElement.remove();
    
    // Remove from groups array
    this.groups = this.groups.filter(g => g.id !== groupId);
    
    // Clear selected group reference
    this.selectedGroup = null;
    
    // Update connections
    const visualizer = ConnectionVisualizer.getInstance();
    if (visualizer) {
      visualizer.updateAllConnections();
    }
    
    return true;
  }
  
  // Add this method to handle keyboard deletion
  initializeKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only handle if not in an input field
    if (!(e.target instanceof HTMLInputElement) && 
        !(e.target instanceof HTMLTextAreaElement) && 
        !(e.target instanceof HTMLSelectElement)) {
      
      // Group selected shortcuts
      if (this.selectedGroup) {
        // Delete on Delete or Backspace key
        if (e.key === 'Delete' || e.key === 'Backspace') {
          this.deleteSelectedGroupWithNodes();
          e.preventDefault();
          return;
        }
        
        // Copy on Ctrl+C
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
          this.copySelectedGroup();
          e.preventDefault();
          return;
        }
      }
      
      // Paste on Ctrl+V (works even if no group is selected)
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        this.pasteGroup();
        e.preventDefault();
        return;
      }
    }
  });
}
copySelectedGroup() {
  if (!this.selectedGroup) {
    console.warn('No group selected to copy');
    return false;
  }
  
  const group = this.groups.find(g => g.id === this.selectedGroup);
  if (!group) return false;
  
  const groupElement = group.element;
  
  // Create a deep copy of the group data
  this.clipboard = {
    name: groupElement.dataset.name,
    nodes: []
  };
  
  // Get all nodes in the group
  const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
  
  // For each node, store its data
  nodes.forEach(node => {
    // Get relative position within the group
    const left = parseInt(node.style.left);
    const top = parseInt(node.style.top);
    
    // Store node data
    this.clipboard.nodes.push({
      type: node.dataset.type,
      properties: this.getNodeProperties(node),
      left: left,
      top: top
    });
  });
  
  console.log('Group copied to clipboard', this.clipboard);
  
  // Optionally, provide visual feedback
  this.showToast('Group copied');
  
  return true;
}
// Helper method to extract node properties
getNodeProperties(node) {
  // This will depend on how your nodes store their properties
  // Here's a simple example that copies data attributes
  const properties = {};
  
  for (const key in node.dataset) {
    // Skip certain attributes we don't want to copy
    if (['id', 'groupId', 'originalX', 'originalY'].includes(key)) continue;
    
    properties[key] = node.dataset[key];
  }
  return properties;
}
// Method to paste a copied group
pasteGroup() {
  if (!this.clipboard) {
    console.warn('Nothing to paste');
    return false;
  }
  
  // Calculate the offset for the pasted group
  // Default offset if we paste multiple times
  const pasteOffset = 30;
  
  // Create a new group
  const groupId = `group-${this.groupCounter++}`;
  
  // Create a list to store the created nodes
  const newNodes = [];
  
  // First create all the nodes at their relative positions
  this.clipboard.nodes.forEach((nodeData, index) => {
    // Create a new node based on the copied node's type and properties
    const newNode = this.createNodeFromData(nodeData, pasteOffset, pasteOffset);
    if (newNode) {
      newNodes.push(newNode);
    }
  });
  
  if (newNodes.length === 0) {
    console.warn('Failed to create nodes for pasted group');
    return false;
  }
  
  // Calculate bounding box for the new nodes
  const boundingBox = this.calculateBoundingBox(newNodes);
  
  // Create the group element
  const groupElement = this.createGroupElement(groupId, boundingBox);
  
  // Update the group name if needed
  const titleElement = groupElement.querySelector('.group-title');
  if (titleElement) {
    titleElement.textContent = this.clipboard.name || `Group ${this.groupCounter - 1}`;
  }
  groupElement.dataset.name = this.clipboard.name || `Group ${this.groupCounter - 1}`;
  
  // Add nodes to the group and position them
  newNodes.forEach(node => {
    // Calculate position relative to the group
    const originalLeft = parseInt(node.style.left) - boundingBox.left;
    const originalTop = parseInt(node.style.top) - boundingBox.top;
    
    // Set groupId
    node.dataset.groupId = groupId;
    
    // Move to group
    groupElement.appendChild(node);
    
    // Update position relative to group
    node.style.left = `${originalLeft}px`;
    node.style.top = `${originalTop}px`;
  });
  
  // Add the group to the canvas
  this.canvas.appendChild(groupElement);
  
  // Create connection points for the group
  this.addConnectionPoints(groupElement);
  
  // Add to groups array
  this.groups.push({
    id: groupId,
    element: groupElement,
    nodes: newNodes,
    expanded: true
  });
  
  // Select the newly created group
  this.selectGroup(groupId);
  
  // Update connections
  const visualizer = ConnectionVisualizer.getInstance();
  if (visualizer) {
    visualizer.updateAllConnections();
  }
  
  // Optionally, provide visual feedback
  this.showToast('Group pasted');
  
  return true;
}

// Helper method to create a node from copied data
createNodeFromData(nodeData, offsetX, offsetY) {
  // Create a new unique ID for the layer
  const nodeId = `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nodeType = nodeData.type;

  const canvas = this.canvas;
  const canvasInstance = canvas.canvasInstance || { scale: 1 };
  const scale = canvasInstance.scale || 1;

  const x = nodeData.left + offsetX + 32; // Adjust for node center offset
  const y = nodeData.top + offsetY + 32;

  const layerTypeDef = NetworkModel.getLayerType(nodeType)
  
  // Create the node element using LayerFactory
  const nodeElement = LayerFactory.createNodeElement(
    nodeId,
    nodeType,
    x,
    y,
    null, // Click handler will be added by LayerManager
    layerTypeDef,
    scale
  );
  // Add to canvas temporarily so we can calculate bounding box
  this.canvas.appendChild(nodeElement);
  
  return nodeElement;
}
// Helper method to show a temporary toast message
showToast(message, duration = 2000) {
  // Check if a toast container exists, if not create one
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '10000';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toast.style.color = 'white';
  toast.style.padding = '10px 15px';
  toast.style.borderRadius = '4px';
  toast.style.marginTop = '10px';
  toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  toast.style.transition = 'opacity 0.3s ease-in-out';
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

  
}

export default GroupManager;