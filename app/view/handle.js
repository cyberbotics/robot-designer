/* global THREE, Part, Robot */

class Handle { // eslint-disable-line no-unused-vars
  constructor(robotController, domElement, camera, scene, orbitControls) {
    this.robotController = robotController;
    this.scene = scene;
    this.mode = 'select';
    this.part = null;

    this.control = new THREE.TransformControls(camera, domElement);
    this.control.isTransformControls = true; // To be detected correctly by OutlinePass.
    this.control.visible = false;
    this.control.enabled = false;
    this.control.setSpace('local');
    this.control.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    this.control.addEventListener('change', (event) => {
      if (!this.target)
        return;
      if (this.part && this.mode === 'translate') {
        var position = this.target.position;
        this.robotController.translatePart(this.part, position);
      }
      if (this.part && this.mode === 'rotate') {
        var quaternion = this.target.quaternion;
        this.robotController.rotatePart(this.part, quaternion);
      }
    });
  }

  attachToObject(object) {
    this.detach();

    this.part = object.mediator.model;
    this.part.addObserver('Translated', (d) => {
      this._updateTargetPosition();
    });
    this.part.addObserver('Rotated', (d) => {
      this._updateTargetPosition();
    });

    this.target = new THREE.Object3D();
    this.target.userData.isHandleTarget = true;
    this._updateTargetPosition();

    object.parent.add(this.target);
    this.control.attach(this.target);
    this.setMode(this.mode); // update visibility.

    // Uncomment to visualize the target:
    // var geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    // var material = new THREE.MeshBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0.5});
    // var cube = new THREE.Mesh(geometry, material);
    // this.target.add(cube);
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'select') {
      this.control.visible = false;
      this.control.enabled = false;
    } else if (mode === 'translate') {
      this.control.visible = true;
      this.control.enabled = true;
      this.control.setMode('translate');
    } else if (mode === 'rotate') {
      this.control.visible = true;
      this.control.enabled = true;
      this.control.setMode('rotate');
    }
    this._updateConstraints();
  }

  detach() {
    this.control.detach();
    if (this.target) {
      this.target.parent.remove(this.target);
      this.target = null;
    }
    this.part = null;
  }

  showHandle() {
    this.scene.add(this.control);
  }

  hideHandle() {
    this.scene.remove(this.control);
  }

  isDragging() {
    return this.control.dragging;
  }

  _updateTargetPosition() {
    if (!this.target)
      return;

    this.target.position.copy(new THREE.Vector3(
      this.part.translation[0],
      this.part.translation[1],
      this.part.translation[2]
    ));
    this.target.quaternion.copy(new THREE.Quaternion(
      this.part.quaternion[0],
      this.part.quaternion[1],
      this.part.quaternion[2],
      this.part.quaternion[3]
    ));
    this.target.updateMatrix();
  }

  _updateConstraints() {
    if (!this.part)
      return;

    var parentPart = this.part.parent;
    console.assert(parentPart);

    if (this.mode !== 'select') {
      if (parentPart instanceof Robot) {
        this.control.rotationSnap = null;
        this.control.translationSnap = null;
        this.control.showX = true;
        this.control.showY = true;
        this.control.showZ = true;
        return;
      }

      if (parentPart instanceof Part) {
        var slotName = parentPart.slotName(this.part);
        if (slotName) {
          var slotData = parentPart.asset.slots[slotName];
          this.control.rotationSnap = slotData.rotationSnap === -1 ? null : slotData.rotationSnap;
          this.control.translationSnap = slotData.translationSnap === -1 ? null : slotData.translationSnap;
          if (this.mode === 'rotate') {
            if (this.control.rotationSnap === 0) {
              this.control.showX = false;
              this.control.showY = false;
              this.control.showZ = false;
            } else if (slotData.rotationGizmoVisibility === undefined) {
              this.control.showX = true;
              this.control.showY = true;
              this.control.showZ = true;
            } else {
              this.control.showX = slotData.rotationGizmoVisibility[0];
              this.control.showY = slotData.rotationGizmoVisibility[1];
              this.control.showZ = slotData.rotationGizmoVisibility[2];
            }
            return;
          } else if (this.mode === 'translate') {
            if (this.control.translationSnap === 0) {
              this.control.showX = false;
              this.control.showY = false;
              this.control.showZ = false;
            } else if (slotData.translationHandleVisibility === undefined) {
              this.control.showX = true;
              this.control.showY = true;
              this.control.showZ = true;
            } else {
              this.control.showX = slotData.translationHandleVisibility[0];
              this.control.showY = slotData.translationHandleVisibility[1];
              this.control.showZ = slotData.translationHandleVisibility[2];
            }
            return;
          }
        }
      }
    }

    // select mode or invalid structure.
    this.control.rotationSnap = null;
    this.control.translationSnap = null;
    this.control.showX = false;
    this.control.showY = false;
    this.control.showZ = false;
  }
}
