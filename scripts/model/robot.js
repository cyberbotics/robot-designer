/* global Observable */

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
}
