/* global THREE */

class Handle { // eslint-disable-line no-unused-vars
  constructor(domElement, camera, scene, orbitControls) {
    this.scene = scene;

    this.control = new THREE.TransformControls(camera, domElement);
    this.control.isTransformControls = true; // To be detected correctly by OutlinePass.
    this.control.visible = false;
    this.control.setSpace('local');
    this.control.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
  }

  attachToObject(object) {
    this.control.attach(object.parent);
  }

  selectMode() {
    this.control.visible = false;
  }

  translateMode() {
    this.control.visible = true;
    this.control.setMode('translate');
  }

  rotateMode() {
    this.control.visible = true;
    this.control.setMode('rotate');
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
