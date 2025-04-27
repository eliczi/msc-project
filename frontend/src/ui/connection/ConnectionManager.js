import { GeometryUtils } from "./GeometryUtils.js";
import DomUtils from "../../utils/DomUtils.js";

export class ConnectionManager {
    constructor(drawer, networkModel) {
      this.drawer = drawer;
      this.networkModel = networkModel;
      this.svgContainer = drawer.svgContainer;
    }
  
    findSourceAndTargetNodes(sourceId, targetId) {
      // Handle group logic
      const targetElement = document.querySelector(`.layer-node[data-id="${targetId}"]`);
      const targetGroupId = targetElement?.dataset?.groupId;
      const targetGroupElement = targetGroupId 
        ? document.querySelector(`.layer-group[data-id="${targetGroupId}"]`) 
        : null;
    
      let isTargetGroup = targetId.startsWith('group-');
      
      // If target is a group and is expanded, return null to indicate we should update connections to all layers
      if (isTargetGroup) {
        const group = document.querySelector(`.layer-group[data-id="${targetId}"]`);
        if (group && group.dataset.expanded === 'true') {
          return null; // Signal to handle multiple layers
        }
      }
      
      // If target is in a collapsed group, redirect to the group
      if (targetGroupElement && targetGroupElement.dataset.expanded === 'false') {
        targetId = targetGroupElement.dataset.id;
        isTargetGroup = true;
      }
      
      // Handle source group logic
      let isSourceGroup = sourceId.startsWith('group-');
      const sourceElement = document.querySelector(`.layer-node[data-id="${sourceId}"]`);
      const sourceGroupId = sourceElement?.dataset?.groupId;
      const sourceGroupElement = sourceGroupId
        ? document.querySelector(`.layer-group[data-id="${sourceGroupId}"]`)
        : null;

      
       // If source is in a collapsed group, redirect to the group
      if (sourceGroupElement && sourceGroupElement.dataset.expanded === 'false') {
        sourceId = sourceGroupElement.dataset.id;
        isSourceGroup = true;
      }
      
      // Check if source and target are in the same collapsed group
      if (sourceGroupId && targetGroupId && sourceGroupId === targetGroupId) {
        const groupElement = document.querySelector(`.layer-group[data-id="${sourceGroupId}"]`);
        if (groupElement && groupElement.dataset.expanded === 'false') {
          return { inSameCollapsedGroup: true };
        }
      }

      // Get the actual DOM nodes
      const sourceSelector = isSourceGroup 
        ? `.layer-group[data-id="${sourceId}"]` 
        : `.layer-node[data-id="${sourceId}"]`;
      
      const targetSelector = isTargetGroup 
        ? `.layer-group[data-id="${targetId}"]` 
        : `.layer-node[data-id="${targetId}"]`;
      
      const sourceNode = document.querySelector(sourceSelector);
      const targetNode = document.querySelector(targetSelector);
      
      if (!sourceNode || !targetNode) {
        return { missingNodes: true, sourceId, targetId };
      }
      // Get connection points
      const sourcePoint = sourceNode._outputPoint;
      const targetPoint = targetNode._inputPoint;
      
      if (!sourcePoint || !targetPoint) {
        return { missingPoints: true, sourceId, targetId };
      }
      
      return { sourceNode, targetNode, sourcePoint, targetPoint, sourceId, targetId };
    }
  
    updateConnection(connectionElement, sourceId, targetId) {
      // Check visibility first
      if (!connectionElement) return;
      
      const result = this.findSourceAndTargetNodes(sourceId, targetId);
      // Handle special cases
      if (!result) {
        // Handle case where target is an expanded group
        const group = document.querySelector(`.layer-group[data-id="${targetId}"]`);
        if (group && group.dataset.expanded === 'true') {
          const layers = group.querySelectorAll('.layer-node');
          layers.forEach(layer => {
            this.updateConnection(connectionElement, sourceId, layer.dataset.id);
          });
          return;
        }
      }
      
      if (result?.inSameCollapsedGroup) {
        connectionElement.style.display = 'none';
        return;
      }
      
      if (result?.missingNodes || result?.missingPoints) {
        console.warn(`Problem with connection: ${result.sourceId} -> ${result.targetId}`);
        return;
      }
      
      // Ensure connection is visible
      connectionElement.style.display = '';
      
      // Calculate coordinates and update
      const sourceCoords = GeometryUtils.calculatePointCoordinates(
        result.sourcePoint, this.svgContainer);
      const targetCoords = GeometryUtils.calculatePointCoordinates(
        result.targetPoint, this.svgContainer);
      
      // Calculate and update path
      const pathData = GeometryUtils.calculatePathData(
        sourceCoords.x, sourceCoords.y, targetCoords.x, targetCoords.y);
      
      this.drawer.updateConnectionPath(connectionElement, pathData);
    }
  
    updateConnectionsForNode(nodeId) {
      this.networkModel.connections.forEach(conn => {
        if (conn.sourceId === nodeId || conn.targetId === nodeId) {
          this.updateConnection(conn.connectionElement, conn.sourceId, conn.targetId);
        }
      });
    }
  
    updateAllConnections() {
      if (!this.networkModel.connections || this.networkModel.connections.length === 0) {
        return; // No connections to update
      }
      const currentScale = DomUtils.getScale();
      
      this.networkModel.connections.forEach(conn => {
        if (conn.connectionElement) {
          this.updateConnection(conn.connectionElement, conn.sourceId, conn.targetId);
        }
      });
      
      this.drawer.updateConnectionWidths(currentScale);
    }
  
    removeConnectionsForNode(nodeId) {
      const connectionsToRemove = this.networkModel.connections.filter(conn => 
        conn.sourceId == nodeId || conn.targetId == nodeId
      );
      
      connectionsToRemove.forEach(conn => {
        if (conn.connectionElement && conn.connectionElement.parentNode) {
          conn.connectionElement.parentNode.removeChild(conn.connectionElement);
        }
      });
      
      this.networkModel.connections = this.networkModel.connections.filter(conn => 
        conn.sourceId != nodeId && conn.targetId != nodeId
      );
    }
  
    removeAllConnections() {
      this.networkModel.connections.forEach(conn => {
        if (conn.connectionElement && conn.connectionElement.parentNode) {
          conn.connectionElement.parentNode.removeChild(conn.connectionElement);
        }
      });
    }
  }