/* global THREE */
'use strict';

class SlotAnchors { // eslint-disable-line no-unused-vars
  constructor(scene) {
    this.scene = scene;
    this.slotRepresentation = new THREE.BoxGeometry(0.011, 0.011, 0.011);
    this.regularMaterial = new THREE.MeshBasicMaterial({color: 0x00ff88, transparent: true, opacity: 0.8});
    this.highlightedMaterial = new THREE.MeshBasicMaterial({color: 0x0088ff, transparent: true, opacity: 0.8});
    this.slotRepresentationList = [];
    this.highlightedMesh = null;
  }

  showSlots(slotType) {
    this.hideSlots();
    var that = this;
    this.scene.traverse(function(obj) {
      if (obj.userData.x3dType === 'Slot' && obj.userData.slotType === slotType) {
        var mesh = new THREE.Mesh(that.slotRepresentation, that.regularMaterial);
        mesh.name = 'slot representation';
        obj.add(mesh);
        that.slotRepresentationList.push(mesh);
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
