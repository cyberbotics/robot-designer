/* global THREE, PartMediator */

class RobotMediator { // eslint-disable-line no-unused-vars
  constructor(robot) {
    this.model = robot;
    this.object3D = this.makeObject3D();
    this.object3D.matrixAutoUpdate = false;
    this.object3D.mediator = this;
    this.model.addObserver('RootPartAdded', (e) => this.onRootPartAdded(e));
    this.model.addObserver('RootPartRemoved', (e) => this.onRootPartRemoved(e));
  }

  onRootPartAdded(part) {
    this.rootPartMediator = new PartMediator(part);
    this.object3D.add(this.rootPartMediator.object3D);
  }

  onRootPartRemoved() {
    this.object3D.remove(this.rootPartMediator.object3D);
    this.rootPartMediator = null;
  }

  makeObject3D() {
    const container = new THREE.Object3D();
    container.name = 'robot';
    container.model = this;

    return container;
  }
}
