class DomUtils {
   
    static createElementWithClass(tag, className) {
      const element = document.createElement(tag);
      if (className) {
        element.className = className;
      }
      return element;
    }
  }
  
  export default DomUtils;