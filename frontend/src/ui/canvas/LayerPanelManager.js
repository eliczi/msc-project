import DomUtils from '../../utils/DomUtils.js'; // Assuming DomUtils.js is in this path

class LayerPanelManager {
  constructor(networkModel) {
    this.networkModel = networkModel;
    this.currentLayerNodeId = null; 
  }

  showLayerPanel(nodeId) {
    this.currentLayerNodeId = nodeId;
    const layer = this.networkModel.getLayerById(nodeId);
    if (!layer) {
      this.hideLayerPanel();
      return;
    }

    const layerDefinition = this.networkModel.getLayerType(layer.type);
    let panel = document.getElementById('layer-properties-panel');
    if (!panel) {
      panel = DomUtils.createElementWithClass('div', 'layer-properties-panel');
      panel.id = 'layer-properties-panel';
      document.body.appendChild(panel);
    }

    panel.innerHTML = ''; // Clear previous content

    const header = DomUtils.createElementWithClass('div', 'panel-header');
    header.textContent = `${layer.type} Properties`;
    panel.appendChild(header);

    const content = DomUtils.createElementWithClass('div', 'panel-content');
    const params = layer.getParameters();
    
    const paramDefinitions = {};
    if (layerDefinition && layerDefinition.params) {
      layerDefinition.params.forEach(paramDef => {
        paramDefinitions[paramDef.name] = paramDef;
      });
    }
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const paramDef = paramDefinitions[key];
        content.appendChild(this.createParameterControl(key, params[key], layer, paramDef));
      }
    }

    panel.appendChild(content);
    this.styleLayerPanel(panel); // Apply styles
    panel.style.display = 'block'; // Ensure panel is visible
  }

  createParameterControl(key, value, layer, paramDef) {
    const paramContainer = DomUtils.createElementWithClass('div', 'param-container');

    const label = DomUtils.createElementWithClass('label', 'param-label');
    label.textContent = this.formatParamName(key);
    label.htmlFor = `param-${key}-${this.currentLayerNodeId}`; // Ensure unique ID for label 'for' attribute

    let input;

    if (paramDef && paramDef.type === 'enum' && paramDef.enum_values && paramDef.enum_values.length > 0) {
      input = document.createElement('select');
      input.id = `param-${key}-${this.currentLayerNodeId}`; // Ensure unique ID

      paramDef.enum_values.forEach(enumValue => {
        const option = document.createElement('option');
        option.value = enumValue;
        option.textContent = this.formatEnumValue(enumValue);
        if (value === enumValue) {
          option.selected = true;
        }
        input.appendChild(option);
      });

      input.addEventListener('change', (e) => {
        const newValue = e.target.value;
        if (layer.getParameters()[key] !== newValue) {
          layer.updateParameter(key, newValue);
          // Refresh the panel to reflect changes
          if (this.currentLayerNodeId) {
            this.showLayerPanel(this.currentLayerNodeId);
          }
        }
      });
    } else {
      input = document.createElement('input');
      input.id = `param-${key}-${this.currentLayerNodeId}`; // Ensure unique ID

      if (typeof value === 'number') {
        input.type = 'number';
        if (paramDef) {
          if (paramDef.min !== undefined) input.min = paramDef.min;
          if (paramDef.max !== undefined) input.max = paramDef.max;
          if (paramDef.step !== undefined) input.step = paramDef.step;
        }
      } else {
        input.type = 'text';
      }

      input.value = value;

      input.addEventListener('change', (e) => {
        const newValue = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        layer.updateParameter(key, newValue);
        
        // Refresh the panel to reflect changes
        if (this.currentLayerNodeId) {
          this.showLayerPanel(this.currentLayerNodeId);
        }
      });
    }

    // Append label and input in standard order
    paramContainer.appendChild(label);
    paramContainer.appendChild(input);

    if (paramDef && paramDef.description) {
      const helpText = DomUtils.createElementWithClass('div', 'param-help');
      helpText.textContent = paramDef.description;
      paramContainer.appendChild(helpText); // Append help text after input
    }

    return paramContainer;
  }

  formatEnumValue(value) {
    if (!value) return '';
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
      position: 'fixed', 
      right: '0px',
      top: '0px',
      width: '300px',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
      zIndex: '1000',
      overflowY: 'auto', 
      overflowX: 'hidden', 
      padding: '15px',
      boxSizing: 'border-box', 
      // display: 'block' // Visibility is handled by show/hide
    });
  }

  hideLayerPanel() {
    const panel = document.getElementById('layer-properties-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    this.currentLayerNodeId = null; 
  }
}

export default LayerPanelManager;
