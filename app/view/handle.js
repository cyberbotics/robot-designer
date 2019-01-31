/* global THREE */

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
    this._updateTargetPosition();

    object.parent.add(this.target);
    this.control.attach(this.target);
    this.setMode(this.mode); // update visibility.

    // Uncomment to visualize the target:
    // var geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    // var material = new THREE.MeshBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0.5});
    // var cube = new THREE.Mesh(geometry, material);
    // this.target.add(cube);

    // TODO: the following should be defined in assets.json (and so Webots :-/ )
    var asset = this.part.asset;
    if (asset.root) {
      this.control.rotationSnap = null;
      this.control.translationSnap = null;
      this.control.showX = true;
      this.control.showY = true;
      this.control.showZ = true;
    } else if (asset.slotType === 'tinkerbots') {
      this.control.rotationSnap = Math.PI / 2.0;
      this.control.translationSnap = null;
      if (this.mode === 'rotate') {
        this.control.showX = false;
        this.control.showY = false;
        this.control.showZ = true;
      } else {
        this.control.showX = false;
        this.control.showY = false;
        this.control.showZ = false;
      }
    } else if (asset.slotType.startsWith('lego')) {
      this.control.rotationSnap = Math.PI / 2.0;
      this.control.translationSnap = 0.02;
      if (this.mode === 'rotate') {
        this.control.showX = false;
        this.control.showY = false;
        this.control.showZ = true;
      } else {
        this.control.showX = true;
        this.control.showY = true;
        this.control.showZ = false;
      }
    } else {
      // normally unreachable.
      this.control.rotationSnap = null;
      this.control.translationSnap = null;
      this.control.showX = false;
      this.control.showY = false;
      this.control.showZ = false;
    }
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
  }

  detach() {
    this.control.detach();
    if (this.target)
      this.target.parent.remove(this.target);
  }

  showHandle() {
    this.scene.add(this.control);
  }

  hideHandle() {
    this.scene.remove(this.control);
  }

  _updateTargetPosition() {
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
}
