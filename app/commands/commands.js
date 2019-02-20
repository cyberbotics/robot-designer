/* global Observable, UndoStack */
'use strict';

class Commands extends Observable { // eslint-disable-line no-unused-vars
  constructor() {
    super();
    this.undoStack = new UndoStack(null);
  }

  undo() {
    if (this.canUndo())
      this.undoStack.undo();
    this.notify('updated', null);
  }

  redo() {
    if (this.canRedo())
      this.undoStack.redo();
    this.notify('updated', null);
  }

  canUndo() {
    return this.undoStack.canUndo();
  }

  canRedo() {
    return this.undoStack.canRedo();
  }

  _pushAction(perform, data) {
    var returnedValue = perform.call(this, true, data);
    this.undoStack.push(perform, data);
    this.notify('updated', null);
    return returnedValue;
  }

  addPart(parent, slot, part) {
    var that = this;
    this._pushAction(
      function(redo, data) {
        if (redo)
          parent.addPart(slot, part);
        else {
          parent.removePart(part);
          that.notify('AnyPartRemoved', null);
        }
      },
      []
    );
  }

  translatePart(part, translation) {
    var previousTranslation = part.translation;
    this._pushAction(
      function(redo, data) {
        if (redo)
          part.translate(translation);
        else
          part.translate(previousTranslation);
      },
      []
    );
  }

  rotatePart(part, quaternion) {
    var previousQuaternion = part.quaternion;
    this._pushAction(
      function(redo, data) {
        if (redo)
          part.rotate(quaternion);
        else
          part.rotate(previousQuaternion);
      },
      []
    );
  }

  addRootPart(robot, part) {
    var that = this;
    this._pushAction(
      function(redo, data) {
        if (redo)
          robot.addRootPart(part);
        else {
          robot.removePart();
          that.notify('AnyPartRemoved', null);
        }
      },
      []
    );
  }

  removePart(part) {
    var that = this;
    var parent = part.parent;
    var slotName = parent.slotName(part);
    this._pushAction(
      function(redo, data) {
        if (redo) {
          parent.removePart(part);
          that.notify('AnyPartRemoved', null);
        } else
          parent.addPart(slotName, part);
      },
      []
    );
  }

  removeRootPart(robot, part) {
    var that = this;
    this._pushAction(
      function(redo, data) {
        if (redo) {
          robot.removePart();
          that.notify('AnyPartRemoved', null);
        } else
          robot.addRootPart(part);
      },
      []
    );
    this.notify('AnyPartRemoved', null);
  }

  changeColor(part, color) {
    var previousColor = part.color;
    this._pushAction(
      function(redo, data) {
        if (redo)
          part.changeColor(color);
        else
          part.changeColor(previousColor);
      },
      []
    );
  }
}
