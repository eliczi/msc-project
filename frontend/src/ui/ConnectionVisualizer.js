import NetworkModel from "../models/NetworkModel.js";

class ConnectionVisualizer {

  static instance = null;
  
  static getInstance() {
    if (!ConnectionVisualizer.instance) {
      ConnectionVisualizer.instance = new ConnectionVisualizer();
    }
    return ConnectionVisualizer.instance;
  }

  constructor() {
    this.svgContainer = document.getElementById('connections');
  }

  calculatePointCoordinates(connectionPoint) {
    const node = connectionPoint.node;
    const position = connectionPoint.getPosition();
    const nodeRect = node.getBoundingClientRect();
    const containerRect = this.svgContainer.getBoundingClientRect();
    
    return {
      x: (nodeRect.left + position.x) - containerRect.left,
      y: (nodeRect.top + position.y) - containerRect.top
    };
  }

  createTemporaryLine(startX, startY) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#000000');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '5,3')
    path.setAttribute('fill', 'none');
    line.appendChild(path);
    this.svgContainer.appendChild(line);
    return { line, path };
  }

  updateTemporaryLine(path, startX, startY, cursorX, cursorY, connectionPointType) {
    const containerRect = this.svgContainer.getBoundingClientRect();
    const adjustedCursorX = cursorX - containerRect.left;
    const adjustedCursorY = cursorY - containerRect.top;
    
    let pathData;
    const offset = Math.abs(adjustedCursorY-startY)/2
    if (connectionPointType === 'output') {
      pathData = `M ${startX} ${startY} C ${startX + offset} ${startY}, ${startX + offset} ${adjustedCursorY}, ${adjustedCursorX} ${adjustedCursorY}`;
    } else {
      pathData = `M ${startX} ${startY} C ${startX - offset} ${startY}, ${startX - offset} ${adjustedCursorY}, ${adjustedCursorX} ${adjustedCursorY}`;
    }
    path.setAttribute('d', pathData);
  }

  removeTemporaryLine(line) {
    if (line && line.parentNode) {
      line.parentNode.removeChild(line);
    }
  }

  createPermanentConnection(sourceId, targetId) {
    const connectionElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    connectionElement.classList.add('permanent-connection');
    connectionElement.dataset.sourceId = sourceId;
    connectionElement.dataset.targetId = targetId;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#000000');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '5,3')
    path.setAttribute('fill', 'none');
    
    connectionElement.appendChild(path);
    this.svgContainer.appendChild(connectionElement);
    this.updateConnection(connectionElement, sourceId, targetId);
    return connectionElement;
  }

  updateConnection(connectionElement, sourceId, targetId) {
    const sourceNode = document.querySelector(`.layer-node[data-id="${sourceId}"]`);
    const targetNode = document.querySelector(`.layer-node[data-id="${targetId}"]`);
        
    const sourcePoint = sourceNode._outputPoint;
    const targetPoint = targetNode._inputPoint;
    
    const sourceCoords = this.calculatePointCoordinates(sourcePoint);
    const targetCoords = this.calculatePointCoordinates(targetPoint);
    
    const path = connectionElement.querySelector('path');
    if (path) {
      const pathData = this.calculatePathData(sourceCoords.x, sourceCoords.y, targetCoords.x, targetCoords.y);
      path.setAttribute('d', pathData);
    }
  }
  
  updateConnectionsForNode(nodeId) {
    NetworkModel.connections.forEach(conn => {
      if (conn.sourceId === nodeId || conn.targetId === nodeId) {
        this.updateConnection(conn.connectionElement, conn.sourceId, conn.targetId);
      }
    });
  }

  calculatePathData(startX, startY, endX, endY) {
    const offset = Math.abs(endY - startY) / 2;
    return `M ${startX} ${startY} C ${startX + offset} ${startY}, ${endX - offset} ${endY}, ${endX} ${endY}`;
  }

  removeConnectionsForNode(nodeId) {
    const connectionsToRemove = NetworkModel.connections.filter(conn => 
      conn.sourceId == nodeId || conn.targetId == nodeId
    );
    connectionsToRemove.forEach(conn => {
      if (conn.connectionElement && conn.connectionElement.parentNode) {
        conn.connectionElement.parentNode.removeChild(conn.connectionElement);
      }
    });
    NetworkModel.connections = NetworkModel.connections.filter(conn => 
      conn.sourceId != nodeId && conn.targetId != nodeId
    );
  }

  removeAllConnections() {
    NetworkModel.connections.forEach(conn => {
      if (conn.connectionElement && conn.connectionElement.parentNode) {
        conn.connectionElement.parentNode.removeChild(conn.connectionElement);
      }
    });
  }
  
}
export default ConnectionVisualizer;
