/* global Part */
'use strict';

class RobotController { // eslint-disable-line no-unused-vars
  constructor(assetLibrary, commands, robot) {
    this.assetLibrary = assetLibrary;
    this.commands = commands;
    this.robot = robot;
  }

  addPart(parent, modelName, closestSlotName) {
    var asset = this.assetLibrary.getAssetByName(modelName);
    var part = new Part(asset);
    if (!parent || parent === this.robot)
      this.commands.addRootPart(this.robot, part);
    else
      this.commands.addPart(parent, closestSlotName, part);
  }

  removePart(part) {
    this.commands.removePart(part);
  }

  translatePart(part, translation) {
    this.commands.translatePart(part, [translation.x, translation.y, translation.z]);
  }

  rotatePart(part, quaternion) {
    this.commands.rotatePart(part, [quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
  }
}
