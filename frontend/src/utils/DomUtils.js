class DomUtils {
   
    static createElementWithClass(tag, className) {
      const element = document.createElement(tag);
      if (className) {
        element.className = className;
      }
      return element;
    }

    static getScale()
    {
      let zoomIndicator = document.querySelector('.zoom-indicator');
      zoomIndicator = zoomIndicator ? parseFloat(zoomIndicator.textContent) : 1.0;
      return zoomIndicator / 100;
    }

    static getNodes(element)
    {
      return element.querySelectorAll('.layer-node');
    }
  }
  
  export default DomUtils;