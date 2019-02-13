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

  webotsExport() {
    var s = '';
    s += '#VRML_SIM R2019a utf8\n';
    s += 'WorldInfo {\n';
    s += '  basicTimeStep 8\n';
    s += '}\n';
    s += 'Viewpoint {\n';
    s += '  orientation -0.02 -0.96 -0.27 3.0\n';
    s += '  position -0.07 0.43 -0.7\n';
    s += '  follow "Tinkerbots"\n';
    s += '}\n';
    s += 'TexturedBackground {\n';
    s += '  texture "empty_office"\n';
    s += '}\n';
    s += 'TexturedBackgroundLight {\n';
    s += '  texture "empty_office"\n';
    s += '}\n';
    s += 'Floor {\n';
    s += '  size 1000 1000\n';
    s += '}\n';
    if (this.rootPart)
      s += this.rootPart.webotsExport();
    return s;
  }

  getAvailableSlotTypes() {
    if (this.rootPart === null)
      return [];
    var availableSlotTypes = this.rootPart.getAvailableSlotTypes();
    availableSlotTypes = availableSlotTypes.filter((v, i, a) => a.indexOf(v) === i); // unique
    return availableSlotTypes;
  }
}
