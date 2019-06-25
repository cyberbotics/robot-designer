/* global THREE */
'use strict';

class SlotAnchors { // eslint-disable-line no-unused-vars
  constructor(scene) {
    this.scene = scene;
    this.slotRepresentation = new THREE.BoxGeometry(0.011, 0.011, 0.011);
    this.regularMaterial = new THREE.MeshBasicMaterial({color: 0x00ff20, transparent: true, opacity: 0.8});
    this.highlightedMaterial = new THREE.MeshBasicMaterial({color: 0x153098, transparent: true, opacity: 0.8});
    this.slotRepresentationList = [];
    this.highlightedMesh = null;
  }

  showSlots(slotType) {
    this.hideSlots();
    this.scene.traverse((obj) => {
      if (obj.userData.isSlotContainer && obj.userData.slotType === slotType && obj.children.length === 0) {
        var mesh = new THREE.Mesh(this.slotRepresentation, this.regularMaterial);
        mesh.userData.isSlotRepresentation = true;
        mesh.matrixAutoUpdate = false;
        mesh.name = 'slot representation';
        obj.add(mesh);
        this.slotRepresentationList.push(mesh);
      }
    });
  }

  slots() {
    return this.slotRepresentationList;
  }

  hideSlots(scene) {
    this.unhighlight();
    this.slotRepresentationList.forEach(function(obj) {
      obj.parent.remove(obj);
    });
    this.slotRepresentationList = [];
  }

  highlight(slot) {
    this.unhighlight();
    var mesh = slot.getObjectByName('slot representation');
    if (mesh) {
      mesh.material = this.highlightedMaterial;
      this.highlightedMesh = mesh;
    }
  }

  unhighlight() {
    if (this.highlightedMesh) {
      this.highlightedMesh.material = this.regularMaterial;
      this.highlightedMesh = null;
    }
  }
}
