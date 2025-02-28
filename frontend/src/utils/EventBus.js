class EventBus {
    constructor() {
      this.listeners = {};
    }
    
    on(eventName, callback) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }
      this.listeners[eventName].push(callback);
    }
        
    emit(eventName, data) {
      if (!this.listeners[eventName]) {
        return;
      }
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`EventBus: Error in listener for '${eventName}':`, error);
        }
      });
    }
  }
  
  export default new EventBus();