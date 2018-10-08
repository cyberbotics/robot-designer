class Highlightor { // eslint-disable-line no-unused-vars
  constructor(outlinePass) {
    this.outlinePass = outlinePass;
  }

  highlight(part) {
    this.outlinePass.selectedObjects = [ part ];
  }

  clearHighlight() {
    this.outlinePass.selectedObjects = [];
  }
}
