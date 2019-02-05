/* global Part, THREE */
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
    var parent = part.parent;
    if (!parent || parent === this.robot)
      this.commands.removeRootPart(this.robot, part);
    else
      this.commands.removePart(part);
  }

  translatePart(part, translation) {
    var previousTranslation = new THREE.Vector3(part.translation[0], part.translation[1], part.translation[2]);
    if (translation.distanceTo(previousTranslation) > 0.001)
      this.commands.translatePart(part, [translation.x, translation.y, translation.z]);
  }

  rotatePart(part, quaternion) {
    var previousQuaternion = new THREE.Quaternion(part.quaternion[0], part.quaternion[1], part.quaternion[2], part.quaternion[3]);
    if (quaternion.angleTo(previousQuaternion) > 0.01)
      this.commands.rotatePart(part, [quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
  }
}
