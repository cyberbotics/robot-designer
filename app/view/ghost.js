/* global THREE */
'use strict';

class Ghost { // eslint-disable-line no-unused-vars
  constructor(scene) {
    this.scene = scene;
    this.ghost = null;
    this.slot = null;
  }

  addGhost(modelName) {
    this.ghost = new THREE.Object3D();
    this.ghost.name = 'ghost';

    var model = '/robot-designer/assets/models/' + modelName + '/model.x3d';
    var loader = new THREE.X3DLoader();
    var that = this;
    loader.load(model, function(object3d) {
      if (that.ghost) {
        that.ghost.add(object3d);
        that.ghost.traverse(function(child) {
          if (child instanceof THREE.Mesh) {
            child.material.transparent = true;
            child.material.opacity = 0.5;
          }
        });
      }
    });

    this.scene.add(this.ghost);
  }

  moveGhostToFloor(projection) {
    this.scene.add(this.ghost);
    this.ghost.position.copy(projection);
  }

  moveGhostToSlot(slot) {
    this.ghost.position.copy(new THREE.Vector3());
    slot.add(this.ghost);
  }

  slot() {
    return this.slot;
  }

  removeGhost() {
    this.ghost.parent.remove(this.ghost);
    this.ghost = null;
    this.slot = null;
  }
}
