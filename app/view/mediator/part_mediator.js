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
  }

  onPartAdded(data) {
    // 1. Look for every slots recursively.
    var that = this;
    var slotCandidates = [];
    this.object3D.children[0].traverse(function(child) {
      if (child.userData.x3dType === 'Slot' && child.userData.slotName === data.slotName) {
        var level = 0;
        var parent = child;
        while (parent && parent !== that.object3D.children[0]) {
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

    // 3. Actually add the part.
    var mediator = new PartMediator(data.part);
    this.childrenSlots[data.slotName] = slotCandidates[0].slot;
    this.childrenSlots[data.slotName].add(mediator.object3D);
    this.childrenMediators[data.slotName] = mediator;
  }

  onPartRemoved(data) {
    this.childrenSlots[data.slotName].remove(this.childrenMediators[data.slotName].object3D);
    delete this.childrenSlots[data.slotName];
    delete this.childrenMediators[data.slotName];
  }

  makeObject3D() {
    var container = new THREE.Object3D();

    var model = '/robot-designer/assets/models/' + this.model.modelName + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, function(object3d) {
      if (container) {
        object3d.userData.isPartRoot = true;
        container.add(object3d);
      }
    });

    return container;
  }
}
