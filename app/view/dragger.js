/* global Ghost, SlotAnchors */

class Dragger { // eslint-disable-line no-unused-vars
  constructor(view3D, robotController) {
    this.view3D = view3D;
    this.robotController = robotController;
    this.draggedPartName = null;
    this.draggedPart = undefined;
    this.slotType = null;
    this.ghost = new Ghost(view3D.scene);
  }

  dragStart(part, slotType) {
    this.draggedPart = part;
    this.slotType = slotType;
  }

  dragEnter() {
    SlotAnchors.showSlots(this.view3D.scene, this.slotType);
    this.ghost.addGhost(this.draggedPart);
  }

  dragOver(x, y) {
    var screenPosition = this.view3D.convertMouseEventPositionToScreenPosition(x, y);

    var projection = this.view3D.projectScreenPositionOnSlotsAnchors(screenPosition);
    if (projection) {
      var closestSlot = this.view3D.getClosestSlot(screenPosition, this.slotType);
      if (closestSlot) {
        SlotAnchors.highlight(closestSlot);
        this.ghost.moveGhostToSlot(closestSlot);
        return;
      }
    }

    projection = this.view3D.projectScreenPositionOnFloor(screenPosition);
    this.ghost.moveGhostToFloor(projection);
  }

  dragLeave() {
    SlotAnchors.hideSlots(this.view3D.scene);
    this.ghost.removeGhost();
  }

  drop(x, y) {
    var screenPosition = this.view3D.convertMouseEventPositionToScreenPosition(x, y);
    var closestSlot = this.view3D.getClosestSlot(screenPosition, this.slotType);

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
      this.robotController.addPart(this.robot, this.draggedPart, '');

    SlotAnchors.hideSlots(this.view3D.scene);
    this.ghost.removeGhost();
  }
}
