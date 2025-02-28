import { DEFAULT_STYLES } from '../config.js';
import DomUtils from '../utils/DomUtils.js';


class NodeFactory {

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
        svgElement.setAttribute('width', '64');
        svgElement.setAttribute('height', '64'); 
        svgContainer.style.width = '64px';
        svgContainer.style.height = '64px';
      }
      node.appendChild(svgContainer);

    } else {
      const displayName = type.replace('Layer', '');
      node.textContent = displayName;
    }

    //create connecting points
    const inputPoint = DomUtils.createElementWithClass('div', 'connection-point input-point');
    const outputPoint = DomUtils.createElementWithClass('div', 'connection-point output-point');
    node.appendChild(inputPoint);
    node.appendChild(outputPoint);

    //this.addText(node, layerTypeDef);
    
    //add event listener
    this.makeDraggable(node);
    
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (clickHandler) clickHandler(nodeId);
    });
    
    return node;
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
    
    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }

}

export default NodeFactory;