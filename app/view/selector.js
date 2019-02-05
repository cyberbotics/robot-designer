/* global Observable */
'use strict';

class Selector extends Observable { // eslint-disable-line no-unused-vars
  constructor(outlinePass) {
    super();
    this.outlinePass = outlinePass;
    this.selectedPart = null;
  }

  selectPart(part) {
    this.selectedPart = part;
    var selectedObjects = [];
    part.children[0].children.forEach((child) => {
      if (child.userData.x3dType === 'Shape' || child.userData.x3dType === 'Transform')
        selectedObjects.push(child);
    });
    this.outlinePass.selectedObjects = selectedObjects;
    this.notify('SelectionChanged', {'part': this.selectedPart});
  }

  clearSelection() {
    this.selectedPart = null;
    this.outlinePass.selectedObjects = [];
    this.notify('SelectionChanged', {'part': null});
  }
}
