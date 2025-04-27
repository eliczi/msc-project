class CanvasUtils {
    constructor(canvas, panManager = null) {
      this.canvas = canvas;
      this.panManager = panManager;
    }
    
    // ===== Utility Methods =====
    /**
     * Gets the mouse position relative to the canvas element.
     * 
     * This function calculates coordinates relative to the canvas origin (top-left corner),
     * with optional adjustment for zoom level. It handles mouse events and can either
     * return raw coordinates or coordinates adjusted for the current zoom level.
     * 
     * @param {MouseEvent} event - The mouse event containing clientX and clientY coordinates
     * @param {boolean} [adjustForZoom=false] - Whether to adjust coordinates for zoom level
     *        - true: Divides coordinates by zoom scale (useful for operations on zoomed canvas)
     *        - false: Returns raw coordinates without zoom adjustment (default)
     * 
     * @returns {Object} An object containing x and y coordinates relative to canvas
     */
    getCanvasPosition(event, adjustForZoom = false) {
        const rect = this.canvas.getBoundingClientRect();
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
      
    
    getNodeCanvasRect(node) {
      const nodeRect = node.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      
      return {
        left: nodeRect.left - canvasRect.left,
        top: nodeRect.top - canvasRect.top,
        right: nodeRect.right - canvasRect.left,
        bottom: nodeRect.bottom - canvasRect.top
      };
    }
    
    rectsIntersect(rect1, rect2) {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );
    }
    
    formatParamName(name) {
      return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    }
    // Add this method to your CanvasUtils class
    getCanvasScale() {
        // Return the current scale from the Canvas instance
        return this.canvas.scale || 1.0;
    }
  }
  
  export default CanvasUtils;