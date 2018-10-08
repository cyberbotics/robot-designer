/* global Observable */

class Part extends Observable { // eslint-disable-line no-unused-vars
  constructor(modelName) {
    super();
    this.modelName = modelName;
    this.slots = {};
  }

  addPart(slotName, part) {
    part.parent = this;
    // TODO: remove previous slot first?
    this.slots[slotName] = part;
    this.notify('PartAdded', { 'part': part, 'slotName': slotName });
  }

  removePart(part) {
    for (var slot in this.slots) {
      delete this.slots[slot];
      this.notify('PartRemoved', { 'part': part, 'slotName': slot });
    }
  }

  serialize() {
    var o = {};
    o.modelName = this.modelName;
    o.slots = {};
    for (var slot in this.slots)
      o.slots[slot] = this.slots[slot].serialize();
    return o;
  }
}
