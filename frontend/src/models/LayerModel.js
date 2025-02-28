class LayerModel {

    constructor(id, backendId, type, params, x, y) {
      this.id = id;
      this.backendId = backendId;
      this.type = type;
      this.params = params;
      this.x = x;
      this.y = y;
      this.element = null; 
    }
    
    updatePosition(x, y) {
      this.x = x;
      this.y = y;
    }
    
    getDisplayName() {
      return this.type;
    }
    
    setElement(element) {
      this.element = element;
    }
  }
  
  export default LayerModel;