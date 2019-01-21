/* global Part, Commands */

class RobotController { // eslint-disable-line no-unused-vars
  constructor(robot) {
    this.robot = robot;
  }

  addPart(parent, modelName, closestSlotName) {
    var part = new Part(modelName);
    if (!parent || parent === this.robot)
      new Commands().addRootPart(this.robot, part);
    else
      new Commands().addPart(parent, closestSlotName, part);
  }

  removePart(part) {
    new Commands().removePart(part);
  }
}
