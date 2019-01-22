/* global Observable */
'use strict';

class Part extends Observable { // eslint-disable-line no-unused-vars
  constructor(asset) {
    super();
    this.name = asset.name;

    // init empty slots from the asset.
    this.slots = {};
    asset.getSlotNames().forEach((name) => {
      this.slots[name] = null;
    });
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
    o.slots = {};
    for (let slot in this.slots) {
      if (this.slots[slot])
        o.slots[slot] = this.slots[slot].serialize();
    }
    return o;
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
