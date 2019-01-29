'use strict';

class Highlightor { // eslint-disable-line no-unused-vars
  constructor(outlinePass) {
    this.outlinePass = outlinePass;
  }

  highlight(part) {
    var selectedObjects = [];
    part.children[0].children.forEach((child) => {
      console.log(child.userData);
      if (child.userData.x3dType === 'Shape' || child.userData.x3dType === 'Transform')
        selectedObjects.push(child);
    });
    this.outlinePass.selectedObjects = selectedObjects;
  }

  clearHighlight() {
    this.outlinePass.selectedObjects = [];
  }
}
