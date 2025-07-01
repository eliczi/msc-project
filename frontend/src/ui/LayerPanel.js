import DomUtils from '../utils/DomUtils.js';
class LayerPanel {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentDraggedLayerType = null;
    this.dragGhost = null; 
    this.isDragging = false; 

  }
  
  renderLayerTypes(layerTypes) {
    this.container.innerHTML = '';
    
    const categories = {
      'Standard Layers': [],
      'Activation Functions': []
    };
    
    
    const filteredTypes = layerTypes.filter(layerType => {
      
      if (layerType.name.includes('InputLayer')) {
        return layerType.name === 'InputLayer' || layerType.name === 'BaseInputLayer';
      }
      return true; 
    });
    
    
    filteredTypes.forEach(layerType => {
      
      if (layerType.name.includes('Function')) {
        categories['Activation Functions'].push(layerType);
      } 
      
      else {
        
        if (layerType.name === 'InputLayer' || layerType.name === 'BaseInputLayer') {
          layerType.displayName = 'Input';
        }
        categories['Standard Layers'].push(layerType);
      }
    });
    
    
    Object.entries(categories).forEach(([categoryName, categoryItems]) => {
      if (categoryItems.length === 0) return;
      
      const categoryContainer = DomUtils.createElementWithClass('div', 'layer-category');
      
      
      const categoryHeader = DomUtils.createElementWithClass('div', 'category-header');
      categoryHeader.innerHTML = `
        <span class="category-name">${categoryName}</span>
        <span class="toggle-icon">▼</span>
      `;
      categoryContainer.appendChild(categoryHeader);
      
      
      const contentContainer = DomUtils.createElementWithClass('div', 'category-content');
      
      
      categoryHeader.addEventListener('click', () => {
        contentContainer.classList.toggle('collapsed');
        const toggleIcon = categoryHeader.querySelector('.toggle-icon');
        toggleIcon.textContent = contentContainer.classList.contains('collapsed') ? '▶' : '▼';
      });
      
      
      if (categoryName === 'Activation Functions') {
        contentContainer.classList.add('collapsed');
        categoryHeader.querySelector('.toggle-icon').textContent = '▶';
      }
      
      
      categoryItems.forEach(layerType => {
        const layerTypeElement = DomUtils.createElementWithClass('div', 'layer-type');
        
        
        let displayName = layerType.displayName || layerType.name
          .replace('Layer', '')
          .replace('Function', '')
          .replace('Base', '')
          .replace(/([A-Z])/g, '$1') 
          .trim();
        
        layerTypeElement.textContent = displayName;
        layerTypeElement.dataset.type = layerType.name;
        
        
        layerTypeElement.draggable = true;
        layerTypeElement.addEventListener('dragstart', this.handleLayerTypeDragStart.bind(this));
        contentContainer.appendChild(layerTypeElement);
      });
      
      categoryContainer.appendChild(contentContainer);
      this.container.appendChild(categoryContainer);
    });
    
    
    if (!document.getElementById('layer-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'layer-panel-styles';
      style.textContent = `
        .layer-type {
          display: flex;
          align-items: center;
          padding: 5px 8px;
        }
      `;
      document.head.appendChild(style);
    }
  }


handleLayerTypeDragStart(e) {
  const layerType = e.target.dataset.type;
  e.dataTransfer.setData('text/plain', layerType);
  e.dataTransfer.effectAllowed = "move";
  this.currentDraggedLayerType = layerType;
  
  
  const invisibleElement = document.createElement('div');
  invisibleElement.style.width = '1px';
  invisibleElement.style.height = '1px';
  invisibleElement.style.position = 'fixed';
  invisibleElement.style.top = '-1000px';
  invisibleElement.style.opacity = '0';
  document.body.appendChild(invisibleElement);
  
  e.dataTransfer.setDragImage(invisibleElement, 0, 0);
  
  
  this.createDragGhost(e.target.textContent);
  this.isDragging = true;
  
  
  document.addEventListener('dragover', this.updateDragGhost.bind(this));
  document.addEventListener('dragend', this.handleDragEnd.bind(this), { once: true });
  
  
  setTimeout(() => {
    document.body.removeChild(invisibleElement);
  }, 10);
}

createDragGhost(text) {
  
  this.dragGhost = document.createElement('div');
  Object.assign(this.dragGhost.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    padding: '5px 10px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '3px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    zIndex: '9999',
    transition: 'opacity 0.5s ease'
  });
  this.dragGhost.textContent = text;
  document.body.appendChild(this.dragGhost);
}

updateDragGhost(e) {
  if (!this.isDragging || !this.dragGhost) return;
  
  
  const canvas = document.querySelector('.drawing-area'); 
  const isOverCanvas = e.target === canvas || canvas.contains(e.target);
  
  if (isOverCanvas) {
    
    this.dragGhost.style.opacity = '0';
  } else {
    
    this.dragGhost.style.opacity = '1';
    this.dragGhost.style.top = `${e.clientY + 0}px`;
    this.dragGhost.style.left = `${e.clientX + 0}px`;
  }
}


handleDragEnd() {
  
  if (this.dragGhost && this.dragGhost.parentNode) {
    this.dragGhost.parentNode.removeChild(this.dragGhost);
    this.dragGhost = null;
  }
  this.isDragging = false;
}
  
}

export default LayerPanel;