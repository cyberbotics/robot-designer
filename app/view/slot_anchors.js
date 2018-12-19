/* global THREE */

var slotRepresentation = null;
var regularMaterial = null;
var highlightedMaterial = null;
var slotRepresentationList = [];
var highlightedMesh = null;

class SlotAnchors { // eslint-disable-line no-unused-vars
  static initialize() {
    slotRepresentation = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    regularMaterial = new THREE.MeshBasicMaterial({color: 0x00ff88, transparent: true, opacity: 0.8});
    highlightedMaterial = new THREE.MeshBasicMaterial({color: 0x0088ff, transparent: true, opacity: 0.8});
  }

  static showSlots(scene, slotType) {
    SlotAnchors.hideSlots();
    scene.traverse(function(obj) {
      if (obj.userData.x3dType === 'Slot' && obj.userData.slotType === slotType) {
        var mesh = new THREE.Mesh(slotRepresentation, regularMaterial);
        mesh.name = 'slot representation';
        obj.add(mesh);
        slotRepresentationList.push(mesh);
      }
    });
  }

  static slots() {
    return slotRepresentationList;
  }

  static hideSlots(scene) {
    SlotAnchors.unhighlight();
    slotRepresentationList.forEach(function(obj) {
      obj.parent.remove(obj);
    });
    slotRepresentationList = [];
  }

  static highlight(slot) {
    SlotAnchors.unhighlight();
    var mesh = slot.getObjectByName('slot representation');
    if (mesh) {
      mesh.material = highlightedMaterial;
      highlightedMesh = mesh;
    }
  }

  static unhighlight() {
    if (highlightedMesh) {
      highlightedMesh.material = regularMaterial;
      highlightedMesh = null;
    }
  }
}
