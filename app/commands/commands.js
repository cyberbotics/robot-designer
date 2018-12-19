class Commands {

  constructor() {
    if (!Commands.instance) {
      Commands.instance = this;
      this.undoStack = new UndoStack(null);
    }
    return Commands.instance;
  }

  undo() {
    this.undoStack.undo();
  }

  redo() {
    this.undoStack.redo();
  }

  _pushAction(perform, data) {
    var returnedValue = perform.call(this, true, data);
    this.undoStack.push(perform, data);
    return returnedValue;
  }

  addPart(parent, slot, part) {
    this._pushAction(
      function (redo, data) {
        if (redo)
          parent.addPart(slot, part);
        else
          parent.removePart(part);
      },
      []
    );
  }

  addRootPart(robot, part) {
    this._pushAction(
      function (redo, data) {
        if (redo)
          robot.addRootPart(part);
        else
          robot.removePart();
      },
      []
    );
  }

  removePart(part) {
    var parent = part.parent;
    var slotName = parent.slotName(part);
    this._pushAction(
      function (redo, data) {
        if (redo)
          parent.removePart(part);
        else
          parent.addPart(slotName, part);
      },
      []
    );
  }
}
