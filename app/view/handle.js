/* global THREE */

class Handle { // eslint-disable-line no-unused-vars
  constructor(domElement, camera, scene, orbitControls) {
    this.scene = scene;
    this.mode = 'select';

    this.control = new THREE.TransformControls(camera, domElement);
    this.control.isTransformControls = true; // To be detected correctly by OutlinePass.
    this.control.visible = false;
    this.control.enabled = false;
    this.control.setSpace('local');
    this.control.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    this.control.addEventListener('change', (event) => {
      if (this.control.object)
        this.control.object.updateMatrix();
    });
  }

  attachToObject(object) {
    this.control.attach(object);
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
  }

  showHandle() {
    this.scene.add(this.control);
  }

  hideHandle() {
    this.scene.remove(this.control);
  }
}
