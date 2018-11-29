/* global THREE */

class PartMediator { // eslint-disable-line no-unused-vars
  constructor(part) {
    this.model = part;
    this.object3D = this.makeObject3D();
    this.object3D.matrixAutoUpdate = false;
    this.object3D.mediator = this;
    this.childrenMediators = {};
    this.childrenSlots = {};
    this.model.addObserver('PartAdded', (d) => this.onPartAdded(d));
    this.model.addObserver('PartRemoved', (d) => this.onPartRemoved(d));
  }

  onPartAdded(data) {
    for (var c = 0; c < this.object3D.children[0].children.length; c++) {
      var child = this.object3D.children[0].children[c];
      if (child.name === 'slot' && child.userdata.slotName === data.slotName) {
        var mediator = new PartMediator(data.part);
        this.childrenSlots[data.slotName] = child;
        this.childrenSlots[data.slotName].add(mediator.object3D);
        this.childrenMediators[data.slotName] = mediator;
      }
    }
  }

  onPartRemoved(data) {
    this.childrenSlots[data.slotName].remove(this.childrenMediators[data.slotName].object3D);
    delete this.childrenSlots[data.slotName];
    delete this.childrenMediators[data.slotName];
  }

  makeObject3D() {
    var container = new THREE.Object3D();

    var model = '/robot-designer/assets/models/' + this.model.modelName + '/model.x3d';
    var loader = new THREE.X3DLoader();
    // loader.ontextureload = this.changed.bind(this);
    loader.load(model, function(object3d) {
      if (container) {
        object3d.name = 'part';
        container.add(object3d);
      }
    });

    return container;
  }
}
