import DomUtils from '../utils/DomUtils.js';

class LayerPanel {
  constructor(containerElement) {
    this.container = containerElement;
  }
  
  renderLayerTypes(layerTypes) {
    this.container.innerHTML = '';
    
    layerTypes.forEach(layerType => {
      const layerTypeElement = DomUtils.createElementWithClass('div', 'layer-type');
      layerTypeElement.textContent = layerType.name.replace('Layer', '');
      layerTypeElement.dataset.type = layerType.name;
      // make draggable
      layerTypeElement.draggable = true;
      layerTypeElement.addEventListener('dragstart', this.handleLayerTypeDragStart.bind(this));
      this.container.appendChild(layerTypeElement);
    });
  }

  handleLayerTypeDragStart(e) {
    const layerType = e.target.dataset.type;
    e.dataTransfer.setData('text/plain', layerType);
    e.dataTransfer.effectAllowed = 'copy';
  }
}

export default LayerPanel;