/* global THREE */
'use strict';

class Ghost { // eslint-disable-line no-unused-vars
  constructor(scene) {
    this.scene = scene;
    this.ghost = null;

    this.pathPrefix = 'models/';
    if (typeof Ghost.assetsPathPrefix !== 'undefined')
      this.pathPrefix = Ghost.assetsPathPrefix + this.pathPrefix;
  }

  addGhost(modelName) {
    this.ghost = new THREE.Object3D();
    this.ghost.userData.isGhost = true;

    var model = this.pathPrefix + modelName + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, (object3dList) => {
      if (!this.ghost || !Array.isArray(object3dList) || object3dList.length === 0)
        return;
      this.ghost.add(object3dList[0]);
      this.ghost.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      });
    });

    this.scene.add(this.ghost);
  }

  moveGhostToFloor(projection) {
    if (!this.ghost)
      return;
    this.scene.add(this.ghost);
    this.ghost.position.copy(projection);
  }

  moveGhostToSlot(slot) {
    if (!this.ghost)
      return;
    this.ghost.position.copy(new THREE.Vector3());
    slot.add(this.ghost);
  }

  removeGhost() {
    if (!this.ghost)
      return;
    this.ghost.parent.remove(this.ghost);
    this.ghost = null;
  }
}
