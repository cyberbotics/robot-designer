/* global Part */

class RobotController { // eslint-disable-line no-unused-vars
  constructor(robot) {
    this.robot = robot;
  }

  addPart(parent, modelName, closestSlotName) {
    var part;
    if (!parent || parent === this.robot) {
      part = new Part(modelName);
      this.robot.addRootPart(part);
    } else {
      part = new Part(modelName);
      parent.addPart(closestSlotName, part);
    }
  }
}
