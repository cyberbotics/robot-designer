/* global THREE, Handle, SlotAnchors, Selector, Highlightor */
'use strict';

// 1. dom
// 2. renderer
// 3. resize events
// 4. refresh events
// 5. pass + compose + controls
// 6. mouse interactions

class View3D { // eslint-disable-line no-unused-vars
  constructor(view3DElement) {
    this.view3DElement = view3DElement;

    this.renderer = new THREE.WebGLRenderer({'antialias': true});
    this.renderer.setClearColor(0x000, 1.0);

    this.scene = new THREE.Scene();

    /* // how to set a textured background.
    var loader = new THREE.CubeTextureLoader();
    loader.setPath( '/robot-designer/assets/common/textures/cubic/' );
    this.scene.background = loader.load( [
      'noon_sunny_empty_right.jpg', 'noon_sunny_empty_left.jpg',
      'noon_sunny_empty_top.jpg', 'noon_sunny_empty_bottom.jpg',
      'noon_sunny_empty_front.jpg', 'noon_sunny_empty_back.jpg'
    ] );
    */

    this.camera = new THREE.PerspectiveCamera(45, 0.3, 0.001, 100);
    this.camera.position.x = 0.1;
    this.camera.position.y = 0.1;
    this.camera.position.z = 0.1;
    this.camera.lookAt(this.scene.position);

    var light = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(light);
    var light2 = new THREE.AmbientLight(0x404040);
    this.scene.add(light2);

    var grid = new THREE.GridHelper(5, 50, 0x880088, 0x440044);
    grid.matrixAutoUpdate = false;
    this.scene.add(grid);

    this.controls = new THREE.OrbitControls(this.camera, this.view3DElement);

    this.composer = new THREE.EffectComposer(this.renderer);
    var renderPass = new THREE.RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.highlightOutlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.composer.addPass(this.highlightOutlinePass);
    this.selectionOutlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.selectionOutlinePass.visibleEdgeColor.set(0x00BFFF);
    this.selectionOutlinePass.renderToScreen = true;
    this.composer.addPass(this.selectionOutlinePass);

    window.onresize = () => this.resize(); // when the window has been resized.

    this.view3DElement.appendChild(this.renderer.domElement);
    this.resize();

    this.highlightor = new Highlightor(this.highlightOutlinePass);
    this.selector = new Selector(this.selectionOutlinePass);
    this.handle = new Handle(this.view3DElement, this.camera, this.scene, this.controls);

    this.gpuPicker = new THREE.GPUPicker({renderer: this.renderer, debug: false});
    this.gpuPicker.setFilter(function(object) {
      return object instanceof THREE.Mesh && 'x3dType' in object.userData;
    });

    this.slotAnchors = new SlotAnchors(this.scene);

    this.render();
  }

  render() {
    requestAnimationFrame(() => this.render());
    this.composer.render();
  }

  resize() {
    var width = this.view3DElement.clientWidth;
    var height = this.view3DElement.clientHeight;
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  convertMouseEventPositionToScreenPosition(eventX, eventY) {
    var rect = this.renderer.domElement.getBoundingClientRect();
    var pos = new THREE.Vector2();
    pos.x = ((eventX - rect.left) / (rect.right - rect.left)) * 2 - 1;
    pos.y = -((eventY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
    return pos;
  }

  convertMouseEventPositionToRelativePosition(eventX, eventY) {
    var rect = this.renderer.domElement.getBoundingClientRect();
    var pos = new THREE.Vector2();
    pos.x = eventX - rect.left;
    pos.y = eventY - rect.top;
    return pos;
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
      if (obj.userData.x3dType === 'Slot' && obj.userData.slotType === slotType) {
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
  }
}
