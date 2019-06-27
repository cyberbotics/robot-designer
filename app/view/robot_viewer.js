/* global THREE, Handle, PartSelector, SlotAnchors, Highlightor */
'use strict';

// 1. dom
// 2. renderer
// 3. resize events
// 4. refresh events
// 5. pass + compose + controls
// 6. mouse interactions

class RobotViewer { // eslint-disable-line no-unused-vars
  constructor(robotViewerElement, robotController, commands) {
    this.robotViewerElement = robotViewerElement;
    this.robotController = robotController;

    this.renderer = new THREE.WebGLRenderer({'antialias': false});
    this.renderer.setClearColor(0x000, 1.0);
    this.renderer.gammaInput = false;
    this.renderer.gammaOutput = false;
    this.renderer.physicallyCorrectLights = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0, 0, 0);

    this.camera = new THREE.PerspectiveCamera(45, 0.3, 0.001, 100);
    this.camera.position.x = 0.1;
    this.camera.position.y = 0.1;
    this.camera.position.z = 0.1;
    this.camera.lookAt(this.scene.position);

    let light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.userData = { 'x3dType': 'DirectionalLight' };
    this.scene.add(light);
    let light2 = new THREE.AmbientLight(0x404040);
    this.scene.add(light2);

    let grid = new THREE.GridHelper(5, 50, 0x880088, 0x440044);
    grid.matrixAutoUpdate = false;
    this.scene.add(grid);

    this.controls = new THREE.OrbitControls(this.camera, this.robotViewerElement);

    this.composer = new THREE.EffectComposer(this.renderer);
    let renderPass = new THREE.RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.hdrResolvePass = new THREE.ShaderPass(THREE.HDRResolveShader);
    this.composer.addPass(this.hdrResolvePass);
    var fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    this.composer.addPass(fxaaPass);
    this.highlightOutlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.composer.addPass(this.highlightOutlinePass);
    this.selectionOutlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.selectionOutlinePass.visibleEdgeColor.set(0x00BFFF);
    this.selectionOutlinePass.renderToScreen = true;
    this.composer.addPass(this.selectionOutlinePass);

    window.onresize = () => this.resize(); // when the window has been resized.

    this.robotViewerElement.appendChild(this.renderer.domElement);
    this.resize();

    this.highlightor = new Highlightor(this.highlightOutlinePass);
    this.selector = new PartSelector(this.selectionOutlinePass);
    this.handle = new Handle(this.robotController, this.robotViewerElement, this.camera, this.scene, this.controls);

    // reset selection and handles when any part is removed
    commands.addObserver('AnyPartRemoved', () => this.clearSelection());

    this.gpuPicker = new THREE.GPUPicker({renderer: this.renderer, debug: false});
    this.gpuPicker.setFilter(function(object) {
      return object instanceof THREE.Mesh && 'x3dType' in object.userData;
    });

    this.slotAnchors = new SlotAnchors(this.scene);

    this.resize();
  }

  render() {
    requestAnimationFrame(() => this.render());
    this.composer.render();
  }

  resize() {
    var width = this.robotViewerElement.clientWidth;
    var height = this.robotViewerElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.gpuPicker)
      this.gpuPicker.resizeTexture(width, height);
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.render();
  }

  getClosestSlot(screenPosition, slotType) {
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPosition, this.camera);
    var ray = raycaster.ray;

    var closestSlot = null;
    var closestSqDistance = Number.POSITIVE_INFINITY;
    var robotObject = this.scene.getObjectByName('robot');
    if (!robotObject)
      return;
    robotObject.traverse(function(obj) {
      if (obj.userData.isSlotContainer && obj.userData.slotType === slotType) {
        var slot = obj;
        var slotGlobalPosition = slot.localToWorld(new THREE.Vector3());
        var sqDistance = ray.distanceSqToPoint(slotGlobalPosition);
        if (closestSqDistance > sqDistance) {
          closestSlot = slot;
          closestSqDistance = sqDistance;
        }
      }
    });
    // if Math.sqrt(closestSqDistance) < 0.01)...
    return closestSlot;
  }

  projectScreenPositionOnFloor(screenPosition) {
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPosition, this.camera);
    var planA = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
    planA.geometry.rotateX(-Math.PI / 2);
    var planB = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
    planB.geometry.rotateX(Math.PI / 2);
    var intersects = raycaster.intersectObjects([planA, planB]);
    if (intersects.length > 0)
      return intersects[0].point;
  }

  projectScreenPositionOnSlotsAnchors(screenPosition) {
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPosition, this.camera);
    var intersects = raycaster.intersectObjects(this.slotAnchors.slots());
    if (intersects.length > 0)
      return intersects[0].point;
  }

  getPartAt(relativePosition, screenPosition) {
    if (this.handle.control.pointerHover(screenPosition))
      return undefined;
    this.handle.hideHandle();
    this.gpuPicker.setScene(this.scene);
    this.gpuPicker.setCamera(this.camera);

    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPosition, this.camera);
    var intersection = this.gpuPicker.pick(relativePosition, raycaster);
    if (intersection && intersection.faceIndex > 0) {
      var parent = intersection.object;
      do {
        if (parent.userData.isPartContainer) {
          this.handle.showHandle();
          return parent;
        }
        parent = parent.parent;
      } while (parent);
    }
    this.handle.showHandle();
    return undefined;
  }

  clearSelection() {
    this.selector.clearSelection();
    this.handle.detach();
  }
}
