/* global THREE, PartMediator */
'use strict';

class RobotMediator { // eslint-disable-line no-unused-vars
  constructor(robot) {
    this.model = robot;

    // Create the root container.
    this.rootObject = new THREE.Object3D();
    this.rootObject.name = 'robot';
    this.rootObject.model = this;
    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this;

    // Link signals
    this.model.addObserver('RootPartAdded', (e) => this.onRootPartAdded(e));
    this.model.addObserver('RootPartRemoved', (e) => this.onRootPartRemoved(e));
  }

  onRootPartAdded(part) {
    this.rootPartMediator = new PartMediator(part);
    this.rootObject.add(this.rootPartMediator.rootObject);
  }

  onRootPartRemoved() {
    this.rootObject.remove(this.rootPartMediator.rootObject);
    this.rootPartMediator = null;
  }
}
