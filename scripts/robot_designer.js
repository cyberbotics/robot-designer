/* global View3D, Robot, Dragger, RobotMediator, RobotController */

class RobotDesigner {
  constructor(part) {
    this.part = part;
    if (typeof this.part === 'undefined') {
      console.error('The Robot Designer is initialized on an undefined part.');
      return;
    }

    this.view3DElement = document.getElementsByName('view3D')[0];
    if (typeof this.view3DElement === 'undefined') {
      console.error('The Robot Designer cannot find its 3D view.');
      return;
    }

    this.view3D = new View3D(this.view3DElement);
    this.highlightOutlinePass = this.view3D.highlightOutlinePass;

    this.robot = new Robot();
    this.robotMediator = new RobotMediator(this.robot);
    this.view3D.scene.add(this.robotMediator.object3D);
    this.robotController = new RobotController(this.robot);

    this.dragger = new Dragger(this.view3D, this.robotController);
  }
}

var designer = new RobotDesigner(document.getElementById('nrp-robot-designer')); // eslint-disable-line no-new

function save() { // eslint-disable-line no-unused-vars
  // TODO: for now, only shows the internal robot structure in the alert dialog box.
  alert(JSON.stringify(designer.robot.serialize(), null, 2));
}

function mousedown(ev) { // eslint-disable-line no-unused-vars
  var screenPosition = designer.view3D.convertMouseEventPositionToScreenPosition(ev.clientX, ev.clientY);
  var part = designer.view3D.getPartAt(screenPosition);
  if (part)
    designer.view3D.selector.toggleSelection(part);
  else
    designer.view3D.selector.clearSelection();
}

function deleteSelectedPart() { // eslint-disable-line no-unused-vars
  for (var s = 0; s < designer.view3D.selector.selectedParts.length; s++) {
    var mesh = designer.view3D.selector.selectedParts[s];
    var part = mesh.parent.parent.mediator.model; // hum
    part.parent.removePart(part);
  }
  designer.view3D.selector.clearSelection();
}

function mouseMove(ev) { // eslint-disable-line no-unused-vars
  var screenPosition = designer.view3D.convertMouseEventPositionToScreenPosition(ev.clientX, ev.clientY);
  var part = designer.view3D.getPartAt(screenPosition);
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
  ev.dataTransfer.setData('text', part); // Cannot be used on Chrome. Cannot be dropped on Firefox.

  // https://stackoverflow.com/a/40923520/2210777
  var img = document.createElement('img');
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  ev.dataTransfer.setDragImage(img, 0, 0);

  designer.dragger.dragStart(part);
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
