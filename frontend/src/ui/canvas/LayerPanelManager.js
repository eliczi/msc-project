import DomUtils from '../../utils/DomUtils.js';

class LayerPanelManager {
  constructor(networkModel) {
    this.networkModel = networkModel;
  }
  
  // ===== Layer Panel Methods =====
  
  showLayerPanel(nodeId) {
    const layer = this.networkModel.getLayerById(nodeId);
    if (!layer) return;
    
    // Get the layer definition to access enum values and parameter types
    const layerDefinition = this.networkModel.getLayerType(layer.type);
    let panel = document.getElementById('layer-properties-panel');
    if (!panel) {
      panel = DomUtils.createElementWithClass('div', 'layer-properties-panel');
      panel.id = 'layer-properties-panel';
      document.body.appendChild(panel);
    }
    
    panel.innerHTML = '';
    
    // Create header
    const header = DomUtils.createElementWithClass('div', 'panel-header');
    header.textContent = `${layer.type} Properties`;
    panel.appendChild(header);
    
    // Create content
    const content = DomUtils.createElementWithClass('div', 'panel-content');
    
    // Add parameters
    const params = layer.getParameters();
    
    // Create a map of parameter names to their definitions
    const paramDefinitions = {};
    if (layerDefinition && layerDefinition.params) {
      layerDefinition.params.forEach(paramDef => {
        paramDefinitions[paramDef.name] = paramDef;
      });
    }    
    for (const key in params) {
      // Get the parameter definition (if available)
      const paramDef = paramDefinitions[key];
      content.appendChild(this.createParameterControl(key, params[key], layer, paramDef));
    }
    
    panel.appendChild(content);
    
    // Style and position the panel
    this.styleLayerPanel(panel);
  }
  
  createParameterControl(key, value, layer, paramDef) {
    const paramContainer = DomUtils.createElementWithClass('div', 'param-container');
    
    const label = DomUtils.createElementWithClass('label', 'param-label');
    label.textContent = this.formatParamName(key);
    label.htmlFor = `param-${key}`;
    
    // Choose input type based on parameter definition
    let input;
    
    // If we have a parameter definition and it's an enum type
    if (paramDef && paramDef.type === 'enum' && paramDef.enum_values && paramDef.enum_values.length > 0) {
      // Create a select dropdown for enum values
      input = document.createElement('select');
      input.id = `param-${key}`;
      
      // Add options for each enum value
      paramDef.enum_values.forEach(enumValue => {
        const option = document.createElement('option');
        option.value = enumValue;
        option.textContent = this.formatEnumValue(enumValue);
        
        // Select the current value
        if (value === enumValue) {
          option.selected = true;
        }
        
        input.appendChild(option);
      });
      
      // Add change listener
      input.addEventListener('change', (e) => {
        const newValue = e.target.value;
        layer.updateParameter(key, newValue);
      });
    } else {
      // Create a regular input field for non-enum types
      input = document.createElement('input');
      input.id = `param-${key}`;
      // Set input type and value
      if (typeof value === 'number') {
        input.type = 'number';
        
        // If we have a parameter definition with min/max/step values, use them
        if (paramDef) {
          if (paramDef.min !== undefined) input.min = paramDef.min;
          if (paramDef.max !== undefined) input.max = paramDef.max;
          if (paramDef.step !== undefined) input.step = paramDef.step;
        }
      } else {
        input.type = 'text';
      }
      
      input.value = value;
      
      // Add change listener
      input.addEventListener('change', (e) => {
        const newValue = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;

        layer.updateParameter(key, newValue);

      });
    }
    
    // Add a description or help text if available in the param definition
    if (paramDef && paramDef.description) {
      const helpText = DomUtils.createElementWithClass('div', 'param-help');
      helpText.textContent = paramDef.description;
      paramContainer.appendChild(helpText);
    }
    
    paramContainer.appendChild(label);
    paramContainer.appendChild(input);
    
    return paramContainer;
  }
  
  /**
   * Formats an enum value for display in the dropdown
   */
  formatEnumValue(value) {
    if (!value) return '';
    
    // Convert snake_case or camelCase to Title Case With Spaces
    return value
      .replace(/_/g, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\s+/, '')
      .replace(/\s+/g, '')
      .replace(/^./, str => str.toUpperCase());
  }
  
  formatParamName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  styleLayerPanel(panel) {
    Object.assign(panel.style, {
      position: 'absolute',
      right: '0',
      top: '0',
      width: '300px',
      height: '100%',
      backgroundColor: '#f5f5f5',
      boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
      zIndex: '1000',
      overflow: 'auto',
      padding: '15px',
      display: 'block'
    });
  }
  
  hideLayerPanel() {
    const panel = document.getElementById('layer-properties-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }
}

export default LayerPanelManager;