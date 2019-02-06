/* global THREE */
'use strict';

class PartMediator { // eslint-disable-line no-unused-vars
  constructor(part) {
    this.model = part;

    // Create the root container.
    this.rootObject = new THREE.Object3D(); // The THREEjs container (contains the slots container and the part representation.)
    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this;
    this.rootObject.userData.isPartContainer = true;

    // Create the representation (async load).
    var model = '/robot-designer/assets/models/' + this.model.name + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, (object3d) => {
      this.representation = object3d; // The THREEjs representation of the part.
      this.representation.userData.isRepresentation = true;
      this.rootObject.add(this.representation);
    });

    // Create the slot containers.
    this.childrenSlots = {};
    Object.keys(this.model.asset.slots).forEach((slotName) => {
      var slot = this.model.asset.slots[slotName];

      var object = new THREE.Object3D();
      object.userData.isSlotContainer = true;
      object.userData.slotType = slot.type;
      object.userData.slotName = slotName;

      var position = convertStringToVec3(slot.translation ? slot.translation : '0 0 0');
      object.position.copy(position);
      var quaternion = convertStringToQuaternion(slot.rotation ? slot.rotation : '0 1 0 0');
      object.quaternion.copy(quaternion);

      this.rootObject.add(object);
      this.childrenSlots[slotName] = slot;
    });

    // Link signals
    this.model.addObserver('PartAdded', (d) => this.onPartAdded(d));
    this.model.addObserver('PartRemoved', (d) => this.onPartRemoved(d));
    this.model.addObserver('Translated', (d) => this.onTranslated(d));
    this.model.addObserver('Rotated', (d) => this.onRotated(d));
    this.model.addObserver('ColorChanged', (d) => this.onColorChanged(d));

    // Apply initial parameters.
    this.onTranslated({'translation': this.model.translation});
    this.onRotated({'quaternion': this.model.quaternion});
    if (typeof this.model.color !== 'undefined')
      this.onColorChanged({'color': this.model.color});
  }

  onPartAdded(data) {
    // Aim: retrieve the THREEjs slot container matching with the target slot, and create the new mediator there.

    // 1. Look for every THREEjs slot container. Slot containers may appear at any level.
    var slotCandidates = [];
    this.rootObject.traverse((child) => {
      if (child.userData.isSlotContainer && child.userData.slotName === data.slotName) {
        var level = 0;
        var parent = child;
        while (parent && parent !== this.rootObject) {
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
    this.childrenSlots[data.slotName].add(mediator.rootObject);
  }

  onPartRemoved(data) {
    var partContainerToRemove = this.childrenSlots[data.slotName].children[0];
    console.assert(partContainerToRemove.userData.isPartContainer);
    partContainerToRemove.parent.remove(partContainerToRemove);
  }

  onTranslated(data) {
    var translation = new THREE.Vector3(
      data.translation[0],
      data.translation[1],
      data.translation[2]
    );
    this.rootObject.position.copy(translation);
    this.rootObject.updateMatrix();
  }

  onRotated(data) {
    var quaternion = new THREE.Quaternion(
      data.quaternion[0],
      data.quaternion[1],
      data.quaternion[2],
      data.quaternion[3]
    );
    this.rootObject.quaternion.copy(quaternion);
    this.rootObject.updateMatrix();
  }

  onColorChanged(data) {
    // TODO: color should not be hardcoded here.
    if (!this.representation)
      return; // TODO: this.representation may not exists a this point :-(
    this.representation.traverse((child) => {
      if (child.isMesh) {
        if (data.color === 'yellow')
          child.material.color = new THREE.Color('rgb(100%, 60%, 0%)');
        else if (data.color === 'blue')
          child.material.color = new THREE.Color('rgb(0%, 45%, 100%)');
      }
    });
  }
}
