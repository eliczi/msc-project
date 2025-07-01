import { DEFAULT_STYLES } from '../config.js';
import DomUtils from '../utils/DomUtils.js';
import { InputPoint, OutputPoint } from './connection/ConnectionPoint.js';
import LayerModel from '../models/LayerModel.js';
import ConnectionVisualizer from './connection/ConnectionVisualizer.js';
import SVGGenerator from './SVGGenerator.js';
import GroupManager from './canvas/GroupManager.js';

class LayerFactory {
 
  static createNodeElement(nodeId, type, x, y, clickHandler, layerTypeDef, scale, panX, panY) {
    const node = DomUtils.createElementWithClass('div', 'layer-node');
    node.classList.add(type.toLowerCase().replace('layer', '-layer'));
    node.dataset.id = nodeId;
    node.dataset.type = type;

    this._setNodePositionAndData(node, x, y, scale, panX, panY, type);
    this._populateNodeContent(node, type, layerTypeDef);
    this._attachNodeBehaviors(node, nodeId, type, clickHandler);
    
    return node;
  }

  static _setNodePositionAndData(node, x, y, scale, panX, panY, type) {
    let offsetX = 32;
    let offsetY = 32;
    if (type === 'PoolingLayer') {
      offsetX = 56;
    }

    node.dataset.originalX = x - offsetX ;
    node.dataset.originalY = y - offsetY;  

    node.style.left = `${x * scale + panX - offsetX }px`;
    node.style.top = `${y * scale + panY -offsetY }px`;
    
    node.style.transformOrigin = 'center center';
    node.style.transform = `scale(${scale})`;
  }

  static _populateNodeContent(node, type, layerTypeDef) {
    node.innerHTML = '';
    const svgContainer = DomUtils.createElementWithClass('div', 'node-svg-container');
    if (layerTypeDef.name === 'ConvolutionalLayer') {
      const svgRepresentation = SVGGenerator.createSVGRepresentation('ConvolutionalLayer');
      svgContainer.innerHTML = svgRepresentation.svg_content;
    }
    else if (layerTypeDef.name.includes('InputLayer')) {
      this._setInputLayerSVG(svgContainer, layerTypeDef);
    }
    else if (layerTypeDef && layerTypeDef.svg_representation && layerTypeDef.svg_representation.svg_content) {
      svgContainer.innerHTML = layerTypeDef.svg_representation.svg_content;
      if (type === 'PoolingLayer') {
        this._addPoolingTypeText(svgContainer, node);
      }
    }
    else {
      const textElement = document.createElement('div');
      textElement.className = 'layer-text';
      textElement.textContent = type.replace('Layer', '');
      svgContainer.appendChild(textElement);
    }

    const svgElement = svgContainer.querySelector('svg');
    if (svgElement) {
      this.setDimensions(svgElement, svgContainer, type);
    }
    node.appendChild(svgContainer);
  }

  static _setInputLayerSVG(svgContainer, layerTypeDef) {
    if (layerTypeDef && layerTypeDef.svg_representation) {
      const inputType = layerTypeDef.name.replace('InputLayer', '').toUpperCase();
      if (
        inputType &&
        inputType !== 'BASE' &&
        layerTypeDef.svg_representation.all_representations &&
        layerTypeDef.svg_representation.all_representations[inputType]
      ) {
        svgContainer.innerHTML = layerTypeDef.svg_representation.all_representations[inputType];
      } else {
        svgContainer.innerHTML = layerTypeDef.svg_representation.svg_content;
      }
    }
  }

  static _addPoolingTypeText(svgContainer, node) {
    const svgElement = svgContainer.querySelector('svg');
    if (svgElement) {
      const poolingType = node.dataset.poolingType || 'MAX';
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.setAttribute('x', 17);
      textElement.setAttribute('y', 16);
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('dominant-baseline', 'middle');
      textElement.setAttribute('font-family', 'Arial, sans-serif');
      textElement.setAttribute('font-size', '12px');
      textElement.setAttribute('font-weight', 'bold');
      textElement.setAttribute('fill', '#333');
      textElement.textContent = poolingType;
      svgElement.appendChild(textElement);
    }
  }

  static _attachNodeBehaviors(node, nodeId, type, clickHandler) {
    if (!type.includes("Function")) {
      const inputPoint = new InputPoint(node);
      const outputPoint = new OutputPoint(node);
      node.appendChild(outputPoint.getElement());
      node._inputPoint = inputPoint;
      node._outputPoint = outputPoint;
      node.appendChild(inputPoint.getElement());
    }
    
    this.addHoverText(node, type);
    this.makeDraggable(node);
    
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (clickHandler) clickHandler(nodeId);
    });
  }


  static addHoverText(node, type) {
    const hoverText = DomUtils.createElementWithClass('div', 'node-hover-text');
    hoverText.textContent = type.replace('Layer', ' Layer');
    node.appendChild(hoverText);

    node.addEventListener('mouseenter', () => {
      hoverText.style.display = 'block';
    });

    node.addEventListener('mouseleave', () => {
      hoverText.style.display = 'none';
    });
  }

  static addText(node, layerTypeDef){
    const textAboveNode = DomUtils.createElementWithClass('div', 'node-text');
    textAboveNode.textContent = 'AVG';
    textAboveNode.style.position = 'absolute';
    textAboveNode.style.top = '30px'; 
    textAboveNode.style.left = '50%';
    textAboveNode.style.transform = 'translateX(-50%)'; 
    node.appendChild(textAboveNode);
  }
  
  static makeDraggable(element) {
    
    let isDragging = false;
    let offsetX, offsetY;
    let selectedNodesInfo = [];
    const visualizer = ConnectionVisualizer.getInstance();
  
    element.addEventListener('mousedown', startDrag);
    
    function startDrag(e) {
      if (e.target.classList.contains('connection-point')) {
        return;
      }
      isDragging = true;
      
      const canvas = element.closest('.drawing-area') || element.parentElement;
      
      const canvasRect = canvas.getBoundingClientRect();
      
      const zoomIndicator = document.querySelector('.zoom-indicator');
      const zoomFloat = zoomIndicator ? parseFloat(zoomIndicator.textContent) : 100;

      const panXIndicator = document.querySelector('.panx-indicator');
      const panX = panXIndicator ? parseFloat(panXIndicator.textContent) : 100;
      const panYIndicator = document.querySelector('.pany-indicator');
      const panY = panYIndicator ? parseFloat(panYIndicator.textContent) : 100;
      const scale = zoomFloat / 100;
      const currentLeft = parseFloat(element.style.left) || 0;
      const currentTop = parseFloat(element.style.top) || 0;

      const worldX = (e.clientX - canvasRect.left - panX) / scale;
      const worldY = (e.clientY - canvasRect.top - panY) / scale;
      
      offsetX = worldX - (currentLeft - panX) / scale;
      offsetY = worldY - (currentTop - panY) / scale;

      e.stopPropagation();
      const isNodeSelected = element.classList.contains('selected');
  
      if (isNodeSelected) {
        selectedNodesInfo = Array.from(document.querySelectorAll('.layer-node.selected'))
          .filter(node => node !== element)
          .map(node => {
            const nodeLeft = parseFloat(node.dataset.originalX) || 0;
            const nodeTop = parseFloat(node.dataset.originalY) || 0;
            const baseLeft = parseFloat(element.dataset.originalX) || 0;
            const baseTop = parseFloat(element.dataset.originalY) || 0;
            
            return {
              node: node,
              offsetLeft: nodeLeft - baseLeft,
              offsetTop: nodeTop - baseTop   
            };
          });
      } else {
        selectedNodesInfo = [];
      }
  
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    }
    
    function drag(e) {
      if (!isDragging) return;
      const canvas = element.closest('.drawing-area');
      const canvasRect = canvas.getBoundingClientRect();
      const zoomIndicator = document.querySelector('.zoom-indicator');
      const zoomFloat = zoomIndicator ? parseFloat(zoomIndicator.textContent) : 100;
      
      const panXIndicator = document.querySelector('.panx-indicator');
      const panXfloat = panXIndicator ? parseFloat(panXIndicator.textContent) : 100;
      const panYIndicator = document.querySelector('.pany-indicator');
      const panYfloat = panYIndicator ? parseFloat(panYIndicator.textContent) : 100;

      const canvasInstance = canvas.canvasInstance;
      const panX = canvasInstance?.panX||panXfloat;
      const panY = canvasInstance?.panY||panYfloat;
      const scale = zoomFloat / 100;
      
      const worldX = (e.clientX - canvasRect.left - panX) / scale;
      const worldY = (e.clientY - canvasRect.top - panY) / scale;
      const left = worldX - offsetX;
      const top = worldY - offsetY;
      
      const transformedX = left * scale + panX;
      const transformedY = top * scale + panY;
      
      element.style.left = `${transformedX}px`;
      element.style.top = `${transformedY}px`;
      
      element.dataset.originalX = left;
      element.dataset.originalY = top;
      if (element.dataset.groupId){
        
        GroupManager.resize(element.dataset.groupId)
      }
    
      const attachedFunctionLayers = document.querySelectorAll(`.layer-node[data-attached-to="${element.dataset.id}"]`);
      attachedFunctionLayers.forEach(functionLayer => {
        const functionLeft = transformedX + element.offsetWidth * scale - 22 * scale;
        const functionTop = transformedY - 22 * scale;
        
        functionLayer.style.left = `${functionLeft}px`;
        functionLayer.style.top = `${functionTop}px`;
        
        functionLayer.dataset.originalX = functionLeft;
        functionLayer.dataset.originalY = functionTop;
      });
      selectedNodesInfo.forEach(info => {
        // Calculate new position based on the original offset
        let newLeft = left + info.offsetLeft;
        let newTop = top + info.offsetTop;
        newLeft = newLeft * scale + panX;
        newTop = newTop * scale + panY;

      
        info.node.style.left = `${newLeft}px`;
        info.node.style.top = `${newTop}px`;
        
        info.node.dataset.originalX = left + info.offsetLeft;
        info.node.dataset.originalY = top + info.offsetTop;
        visualizer.updateConnectionsForNode(info.node.dataset.id);
      });
      
      visualizer.updateConnectionsForNode(element.dataset.id);
    }
    
    function stopDrag() {
      isDragging = false;
      selectedNodesInfo = [];
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }
  
  static setDimensions(svgElement,svgContainer, layerType) {
    const dimensions = LayerModel.getDimensionsForType(layerType)
    svgElement.setAttribute('width', dimensions.width);
    svgElement.setAttribute('height', dimensions.height); 
    svgContainer.style.width = `${dimensions.width}px`;
    svgContainer.style.height = `${dimensions.height}px`;

  }

  static updatePoolingTypeText(node, poolingType) {
    if (node.dataset.type === 'PoolingLayer') {
      const svgElement = node.querySelector('svg');
      if (svgElement) {
        node.dataset.poolingType = poolingType;
        
        let textElement = svgElement.querySelector('text');
        if (!textElement) {
          textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textElement.setAttribute('x', svgElement.getAttribute('width') / 2);
          textElement.setAttribute('y', svgElement.getAttribute('height') / 2);
          textElement.setAttribute('text-anchor', 'middle');
          textElement.setAttribute('dominant-baseline', 'middle');
          textElement.setAttribute('font-family', 'Arial, sans-serif');
          textElement.setAttribute('font-size', '12px');
          textElement.setAttribute('font-weight', 'bold');
          textElement.setAttribute('fill', '#333');
          svgElement.appendChild(textElement);
        }
        textElement.textContent = poolingType;
      }
    }
  }

  static getCanvasPosition(event, adjustForZoom = false) {
    const canvas  = document.querySelector('.drawing-area')
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX;
    const clientY = event.clientY;
    if (adjustForZoom) {
      const zoomIndicator = document.querySelector('.zoom-indicator');
      const zoomFloat = zoomIndicator ? parseFloat(zoomIndicator.textContent) : 100;
      const scale = zoomFloat / 100;
      
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale
      };
    } else {
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  }

}

export default LayerFactory;