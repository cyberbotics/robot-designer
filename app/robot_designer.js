/* global RobotViewer, Robot, Dragger, RobotMediator, RobotController, PartBrowser, PartViewer, AssetLibrary, Commands */
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
    this.robotViewerElement = document.getElementsByName('robotViewer')[0];
    if (typeof this.robotViewerElement === 'undefined') {
      console.error('The Robot Designer cannot find its 3D component.');
      return;
    }
    this.assetLibraryElement = document.getElementsByName('assets-library-component')[0];
    if (typeof this.assetLibraryElement === 'undefined') {
      console.error('The Robot Designer cannot find its asset library component.');
      return;
    }
    this.partViewerElement = document.getElementsByName('part-viewer')[0];
    if (typeof this.partViewerElement === 'undefined') {
      console.error('The Robot Designer cannot find its part viewer component.');
      return;
    }

    this.assetLibrary = new AssetLibrary();
    this.partBrowser = new PartBrowser(this.assetLibraryElement, this.assetLibrary);
    this.assetLibrary.addObserver('loaded', () => { this.partBrowser.loadAssets(); });

    this.commands = new Commands();
    this.commands.addObserver('updated', () => this.updateUndoRedoButtons());
    this.commands.addObserver('updated', () => this.partBrowser.update(this.robot));

    this.robot = new Robot();
    this.robotMediator = new RobotMediator(this.robot);
    this.robotController = new RobotController(this.assetLibrary, this.commands, this.robot);

    this.robotViewer = new RobotViewer(this.robotViewerElement, this.robotController, this.commands);
    this.robotViewer.scene.add(this.robotMediator.rootObject);
    this.highlightOutlinePass = this.robotViewer.highlightOutlinePass;

    this.dragger = new Dragger(this.robotViewer, this.robotController);

    this.partViewer = new PartViewer(this.robotController, this.partViewerElement, this.robotViewer.selector);
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

function openExportModal() { // eslint-disable-line no-unused-vars
  var modal = document.getElementById('nrp-robot-designer-modal-window');
  modal.style.display = 'block';

  var span = document.getElementsByClassName('modal-close-button')[0];
  span.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target === modal)
      modal.style.display = 'none';
  };
}

function exportToFile(format) { // eslint-disable-line no-unused-vars
  var mimeType = '';
  var data = '';
  var filename = '';

  if (format === 'json') {
    mimeType = 'text/json';
    data = JSON.stringify(designer.robot.serialize(), null, 2);
    filename = 'robot.json';
  } else if (format === 'webots') {
    mimeType = 'text/txt';
    data = designer.robot.webotsExport();
    filename = 'robot.wbt';
  } else {
    console.assert(false); // Invalid format.
    return;
  }

  var blob = new Blob([data], {type: mimeType});
  var e = document.createEvent('MouseEvents');
  var a = document.createElement('a');
  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = [mimeType, a.download, a.href].join(':');
  e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
  a.dispatchEvent(e);
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

  if (mode === 'select')
    designer.selectButton.classList.add('fa-selected');
  else if (mode === 'translate')
    designer.translateButton.classList.add('fa-selected');
  else if (mode === 'rotate')
    designer.rotateButton.classList.add('fa-selected');

  designer.robotViewer.handle.setMode(mode);
}

function mousedown(ev) { // eslint-disable-line no-unused-vars
  var relativePosition = designer.robotViewer.convertMouseEventPositionToRelativePosition(ev.clientX, ev.clientY);
  var screenPosition = designer.robotViewer.convertMouseEventPositionToScreenPosition(ev.clientX, ev.clientY);
  var part = designer.robotViewer.getPartAt(relativePosition, screenPosition);
  if (part) {
    designer.robotViewer.selector.selectPart(part);
    designer.robotViewer.handle.attachToObject(part);
  }
}

function deleteSelectedPart() { // eslint-disable-line no-unused-vars
  var mesh = designer.robotViewer.selector.selectedPart;

  if (mesh) {
    var parent = mesh;
    do {
      if (parent.userData.isPartContainer) {
        designer.robotController.removePart(parent.mediator.model);
        break;
      }
      parent = parent.parent;
    } while (parent);
  }

  designer.robotViewer.clearSelection();
}

function mouseMove(ev) { // eslint-disable-line no-unused-vars
  var relativePosition = designer.robotViewer.convertMouseEventPositionToRelativePosition(ev.clientX, ev.clientY);
  var screenPosition = designer.robotViewer.convertMouseEventPositionToScreenPosition(ev.clientX, ev.clientY);
  var part = designer.robotViewer.getPartAt(relativePosition, screenPosition);
  if (part)
    designer.robotViewer.highlightor.highlight(part);
  else
    designer.robotViewer.highlightor.clearHighlight();
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
