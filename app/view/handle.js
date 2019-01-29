/* global THREE */

class Handle { // eslint-disable-line no-unused-vars
  constructor(domElement, camera, scene, orbitControls) {
    this.scene = scene;
    var geometry = new THREE.CubeGeometry(0.01, 0.01, 0.01);
    var material = new THREE.MeshBasicMaterial({
      color: 0x00ff00
    });

    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh); // parent?

    this.control = new THREE.TransformControls(camera, domElement);
    this.control.traverse((obj) => { // To be detected correctly by OutlinePass.
      obj.isTransformControls = true;
    });
    this.control.attach(mesh);
    this.control.setSpace('local');
    this.control.setMode('rotate');

    this.control.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
  }

  showHandle() {
    this.scene.add(this.control);
  }

  hideHandle() {
    this.scene.remove(this.control);
  }
}
