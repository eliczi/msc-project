import { DEFAULT_STYLES } from '../config.js';
import DomUtils from '../utils/DomUtils.js';
import { InputPoint, OutputPoint } from './ConnectionPoint.js';
import LayerModel from '../models/LayerModel.js';
import ConnectionVisualizer from './ConnectionVisualizer.js';


class LayerFactory {

  static createNodeElement(nodeId, type, x, y, clickHandler, layerTypeDef) {
    const node = DomUtils.createElementWithClass('div', 'layer-node');
    node.classList.add(type.toLowerCase().replace('layer', '-layer'));
    node.dataset.id = nodeId;
    node.dataset.type = type;
    
    const offsetX = DEFAULT_STYLES.node.centerOffsetX;
    const offsetY = DEFAULT_STYLES.node.centerOffsetY;
    node.style.left = `${x - offsetX}px`;
    node.style.top = `${y - offsetY}px`;
    
    if (layerTypeDef && layerTypeDef.svg_representation && layerTypeDef.svg_representation.svg_content) {
      node.innerHTML = '';
      const svgContainer = DomUtils.createElementWithClass('div', 'node-svg-container');

      svgContainer.innerHTML = layerTypeDef.svg_representation.svg_content;

      const svgElement = svgContainer.querySelector('svg');
      if (svgElement) {
        this.setDimensions(svgElement, svgContainer, type);
      }
      node.appendChild(svgContainer);

    } else {
      node.textContent = type.replace('Layer', '');
    }

    //create connecting points
    const inputPoint = new InputPoint(node);
    const outputPoint = new OutputPoint(node);
    
    // add the connection points to the node
    node.appendChild(inputPoint.getElement());
    node.appendChild(outputPoint.getElement());

    node._inputPoint = inputPoint;
    node._outputPoint = outputPoint;

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
    console.log('ssss')
    const hoverText = DomUtils.createElementWithClass('div', 'node-hover-text');
    hoverText.textContent = type.replace('Layer', ' Layer');
    hoverText.style.position = 'absolute';
    hoverText.style.top = '-40px';
    hoverText.style.left = '50%';
    hoverText.style.transform = 'translateX(-50%)';
    hoverText.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
    hoverText.style.color = 'white';
    hoverText.style.padding = '4px 8px';
    hoverText.style.borderRadius = '4px';
    hoverText.style.fontSize = '12px';
    hoverText.style.whiteSpace = 'nowrap';
    hoverText.style.display = 'none';
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
    textAboveNode.textContent = 'AVG'; // or customize the text as needed
    textAboveNode.style.position = 'absolute';
    textAboveNode.style.top = '30px';  // Adjust this to control how far above the node the text should appear
    textAboveNode.style.left = '50%';
    textAboveNode.style.transform = 'translateX(-50%)'; // Center the text horizontally above the node
    console.log(layerTypeDef)
    // Add the text to the node
    node.appendChild(textAboveNode);
  }
  
  static makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY;
    const visualizer = ConnectionVisualizer.getInstance();

    element.addEventListener('mousedown', startDrag);
    
    function startDrag(e) {
      if (e.target.classList.contains('connection-point')) {
        return;
      }
      isDragging = true;
      
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    }
    
    function drag(e) {
      if (!isDragging) return;
      const drawingArea = element.parentElement;
      const rect = drawingArea.getBoundingClientRect();
      
      //minus offset to prevent from topleft dragging
      let left = e.clientX - rect.left - offsetX;
      let top = e.clientY - rect.top - offsetY;
      
      left = Math.max(0, Math.min(rect.width - element.offsetWidth, left));
      top = Math.max(0, Math.min(rect.height - element.offsetHeight, top));
      
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      visualizer.updateConnectionsForNode(element.dataset.id);

    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }
  
  static setDimensions(svgElement,svgContainer, layerType) {
    const dimensions = LayerModel.getDimensionsForType(layerType)
    svgElement.setAttribute('width', dimensions.width);
    svgElement.setAttribute('height', dimensions.height); 
    svgContainer.style.width = '112'; //connection point
    svgContainer.style.height = '64px';
  }
}

export default LayerFactory;