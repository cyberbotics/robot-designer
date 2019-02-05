/* global THREE */
'use strict';

class PartMediator { // eslint-disable-line no-unused-vars
  constructor(part) {
    this.model = part;
    this.object3D = this.makeObject3D();
    this.object3D.matrixAutoUpdate = false;
    this.object3D.mediator = this;
    this.object3D.userData.isPartContainer = true;
    this.childrenMediators = {};
    this.childrenSlots = {};
    this.model.addObserver('PartAdded', (d) => this.onPartAdded(d));
    this.model.addObserver('PartRemoved', (d) => this.onPartRemoved(d));
    this.model.addObserver('Translated', (d) => this.onTranslated(d));
    this.model.addObserver('Rotated', (d) => this.onRotated(d));
    this.model.addObserver('ColorChanged', (d) => this.onColorChanged(d));
  }

  onPartAdded(data) {
    // Aim: retrieve the THREEjs slot container matching with the target slot, and create the new mediator there.

    // 1. Look for every THREEjs slot container. Slot containers may appear at any level.
    var slotCandidates = [];
    this.object3D.traverse((child) => {
      if (child.userData.x3dType === 'Slot' && child.userData.slotName === data.slotName) {
        var level = 0;
        var parent = child;
        while (parent && parent !== this.object3D) {
          level++;
          parent = parent.parent;
        }
        if (parent)
          slotCandidates.push({ level: level, slot: child });
      }
    });
    if (slotCandidates.length <= 0)
      return;

    // 2. Sort slots, by level, to be sure the new part will be added to the right slot.
    slotCandidates.sort(function(a, b) {
      return a.level - b.level;
    });

    // 3. Actually add the part to the found slot container.
    this.childrenSlots[data.slotName] = slotCandidates[0].slot;

    // 4. Create the part mediator.
    var mediator = new PartMediator(data.part);
    this.childrenSlots[data.slotName].add(mediator.object3D);
    this.childrenMediators[data.slotName] = mediator;
  }

  onPartRemoved(data) {
    this.childrenSlots[data.slotName].remove(this.childrenMediators[data.slotName].object3D);
    delete this.childrenSlots[data.slotName];
    delete this.childrenMediators[data.slotName];
  }

  onTranslated(data) {
    var translation = new THREE.Vector3(
      data.translation[0],
      data.translation[1],
      data.translation[2]
    );
    this.object3D.position.copy(translation);
    this.object3D.updateMatrix();
  }

  onRotated(data) {
    var quaternion = new THREE.Quaternion(
      data.quaternion[0],
      data.quaternion[1],
      data.quaternion[2],
      data.quaternion[3]
    );
    this.object3D.quaternion.copy(quaternion);
    this.object3D.updateMatrix();
  }

  onColorChanged(data) {
    // TODO: color should not be hardcoded here.
    this.object3D.children[0].traverse((child) => {
      if (child.isMesh) {
        if (data.color === 'yellow')
          child.material.color = new THREE.Color('rgb(100%, 60%, 0%)');
        else if (data.color === 'blue')
          child.material.color = new THREE.Color('rgb(0%, 45%, 100%)');
      }
    });
  }

  makeObject3D() {
    var container = new THREE.Object3D();

    var model = '/robot-designer/assets/models/' + this.model.name + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, (object3d) => {
      if (container) {
        object3d.userData.isPartRoot = true;
        container.add(object3d);
        this.createSlots();
      }
    });

    return container;
  }

  createSlots() {
    Object.keys(this.model.asset.slots).forEach((slotName) => {
      var slot = this.model.asset.slots[slotName];

      var object = new THREE.Object3D();
      object.userData.x3dType = 'Slot';
      object.userData.slotType = slot.type;
      object.userData.slotName = slotName;

      var position = convertStringToVec3(slot.translation ? slot.translation : '0 0 0');
      object.position.copy(position);
      var quaternion = convertStringToQuaternion(slot.rotation ? slot.rotation : '0 1 0 0');
      object.quaternion.copy(quaternion);

      this.object3D.children[0].add(object);
    });
  }
}
