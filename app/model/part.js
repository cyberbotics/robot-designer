/* global Observable, THREE */
'use strict';

class Part extends Observable { // eslint-disable-line no-unused-vars
  constructor(asset) {
    super();
    this.asset = asset;
    this.name = asset.name;
    this.translation = new THREE.Vector3();

    // init empty slots from the asset.
    this.slots = {};
    asset.getSlotNames().forEach((name) => {
      this.slots[name] = null;
    });
  }

  translate(translation) {
    this.translation = translation;
    this.notify('Translated', {'translation': translation});
  }

  addPart(slotName, part) {
    part.parent = this;
    // TODO: remove previous slot first?
    this.slots[slotName] = part;
    this.notify('PartAdded', { 'part': part, 'slotName': slotName });

    // notify the creation of the subparts is any.
    for (let subSlotName in part.slots) {
      var slot = part.slots[subSlotName];
      if (slot) {
        slot._applyFooRecursively(function(child) {
          child.parent.notify('PartAdded', { 'part': child, 'slotName': child.parent.slotName(child) });
        });
      }
    }
  }

  removePart(part) {
    for (let slotName in this.slots) {
      if (this.slots[slotName] === part) {
        this.slots[slotName] = null;
        this.notify('PartRemoved', { 'part': part, 'slotName': slotName });
      }
    }
  }

  slotName(part) {
    for (let slotName in this.slots) {
      if (this.slots[slotName] === part)
        return slotName;
    }
  }

  serialize() {
    var o = {};
    o.modelName = this.name;
    o.translation = this.translation;
    o.slots = {};
    for (let slotName in this.slots) {
      if (this.slots[slotName])
        o.slots[slotName] = this.slots[slotName].serialize();
    }
    return o;
  }

  getAvailableSlotTypes() {
    var availableSlotTypes = [];
    for (let slotName in this.slots) {
      if (this.slots[slotName] === null)
        availableSlotTypes.push(this.asset.slots[slotName].type);
      else
        availableSlotTypes = availableSlotTypes.concat(this.slots[slotName].getAvailableSlotTypes());
    }
    return availableSlotTypes;
  }

  _applyFooRecursively(foo) {
    foo(this);
    for (let slotName in this.slots) {
      var slot = this.slots[slotName];
      if (slot)
        slot._applyFooRecursively(foo);
    }
  }
}
