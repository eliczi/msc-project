
class ConnectionModel {

    constructor(id, sourceId, targetId, node, connectionElement) {
      this.id = id;
      this.sourceId = sourceId;
      this.targetId = targetId;
      this.node = node
      this.connectionElement = connectionElement
    }
  }
  
  export default ConnectionModel;