class Selector { // eslint-disable-line no-unused-vars
  constructor(outlinePass) {
    this.outlinePass = outlinePass;
    this.selectedParts = [];
  }

  toggleSelection(object) {
    var index = this.selectedParts.indexOf(object);
    if (index > -1)
      this.selectedParts.splice(index, 1);
    else
      this.selectedParts.push(object);
    this.outlinePass.selectedObjects = this.selectedParts;
  }

  clearSelection() {
    this.selectedParts = [];
    this.outlinePass.selectedObjects = [];
  }
}
