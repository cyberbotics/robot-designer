/* global Ghost, MouseEvents */
'use strict';

class Dragger { // eslint-disable-line no-unused-vars
  constructor(robotViewer, robotController) {
    this.robotViewer = robotViewer;
    this.robotController = robotController;
    this.draggedPartName = null;
    this.draggedPart = undefined;
    this.slotType = null;
    this.ghost = new Ghost(robotViewer.scene);
  }

  dragStart(part, slotType) {
    this.draggedPart = part;
    this.slotType = slotType;
  }

  dragEnter() {
    this.robotViewer.slotAnchors.showSlots(this.slotType);
    this.ghost.addGhost(this.draggedPart);
  }

  dragOver(x, y) {
    var domElement = this.robotViewer.robotViewerElement;
    var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, x, y);

    var projection = this.robotViewer.projectScreenPositionOnSlotsAnchors(screenPosition);
    if (projection) {
      var closestSlot = this.robotViewer.getClosestSlot(screenPosition, this.slotType);
      if (closestSlot) {
        this.robotViewer.slotAnchors.highlight(closestSlot);
        this.ghost.moveGhostToSlot(closestSlot);
        return;
      }
    }

    projection = this.robotViewer.projectScreenPositionOnFloor(screenPosition);
    this.ghost.moveGhostToFloor(projection);
  }

  dragLeave() {
    this.robotViewer.slotAnchors.hideSlots(this.robotViewer.scene);
    this.ghost.removeGhost();
  }

  drop(x, y) {
    var domElement = this.robotViewer.robotViewerElement;
    var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, x, y);
    var closestSlot = this.robotViewer.getClosestSlot(screenPosition, this.slotType);

    if (closestSlot) {
      var parent = closestSlot;
      do {
        if (parent.userData.isPartContainer) {
          this.robotController.addPart(parent.mediator.model, this.draggedPart, closestSlot.userData.slotName);
          break;
        }
        parent = parent.parent;
      } while (parent);
    } else
      this.robotController.addPart(null, this.draggedPart, '');

    this.robotViewer.slotAnchors.hideSlots(this.robotViewer.scene);
    this.ghost.removeGhost();
  }
}
