/* global Observable */
'use strict';

class Robot extends Observable { // eslint-disable-line no-unused-vars
  constructor() {
    super();
    this.rootPart = null;
  }

  hasRootPart() {
    return this.rootPart !== null;
  }

  addRootPart(part) {
    part.parent = this;
    this.rootPart = part;
    this.notify('RootPartAdded', part);
  }

  removePart() {
    this.rootPart = null;
    this.notify('RootPartRemoved');
  }

  serialize() {
    var o = {};
    if (this.rootPart)
      o.rootPart = this.rootPart.serialize();
    return o;
  }

  getAvailableSlotTypes() {
    if (this.rootPart === null)
      return [];
    var availableSlotTypes = this.rootPart.getAvailableSlotTypes();
    availableSlotTypes = availableSlotTypes.filter((v, i, a) => a.indexOf(v) === i); // unique
    return availableSlotTypes;
  }
}
