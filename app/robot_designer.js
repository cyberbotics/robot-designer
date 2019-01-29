/* global View3D, Robot, Dragger, RobotMediator, RobotController, AssetComponent, AssetLibrary, Commands */
'use strict';

class RobotDesigner {
  constructor(part, undoButton, redoButton, selectButton, translateButton, rotateButton) {
    this.part = part;
    this.undoButton = undoButton;
    this.redoButton = redoButton;
    this.selectButton = selectButton;
    this.translateButton = translateButton;
    this.rotateButton = rotateButton;

    if (typeof part === 'undefined') {
      console.error('The Robot Designer is initialized on an undefined part.');
      return;
    }
    this.view3DElement = document.getElementsByName('view3D')[0];
    if (typeof this.view3DElement === 'undefined') {
      console.error('The Robot Designer cannot find its 3D component.');
      return;
    }
    this.assetLibraryElement = document.getElementsByName('assets-library-component')[0];
    if (typeof this.assetLibraryElement === 'undefined') {
      console.error('The Robot Designer cannot find its asset library component.');
      return;
    }

    this.assetLibrary = new AssetLibrary();
    this.assetComponent = new AssetComponent(this.assetLibraryElement, this.assetLibrary);
    this.assetLibrary.addObserver('loaded', () => { this.assetComponent.loadAssets(); });

    this.view3D = new View3D(this.view3DElement);
    this.highlightOutlinePass = this.view3D.highlightOutlinePass;

    this.commands = new Commands();
    this.commands.addObserver('updated', () => this.updateUndoRedoButtons());
    this.commands.addObserver('updated', () => this.assetComponent.update(this.robot));

    this.robot = new Robot();
    this.robotMediator = new RobotMediator(this.robot);
    this.view3D.scene.add(this.robotMediator.object3D);
    this.robotController = new RobotController(this.assetLibrary, this.commands, this.robot);

    this.dragger = new Dragger(this.view3D, this.robotController);
  }

  updateUndoRedoButtons() {
    if (this.commands.canRedo())
      this.redoButton.classList.remove('fa-disabled');
    else
      this.redoButton.classList.add('fa-disabled');
    if (this.commands.canUndo())
      this.undoButton.classList.remove('fa-disabled');
    else
      this.undoButton.classList.add('fa-disabled');
  }
}

var designer = new RobotDesigner( // eslint-disable-line no-new
  document.getElementById('nrp-robot-designer'),
  document.getElementById('nrp-robot-designer-undo-button'),
  document.getElementById('nrp-robot-designer-redo-button'),
  document.getElementById('nrp-robot-designer-select-button'),
  document.getElementById('nrp-robot-designer-translate-button'),
  document.getElementById('nrp-robot-designer-rotate-button')
);

function save() { // eslint-disable-line no-unused-vars
  // TODO: for now, only shows the internal robot structure in the alert dialog box.
  alert(JSON.stringify(designer.robot.serialize(), null, 2));
}

function undo() { // eslint-disable-line no-unused-vars
  designer.commands.undo();
}

function redo() { // eslint-disable-line no-unused-vars
  designer.commands.redo();
}

function changeMode(mode) { // eslint-disable-line no-unused-vars
  designer.selectButton.classList.remove('fa-selected');
  designer.translateButton.classList.remove('fa-selected');
  designer.rotateButton.classList.remove('fa-selected');

  if (mode === 'select') {
    designer.selectButton.classList.add('fa-selected');
    designer.view3D.handle.selectMode();
  } else if (mode === 'translate') {
    designer.translateButton.classList.add('fa-selected');
    designer.view3D.handle.translateMode();
  } else if (mode === 'rotate') {
    designer.rotateButton.classList.add('fa-selected');
    designer.view3D.handle.rotateMode();
  }
}

function mousedown(ev) { // eslint-disable-line no-unused-vars
  var relativePosition = designer.view3D.convertMouseEventPositionToRelativePosition(ev.clientX, ev.clientY);
  var screenPosition = designer.view3D.convertMouseEventPositionToScreenPosition(ev.clientX, ev.clientY);
  var part = designer.view3D.getPartAt(relativePosition, screenPosition);
  if (part) {
    designer.view3D.selector.selectPart(part);
    designer.view3D.handle.attachToObject(part);
  } else {
    designer.view3D.selector.clearSelection();
    designer.view3D.handle.detach();
  }
}

function deleteSelectedPart() { // eslint-disable-line no-unused-vars
  for (let s = 0; s < designer.view3D.selector.selectedParts.length; s++) {
    var mesh = designer.view3D.selector.selectedParts[s];

    var parent = mesh;
    do {
      if (parent.userData.isPartContainer) {
        designer.robotController.removePart(parent.mediator.model);
        break;
      }
      parent = parent.parent;
    } while (parent);
  }
  designer.view3D.selector.clearSelection();
}

function mouseMove(ev) { // eslint-disable-line no-unused-vars
  var relativePosition = designer.view3D.convertMouseEventPositionToRelativePosition(ev.clientX, ev.clientY);
  var screenPosition = designer.view3D.convertMouseEventPositionToScreenPosition(ev.clientX, ev.clientY);
  var part = designer.view3D.getPartAt(relativePosition, screenPosition);
  if (part)
    designer.view3D.highlightor.highlight(part);
  else
    designer.view3D.highlightor.clearHighlight();
}

function drop(ev) { // eslint-disable-line no-unused-vars
  ev.preventDefault();

  designer.dragger.drop(ev.clientX, ev.clientY);
}

function dragStart(ev) { // eslint-disable-line no-unused-vars
  var part = ev.target.getAttribute('part');
  var slotType = ev.target.getAttribute('slotType');
  ev.dataTransfer.setData('text', part); // Cannot be used on Chrome. Cannot be dropped on Firefox.

  // https://stackoverflow.com/a/40923520/2210777
  var img = document.createElement('img');
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  ev.dataTransfer.setDragImage(img, 0, 0);

  designer.dragger.dragStart(part, slotType);
}

function dragOver(ev) { // eslint-disable-line no-unused-vars
  ev.preventDefault();
  ev.dataTransfer.getData('text'); // Cannot be used on Chrome. Cannot be dropped on Firefox.

  designer.dragger.dragOver(ev.clientX, ev.clientY);
}

function dragLeave(ev) { // eslint-disable-line no-unused-vars
  designer.dragger.dragLeave();
}

function dragEnter(ev) { // eslint-disable-line no-unused-vars
  designer.dragger.dragEnter();
}
