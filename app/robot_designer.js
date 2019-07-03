/* global RobotViewer, Robot, Dragger, RobotMediator, RobotController, PartBrowser, PartViewer, AssetLibrary, Commands, MouseEvents */
'use strict';

class RobotDesigner { // eslint-disable-line no-unused-vars
  constructor(domElement, showHeader) {
    this._createDomElements(domElement);

    this.assetLibrary = new AssetLibrary();
    this.partBrowser = new PartBrowser(this.assetLibraryElement, this.assetLibrary, (event) => { this.dragStart(event); });
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

  // events

  openExportModal() { // eslint-disable-line no-unused-vars
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

  exportToFile(format) { // eslint-disable-line no-unused-vars
    var mimeType = '';
    var data = '';
    var filename = '';

    if (format === 'json') {
      mimeType = 'text/json';
      data = JSON.stringify(this.robot.serialize(), null, 2);
      filename = 'robot.json';
    } else if (format === 'webots') {
      mimeType = 'text/txt';
      data = this.robot.webotsExport();
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

  undo() { // eslint-disable-line no-unused-vars
    this.commands.undo();
  }

  redo() { // eslint-disable-line no-unused-vars
    this.commands.redo();
  }

  changeMode(mode) { // eslint-disable-line no-unused-vars
    this.selectButton.classList.remove('fa-selected');
    this.translateButton.classList.remove('fa-selected');
    this.rotateButton.classList.remove('fa-selected');

    if (mode === 'select')
      this.selectButton.classList.add('fa-selected');
    else if (mode === 'translate')
      this.translateButton.classList.add('fa-selected');
    else if (mode === 'rotate')
      this.rotateButton.classList.add('fa-selected');

    this.robotViewer.handle.setMode(mode);
  }

  mouseDown(ev) { // eslint-disable-line no-unused-vars
    var domElement = this.robotViewer.robotViewerElement;
    var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(domElement, ev.clientX, ev.clientY);
    var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, ev.clientX, ev.clientY);
    // get picked part that will be selected on mouseUp if the mouse doesn't move
    this.partToBeSelected = this.robotViewer.getPartAt(relativePosition, screenPosition);
    this.mouseDownPosition = {x: ev.clientX, y: ev.clientY };
  }

  mouseUp(ev) { // eslint-disable-line no-unused-vars
    if (typeof this.partToBeSelected === 'undefined' || typeof this.mouseDownPosition === 'undefined')
      return;

    // compute Manhattan length
    let length = Math.abs(this.mouseDownPosition.x - ev.clientX) + Math.abs(this.mouseDownPosition.y - ev.clientY);
    if (length < 20) { // the mouse was moved by less than 20 pixels (determined empirically)
      // select part
      this.robotViewer.selector.selectPart(this.partToBeSelected);
      this.robotViewer.handle.attachToObject(this.partToBeSelected);
    }

    this.partToBeSelected = undefined;
    this.mouseDownPosition = undefined;
  }

  deleteSelectedPart() { // eslint-disable-line no-unused-vars
    var mesh = this.robotViewer.selector.selectedPart;

    if (mesh) {
      var parent = mesh;
      do {
        if (parent.userData.isPartContainer) {
          this.robotController.removePart(parent.mediator.model);
          break;
        }
        parent = parent.parent;
      } while (parent);
    }

    this.robotViewer.clearSelection();
  }

  mouseMove(ev) { // eslint-disable-line no-unused-vars
    if (this.robotViewer.handle.isDragging())
      return;

    var domElement = this.robotViewer.robotViewerElement;
    var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(domElement, ev.clientX, ev.clientY);
    var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, ev.clientX, ev.clientY);
    var part = this.robotViewer.getPartAt(relativePosition, screenPosition);
    if (part)
      this.robotViewer.highlightor.highlight(part);
    else
      this.robotViewer.highlightor.clearHighlight();
  }

  drop(ev) { // eslint-disable-line no-unused-vars
    ev.preventDefault();

    this.dragger.drop(ev.clientX, ev.clientY);
  }

  dragStart(ev) { // eslint-disable-line no-unused-vars
    var part = ev.target.getAttribute('part');
    var slotType = ev.target.getAttribute('slotType');
    ev.dataTransfer.setData('text', part); // Cannot be used on Chrome. Cannot be dropped on Firefox.

    // https://stackoverflow.com/a/40923520/2210777
    var img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    ev.dataTransfer.setDragImage(img, 0, 0);

    this.dragger.dragStart(part, slotType);
  }

  dragOver(ev) { // eslint-disable-line no-unused-vars
    ev.preventDefault();
    ev.dataTransfer.getData('text'); // Cannot be used on Chrome. Cannot be dropped on Firefox.

    this.dragger.dragOver(ev.clientX, ev.clientY);
  }

  dragLeave(ev) { // eslint-disable-line no-unused-vars
    this.dragger.dragLeave();
  }

  dragEnter(ev) { // eslint-disable-line no-unused-vars
    this.dragger.dragEnter();
  }

  // DOM setup
  _createDomElements(domElement, showHeader) {
    this.part = document.createElement('div');
    this.part.classList.add('nrp-robot-designer');
    this.part.id = 'nrp-robot-designer';
    if (typeof domElement === 'undefined')
      document.body.appendChild(this.part);
    else
      domElement.appendChild(this.part);

    if (showHeader) {
      let header = document.createElement('div');
      header.classList.add('header');
      header.innerHTML = `<span>NRP Robot Designer</span>
        <i class="fas fa-robot"></i>'
        <span class="menu-item">File</span>
        <span class="menu-item">Help</span>`;
      this.part.appendChild(header);
    }

    this.toolbar = document.createElement('div');
    this.toolbar.classList.add('menu');
    this.toolbar.innerHTML = `
      <i class="fas fa-file-export" onclick="openExportModal()"></i>
      <span>-</span>
      <i id="nrp-robot-designer-undo-button" class="fas fa-undo fa-disabled"></i>
      <i id="nrp-robot-designer-redo-button" class="fas fa-redo fa-disabled"></i>
      <span>-</span>
      <i id="nrp-robot-designer-select-button" class="fas fa-selected fa-mouse-pointer"></i>
      <i id="nrp-robot-designer-translate-button" class="fas fa-arrows-alt"></i>
      <i id="nrp-robot-designer-rotate-button" class="fas fa-sync-alt"></i>
      <span>-</span>
      <i id="nrp-robot-designer-delete-button" class="fas fa-trash-alt"></i>
      <span>-</span>
      <i id="nrp-robot-designer-maximize-button" class="fas fa-window-maximize"></i>`;
    this.part.appendChild(this.toolbar);

    this.undoButton = document.getElementById('nrp-robot-designer-undo-button');
    this.undoButton.addEventListener('click', () => { this.undo(); });
    this.redoButton = document.getElementById('nrp-robot-designer-redo-button');
    this.redoButton.addEventListener('click', () => { this.redo(); });
    this.translateButton = document.getElementById('nrp-robot-designer-translate-button');
    this.translateButton.addEventListener('click', () => { this.changeMode('translate'); });
    this.rotateButton = document.getElementById('nrp-robot-designer-rotate-button');
    this.rotateButton.addEventListener('click', () => { this.changeMode('rotate'); });
    var selectButton = document.getElementById('nrp-robot-designer-select-button');
    selectButton.addEventListener('click', () => { this.changeMode('select'); });
    var deleteButton = document.getElementById('nrp-robot-designer-delete-button');
    deleteButton.addEventListener('click', () => { this.this.deleteSelectedPart(); });
    var maximizeButton = document.getElementById('nrp-robot-designer-maximize-button');
    maximizeButton.addEventListener('click', () => { this.toggleFullScreen(); });

    this.assetLibraryElement = document.createElement('div');
    this.assetLibraryElement.classList.add('part-browser');
    this.assetLibraryElement.classList.add('designer-group');
    this.part.appendChild(this.assetLibraryElement);

    var partViewerContainer = document.createElement('div');
    partViewerContainer.classList.add('part-viewer');
    partViewerContainer.classList.add('designer-group');
    partViewerContainer.innerHTML = `<p class="designer-group-title">Part viewer</p>`;
    this.partViewerElement = document.createElement('div');
    partViewerContainer.appendChild(this.partViewerElement);
    this.part.appendChild(partViewerContainer);

    this.robotViewerElement = document.createElement('div');
    this.robotViewerElement.classList.add('main');
    this.robotViewerElement.addEventListener('drop', (event) => { this.drop(event); });
    this.robotViewerElement.addEventListener('dragenter', (event) => { this.dragEnter(event); });
    this.robotViewerElement.addEventListener('dragover', (event) => { this.dragOver(event); });
    this.robotViewerElement.addEventListener('dragleave', (event) => { this.dragLeave(event); });
    this.robotViewerElement.addEventListener('mousemove', (event) => { this.mouseMove(event); });
    this.robotViewerElement.addEventListener('mousedown', (event) => { this.mouseDown(event); });
    this.robotViewerElement.addEventListener('mouseup', (event) => { this.mouseUp(event); });
    this.part.appendChild(this.robotViewerElement);

    // export modal window
    var modalWindow = document.createElement('div');
    modalWindow.id = 'nrp-robot-designer-modal-window';
    modalWindow.classList.add('modal');
    modalWindow.innerHTML =
    `<div id="nrp-robot-designer-modal-window" class="modal">
       <div class="modal-content">
         <span class="modal-close-button">&times;</span>
         <div class="modal-grid">
           <button type="button" id="nrp-robot-designer-json-export-button"  class="nrp-button">Export to JSON</button>
           <button type="button" id="nrp-robot-designer-webots-export-button" class="nrp-button">Export to Webots</button>
           <button type="button" id="nrp-robot-designer-nrp-export-button" class="nrp-button nrp-button-disabled">Export to NRP</button>
         </div>
       </div>
     </div>`;
    this.part.appendChild(modalWindow);

    var jsonExportButton = document.getElementById('nrp-robot-designer-json-export-button');
    jsonExportButton.addEventListener('click', () => { this.exportToFile('json'); });
    var webotsExportButton = document.getElementById('nrp-robot-designer-webots-export-button');
    webotsExportButton.addEventListener('click', () => { this.exportToFile('webots'); });
    var nrpExportButton = document.getElementById('nrp-robot-designer-nrp-export-button');
    nrpExportButton.addEventListener('click', () => { alert('Coming soon...'); });
  }
}
