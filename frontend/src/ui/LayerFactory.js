import { DEFAULT_STYLES } from '../config.js';
import DomUtils from '../utils/DomUtils.js';
import { InputPoint, OutputPoint } from './connection/ConnectionPoint.js';
import LayerModel from '../models/LayerModel.js';
import ConnectionVisualizer from './connection/ConnectionVisualizer.js';
import SVGGenerator from './SVGGenerator.js';


class LayerFactory {
  //add documentation
  /*   * Creates a node element for a layer in the drawing area.
    *   * @param {string} nodeId - The ID of the node.
    *   * @param {string} type - The type of the layer.
    *  * @param {number} x - The x-coordinate of the node.
    *  * @param {number} y - The y-coordinate of the node.
    *  * @param {function} clickHandler - The function to call when the node is clicked.
    *  * @param {object} layerTypeDef - The layer type definition.
    *  * @param {number} scale - The scale factor for the node.
    *  * @returns {HTMLElement} The created node element.
    *  */
  static createNodeElement(nodeId, type, x, y, clickHandler, layerTypeDef, scale) {
    const node = DomUtils.createElementWithClass('div', 'layer-node');
    node.classList.add(type.toLowerCase().replace('layer', '-layer'));
    node.dataset.id = nodeId;
    node.dataset.type = type;

    let offsetX, offsetY;
    if (type === 'PoolingLayer') {
      offsetX = 56;
      offsetY = 32;
    }
    // else if(type.includes("Function")){
    //   offsetX = 20
    //   offsetY = 20
    //   console.log('dupa')
    // }
    
    else{
      offsetX = 32;
      offsetY = 32;
    }
 
    
    node.style.left = `${x * scale - offsetX * scale}px`;
    node.style.top = `${y* scale - offsetY * scale}px`;

    ////adjusting the position of the node

    const rect = document.querySelector('.drawing-area').getBoundingClientRect();
    const canvasCenterX = rect.width / 2 ;
    const canvasCenterY = rect.height / 2;
   
    // Save logical position
    const left = parseFloat(node.style.left);
    const top = parseFloat(node.style.top);
    const logicalX = (left -  canvasCenterX) / scale + canvasCenterX;
    const logicalY = (top -  canvasCenterY) / scale + canvasCenterY;
    // Save logical position
    node.dataset.originalX = logicalX;
    node.dataset.originalY = logicalY;
    ////adjusting the position of the node

    node.style.transformOrigin = 'center center';
    if (scale !== 1.0) {
      node.style.transform = `scale(${scale})`;
    }
  

    node.innerHTML = '';
    const svgContainer = DomUtils.createElementWithClass('div', 'node-svg-container');


    if (layerTypeDef.name === 'ConvolutionalLayer') {
      // Generate SVG programmatically
      const svgRepresentation = SVGGenerator.createSVGRepresentation('ConvolutionalLayer');
      svgContainer.innerHTML = svgRepresentation.svg_content;
    }
    else if (layerTypeDef.name.includes('InputLayer')) {
      // Special handling for all input layer types
      if (layerTypeDef && layerTypeDef.svg_representation) {
        // Get the specific input type representation if available
        const inputType = layerTypeDef.name.replace('InputLayer', '').toUpperCase();
        
        // If it's a specialized input layer, use its corresponding SVG
        if (inputType && inputType !== 'BASE' && 
            layerTypeDef.svg_representation.all_representations && 
            layerTypeDef.svg_representation.all_representations[inputType]) {
          svgContainer.innerHTML = layerTypeDef.svg_representation.all_representations[inputType];
        } 
        // Otherwise fall back to the default input representation
        else {
          svgContainer.innerHTML = layerTypeDef.svg_representation.svg_content;
        }
        
       
      } 
    }     
    else if (layerTypeDef && layerTypeDef.svg_representation && layerTypeDef.svg_representation.svg_content) {
      svgContainer.innerHTML = layerTypeDef.svg_representation.svg_content;
      if (type === 'PoolingLayer') {
        const svgElement = svgContainer.querySelector('svg');
        if (svgElement) {
          // Get the pooling type parameter (or default to MAX if not specified)
          const poolingType = node.dataset.poolingType || 'MAX';
          
          // Create text element
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
          
          // Add text to SVG
          svgElement.appendChild(textElement);
        } 
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

    //create connecting points
    
    
    // add the connection points to the node
    if(!type.includes("Function"))
    {
      const inputPoint = new InputPoint(node);
      const outputPoint = new OutputPoint(node);
      node.appendChild(outputPoint.getElement());
      node._inputPoint = inputPoint;
      node._outputPoint = outputPoint;
      node.appendChild(inputPoint.getElement());
    }
    
  
    this.addHoverText(node, type);

    //this.addText(node, layerTypeDef);
    
    //add event listener
    this.makeDraggable(node);
    
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (clickHandler) clickHandler(nodeId);
    });
    
    return node;
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
    // Add the text to the node
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
      const panXfloat = panXIndicator ? parseFloat(panXIndicator.textContent) : 100;
      const panYIndicator = document.querySelector('.pany-indicator');
      const panYfloat = panYIndicator ? parseFloat(panYIndicator.textContent) : 100;
      // Get canvas instance to access panX, panY, and scale
      const canvasInstance = canvas.canvasInstance;
      const panX = canvasInstance?.panX||panXfloat;
      const panY = canvasInstance?.panY||panYfloat;
      const scale = zoomFloat / 100;
      // Calculate offset in world coordinates

      const currentLeft = parseFloat(element.style.left) || 0;
      const currentTop = parseFloat(element.style.top) || 0;

      // Convert mouse position to canvas coordinates
      const worldX = (e.clientX - canvasRect.left - panX) / scale;
      const worldY = (e.clientY - canvasRect.top - panY) / scale;
      
        // Calculate offset from mouse to group's top-left corner
      offsetX = worldX - (currentLeft - panX) / scale;
      offsetY = worldY - (currentTop - panY) / scale;
    
      // Prevent propagation to avoid node selection
      e.stopPropagation();

      // const elementRect = element.getBoundingClientRect();
      // const worldX = (e.clientX - canvasRect.left - panX) / scale;
      // const worldY = (e.clientY - canvasRect.top - panY) / scale;

      // const currentLeft = parseFloat(element.style.left) || 0;
      // const currentTop = parseFloat(element.style.top) || 0;
      
      // offsetX = worldX - currentLeft;
      // offsetY = worldY - currentTop;
      
      const isNodeSelected = element.classList.contains('selected');
  
      if (isNodeSelected) {
        selectedNodesInfo = Array.from(document.querySelectorAll('.layer-node.selected'))
          .filter(node => node !== element)
          .map(node => {
            const nodeLeft = parseFloat(node.style.left) || 0;
            const nodeTop = parseFloat(node.style.top) || 0;
            const baseLeft = parseFloat(element.style.left) || 0;
            const baseTop = parseFloat(element.style.top) || 0;
            
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
      // Get canvas instance to access panX, panY, and scale
      const canvasInstance = canvas.canvasInstance;
      const panX = canvasInstance?.panX||panXfloat;
      const panY = canvasInstance?.panY||panYfloat;
      const scale = zoomFloat / 100;
      
      // Convert mouse position to world coordinates
      const worldX = (e.clientX - canvasRect.left - panX) / scale;
      const worldY = (e.clientY - canvasRect.top - panY) / scale;
      
      // Calculate new position
      const left = worldX - offsetX;
      const top = worldY - offsetY;
      
      // Update position
      const transformedX = left * scale + panX;
      const transformedY = top * scale + panY;
      
      element.style.left = `${transformedX}px`;
      element.style.top = `${transformedY}px`;
      
      // Update the original position (world coordinates)
      element.dataset.originalX = left;
      element.dataset.originalY = top;

        //
    
      // Handle attached function layers
      const attachedFunctionLayers = document.querySelectorAll(`.layer-node[data-attached-to="${element.dataset.id}"]`);
      attachedFunctionLayers.forEach(functionLayer => {
        // Position at the top-right corner of the parent element
        const functionLeft = transformedX + element.offsetWidth * scale - 22 * scale;
        const functionTop = transformedY - 22 * scale;
        
        functionLayer.style.left = `${functionLeft}px`;
        functionLayer.style.top = `${functionTop}px`;
        
        // Update original positions for function layers
        functionLayer.dataset.originalX = functionLeft;
        functionLayer.dataset.originalY = functionTop;
      });
      
      // Move selected nodes together
      selectedNodesInfo.forEach(info => {
        let newLeft = left + info.offsetLeft;
        let newTop = top + info.offsetTop;
        
        newLeft = Math.max(0, Math.min(maxWidth - info.node.offsetWidth / scale, newLeft));
        newTop = Math.max(0, Math.min(maxHeight - info.node.offsetHeight / scale, newTop));
        
        info.node.style.left = `${newLeft}px`;
        info.node.style.top = `${newTop}px`;
        
        // Update original positions for selected nodes
        info.node.dataset.originalX = newLeft;
        info.node.dataset.originalY = newTop;
        
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
    console.log(layerType)
    svgElement.setAttribute('width', dimensions.width);
    svgElement.setAttribute('height', dimensions.height); 
    svgContainer.style.width = `${dimensions.width}px`;
    svgContainer.style.height = `${dimensions.height}px`;

  }

  static updatePoolingTypeText(node, poolingType) {
    if (node.dataset.type === 'PoolingLayer') {
      const svgElement = node.querySelector('svg');
      if (svgElement) {
        // Update the dataset attribute
        node.dataset.poolingType = poolingType;
        
        // Find existing text element or create a new one
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
        // Update text content
        textElement.textContent = poolingType;
      }
    }
  }

  static getCanvasPosition(event, adjustForZoom = false) {
    const canvas  = document.querySelector('.drawing-area')
    const rect = canvas.getBoundingClientRect();
    // Get coordinates from event
    const clientX = event.clientX;
    const clientY = event.clientY;
    // If we need to adjust for zoom
    if (adjustForZoom) {
      // Get scale from zoom indicator
      const zoomIndicator = document.querySelector('.zoom-indicator');
      const zoomFloat = zoomIndicator ? parseFloat(zoomIndicator.textContent) : 100;
      const scale = zoomFloat / 100;
      
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale
      };
    } else {
      // Return raw position without zoom adjustment
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  }

  

}

export default LayerFactory;