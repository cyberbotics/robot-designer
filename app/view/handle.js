/* global THREE */

class Handle { // eslint-disable-line no-unused-vars
  constructor(domElement, camera, scene, orbitControls) {
    this.scene = scene;

    this.control = new THREE.TransformControls(camera, domElement);
    this.control.isTransformControls = true; // To be detected correctly by OutlinePass.

    this.control.setSpace('local');
    this.control.setMode('rotate');
    this.control.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
  }

  attachToObject(object) {
    this.control.attach(object.parent);
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
