import DomUtils from '../../utils/DomUtils.js';
import ConnectionVisualizer from '../connection/ConnectionVisualizer.js';
import { InputPoint, OutputPoint } from '../connection/ConnectionPoint.js';
import LayerFactory from '../LayerFactory.js';
import NetworkModel from '../../models/NetworkModel.js';
import { ConnectionPoint } from '../connection/ConnectionPoint.js';
import ConnectionModel from '../../models/ConnectionModel.js';

const GROUP_DEFAULTS = {
  PADDING: 20,
  HEADER_AREA_HEIGHT: 30, 
  BOUNDING_BOX_PADDING: 30,
  COLLAPSED_WIDTH: 150,
  MIN_RESIZE_WIDTH: 100,
  MIN_RESIZE_HEIGHT: 50,
  PASTE_OFFSET: 30,
  NODE_PASTE_OFFSET_ADJUST: 32 
};

class GroupManager {
  constructor(canvas, selectionManager, layerManager, parent) {
    this.canvas = canvas;
    this.selectionManager = selectionManager;
    this.layerManager = layerManager;
    this.groups = [];
    this.groupCounter = 0;
    this.selectedGroup = null; 
    this.parent = parent

    this.clipboard = null;
    this.initializeKeyboardShortcuts();
  }

  _clientToWorld(clientX, clientY, canvasElement) {
    const canvasRect = canvasElement.getBoundingClientRect();
    const panX = this.parent.panX || 0;
    const panY = this.parent.panY || 0;
    const scale = this.parent.scale || 1;

    const worldX = (clientX - canvasRect.left - panX) / scale;
    const worldY = (clientY - canvasRect.top - panY) / scale;
    return { x: worldX, y: worldY };
  }

  _worldToStyle(worldX, worldY) {
    const panX = this.parent.panX || 0;
    const panY = this.parent.panY || 0;
    const scale = this.parent.scale || 1;

    const styleX = worldX * scale + panX;
    const styleY = worldY * scale + panY;
    return { x: styleX, y: styleY };
  }

  _styleToWorld(styleX, styleY) {
    const panX = this.parent.panX || 0;
    const panY = this.parent.panY || 0;
    const scale = this.parent.scale || 1;

    const worldX = (styleX - panX) / scale;
    const worldY = (styleY - panY) / scale;
    return { x: worldX, y: worldY };
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

    const alreadyGrouped = nodes.some(node => node.dataset.groupId);
    if (alreadyGrouped) {
      console.warn('Some selected nodes are already part of another group');
      return null;
    }

    
    const boundingBox = GroupManager.calculateBoundingBox(nodes);
    const groupElement = this.createGroupElement(groupId, boundingBox);
    const uniqueNodes = Array.from(new Set(nodes));    
    uniqueNodes.forEach(node => {
      const originalLeft = parseInt(node.style.left) - boundingBox.left;
      const originalTop = parseInt(node.style.top) - boundingBox.top;      
      node.dataset.groupId = groupId;
      groupElement.appendChild(node);
      node.style.left = `${originalLeft}px`;
      node.style.top = `${originalTop}px`;
    });
    this.canvas.appendChild(groupElement);
    this.addConnectionPoints(groupElement);

    this.groups.push({
      id: groupId,
      element: groupElement,
      nodes: nodes,
      expanded: true
    });
    this.selectionManager.clearSelection();
    this.updateGroupConnections(groupId);
    
    return groupElement;
  }
  
  createGroupElement(groupId, boundingBox, groupName = `Group ${this.groupCounter}`) {
    const groupElement = DomUtils.createElementWithClass('div', 'layer-group');
    groupElement.dataset.id = groupId;
    
    groupElement.style.left = `${boundingBox.left}px`;
    groupElement.style.top = `${boundingBox.top}px`;
    groupElement.style.width = `${boundingBox.width}px`;
    groupElement.style.height = `${boundingBox.height}px`;
    
    groupElement.style.paddingLeft = `${GROUP_DEFAULTS.PADDING}px`;
    groupElement.style.paddingRight = `${GROUP_DEFAULTS.PADDING}px`;
    groupElement.style.paddingTop = `${GROUP_DEFAULTS.PADDING + 30}px`; 
    groupElement.style.paddingBottom = `${GROUP_DEFAULTS.PADDING}px`;
    
    
    const header = DomUtils.createElementWithClass('div', 'group-header');
    header.innerHTML = `
      <span class="group-title">${groupName}</span>
      <button class="group-toggle">−</button>
    `;
    groupElement.appendChild(header);
    
    groupElement.dataset.name = groupName;
    groupElement.style.transformOrigin = '0 0'; 
    //groupElement.style.transform = `scale(${this.parent.scale})`;
    
    const titleElement = header.querySelector('.group-title');
    this.setupRenaming(titleElement, groupElement);
    
    const toggleButton = header.querySelector('.group-toggle');
    toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGroup(groupId);
    });
    
    this.makeGroupDraggable(groupElement);
    
    this.addResizeHandles(groupElement);
    
    this.addSelectionFunctionality(groupElement);
    
    return groupElement;
  }
  
  addSelectionFunctionality(groupElement) {
    groupElement.addEventListener('click', (e) => {
      if ((e.target === groupElement || 
           e.target.classList.contains('group-header') || 
           e.target.classList.contains('group-title')) && 
          !e.target.classList.contains('editing')) {
        
        this.selectGroup(groupElement.dataset.id);
        e.stopPropagation();
      }
    });
    
    if (!this.canvasClickHandlerAdded) {
      this.canvas.addEventListener('click', () => {
        this.deselectAllGroups();
      });
      this.canvasClickHandlerAdded = true;
    }
  }
  
  selectGroup(groupId) {
    this.deselectAllGroups();
    
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const groupElement = group.element;
    groupElement.classList.add('selected-group');
    
    
    this.selectedGroup = groupId;
    
    
    const event = new CustomEvent('group-selected', { 
      detail: { groupId: groupId } 
    });
    document.dispatchEvent(event);
    
  }
  
  
  deselectAllGroups() {
    if (this.selectedGroup) {
      
      const previousGroup = this.groups.find(g => g.id === this.selectedGroup);
      if (previousGroup && previousGroup.element) {
        previousGroup.element.classList.remove('selected-group');
      }
      
      
      this.selectedGroup = null;
      
      
      const event = new CustomEvent('group-deselected');
      document.dispatchEvent(event);
    }
  }
  
  setupRenaming(titleElement, groupElement) {
    
    titleElement.style.cursor = 'text';
    titleElement.title = 'Click to rename group';
    
    titleElement.addEventListener('click', (e) => {
      e.stopPropagation();
      
      
      if (titleElement.classList.contains('editing')) return;
      
      
      const currentTitle = titleElement.textContent;
      
      
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
      
      
      titleElement.classList.add('editing');
      
      
      titleElement.innerHTML = '';
      titleElement.appendChild(inputField);
      
      
      inputField.focus();
      inputField.select();
      
      
      const finishEditing = () => {
        const newTitle = inputField.value.trim() || currentTitle;
        titleElement.innerHTML = newTitle;
        titleElement.classList.remove('editing');
        groupElement.dataset.name = newTitle;
        
        
        inputField.removeEventListener('blur', finishEditing);
        inputField.removeEventListener('keydown', handleKeyDown);
      };
      
      
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
      
      
      inputField.addEventListener('blur', finishEditing);
      inputField.addEventListener('keydown', handleKeyDown);
    });
  }
  
  static calculateBoundingBox(nodes) {
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
    
    
    minX -= GROUP_DEFAULTS.BOUNDING_BOX_PADDING;
    minY -= GROUP_DEFAULTS.BOUNDING_BOX_PADDING;
    maxX += GROUP_DEFAULTS.BOUNDING_BOX_PADDING;
    maxY += GROUP_DEFAULTS.BOUNDING_BOX_PADDING;
    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  addConnectionPoints(groupElement) {
    
    const inputPoint = new InputPoint(groupElement);
    const outputPoint = new OutputPoint(groupElement);
    
    
    const inputElement = inputPoint.getElement();
    const outputElement = outputPoint.getElement();
    
    
    inputElement.classList.add('group-connection-point');
    outputElement.classList.add('group-connection-point');
    
    
    groupElement.appendChild(inputElement);
    groupElement.appendChild(outputElement);
    
    
    groupElement._inputPoint = inputPoint;
    groupElement._outputPoint = outputPoint;
    
    
    
    
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
      if ((e.target.classList.contains('group-header') || 
          e.target.classList.contains('group-title') ||
          e.target === groupElement) && 
          !e.target.classList.contains('editing') &&
          !e.target.classList.contains('group-title-edit')) {
        
        
        this.selectGroup(groupElement.dataset.id);
        
        isDragging = true;

         
        const canvas = groupElement.closest('.drawing-area');
        const canvasRect = canvas.getBoundingClientRect();
        

        const panX = this.parent.panX;
        const panY = this.parent.panY;
        const scale = this.parent.scale;
        
        const currentLeft = parseFloat(groupElement.style.left) || 0;
        const currentTop = parseFloat(groupElement.style.top) || 0;

        
        const worldX = (e.clientX - canvasRect.left - panX) / scale;
        const worldY = (e.clientY - canvasRect.top - panY) / scale;
        
          
        offsetX = worldX - (currentLeft - panX) / scale;
        offsetY = worldY - (currentTop - panY) / scale;
      
        
        e.stopPropagation();
        
        const moveHandler = (moveEvent) => {
          if (isDragging) {
          const canvasRect = canvas.getBoundingClientRect();
          const panX = this.parent.panX || 0;
          const panY = this.parent.panY || 0;
          const scale = this.parent.scale || 1;
          
          
          const worldX = (moveEvent.clientX - canvasRect.left - panX) / scale;
          const worldY = (moveEvent.clientY - canvasRect.top - panY) / scale;
          
          
          const left = worldX - offsetX;
          const top = worldY - offsetY;
          
          
          const transformedX = left * scale + panX;
          const transformedY = top * scale + panY;
          
          groupElement.style.left = `${transformedX}px`;
          groupElement.style.top = `${transformedY}px`;

          groupElement.dataset.originalX = left;
          groupElement.dataset.originalY = top;
          
          
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
      nodes.forEach(node => {
        node.style.display = 'none';
      });
      const headerHeight = groupElement.querySelector('.group-header').offsetHeight;
      groupElement.style.height = `${headerHeight + 20}px`; 
      groupElement.style.width = `${GROUP_DEFAULTS.COLLAPSED_WIDTH}px`//'150px';
      
      toggleButton.textContent = '+';
      group.expanded = false;
      groupElement.dataset.expanded = 'false';
      
      const inputPoint = groupElement._inputPoint.getElement();
      const outputPoint = groupElement._outputPoint.getElement();
      
      inputPoint.style.left = '-10px';
      inputPoint.style.top = '15px';
      
      outputPoint.style.right = '-10px';
      outputPoint.style.top = '15px';
      
    } else {
      nodes.forEach(node => {
        node.style.display = 'block';
      });
      const boundingBox = GroupManager.calculateBoundingBox(nodes);
      groupElement.style.width = `${boundingBox.width}px`;
      groupElement.style.height = `${boundingBox.height + 40}px`; 
      
      toggleButton.textContent = '−';
      group.expanded = true;
      groupElement.dataset.expanded = 'true';
      
      const inputPoint = groupElement._inputPoint;
      const outputPoint = groupElement._outputPoint;
      
      const inputElement = inputPoint.getElement();
      const outputElement = outputPoint.getElement();
      
      inputElement.style.left = '';
      inputElement.style.top = '';
      
      outputElement.style.right = '';
      outputElement.style.top = '';
    }
    this.updateGroupConnections(groupId);
  }
  
  addResizeHandles(groupElement) {
    this.removeResizeHandles(groupElement);
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
    
    this.selectGroup(groupElement.dataset.id);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = parseInt(groupElement.style.width);
    const initialHeight = parseInt(groupElement.style.height);
    const initialLeft = parseInt(groupElement.style.left);
    const initialTop = parseInt(groupElement.style.top);
    
    const minHeight = 50;  
    const minWidth = 100;
    
    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newLeft = initialLeft;
      let newTop = initialTop;

      switch (position) {
        case 'nw': 
          newWidth = Math.max(GROUP_DEFAULTS.MIN_RESIZE_WIDTH, initialWidth - dx);
          newHeight = Math.max(GROUP_DEFAULTS.MIN_RESIZE_HEIGHT, initialHeight - dy);
          newLeft = initialLeft + initialWidth - newWidth;
          newTop = initialTop + initialHeight - newHeight;
          break;
        case 'ne': 
          newWidth = Math.max(minWidth, initialWidth + dx);
          newHeight = Math.max(minHeight, initialHeight - dy);
          newTop = initialTop + initialHeight - newHeight;
          break;
        case 'se': 
          newWidth = Math.max(minWidth, initialWidth + dx);
          newHeight = Math.max(minHeight, initialHeight + dy);
          break;
        case 'sw': 
          newWidth = Math.max(minWidth, initialWidth - dx);
          newHeight = Math.max(minHeight, initialHeight + dy);
          newLeft = initialLeft + initialWidth - newWidth;
          break;
      }
      
      groupElement.style.width = `${newWidth}px`;
      groupElement.style.height = `${newHeight}px`;
      groupElement.style.left = `${newLeft}px`;
      groupElement.style.top = `${newTop}px`;
      
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
  
  
  deleteGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    
    if (this.selectedGroup === groupId) {
      this.deselectAllGroups();
    }
    
    const groupElement = group.element;
    const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
    
    const groupLeft = parseInt(groupElement.style.left);
    const groupTop = parseInt(groupElement.style.top);
    
    nodes.forEach(node => {
     
      const left = groupLeft + parseInt(node.style.left);
      const top = groupTop + parseInt(node.style.top);
      
      delete node.dataset.groupId;
      
      this.canvas.appendChild(node);
      
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
    });
    
    groupElement.remove();
    
    this.groups = this.groups.filter(g => g.id !== groupId);
    
    const visualizer = ConnectionVisualizer.getInstance();
    if (visualizer) {
      visualizer.updateAllConnections();
    }
  }
  
  
  getSelectedGroup() {
    return this.selectedGroup;
  }
  
  
  hasSelectedGroup() {
    return this.selectedGroup !== null;
  }
  deleteSelectedGroupWithNodes() {
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
    
    const groupElement = group.element;
    const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
    
    nodes.forEach(node => {
      const nodeId = node.dataset.id;
      
      if (window.NetworkModel && window.NetworkModel.removeLayer) {
        window.NetworkModel.removeLayer(nodeId);
      }
      
      const visualizer = ConnectionVisualizer.getInstance();
      if (visualizer) {
        visualizer.removeConnectionsForNode(nodeId);
      }
      
      node.remove();
    });
    
    groupElement.remove();
    
    this.groups = this.groups.filter(g => g.id !== groupId);
    
    this.selectedGroup = null;
    
    const visualizer = ConnectionVisualizer.getInstance();
    if (visualizer) {
      visualizer.updateAllConnections();
    }
    
    return true;
  }
  
  initializeKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (!(e.target instanceof HTMLInputElement) && 
        !(e.target instanceof HTMLTextAreaElement) && 
        !(e.target instanceof HTMLSelectElement)) {
      
      if (this.selectedGroup) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          this.deleteSelectedGroupWithNodes();
          e.preventDefault();
          return;
        }
        
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
          this.copySelectedGroup();
          e.preventDefault();
          return;
        }
      }
      
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        this.pasteGroup();
        //this.parent.updateElementZoom()
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
  
  this.clipboard = {
    name: groupElement.dataset.name,
    nodes: [],
    connections: []
  };
  
  const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
  const nodeIds = nodes.map(node => node.dataset.id);

  nodes.forEach(node => {
    const left = parseInt(node.style.left);
    const top = parseInt(node.style.top);
    
    this.clipboard.nodes.push({
      type: node.dataset.type,
      properties: this.getNodeProperties(node),
      left: left,
      top: top,
      id: node.dataset.id
    });
  });

  NetworkModel.connections.forEach(conn => {
    if (nodeIds.includes(conn.sourceId) && nodeIds.includes(conn.targetId)) {
      this.clipboard.connections.push({
        sourceId: conn.sourceId,
        targetId: conn.targetId
      });
    }
  });
  
  DomUtils.showToast('Group copied');
  
  return true;
}

getNodeProperties(node) {
  const properties = {};
  
  for (const key in node.dataset) {
    
    if (['id', 'groupId', 'originalX', 'originalY'].includes(key)) continue;
    properties[key] = node.dataset[key];
  }
  return properties;
}
async pasteGroup() {
  if (!this.clipboard) {
    console.warn('Nothing to paste');
    return false;
  }
  const newLayers = [];
  const idMapping = {}; 
  this.selectionManager.clearSelection();

  for (const nodeData of this.clipboard.nodes) {
    const newNode = await this.createNodeFromData(nodeData, GROUP_DEFAULTS.PASTE_OFFSET, GROUP_DEFAULTS.PASTE_OFFSET);
    if (newNode) {
      newLayers.push(newNode);
      const id = parseInt(nodeData.id);
      
      idMapping[id] = String(newNode.id);
      this.selectionManager.addNodeToSelection(idMapping[id]);
    }
  }
    if (this.clipboard.connections && this.clipboard.connections.length > 0) {
    for (const conn of this.clipboard.connections) {
      const newSourceId = idMapping[conn.sourceId];
      const newTargetId = idMapping[conn.targetId];
      const sourceNode = document.querySelector(`.layer-node[data-id="${newSourceId}"]`);
      this.createConnection(newSourceId, newTargetId, sourceNode);
    }
  }
  this.createGroup();
  DomUtils.showToast('Group pasted');
  return true;
}

async createNodeFromData(nodeData, offsetX, offsetY) {
  const canvas = this.canvas;
  const canvasInstance = canvas.canvasInstance || { scale: 1 };
  const scale = canvasInstance.scale || 1;
  const x = nodeData.left + offsetX + 32; 
  const y = nodeData.top + offsetY + 32;
  const nodeType = nodeData.type;
  const layer = await this.layerManager.createLayer(nodeType, x,y, scale);

  return layer;
}

createConnection(sourceId, targetId, sourceNode) {
  const id = NetworkModel.getConnectionId();
  const visualizer = ConnectionVisualizer.getInstance();

  const connectionElement = visualizer.createPermanentConnection(sourceId, targetId);
  if (connectionElement) {
    let targetNode = document.querySelector(`.layer-node[data-id="${targetId}"]`);
    if (!targetNode) {
      targetNode = document.querySelector(`.layer-group[data-id="${targetId}"]`);
    }
    const connection = new ConnectionModel(id, sourceId, targetId, sourceNode, targetNode, connectionElement);
    NetworkModel.addConnection(connection);
  }
  }
  static resize(groupId){
    const group = document.querySelector(`.layer-group[data-id="${groupId}"]`)
    console.log(group)
   
    const groupElement = group;
    const nodes = Array.from(groupElement.querySelectorAll('.layer-node'));
    const boundingBox = GroupManager.calculateBoundingBox(nodes);
    groupElement.style.width = `${boundingBox.width}px`;
    groupElement.style.height = `${boundingBox.height + 40}px`;
  }

  
}

export default GroupManager;