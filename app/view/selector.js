/* global Observable */
'use strict';

class Selector extends Observable { // eslint-disable-line no-unused-vars
  constructor(outlinePass) {
    super();
    this.outlinePass = outlinePass;
    this.selectedPart = null;
  }

  selectPart(part) {
    var selectedRepresentations = [];
    part.children.forEach((child) => {
      if (child.userData.isRepresentation)
        selectedRepresentations.push(child);
    });
    if (selectedRepresentations.length > 0) {
      this.selectedPart = part;
      this.outlinePass.selectedObjects = selectedRepresentations;
      this.notify('SelectionChanged', {'part': this.selectedPart});
    }
  }

  clearSelection() {
    this.selectedPart = null;
    this.outlinePass.selectedObjects = [];
    this.notify('SelectionChanged', {'part': null});
  }
}
