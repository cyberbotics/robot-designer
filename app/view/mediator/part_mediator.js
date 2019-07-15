/* global THREE, convertStringToVec3, convertStringToQuaternion */
'use strict';

class PartMediator { // eslint-disable-line no-unused-vars
  constructor(part) {
    this.model = part;
    this.pathPrefix = '/robot-designer/assets/models/';
    if (typeof PartMediator.pathPrefix !== 'undefined')
      this.pathPrefix = PartMediator.pathPrefix + this.pathPrefix;

    // Create the root container.
    this.rootObject = new THREE.Object3D(); // The THREEjs container (contains the slots container and the part representation.)
    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this;
    this.rootObject.userData.isPartContainer = true;

    // Create the representation (async load).
    var model = this.pathPrefix + this.model.name + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, (object3dList) => {
      if (!Array.isArray(object3dList) || object3dList.length === 0)
        return;
      this.representation = object3dList[0]; // The THREEjs representation of the part.
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
      this.childrenSlots[slotName] = object;
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
    // Create the new part mediator, attach its root parts to this slot.
    var mediator = new PartMediator(data.part);
    this.childrenSlots[data.slotName].add(mediator.rootObject);
  }

  onPartRemoved(data) {
    // Remove the child part containers.
    // The slot container should contain only one part container and eventually the handle target.
    for (let c = this.childrenSlots[data.slotName].children.length - 1; c >= 0; c--) { // technique to loop through array while removing array items.
      var child = this.childrenSlots[data.slotName].children[c];
      if (child.userData.isPartContainer)
        child.parent.remove(child);
      else
        console.assert(child.userData.isHandleTarget);
    }
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
