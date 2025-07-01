class EventManager {
    constructor(canvas, transformManager, elementUpdater) {
      this.canvas = canvas;
      this.transformManager = transformManager;
      this.elementUpdater = elementUpdater;
      this.bindEvents();
    }
  
    bindEvents() {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }
  
    handleWheel(e) {
      e.preventDefault();
      if (e.ctrlKey) {
        const zoomAmount = -e.deltaY * this.transformManager.zoomStep;
        const zoomed = this.transformManager.zoom(zoomAmount, e.clientX, e.clientY);
        if (zoomed) this.elementUpdater.updateAll();
      } else {
        this.transformManager.pan(-e.deltaX, -e.deltaY);
        this.elementUpdater.updateAll();
      }
    }
  
    handleKeyDown(e) {
      if (this.isInputElement(e.target)) return;
      
      const panSpeed = 20;
      let shouldUpdate = false;
  
      switch (e.key) {
        case 'ArrowLeft':
          this.transformManager.pan(panSpeed, 0);
          shouldUpdate = true;
          break;
        case 'ArrowRight':
          this.transformManager.pan(-panSpeed, 0);
          shouldUpdate = true;
          break;
        case 'ArrowUp':
          this.transformManager.pan(0, panSpeed);
          shouldUpdate = true;
          break;
        case 'ArrowDown':
          this.transformManager.pan(0, -panSpeed);
          shouldUpdate = true;
          break;
        case 'Home':
          this.transformManager.reset();
          shouldUpdate = true;
          break;
      }
  
      if (shouldUpdate) {
        e.preventDefault();
        this.elementUpdater.updateAll();
      }
    }
  
    isInputElement(element) {
      return element instanceof HTMLInputElement ||
             element instanceof HTMLTextAreaElement ||
             element instanceof HTMLSelectElement;
    }
  }
  export default EventManager;