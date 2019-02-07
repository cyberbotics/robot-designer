/* global Observable */
'use strict';

class Part extends Observable { // eslint-disable-line no-unused-vars
  constructor(asset) {
    super();
    this.asset = asset;
    this.name = asset.name;
    this.translation = [0.0, 0.0, 0.0];
    this.quaternion = [0.0, 0.0, 0.0, 1.0];

    this.slots = {};
    asset.getSlotNames().forEach((name) => {
      this.slots[name] = null;
    });
  }

  translate(translation) {
    this.translation = translation;
    this.notify('Translated', {'translation': translation});
  }

  rotate(quaternion) {
    this.quaternion = quaternion;
    this.notify('Rotated', {'quaternion': quaternion});
  }

  addPart(slotName, part) {
    console.assert(!this.slots[slotName]);
    part.parent = this;
    this.slots[slotName] = part;
    this.notify('PartAdded', { 'part': part, 'slotName': slotName });

    // Notify the creation of the subparts if any.
    // `part` may contain subparts when redo multiple parts at the same time.
    // This notification is required to create the mediators of the sub parts,
    // and so actually create the THREEjs meshes and attach them correctly.
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

  changeColor(color) {
    this.color = color;
    this.notify('ColorChanged', {'color': color});
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
    if (this.translation[0] !== 0.0 || this.translation[1] !== 0.0 || this.translation[2] !== 0.0)
      o.translation = this.translation;
    if (this.quaternion[0] !== 0.0 || this.quaternion[1] !== 0.0 || this.quaternion[2] !== 0.0 || this.quaternion[3] !== 1.0)
      o.quaternion = this.quaternion;
    if (typeof this.color !== 'undefined')
      o.color = this.color;
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
