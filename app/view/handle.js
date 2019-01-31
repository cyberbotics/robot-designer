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
      var position = this.target.position;
      if (this.part)
        this.robotController.translatePart(this.part, position);
    });
  }

  attachToObject(object) {
    this.detach();

    this.part = object.mediator.model;
    this.target = new THREE.Object3D();

    // Uncomment to visualize the target:
    // var geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    // var material = new THREE.MeshBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0.5});
    // var cube = new THREE.Mesh(geometry, material);
    // this.target.add(cube);

    object.parent.add(this.target);
    this.control.attach(this.target);
    this.setMode(this.mode); // update visibility.
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
}
