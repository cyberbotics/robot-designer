/* global Part */
'use strict';

class RobotController { // eslint-disable-line no-unused-vars
  constructor(commands, robot) {
    this.commands = commands;
    this.robot = robot;
  }

  addPart(parent, modelName, closestSlotName) {
    var part = new Part(modelName);
    if (!parent || parent === this.robot)
      this.commands.addRootPart(this.robot, part);
    else
      this.commands.addPart(parent, closestSlotName, part);
  }

  removePart(part) {
    this.commands.removePart(part);
  }
}
