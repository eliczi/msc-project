import DomUtils from '../utils/DomUtils.js';
class LayerPanel {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentDraggedLayerType = null;
    this.dragGhost = null; // Add this property
    this.isDragging = false; // Track drag state

  }
  
  renderLayerTypes(layerTypes) {
    this.container.innerHTML = '';
    console.log(layerTypes)
    // Categorize layer types with additional categories
    const categories = {
      'Standard Layers': [],
      'Activation Functions': []
    };
    
    // Filter out any specialized input types
    const filteredTypes = layerTypes.filter(layerType => {
      // Only allow InputLayer or BaseInputLayer, not specialized ones like TextInputLayer
      if (layerType.name.includes('InputLayer')) {
        return layerType.name === 'InputLayer' || layerType.name === 'BaseInputLayer';
      }
      return true; // Keep all other layer types
    });
    
    // Sort layer types into categories
    filteredTypes.forEach(layerType => {
      // Check if the layer type is an activation function
      if (layerType.name.includes('Function')) {
        categories['Activation Functions'].push(layerType);
      } 
      // Everything else goes to standard layers
      else {
        // Rename InputLayer or BaseInputLayer to just "Input"
        if (layerType.name === 'InputLayer' || layerType.name === 'BaseInputLayer') {
          layerType.displayName = 'Input';
        }
        categories['Standard Layers'].push(layerType);
      }
    });
    
    // Render categories
    Object.entries(categories).forEach(([categoryName, categoryItems]) => {
      if (categoryItems.length === 0) return;
      
      const categoryContainer = DomUtils.createElementWithClass('div', 'layer-category');
      
      // Create category header with expand/collapse functionality
      const categoryHeader = DomUtils.createElementWithClass('div', 'category-header');
      categoryHeader.innerHTML = `
        <span class="category-name">${categoryName}</span>
        <span class="toggle-icon">▼</span>
      `;
      categoryContainer.appendChild(categoryHeader);
      
      // Create content container for category items
      const contentContainer = DomUtils.createElementWithClass('div', 'category-content');
      
      // Toggle category expansion when header is clicked
      categoryHeader.addEventListener('click', () => {
        contentContainer.classList.toggle('collapsed');
        const toggleIcon = categoryHeader.querySelector('.toggle-icon');
        toggleIcon.textContent = contentContainer.classList.contains('collapsed') ? '▶' : '▼';
      });
      
      // Always collapse activation functions
      if (categoryName === 'Activation Functions') {
        contentContainer.classList.add('collapsed');
        categoryHeader.querySelector('.toggle-icon').textContent = '▶';
      }
      
      // Add layer types to the category content
      categoryItems.forEach(layerType => {
        const layerTypeElement = DomUtils.createElementWithClass('div', 'layer-type');
        
        // Format the display name more nicely
        let displayName = layerType.displayName || layerType.name
          .replace('Layer', '')
          .replace('Function', '')
          .replace('Base', '')
          .replace(/([A-Z])/g, '$1') // Add space before capital letters
          .trim();
        
        layerTypeElement.textContent = displayName;
        layerTypeElement.dataset.type = layerType.name;
        
        // make draggable
        layerTypeElement.draggable = true;
        layerTypeElement.addEventListener('dragstart', this.handleLayerTypeDragStart.bind(this));
        contentContainer.appendChild(layerTypeElement);
      });
      
      categoryContainer.appendChild(contentContainer);
      this.container.appendChild(categoryContainer);
    });
    
    // Add some CSS for styling
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
  
  // Always make the drag image invisible
  const invisibleElement = document.createElement('div');
  invisibleElement.style.width = '1px';
  invisibleElement.style.height = '1px';
  invisibleElement.style.position = 'fixed';
  invisibleElement.style.top = '-1000px';
  invisibleElement.style.opacity = '0';
  document.body.appendChild(invisibleElement);
  
  e.dataTransfer.setDragImage(invisibleElement, 0, 0);
  
  // Create a custom ghost element that follows the cursor
  this.createDragGhost(e.target.textContent);
  this.isDragging = true;
  
  // Setup event listeners for the drag operation
  document.addEventListener('dragover', this.updateDragGhost.bind(this));
  document.addEventListener('dragend', this.handleDragEnd.bind(this), { once: true });
  
  // Remove the invisible element after a short delay
  setTimeout(() => {
    document.body.removeChild(invisibleElement);
  }, 10);
}

createDragGhost(text) {
  // Create a visible "ghost" element that will follow the cursor
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
  
  // Check if over canvas - get the canvas element
  const canvas = document.querySelector('.drawing-area'); // Adjust the selector to match your canvas
  const isOverCanvas = e.target === canvas || canvas.contains(e.target);
  
  if (isOverCanvas) {
    // Hide ghost when over canvas
    this.dragGhost.style.opacity = '0';
  } else {
    // Show and position ghost when not over canvas
    this.dragGhost.style.opacity = '1';
    this.dragGhost.style.top = `${e.clientY + 0}px`;
    this.dragGhost.style.left = `${e.clientX + 0}px`;
  }
}


handleDragEnd() {
  // Clean up the ghost element
  if (this.dragGhost && this.dragGhost.parentNode) {
    this.dragGhost.parentNode.removeChild(this.dragGhost);
    this.dragGhost = null;
  }
  this.isDragging = false;
}
  
}

export default LayerPanel;