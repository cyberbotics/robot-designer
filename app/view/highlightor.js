'use strict';

class Highlightor { // eslint-disable-line no-unused-vars
  constructor(outlinePass) {
    this.outlinePass = outlinePass;
  }

  highlight(part) {
    var selectedRepresentations = [];
    part.children.forEach((child) => {
      if (child.userData.isRepresentation)
        selectedRepresentations.push(child);
    });
    if (selectedRepresentations.length > 0)
      this.outlinePass.selectedObjects = selectedRepresentations;
  }

  clearHighlight() {
    this.outlinePass.selectedObjects = [];
  }
}
