"use strict";

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move
THREE.OrbitControls = function (object, domElement) {
  this.object = object;
  this.domElement = domElement !== undefined ? domElement : document; // Set to false to disable this control

  this.enabled = true; // "target" sets the location of focus, where the object orbits around

  this.target = new THREE.Vector3(); // How far you can dolly in and out ( PerspectiveCamera only )

  this.minDistance = 0;
  this.maxDistance = Infinity; // How far you can zoom in and out ( OrthographicCamera only )

  this.minZoom = 0;
  this.maxZoom = Infinity; // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.

  this.minPolarAngle = 0; // radians

  this.maxPolarAngle = Math.PI; // radians
  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].

  this.minAzimuthAngle = -Infinity; // radians

  this.maxAzimuthAngle = Infinity; // radians
  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop

  this.enableDamping = false;
  this.dampingFactor = 0.25; // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming

  this.enableZoom = true;
  this.zoomSpeed = 1.0; // Set to false to disable rotating

  this.enableRotate = true;
  this.rotateSpeed = 1.0; // Set to false to disable panning

  this.enablePan = true;
  this.panSpeed = 1.0;
  this.screenSpacePanning = false; // if true, pan in screen-space

  this.keyPanSpeed = 7.0; // pixels moved per arrow key push
  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop

  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
  // Set to false to disable use of the keys

  this.enableKeys = true; // The four arrow keys

  this.keys = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40
  }; // Mouse buttons

  this.mouseButtons = {
    LEFT: THREE.MOUSE.LEFT,
    MIDDLE: THREE.MOUSE.MIDDLE,
    RIGHT: THREE.MOUSE.RIGHT
  }; // for reset

  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom; //
  // public methods
  //

  this.getPolarAngle = function () {
    return spherical.phi;
  };

  this.getAzimuthalAngle = function () {
    return spherical.theta;
  };

  this.saveState = function () {
    scope.target0.copy(scope.target);
    scope.position0.copy(scope.object.position);
    scope.zoom0 = scope.object.zoom;
  };

  this.reset = function () {
    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;
    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);
    scope.update();
    state = STATE.NONE;
  }; // this method is exposed, but perhaps it would be better if we can make it private...


  this.update = function () {
    var offset = new THREE.Vector3(); // so camera.up is the orbit axis

    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();
    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();
    return function update() {
      var position = scope.object.position;
      offset.copy(position).sub(scope.target); // rotate offset to "y-axis-is-up" space

      offset.applyQuaternion(quat); // angle from z-axis around y-axis

      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {
        rotateLeft(getAutoRotationAngle());
      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi; // restrict theta to be between desired limits

      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta)); // restrict phi to be between desired limits

      spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
      spherical.makeSafe();
      spherical.radius *= scale; // restrict radius to be between desired limits

      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius)); // move target to panned location

      scope.target.add(panOffset);
      offset.setFromSpherical(spherical); // rotate offset back to "camera-up-vector-is-up" space

      offset.applyQuaternion(quatInverse);
      position.copy(scope.target).add(offset);
      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {
        sphericalDelta.theta *= 1 - scope.dampingFactor;
        sphericalDelta.phi *= 1 - scope.dampingFactor;
        panOffset.multiplyScalar(1 - scope.dampingFactor);
      } else {
        sphericalDelta.set(0, 0, 0);
        panOffset.set(0, 0, 0);
      }

      scale = 1; // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
        scope.dispatchEvent(changeEvent);
        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;
        return true;
      }

      return false;
    };
  }();

  this.dispose = function () {
    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);
    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    window.removeEventListener('keydown', onKeyDown, false); //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
  }; //
  // internals
  //


  var scope = this;
  var changeEvent = {
    type: 'change'
  };
  var startEvent = {
    type: 'start'
  };
  var endEvent = {
    type: 'end'
  };
  var STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY_PAN: 4
  };
  var state = STATE.NONE;
  var EPS = 0.000001; // current position in spherical coordinates

  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();
  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;
  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();
  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();
  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
  }

  function getZoomScale() {
    return Math.pow(0.95, scope.zoomSpeed);
  }

  function rotateLeft(angle) {
    sphericalDelta.theta -= angle;
  }

  function rotateUp(angle) {
    sphericalDelta.phi -= angle;
  }

  var panLeft = function () {
    var v = new THREE.Vector3();
    return function panLeft(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix

      v.multiplyScalar(-distance);
      panOffset.add(v);
    };
  }();

  var panUp = function () {
    var v = new THREE.Vector3();
    return function panUp(distance, objectMatrix) {
      if (scope.screenSpacePanning === true) {
        v.setFromMatrixColumn(objectMatrix, 1);
      } else {
        v.setFromMatrixColumn(objectMatrix, 0);
        v.crossVectors(scope.object.up, v);
      }

      v.multiplyScalar(distance);
      panOffset.add(v);
    };
  }(); // deltaX and deltaY are in pixels; right and down are positive


  var pan = function () {
    var offset = new THREE.Vector3();
    return function pan(deltaX, deltaY) {
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if (scope.object.isPerspectiveCamera) {
        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length(); // half of the fov is center to top of screen

        targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0); // we use only clientHeight here so aspect ratio does not distort speed

        panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
        panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);
      } else if (scope.object.isOrthographicCamera) {
        // orthographic
        panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
        panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);
      } else {
        // camera neither orthographic nor perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;
      }
    };
  }();

  function dollyIn(dollyScale) {
    if (scope.object.isPerspectiveCamera) {
      scale /= dollyScale;
    } else if (scope.object.isOrthographicCamera) {
      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;
    }
  }

  function dollyOut(dollyScale) {
    if (scope.object.isPerspectiveCamera) {
      scale *= dollyScale;
    } else if (scope.object.isOrthographicCamera) {
      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;
    }
  } //
  // event callbacks - update the object state
  //


  function handleMouseDownRotate(event) {
    //console.log( 'handleMouseDownRotate' );
    rotateStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownDolly(event) {
    //console.log( 'handleMouseDownDolly' );
    dollyStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownPan(event) {
    //console.log( 'handleMouseDownPan' );
    panStart.set(event.clientX, event.clientY);
  }

  function handleMouseMoveRotate(event) {
    //console.log( 'handleMouseMoveRotate' );
    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
    rotateStart.copy(rotateEnd);
    scope.update();
  }

  function handleMouseMoveDolly(event) {
    //console.log( 'handleMouseMoveDolly' );
    dollyEnd.set(event.clientX, event.clientY);
    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {
      dollyIn(getZoomScale());
    } else if (dollyDelta.y < 0) {
      dollyOut(getZoomScale());
    }

    dollyStart.copy(dollyEnd);
    scope.update();
  }

  function handleMouseMovePan(event) {
    //console.log( 'handleMouseMovePan' );
    panEnd.set(event.clientX, event.clientY);
    panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
    pan(panDelta.x, panDelta.y);
    panStart.copy(panEnd);
    scope.update();
  }

  function handleMouseUp(event) {// console.log( 'handleMouseUp' );
  }

  function handleMouseWheel(event) {
    // console.log( 'handleMouseWheel' );
    if (event.deltaY < 0) {
      dollyOut(getZoomScale());
    } else if (event.deltaY > 0) {
      dollyIn(getZoomScale());
    }

    scope.update();
  }

  function handleKeyDown(event) {
    // console.log( 'handleKeyDown' );
    var needsUpdate = false;

    switch (event.keyCode) {
      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        needsUpdate = true;
        break;

      case scope.keys.BOTTOM:
        pan(0, -scope.keyPanSpeed);
        needsUpdate = true;
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        needsUpdate = true;
        break;

      case scope.keys.RIGHT:
        pan(-scope.keyPanSpeed, 0);
        needsUpdate = true;
        break;
    }

    if (needsUpdate) {
      // prevent the browser from scrolling on cursor keys
      event.preventDefault();
      scope.update();
    }
  }

  function handleTouchStartRotate(event) {
    //console.log( 'handleTouchStartRotate' );
    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  function handleTouchStartDollyPan(event) {
    //console.log( 'handleTouchStartDollyPan' );
    if (scope.enableZoom) {
      var dx = event.touches[0].pageX - event.touches[1].pageX;
      var dy = event.touches[0].pageY - event.touches[1].pageY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      dollyStart.set(0, distance);
    }

    if (scope.enablePan) {
      var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      panStart.set(x, y);
    }
  }

  function handleTouchMoveRotate(event) {
    //console.log( 'handleTouchMoveRotate' );
    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
    rotateStart.copy(rotateEnd);
    scope.update();
  }

  function handleTouchMoveDollyPan(event) {
    //console.log( 'handleTouchMoveDollyPan' );
    if (scope.enableZoom) {
      var dx = event.touches[0].pageX - event.touches[1].pageX;
      var dy = event.touches[0].pageY - event.touches[1].pageY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      dollyEnd.set(0, distance);
      dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
      dollyIn(dollyDelta.y);
      dollyStart.copy(dollyEnd);
    }

    if (scope.enablePan) {
      var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      panEnd.set(x, y);
      panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
      pan(panDelta.x, panDelta.y);
      panStart.copy(panEnd);
    }

    scope.update();
  }

  function handleTouchEnd(event) {} //console.log( 'handleTouchEnd' );
  //
  // event handlers - FSM: listen for events and reset state
  //


  function onMouseDown(event) {
    if (scope.enabled === false) return; // Prevent the browser from scrolling.

    event.preventDefault(); // Manually set the focus since calling preventDefault above
    // prevents the browser from setting it automatically.

    scope.domElement.focus ? scope.domElement.focus() : window.focus();

    switch (event.button) {
      case scope.mouseButtons.LEFT:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (scope.enablePan === false) return;
          handleMouseDownPan(event);
          state = STATE.PAN;
        } else {
          if (scope.enableRotate === false) return;
          handleMouseDownRotate(event);
          state = STATE.ROTATE;
        }

        break;

      case scope.mouseButtons.MIDDLE:
        if (scope.enableZoom === false) return;
        handleMouseDownDolly(event);
        state = STATE.DOLLY;
        break;

      case scope.mouseButtons.RIGHT:
        if (scope.enablePan === false) return;
        handleMouseDownPan(event);
        state = STATE.PAN;
        break;
    }

    if (state !== STATE.NONE) {
      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);
      scope.dispatchEvent(startEvent);
    }
  }

  function onMouseMove(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (state) {
      case STATE.ROTATE:
        if (scope.enableRotate === false) return;
        handleMouseMoveRotate(event);
        break;

      case STATE.DOLLY:
        if (scope.enableZoom === false) return;
        handleMouseMoveDolly(event);
        break;

      case STATE.PAN:
        if (scope.enablePan === false) return;
        handleMouseMovePan(event);
        break;
    }
  }

  function onMouseUp(event) {
    if (scope.enabled === false) return;
    handleMouseUp(event);
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    scope.dispatchEvent(endEvent);
    state = STATE.NONE;
  }

  function onMouseWheel(event) {
    if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE) return;
    event.preventDefault();
    event.stopPropagation();
    scope.dispatchEvent(startEvent);
    handleMouseWheel(event);
    scope.dispatchEvent(endEvent);
  }

  function onKeyDown(event) {
    if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;
    handleKeyDown(event);
  }

  function onTouchStart(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        handleTouchStartRotate(event);
        state = STATE.TOUCH_ROTATE;
        break;

      case 2:
        // two-fingered touch: dolly-pan
        if (scope.enableZoom === false && scope.enablePan === false) return;
        handleTouchStartDollyPan(event);
        state = STATE.TOUCH_DOLLY_PAN;
        break;

      default:
        state = STATE.NONE;
    }

    if (state !== STATE.NONE) {
      scope.dispatchEvent(startEvent);
    }
  }

  function onTouchMove(event) {
    if (scope.enabled === false) return;
    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:
        // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?

        handleTouchMoveRotate(event);
        break;

      case 2:
        // two-fingered touch: dolly-pan
        if (scope.enableZoom === false && scope.enablePan === false) return;
        if (state !== STATE.TOUCH_DOLLY_PAN) return; // is this needed?

        handleTouchMoveDollyPan(event);
        break;

      default:
        state = STATE.NONE;
    }
  }

  function onTouchEnd(event) {
    if (scope.enabled === false) return;
    handleTouchEnd(event);
    scope.dispatchEvent(endEvent);
    state = STATE.NONE;
  }

  function onContextMenu(event) {
    if (scope.enabled === false) return;
    event.preventDefault();
  } //


  scope.domElement.addEventListener('contextmenu', onContextMenu, false);
  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);
  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);
  window.addEventListener('keydown', onKeyDown, false); // force an update at start

  this.update();
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
Object.defineProperties(THREE.OrbitControls.prototype, {
  center: {
    get: function get() {
      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;
    }
  },
  // backward compatibility
  noZoom: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      return !this.enableZoom;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      this.enableZoom = !value;
    }
  },
  noRotate: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      return !this.enableRotate;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      this.enableRotate = !value;
    }
  },
  noPan: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      return !this.enablePan;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      this.enablePan = !value;
    }
  },
  noKeys: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      return !this.enableKeys;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      this.enableKeys = !value;
    }
  },
  staticMoving: {
    get: function get() {
      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      return !this.enableDamping;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      this.enableDamping = !value;
    }
  },
  dynamicDampingFactor: {
    get: function get() {
      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      return this.dampingFactor;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      this.dampingFactor = value;
    }
  }
});
"use strict";

var _this2 = void 0;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

/**
 * @author Nikos M. / https://github.com/foo123/
 */
// https://github.com/mrdoob/three.js/issues/5552
// http://en.wikipedia.org/wiki/RGBE_image_format
THREE.HDRLoader = THREE.RGBELoader = function (manager) {
  this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;
  this.type = THREE.UnsignedByteType;
}; // extend THREE.DataTextureLoader


THREE.RGBELoader.prototype = Object.create(THREE.DataTextureLoader.prototype); // adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html

THREE.RGBELoader.prototype._parser = function (buffer) {
  var
  /* return codes for rgbe routines */
  RGBE_RETURN_SUCCESS = 0,
      RGBE_RETURN_FAILURE = -1,

  /* default error routine.  change this to change error handling */
  rgbe_read_error = 1,
      rgbe_write_error = 2,
      rgbe_format_error = 3,
      rgbe_memory_error = 4,
      rgbe_error = function rgbe_error(rgbe_error_code, msg) {
    switch (rgbe_error_code) {
      case rgbe_read_error:
        console.error("THREE.RGBELoader Read Error: " + (msg || ''));
        break;

      case rgbe_write_error:
        console.error("THREE.RGBELoader Write Error: " + (msg || ''));
        break;

      case rgbe_format_error:
        console.error("THREE.RGBELoader Bad File Format: " + (msg || ''));
        break;

      default:
      case rgbe_memory_error:
        console.error("THREE.RGBELoader: Error: " + (msg || ''));
    }

    return RGBE_RETURN_FAILURE;
  },

  /* offsets to red, green, and blue components in a data (float) pixel */
  RGBE_DATA_RED = 0,
      RGBE_DATA_GREEN = 1,
      RGBE_DATA_BLUE = 2,

  /* number of floats per pixel, use 4 since stored in rgba image format */
  RGBE_DATA_SIZE = 4,

  /* flags indicating which fields in an rgbe_header_info are valid */
  RGBE_VALID_PROGRAMTYPE = 1,
      RGBE_VALID_FORMAT = 2,
      RGBE_VALID_DIMENSIONS = 4,
      NEWLINE = "\n",
      fgets = function fgets(buffer, lineLimit, consume) {
    lineLimit = !lineLimit ? 1024 : lineLimit;
    var p = buffer.pos,
        i = -1,
        len = 0,
        s = '',
        chunkSize = 128,
        chunk = String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));

    while (0 > (i = chunk.indexOf(NEWLINE)) && len < lineLimit && p < buffer.byteLength) {
      s += chunk;
      len += chunk.length;
      p += chunkSize;
      chunk += String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));
    }

    if (-1 < i) {
      /*for (i=l-1; i>=0; i--) {
      	byteCode = m.charCodeAt(i);
      	if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
      	else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
      	if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
      }*/
      if (false !== consume) buffer.pos += len + i + 1;
      return s + chunk.slice(0, i);
    }

    return false;
  },

  /* minimal header reading.  modify if you want to parse more information */
  RGBE_ReadHeader = function RGBE_ReadHeader(buffer) {
    var line,
        match,
        // regexes to parse header info fields
    magic_token_re = /^#\?(\S+)$/,
        gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
        exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
        format_re = /^\s*FORMAT=(\S+)\s*$/,
        dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,
        // RGBE format header struct
    header = {
      valid: 0,

      /* indicate which fields are valid */
      string: '',

      /* the actual header string */
      comments: '',

      /* comments found in header */
      programtype: 'RGBE',

      /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */
      format: '',

      /* RGBE format, default 32-bit_rle_rgbe */
      gamma: 1.0,

      /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */
      exposure: 1.0,

      /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */
      width: 0,
      height: 0
      /* image dimensions, width/height */

    };

    if (buffer.pos >= buffer.byteLength || !(line = fgets(buffer))) {
      return rgbe_error(rgbe_read_error, "no header found");
    }
    /* if you want to require the magic token then uncomment the next line */


    if (!(match = line.match(magic_token_re))) {
      return rgbe_error(rgbe_format_error, "bad initial token");
    }

    header.valid |= RGBE_VALID_PROGRAMTYPE;
    header.programtype = match[1];
    header.string += line + "\n";

    while (true) {
      line = fgets(buffer);
      if (false === line) break;
      header.string += line + "\n";

      if ('#' === line.charAt(0)) {
        header.comments += line + "\n";
        continue; // comment line
      }

      if (match = line.match(gamma_re)) {
        header.gamma = parseFloat(match[1], 10);
      }

      if (match = line.match(exposure_re)) {
        header.exposure = parseFloat(match[1], 10);
      }

      if (match = line.match(format_re)) {
        header.valid |= RGBE_VALID_FORMAT;
        header.format = match[1]; //'32-bit_rle_rgbe';
      }

      if (match = line.match(dimensions_re)) {
        header.valid |= RGBE_VALID_DIMENSIONS;
        header.height = parseInt(match[1], 10);
        header.width = parseInt(match[2], 10);
      }

      if (header.valid & RGBE_VALID_FORMAT && header.valid & RGBE_VALID_DIMENSIONS) break;
    }

    if (!(header.valid & RGBE_VALID_FORMAT)) {
      return rgbe_error(rgbe_format_error, "missing format specifier");
    }

    if (!(header.valid & RGBE_VALID_DIMENSIONS)) {
      return rgbe_error(rgbe_format_error, "missing image size specifier");
    }

    return header;
  },
      RGBE_ReadPixels_RLE = function RGBE_ReadPixels_RLE(buffer, w, h) {
    var data_rgba,
        offset,
        pos,
        count,
        byteValue,
        scanline_buffer,
        ptr,
        ptr_end,
        i,
        l,
        off,
        isEncodedRun,
        scanline_width = w,
        num_scanlines = h,
        rgbeStart;

    if ( // run length encoding is not allowed so read flat
    scanline_width < 8 || scanline_width > 0x7fff || // this file is not run length encoded
    2 !== buffer[0] || 2 !== buffer[1] || buffer[2] & 0x80) {
      // return the flat buffer
      return new Uint8Array(buffer);
    }

    if (scanline_width !== (buffer[2] << 8 | buffer[3])) {
      return rgbe_error(rgbe_format_error, "wrong scanline width");
    }

    data_rgba = new Uint8Array(4 * w * h);

    if (!data_rgba || !data_rgba.length) {
      return rgbe_error(rgbe_memory_error, "unable to allocate buffer space");
    }

    offset = 0;
    pos = 0;
    ptr_end = 4 * scanline_width;
    rgbeStart = new Uint8Array(4);
    scanline_buffer = new Uint8Array(ptr_end); // read in each successive scanline

    while (num_scanlines > 0 && pos < buffer.byteLength) {
      if (pos + 4 > buffer.byteLength) {
        return rgbe_error(rgbe_read_error);
      }

      rgbeStart[0] = buffer[pos++];
      rgbeStart[1] = buffer[pos++];
      rgbeStart[2] = buffer[pos++];
      rgbeStart[3] = buffer[pos++];

      if (2 != rgbeStart[0] || 2 != rgbeStart[1] || (rgbeStart[2] << 8 | rgbeStart[3]) != scanline_width) {
        return rgbe_error(rgbe_format_error, "bad rgbe scanline format");
      } // read each of the four channels for the scanline into the buffer
      // first red, then green, then blue, then exponent


      ptr = 0;

      while (ptr < ptr_end && pos < buffer.byteLength) {
        count = buffer[pos++];
        isEncodedRun = count > 128;
        if (isEncodedRun) count -= 128;

        if (0 === count || ptr + count > ptr_end) {
          return rgbe_error(rgbe_format_error, "bad scanline data");
        }

        if (isEncodedRun) {
          // a (encoded) run of the same value
          byteValue = buffer[pos++];

          for (i = 0; i < count; i++) {
            scanline_buffer[ptr++] = byteValue;
          } //ptr += count;

        } else {
          // a literal-run
          scanline_buffer.set(buffer.subarray(pos, pos + count), ptr);
          ptr += count;
          pos += count;
        }
      } // now convert data from buffer into rgba
      // first red, then green, then blue, then exponent (alpha)


      l = scanline_width; //scanline_buffer.byteLength;

      for (i = 0; i < l; i++) {
        off = 0;
        data_rgba[offset] = scanline_buffer[i + off];
        off += scanline_width; //1;

        data_rgba[offset + 1] = scanline_buffer[i + off];
        off += scanline_width; //1;

        data_rgba[offset + 2] = scanline_buffer[i + off];
        off += scanline_width; //1;

        data_rgba[offset + 3] = scanline_buffer[i + off];
        offset += 4;
      }

      num_scanlines--;
    }

    return data_rgba;
  };

  var byteArray = new Uint8Array(buffer),
      byteLength = byteArray.byteLength;
  byteArray.pos = 0;
  var rgbe_header_info = RGBE_ReadHeader(byteArray);

  if (RGBE_RETURN_FAILURE !== rgbe_header_info) {
    var w = rgbe_header_info.width,
        h = rgbe_header_info.height,
        image_rgba_data = RGBE_ReadPixels_RLE(byteArray.subarray(byteArray.pos), w, h);

    if (RGBE_RETURN_FAILURE !== image_rgba_data) {
      if (this.type === THREE.UnsignedByteType) {
        var data = image_rgba_data;
        var format = THREE.RGBEFormat; // handled as THREE.RGBAFormat in shaders

        var type = THREE.UnsignedByteType;
      } else if (this.type === THREE.FloatType) {
        var RGBEByteToRGBFloat = function RGBEByteToRGBFloat(sourceArray, sourceOffset, destArray, destOffset) {
          var e = sourceArray[sourceOffset + 3];
          var scale = Math.pow(2.0, e - 128.0) / 255.0;
          destArray[destOffset + 0] = sourceArray[sourceOffset + 0] * scale;
          destArray[destOffset + 1] = sourceArray[sourceOffset + 1] * scale;
          destArray[destOffset + 2] = sourceArray[sourceOffset + 2] * scale;
        };

        var numElements = image_rgba_data.length / 4 * 3;
        var floatArray = new Float32Array(numElements);

        for (var j = 0; j < numElements; j++) {
          RGBEByteToRGBFloat(image_rgba_data, j * 4, floatArray, j * 3);
        }

        var data = floatArray;
        var format = THREE.RGBFormat;
        var type = THREE.FloatType;
      } else {
        console.error('THREE.RGBELoader: unsupported type: ', this.type);
      }

      return {
        width: w,
        height: h,
        data: data,
        header: rgbe_header_info.string,
        gamma: rgbe_header_info.gamma,
        exposure: rgbe_header_info.exposure,
        format: format,
        type: type
      };
    }
  }

  return null;
};

THREE.RGBELoader.prototype.setType = function (value) {
  this.type = value;
  return this;
};
/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * This class takes the cube lods(corresponding to different roughness values), and creates a single cubeUV
 * Texture. The format for a given roughness set of faces is simply::
 * +X+Y+Z
 * -X-Y-Z
 * For every roughness a mip map chain is also saved, which is essential to remove the texture artifacts due to
 * minification.
 * Right now for every face a PlaneMesh is drawn, which leads to a lot of geometry draw calls, but can be replaced
 * later by drawing a single buffer and by sending the appropriate faceIndex via vertex attributes.
 * The arrangement of the faces is fixed, as assuming this arrangement, the sampling function has been written.
 */


THREE.PMREMCubeUVPacker = function () {
  var camera = new THREE.OrthographicCamera();
  var scene = new THREE.Scene();
  var shader = getShader();

  var PMREMCubeUVPacker = function PMREMCubeUVPacker(cubeTextureLods) {
    this.cubeLods = cubeTextureLods;
    var size = cubeTextureLods[0].width * 4;
    var sourceTexture = cubeTextureLods[0].texture;
    var params = {
      format: sourceTexture.format,
      magFilter: sourceTexture.magFilter,
      minFilter: sourceTexture.minFilter,
      type: sourceTexture.type,
      generateMipmaps: sourceTexture.generateMipmaps,
      anisotropy: sourceTexture.anisotropy,
      encoding: sourceTexture.encoding === THREE.RGBEEncoding ? THREE.RGBM16Encoding : sourceTexture.encoding
    };

    if (params.encoding === THREE.RGBM16Encoding) {
      params.magFilter = THREE.LinearFilter;
      params.minFilter = THREE.LinearFilter;
    }

    this.CubeUVRenderTarget = new THREE.WebGLRenderTarget(size, size, params);
    this.CubeUVRenderTarget.texture.name = "PMREMCubeUVPacker.cubeUv";
    this.CubeUVRenderTarget.texture.mapping = THREE.CubeUVReflectionMapping;
    this.objects = [];
    var geometry = new THREE.PlaneBufferGeometry(1, 1);
    var faceOffsets = [];
    faceOffsets.push(new THREE.Vector2(0, 0));
    faceOffsets.push(new THREE.Vector2(1, 0));
    faceOffsets.push(new THREE.Vector2(2, 0));
    faceOffsets.push(new THREE.Vector2(0, 1));
    faceOffsets.push(new THREE.Vector2(1, 1));
    faceOffsets.push(new THREE.Vector2(2, 1));
    var textureResolution = size;
    size = cubeTextureLods[0].width;
    var offset2 = 0;
    var c = 4.0;
    this.numLods = Math.log(cubeTextureLods[0].width) / Math.log(2) - 2; // IE11 doesn't support Math.log2

    for (var i = 0; i < this.numLods; i++) {
      var offset1 = (textureResolution - textureResolution / c) * 0.5;
      if (size > 16) c *= 2;
      var nMips = size > 16 ? 6 : 1;
      var mipOffsetX = 0;
      var mipOffsetY = 0;
      var mipSize = size;

      for (var j = 0; j < nMips; j++) {
        // Mip Maps
        for (var k = 0; k < 6; k++) {
          // 6 Cube Faces
          var material = shader.clone();
          material.uniforms['envMap'].value = this.cubeLods[i].texture;
          material.envMap = this.cubeLods[i].texture;
          material.uniforms['faceIndex'].value = k;
          material.uniforms['mapSize'].value = mipSize;
          var planeMesh = new THREE.Mesh(geometry, material);
          planeMesh.position.x = faceOffsets[k].x * mipSize - offset1 + mipOffsetX;
          planeMesh.position.y = faceOffsets[k].y * mipSize - offset1 + offset2 + mipOffsetY;
          planeMesh.material.side = THREE.BackSide;
          planeMesh.scale.setScalar(mipSize);
          this.objects.push(planeMesh);
        }

        mipOffsetY += 1.75 * mipSize;
        mipOffsetX += 1.25 * mipSize;
        mipSize /= 2;
      }

      offset2 += 2 * size;
      if (size > 16) size /= 2;
    }
  };

  PMREMCubeUVPacker.prototype = {
    constructor: PMREMCubeUVPacker,
    update: function update(renderer) {
      var size = this.cubeLods[0].width * 4; // top and bottom are swapped for some reason?

      camera.left = -size * 0.5;
      camera.right = size * 0.5;
      camera.top = -size * 0.5;
      camera.bottom = size * 0.5;
      camera.near = 0;
      camera.far = 1;
      camera.updateProjectionMatrix();

      for (var i = 0; i < this.objects.length; i++) {
        scene.add(this.objects[i]);
      }

      var gammaInput = renderer.gammaInput;
      var gammaOutput = renderer.gammaOutput;
      var toneMapping = renderer.toneMapping;
      var toneMappingExposure = renderer.toneMappingExposure;
      var currentRenderTarget = renderer.getRenderTarget();
      renderer.gammaInput = false;
      renderer.gammaOutput = false;
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.setRenderTarget(this.CubeUVRenderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(currentRenderTarget);
      renderer.toneMapping = toneMapping;
      renderer.toneMappingExposure = toneMappingExposure;
      renderer.gammaInput = gammaInput;
      renderer.gammaOutput = gammaOutput;

      for (var i = 0; i < this.objects.length; i++) {
        scene.remove(this.objects[i]);
      }
    },
    dispose: function dispose() {
      for (var i = 0, l = this.objects.length; i < l; i++) {
        this.objects[i].material.dispose();
      }

      this.objects[0].geometry.dispose();
    }
  };

  function getShader() {
    var shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        "faceIndex": {
          value: 0
        },
        "mapSize": {
          value: 0
        },
        "envMap": {
          value: null
        },
        "testColor": {
          value: new THREE.Vector3(1, 1, 1)
        }
      },
      vertexShader: "precision highp float;\
        varying vec2 vUv;\
        void main() {\
          vUv = uv;\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
        }",
      fragmentShader: "precision highp float;\
        varying vec2 vUv;\
        uniform samplerCube envMap;\
        uniform float mapSize;\
        uniform vec3 testColor;\
        uniform int faceIndex;\
        \
        void main() {\
          vec3 sampleDirection;\
          vec2 uv = vUv;\
          uv = uv * 2.0 - 1.0;\
          uv.y *= -1.0;\
          if(faceIndex == 0) {\
            sampleDirection = normalize(vec3(1.0, uv.y, -uv.x));\
          } else if(faceIndex == 1) {\
            sampleDirection = normalize(vec3(uv.x, 1.0, uv.y));\
          } else if(faceIndex == 2) {\
            sampleDirection = normalize(vec3(uv.x, uv.y, 1.0));\
          } else if(faceIndex == 3) {\
            sampleDirection = normalize(vec3(-1.0, uv.y, uv.x));\
          } else if(faceIndex == 4) {\
            sampleDirection = normalize(vec3(uv.x, -1.0, -uv.y));\
          } else {\
            sampleDirection = normalize(vec3(-uv.x, uv.y, -1.0));\
          }\
          vec4 color = envMapTexelToLinear( textureCube( envMap, sampleDirection ) );\
          gl_FragColor = linearToOutputTexel( color );\
        }",
      blending: THREE.NoBlending
    });
    shaderMaterial.type = 'PMREMCubeUVPacker';
    return shaderMaterial;
  }

  return PMREMCubeUVPacker;
}();
/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * To avoid cube map seams, I create an extra pixel around each face. This way when the cube map is
 * sampled by an application later(with a little care by sampling the centre of the texel), the extra 1 border
 *	of pixels makes sure that there is no seams artifacts present. This works perfectly for cubeUV format as
 *	well where the 6 faces can be arranged in any manner whatsoever.
 * Code in the beginning of fragment shader's main function does this job for a given resolution.
 *	Run Scene_PMREM_Test.html in the examples directory to see the sampling from the cube lods generated
 *	by this class.
 */


THREE.PMREMGenerator = function () {
  var shader = getShader();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.0, 1000);
  var scene = new THREE.Scene();
  var planeMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0), shader);
  planeMesh.material.side = THREE.DoubleSide;
  scene.add(planeMesh);
  scene.add(camera);

  var PMREMGenerator = function PMREMGenerator(sourceTexture, samplesPerLevel, resolution) {
    this.sourceTexture = sourceTexture;
    this.resolution = resolution !== undefined ? resolution : 256; // NODE: 256 is currently hard coded in the glsl code for performance reasons

    this.samplesPerLevel = samplesPerLevel !== undefined ? samplesPerLevel : 32;
    var monotonicEncoding = this.sourceTexture.encoding === THREE.LinearEncoding || this.sourceTexture.encoding === THREE.GammaEncoding || this.sourceTexture.encoding === THREE.sRGBEncoding;
    this.sourceTexture.minFilter = monotonicEncoding ? THREE.LinearFilter : THREE.NearestFilter;
    this.sourceTexture.magFilter = monotonicEncoding ? THREE.LinearFilter : THREE.NearestFilter;
    this.sourceTexture.generateMipmaps = this.sourceTexture.generateMipmaps && monotonicEncoding;
    this.cubeLods = [];
    var size = this.resolution;
    var params = {
      format: this.sourceTexture.format,
      magFilter: this.sourceTexture.magFilter,
      minFilter: this.sourceTexture.minFilter,
      type: this.sourceTexture.type,
      generateMipmaps: this.sourceTexture.generateMipmaps,
      anisotropy: this.sourceTexture.anisotropy,
      encoding: this.sourceTexture.encoding
    }; // how many LODs fit in the given CubeUV Texture.

    this.numLods = Math.log(size) / Math.log(2) - 2; // IE11 doesn't support Math.log2

    for (var i = 0; i < this.numLods; i++) {
      var renderTarget = new THREE.WebGLRenderTargetCube(size, size, params);
      renderTarget.texture.name = "PMREMGenerator.cube" + i;
      this.cubeLods.push(renderTarget);
      size = Math.max(16, size / 2);
    }
  };

  PMREMGenerator.prototype = {
    constructor: PMREMGenerator,

    /*
     * Prashant Sharma / spidersharma03: More thought and work is needed here.
     * Right now it's a kind of a hack to use the previously convolved map to convolve the current one.
     * I tried to use the original map to convolve all the lods, but for many textures(specially the high frequency)
     * even a high number of samples(1024) dosen't lead to satisfactory results.
     * By using the previous convolved maps, a lower number of samples are generally sufficient(right now 32, which
     * gives okay results unless we see the reflection very carefully, or zoom in too much), however the math
     * goes wrong as the distribution function tries to sample a larger area than what it should be. So I simply scaled
     * the roughness by 0.9(totally empirical) to try to visually match the original result.
     * The condition "if(i <5)" is also an attemt to make the result match the original result.
     * This method requires the most amount of thinking I guess. Here is a paper which we could try to implement in future::
     * https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
     */
    update: function update(renderer) {
      // Texture should only be flipped for CubeTexture, not for
      // a Texture created via THREE.WebGLRenderTargetCube.
      var tFlip = this.sourceTexture.isCubeTexture ? -1 : 1;
      shader.defines['SAMPLES_PER_LEVEL'] = this.samplesPerLevel;
      shader.uniforms['faceIndex'].value = 0;
      shader.uniforms['envMap'].value = this.sourceTexture;
      shader.envMap = this.sourceTexture;
      shader.needsUpdate = true;
      var gammaInput = renderer.gammaInput;
      var gammaOutput = renderer.gammaOutput;
      var toneMapping = renderer.toneMapping;
      var toneMappingExposure = renderer.toneMappingExposure;
      var currentRenderTarget = renderer.getRenderTarget();
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.gammaInput = false;
      renderer.gammaOutput = false;

      for (var i = 0; i < this.numLods; i++) {
        var r = i / (this.numLods - 1);
        shader.uniforms['roughness'].value = r * 0.9; // see comment above, pragmatic choice
        // Only apply the tFlip for the first LOD

        shader.uniforms['tFlip'].value = i == 0 ? tFlip : 1;
        var size = this.cubeLods[i].width;
        shader.uniforms['mapSize'].value = size;
        this.renderToCubeMapTarget(renderer, this.cubeLods[i]);
        if (i < 5) shader.uniforms['envMap'].value = this.cubeLods[i].texture;
      }

      renderer.setRenderTarget(currentRenderTarget);
      renderer.toneMapping = toneMapping;
      renderer.toneMappingExposure = toneMappingExposure;
      renderer.gammaInput = gammaInput;
      renderer.gammaOutput = gammaOutput;
    },
    renderToCubeMapTarget: function renderToCubeMapTarget(renderer, renderTarget) {
      for (var i = 0; i < 6; i++) {
        this.renderToCubeMapTargetFace(renderer, renderTarget, i);
      }
    },
    renderToCubeMapTargetFace: function renderToCubeMapTargetFace(renderer, renderTarget, faceIndex) {
      shader.uniforms['faceIndex'].value = faceIndex;
      renderer.setRenderTarget(renderTarget, faceIndex);
      renderer.clear();
      renderer.render(scene, camera);
    },
    dispose: function dispose() {
      for (var i = 0, l = this.cubeLods.length; i < l; i++) {
        this.cubeLods[i].dispose();
      }
    }
  };

  function getShader() {
    var shaderMaterial = new THREE.ShaderMaterial({
      defines: {
        "SAMPLES_PER_LEVEL": 20
      },
      uniforms: {
        "faceIndex": {
          value: 0
        },
        "roughness": {
          value: 0.5
        },
        "mapSize": {
          value: 0.5
        },
        "envMap": {
          value: null
        },
        "tFlip": {
          value: -1
        }
      },
      vertexShader: "varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",
      fragmentShader: "#include <common>\n\
				varying vec2 vUv;\n\
				uniform int faceIndex;\n\
				uniform float roughness;\n\
				uniform samplerCube envMap;\n\
				uniform float mapSize;\n\
				uniform float tFlip;\n\
				\n\
				float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {\n\
					float a = ggxRoughness + 0.0001;\n\
					a *= a;\n\
					return ( 2.0 / a - 2.0 );\n\
				}\n\
				vec3 ImportanceSamplePhong(vec2 uv, mat3 vecSpace, float specPow) {\n\
					float phi = uv.y * 2.0 * PI;\n\
					float cosTheta = pow(1.0 - uv.x, 1.0 / (specPow + 1.0));\n\
					float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\
					vec3 sampleDir = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);\n\
					return vecSpace * sampleDir;\n\
				}\n\
				vec3 ImportanceSampleGGX( vec2 uv, mat3 vecSpace, float Roughness )\n\
				{\n\
					float a = Roughness * Roughness;\n\
					float Phi = 2.0 * PI * uv.x;\n\
					float CosTheta = sqrt( (1.0 - uv.y) / ( 1.0 + (a*a - 1.0) * uv.y ) );\n\
					float SinTheta = sqrt( 1.0 - CosTheta * CosTheta );\n\
					return vecSpace * vec3(SinTheta * cos( Phi ), SinTheta * sin( Phi ), CosTheta);\n\
				}\n\
				mat3 matrixFromVector(vec3 n) {\n\
					float a = 1.0 / (1.0 + n.z);\n\
					float b = -n.x * n.y * a;\n\
					vec3 b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);\n\
					vec3 b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);\n\
					return mat3(b1, b2, n);\n\
				}\n\
				\n\
				vec4 testColorMap(float Roughness) {\n\
					vec4 color;\n\
					if(faceIndex == 0)\n\
						color = vec4(1.0,0.0,0.0,1.0);\n\
					else if(faceIndex == 1)\n\
						color = vec4(0.0,1.0,0.0,1.0);\n\
					else if(faceIndex == 2)\n\
						color = vec4(0.0,0.0,1.0,1.0);\n\
					else if(faceIndex == 3)\n\
						color = vec4(1.0,1.0,0.0,1.0);\n\
					else if(faceIndex == 4)\n\
						color = vec4(0.0,1.0,1.0,1.0);\n\
					else\n\
						color = vec4(1.0,0.0,1.0,1.0);\n\
					color *= ( 1.0 - Roughness );\n\
					return color;\n\
				}\n\
				void main() {\n\
					vec3 sampleDirection;\n\
					vec2 uv = vUv*2.0 - 1.0;\n\
					float offset = -1.0/mapSize;\n\
					const float a = -1.0;\n\
					const float b = 1.0;\n\
					float c = -1.0 + offset;\n\
					float d = 1.0 - offset;\n\
					float bminusa = b - a;\n\
					uv.x = (uv.x - a)/bminusa * d - (uv.x - b)/bminusa * c;\n\
					uv.y = (uv.y - a)/bminusa * d - (uv.y - b)/bminusa * c;\n\
					if (faceIndex==0) {\n\
						sampleDirection = vec3(1.0, -uv.y, -uv.x);\n\
					} else if (faceIndex==1) {\n\
						sampleDirection = vec3(-1.0, -uv.y, uv.x);\n\
					} else if (faceIndex==2) {\n\
						sampleDirection = vec3(uv.x, 1.0, uv.y);\n\
					} else if (faceIndex==3) {\n\
						sampleDirection = vec3(uv.x, -1.0, -uv.y);\n\
					} else if (faceIndex==4) {\n\
						sampleDirection = vec3(uv.x, -uv.y, 1.0);\n\
					} else {\n\
						sampleDirection = vec3(-uv.x, -uv.y, -1.0);\n\
					}\n\
					vec3 correctedDirection = vec3( tFlip * sampleDirection.x, sampleDirection.yz );\n\
					mat3 vecSpace = matrixFromVector( normalize( correctedDirection ) );\n\
					vec3 rgbColor = vec3(0.0);\n\
					const int NumSamples = SAMPLES_PER_LEVEL;\n\
					vec3 vect;\n\
					float weight = 0.0;\n\
					for( int i = 0; i < NumSamples; i ++ ) {\n\
						float sini = sin(float(i));\n\
						float cosi = cos(float(i));\n\
						float r = rand(vec2(sini, cosi));\n\
						vect = ImportanceSampleGGX(vec2(float(i) / float(NumSamples), r), vecSpace, roughness);\n\
						float dotProd = dot(vect, normalize(sampleDirection));\n\
						weight += dotProd;\n\
						vec3 color = envMapTexelToLinear(textureCube(envMap, vect)).rgb;\n\
						rgbColor.rgb += color;\n\
					}\n\
					rgbColor /= float(NumSamples);\n\
					//rgbColor = testColorMap( roughness ).rgb;\n\
					gl_FragColor = linearToOutputTexel( vec4( rgbColor, 1.0 ) );\n\
				}",
      blending: THREE.NoBlending
    });
    shaderMaterial.type = 'PMREMGenerator';
    return shaderMaterial;
  }

  return PMREMGenerator;
}();
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */


THREE.CopyShader = {
  uniforms: {
    "tDiffuse": {
      value: null
    },
    "opacity": {
      value: 1.0
    }
  },
  vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),
  fragmentShader: ["uniform float opacity;", "uniform sampler2D tDiffuse;", "varying vec2 vUv;", "void main() {", "vec4 texel = texture2D( tDiffuse, vUv );", "gl_FragColor = opacity * texel;", "}"].join("\n")
};
/**
 * @author alteredq / http://alteredqualia.com/
 * @author davidedc / http://www.sketchpatch.net/
 *
 * NVIDIA FXAA by Timothy Lottes
 * http://timothylottes.blogspot.com/2011/06/fxaa3-source-released.html
 * - WebGL port by @supereggbert
 * http://www.glge.org/demos/fxaa/
 */

THREE.FXAAShader = {
  uniforms: {
    "tDiffuse": {
      value: null
    },
    "resolution": {
      value: new THREE.Vector2(1 / 1024, 1 / 512)
    }
  },
  vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),
  fragmentShader: ["precision highp float;", "", "uniform sampler2D tDiffuse;", "", "uniform vec2 resolution;", "", "varying vec2 vUv;", "", "// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)", "", "//----------------------------------------------------------------------------------", "// File:        es3-kepler\FXAA\assets\shaders/FXAA_DefaultES.frag", "// SDK Version: v3.00", "// Email:       gameworks@nvidia.com", "// Site:        http://developer.nvidia.com/", "//", "// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.", "//", "// Redistribution and use in source and binary forms, with or without", "// modification, are permitted provided that the following conditions", "// are met:", "//  * Redistributions of source code must retain the above copyright", "//    notice, this list of conditions and the following disclaimer.", "//  * Redistributions in binary form must reproduce the above copyright", "//    notice, this list of conditions and the following disclaimer in the", "//    documentation and/or other materials provided with the distribution.", "//  * Neither the name of NVIDIA CORPORATION nor the names of its", "//    contributors may be used to endorse or promote products derived", "//    from this software without specific prior written permission.", "//", "// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY", "// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE", "// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR", "// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR", "// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,", "// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,", "// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR", "// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY", "// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT", "// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE", "// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.", "//", "//----------------------------------------------------------------------------------", "", "#define FXAA_PC 1", "#define FXAA_GLSL_100 1", "#define FXAA_QUALITY_PRESET 12", "", "#define FXAA_GREEN_AS_LUMA 1", "", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_PC_CONSOLE", "    //", "    // The console algorithm for PC is included", "    // for developers targeting really low spec machines.", "    // Likely better to just run FXAA_PC, and use a really low preset.", "    //", "    #define FXAA_PC_CONSOLE 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_GLSL_120", "    #define FXAA_GLSL_120 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_GLSL_130", "    #define FXAA_GLSL_130 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_HLSL_3", "    #define FXAA_HLSL_3 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_HLSL_4", "    #define FXAA_HLSL_4 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_HLSL_5", "    #define FXAA_HLSL_5 0", "#endif", "/*==========================================================================*/", "#ifndef FXAA_GREEN_AS_LUMA", "    //", "    // For those using non-linear color,", "    // and either not able to get luma in alpha, or not wanting to,", "    // this enables FXAA to run using green as a proxy for luma.", "    // So with this enabled, no need to pack luma in alpha.", "    //", "    // This will turn off AA on anything which lacks some amount of green.", "    // Pure red and blue or combination of only R and B, will get no AA.", "    //", "    // Might want to lower the settings for both,", "    //    fxaaConsoleEdgeThresholdMin", "    //    fxaaQualityEdgeThresholdMin", "    // In order to insure AA does not get turned off on colors", "    // which contain a minor amount of green.", "    //", "    // 1 = On.", "    // 0 = Off.", "    //", "    #define FXAA_GREEN_AS_LUMA 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_EARLY_EXIT", "    //", "    // Controls algorithm's early exit path.", "    // On PS3 turning this ON adds 2 cycles to the shader.", "    // On 360 turning this OFF adds 10ths of a millisecond to the shader.", "    // Turning this off on console will result in a more blurry image.", "    // So this defaults to on.", "    //", "    // 1 = On.", "    // 0 = Off.", "    //", "    #define FXAA_EARLY_EXIT 1", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_DISCARD", "    //", "    // Only valid for PC OpenGL currently.", "    // Probably will not work when FXAA_GREEN_AS_LUMA = 1.", "    //", "    // 1 = Use discard on pixels which don't need AA.", "    //     For APIs which enable concurrent TEX+ROP from same surface.", "    // 0 = Return unchanged color on pixels which don't need AA.", "    //", "    #define FXAA_DISCARD 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_FAST_PIXEL_OFFSET", "    //", "    // Used for GLSL 120 only.", "    //", "    // 1 = GL API supports fast pixel offsets", "    // 0 = do not use fast pixel offsets", "    //", "    #ifdef GL_EXT_gpu_shader4", "        #define FXAA_FAST_PIXEL_OFFSET 1", "    #endif", "    #ifdef GL_NV_gpu_shader5", "        #define FXAA_FAST_PIXEL_OFFSET 1", "    #endif", "    #ifdef GL_ARB_gpu_shader5", "        #define FXAA_FAST_PIXEL_OFFSET 1", "    #endif", "    #ifndef FXAA_FAST_PIXEL_OFFSET", "        #define FXAA_FAST_PIXEL_OFFSET 0", "    #endif", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_GATHER4_ALPHA", "    //", "    // 1 = API supports gather4 on alpha channel.", "    // 0 = API does not support gather4 on alpha channel.", "    //", "    #if (FXAA_HLSL_5 == 1)", "        #define FXAA_GATHER4_ALPHA 1", "    #endif", "    #ifdef GL_ARB_gpu_shader5", "        #define FXAA_GATHER4_ALPHA 1", "    #endif", "    #ifdef GL_NV_gpu_shader5", "        #define FXAA_GATHER4_ALPHA 1", "    #endif", "    #ifndef FXAA_GATHER4_ALPHA", "        #define FXAA_GATHER4_ALPHA 0", "    #endif", "#endif", "", "", "/*============================================================================", "                        FXAA QUALITY - TUNING KNOBS", "------------------------------------------------------------------------------", "NOTE the other tuning knobs are now in the shader function inputs!", "============================================================================*/", "#ifndef FXAA_QUALITY_PRESET", "    //", "    // Choose the quality preset.", "    // This needs to be compiled into the shader as it effects code.", "    // Best option to include multiple presets is to", "    // in each shader define the preset, then include this file.", "    //", "    // OPTIONS", "    // -----------------------------------------------------------------------", "    // 10 to 15 - default medium dither (10=fastest, 15=highest quality)", "    // 20 to 29 - less dither, more expensive (20=fastest, 29=highest quality)", "    // 39       - no dither, very expensive", "    //", "    // NOTES", "    // -----------------------------------------------------------------------", "    // 12 = slightly faster then FXAA 3.9 and higher edge quality (default)", "    // 13 = about same speed as FXAA 3.9 and better than 12", "    // 23 = closest to FXAA 3.9 visually and performance wise", "    //  _ = the lowest digit is directly related to performance", "    // _  = the highest digit is directly related to style", "    //", "    #define FXAA_QUALITY_PRESET 12", "#endif", "", "", "/*============================================================================", "", "                           FXAA QUALITY - PRESETS", "", "============================================================================*/", "", "/*============================================================================", "                     FXAA QUALITY - MEDIUM DITHER PRESETS", "============================================================================*/", "#if (FXAA_QUALITY_PRESET == 10)", "    #define FXAA_QUALITY_PS 3", "    #define FXAA_QUALITY_P0 1.5", "    #define FXAA_QUALITY_P1 3.0", "    #define FXAA_QUALITY_P2 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 11)", "    #define FXAA_QUALITY_PS 4", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 3.0", "    #define FXAA_QUALITY_P3 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 12)", "    #define FXAA_QUALITY_PS 5", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 4.0", "    #define FXAA_QUALITY_P4 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 13)", "    #define FXAA_QUALITY_PS 6", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 4.0", "    #define FXAA_QUALITY_P5 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 14)", "    #define FXAA_QUALITY_PS 7", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 4.0", "    #define FXAA_QUALITY_P6 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 15)", "    #define FXAA_QUALITY_PS 8", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 4.0", "    #define FXAA_QUALITY_P7 12.0", "#endif", "", "/*============================================================================", "                     FXAA QUALITY - LOW DITHER PRESETS", "============================================================================*/", "#if (FXAA_QUALITY_PRESET == 20)", "    #define FXAA_QUALITY_PS 3", "    #define FXAA_QUALITY_P0 1.5", "    #define FXAA_QUALITY_P1 2.0", "    #define FXAA_QUALITY_P2 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 21)", "    #define FXAA_QUALITY_PS 4", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 22)", "    #define FXAA_QUALITY_PS 5", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 23)", "    #define FXAA_QUALITY_PS 6", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 24)", "    #define FXAA_QUALITY_PS 7", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 3.0", "    #define FXAA_QUALITY_P6 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 25)", "    #define FXAA_QUALITY_PS 8", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 4.0", "    #define FXAA_QUALITY_P7 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 26)", "    #define FXAA_QUALITY_PS 9", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 4.0", "    #define FXAA_QUALITY_P8 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 27)", "    #define FXAA_QUALITY_PS 10", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 4.0", "    #define FXAA_QUALITY_P9 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 28)", "    #define FXAA_QUALITY_PS 11", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 2.0", "    #define FXAA_QUALITY_P9 4.0", "    #define FXAA_QUALITY_P10 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 29)", "    #define FXAA_QUALITY_PS 12", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 2.0", "    #define FXAA_QUALITY_P9 2.0", "    #define FXAA_QUALITY_P10 4.0", "    #define FXAA_QUALITY_P11 8.0", "#endif", "", "/*============================================================================", "                     FXAA QUALITY - EXTREME QUALITY", "============================================================================*/", "#if (FXAA_QUALITY_PRESET == 39)", "    #define FXAA_QUALITY_PS 12", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.0", "    #define FXAA_QUALITY_P2 1.0", "    #define FXAA_QUALITY_P3 1.0", "    #define FXAA_QUALITY_P4 1.0", "    #define FXAA_QUALITY_P5 1.5", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 2.0", "    #define FXAA_QUALITY_P9 2.0", "    #define FXAA_QUALITY_P10 4.0", "    #define FXAA_QUALITY_P11 8.0", "#endif", "", "", "", "/*============================================================================", "", "                                API PORTING", "", "============================================================================*/", "#if (FXAA_GLSL_100 == 1) || (FXAA_GLSL_120 == 1) || (FXAA_GLSL_130 == 1)", "    #define FxaaBool bool", "    #define FxaaDiscard discard", "    #define FxaaFloat float", "    #define FxaaFloat2 vec2", "    #define FxaaFloat3 vec3", "    #define FxaaFloat4 vec4", "    #define FxaaHalf float", "    #define FxaaHalf2 vec2", "    #define FxaaHalf3 vec3", "    #define FxaaHalf4 vec4", "    #define FxaaInt2 ivec2", "    #define FxaaSat(x) clamp(x, 0.0, 1.0)", "    #define FxaaTex sampler2D", "#else", "    #define FxaaBool bool", "    #define FxaaDiscard clip(-1)", "    #define FxaaFloat float", "    #define FxaaFloat2 float2", "    #define FxaaFloat3 float3", "    #define FxaaFloat4 float4", "    #define FxaaHalf half", "    #define FxaaHalf2 half2", "    #define FxaaHalf3 half3", "    #define FxaaHalf4 half4", "    #define FxaaSat(x) saturate(x)", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_GLSL_100 == 1)", "  #define FxaaTexTop(t, p) texture2D(t, p, 0.0)", "  #define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), 0.0)", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_GLSL_120 == 1)", "    // Requires,", "    //  #version 120", "    // And at least,", "    //  #extension GL_EXT_gpu_shader4 : enable", "    //  (or set FXAA_FAST_PIXEL_OFFSET 1 to work like DX9)", "    #define FxaaTexTop(t, p) texture2DLod(t, p, 0.0)", "    #if (FXAA_FAST_PIXEL_OFFSET == 1)", "        #define FxaaTexOff(t, p, o, r) texture2DLodOffset(t, p, 0.0, o)", "    #else", "        #define FxaaTexOff(t, p, o, r) texture2DLod(t, p + (o * r), 0.0)", "    #endif", "    #if (FXAA_GATHER4_ALPHA == 1)", "        // use #extension GL_ARB_gpu_shader5 : enable", "        #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)", "        #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)", "        #define FxaaTexGreen4(t, p) textureGather(t, p, 1)", "        #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)", "    #endif", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_GLSL_130 == 1)", "    // Requires \"#version 130\" or better", "    #define FxaaTexTop(t, p) textureLod(t, p, 0.0)", "    #define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)", "    #if (FXAA_GATHER4_ALPHA == 1)", "        // use #extension GL_ARB_gpu_shader5 : enable", "        #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)", "        #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)", "        #define FxaaTexGreen4(t, p) textureGather(t, p, 1)", "        #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)", "    #endif", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_HLSL_3 == 1)", "    #define FxaaInt2 float2", "    #define FxaaTex sampler2D", "    #define FxaaTexTop(t, p) tex2Dlod(t, float4(p, 0.0, 0.0))", "    #define FxaaTexOff(t, p, o, r) tex2Dlod(t, float4(p + (o * r), 0, 0))", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_HLSL_4 == 1)", "    #define FxaaInt2 int2", "    struct FxaaTex { SamplerState smpl; Texture2D tex; };", "    #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)", "    #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_HLSL_5 == 1)", "    #define FxaaInt2 int2", "    struct FxaaTex { SamplerState smpl; Texture2D tex; };", "    #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)", "    #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)", "    #define FxaaTexAlpha4(t, p) t.tex.GatherAlpha(t.smpl, p)", "    #define FxaaTexOffAlpha4(t, p, o) t.tex.GatherAlpha(t.smpl, p, o)", "    #define FxaaTexGreen4(t, p) t.tex.GatherGreen(t.smpl, p)", "    #define FxaaTexOffGreen4(t, p, o) t.tex.GatherGreen(t.smpl, p, o)", "#endif", "", "", "/*============================================================================", "                   GREEN AS LUMA OPTION SUPPORT FUNCTION", "============================================================================*/", "#if (FXAA_GREEN_AS_LUMA == 0)", "    FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.w; }", "#else", "    FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.y; }", "#endif", "", "", "", "", "/*============================================================================", "", "                             FXAA3 QUALITY - PC", "", "============================================================================*/", "#if (FXAA_PC == 1)", "/*--------------------------------------------------------------------------*/", "FxaaFloat4 FxaaPixelShader(", "    //", "    // Use noperspective interpolation here (turn off perspective interpolation).", "    // {xy} = center of pixel", "    FxaaFloat2 pos,", "    //", "    // Used only for FXAA Console, and not used on the 360 version.", "    // Use noperspective interpolation here (turn off perspective interpolation).", "    // {xy_} = upper left of pixel", "    // {_zw} = lower right of pixel", "    FxaaFloat4 fxaaConsolePosPos,", "    //", "    // Input color texture.", "    // {rgb_} = color in linear or perceptual color space", "    // if (FXAA_GREEN_AS_LUMA == 0)", "    //     {__a} = luma in perceptual color space (not linear)", "    FxaaTex tex,", "    //", "    // Only used on the optimized 360 version of FXAA Console.", "    // For everything but 360, just use the same input here as for \"tex\".", "    // For 360, same texture, just alias with a 2nd sampler.", "    // This sampler needs to have an exponent bias of -1.", "    FxaaTex fxaaConsole360TexExpBiasNegOne,", "    //", "    // Only used on the optimized 360 version of FXAA Console.", "    // For everything but 360, just use the same input here as for \"tex\".", "    // For 360, same texture, just alias with a 3nd sampler.", "    // This sampler needs to have an exponent bias of -2.", "    FxaaTex fxaaConsole360TexExpBiasNegTwo,", "    //", "    // Only used on FXAA Quality.", "    // This must be from a constant/uniform.", "    // {x_} = 1.0/screenWidthInPixels", "    // {_y} = 1.0/screenHeightInPixels", "    FxaaFloat2 fxaaQualityRcpFrame,", "    //", "    // Only used on FXAA Console.", "    // This must be from a constant/uniform.", "    // This effects sub-pixel AA quality and inversely sharpness.", "    //   Where N ranges between,", "    //     N = 0.50 (default)", "    //     N = 0.33 (sharper)", "    // {x__} = -N/screenWidthInPixels", "    // {_y_} = -N/screenHeightInPixels", "    // {_z_} =  N/screenWidthInPixels", "    // {__w} =  N/screenHeightInPixels", "    FxaaFloat4 fxaaConsoleRcpFrameOpt,", "    //", "    // Only used on FXAA Console.", "    // Not used on 360, but used on PS3 and PC.", "    // This must be from a constant/uniform.", "    // {x__} = -2.0/screenWidthInPixels", "    // {_y_} = -2.0/screenHeightInPixels", "    // {_z_} =  2.0/screenWidthInPixels", "    // {__w} =  2.0/screenHeightInPixels", "    FxaaFloat4 fxaaConsoleRcpFrameOpt2,", "    //", "    // Only used on FXAA Console.", "    // Only used on 360 in place of fxaaConsoleRcpFrameOpt2.", "    // This must be from a constant/uniform.", "    // {x__} =  8.0/screenWidthInPixels", "    // {_y_} =  8.0/screenHeightInPixels", "    // {_z_} = -4.0/screenWidthInPixels", "    // {__w} = -4.0/screenHeightInPixels", "    FxaaFloat4 fxaaConsole360RcpFrameOpt2,", "    //", "    // Only used on FXAA Quality.", "    // This used to be the FXAA_QUALITY_SUBPIX define.", "    // It is here now to allow easier tuning.", "    // Choose the amount of sub-pixel aliasing removal.", "    // This can effect sharpness.", "    //   1.00 - upper limit (softer)", "    //   0.75 - default amount of filtering", "    //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)", "    //   0.25 - almost off", "    //   0.00 - completely off", "    FxaaFloat fxaaQualitySubpix,", "    //", "    // Only used on FXAA Quality.", "    // This used to be the FXAA_QUALITY_EDGE_THRESHOLD define.", "    // It is here now to allow easier tuning.", "    // The minimum amount of local contrast required to apply algorithm.", "    //   0.333 - too little (faster)", "    //   0.250 - low quality", "    //   0.166 - default", "    //   0.125 - high quality", "    //   0.063 - overkill (slower)", "    FxaaFloat fxaaQualityEdgeThreshold,", "    //", "    // Only used on FXAA Quality.", "    // This used to be the FXAA_QUALITY_EDGE_THRESHOLD_MIN define.", "    // It is here now to allow easier tuning.", "    // Trims the algorithm from processing darks.", "    //   0.0833 - upper limit (default, the start of visible unfiltered edges)", "    //   0.0625 - high quality (faster)", "    //   0.0312 - visible limit (slower)", "    // Special notes when using FXAA_GREEN_AS_LUMA,", "    //   Likely want to set this to zero.", "    //   As colors that are mostly not-green", "    //   will appear very dark in the green channel!", "    //   Tune by looking at mostly non-green content,", "    //   then start at zero and increase until aliasing is a problem.", "    FxaaFloat fxaaQualityEdgeThresholdMin,", "    //", "    // Only used on FXAA Console.", "    // This used to be the FXAA_CONSOLE_EDGE_SHARPNESS define.", "    // It is here now to allow easier tuning.", "    // This does not effect PS3, as this needs to be compiled in.", "    //   Use FXAA_CONSOLE_PS3_EDGE_SHARPNESS for PS3.", "    //   Due to the PS3 being ALU bound,", "    //   there are only three safe values here: 2 and 4 and 8.", "    //   These options use the shaders ability to a free *|/ by 2|4|8.", "    // For all other platforms can be a non-power of two.", "    //   8.0 is sharper (default!!!)", "    //   4.0 is softer", "    //   2.0 is really soft (good only for vector graphics inputs)", "    FxaaFloat fxaaConsoleEdgeSharpness,", "    //", "    // Only used on FXAA Console.", "    // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD define.", "    // It is here now to allow easier tuning.", "    // This does not effect PS3, as this needs to be compiled in.", "    //   Use FXAA_CONSOLE_PS3_EDGE_THRESHOLD for PS3.", "    //   Due to the PS3 being ALU bound,", "    //   there are only two safe values here: 1/4 and 1/8.", "    //   These options use the shaders ability to a free *|/ by 2|4|8.", "    // The console setting has a different mapping than the quality setting.", "    // Other platforms can use other values.", "    //   0.125 leaves less aliasing, but is softer (default!!!)", "    //   0.25 leaves more aliasing, and is sharper", "    FxaaFloat fxaaConsoleEdgeThreshold,", "    //", "    // Only used on FXAA Console.", "    // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD_MIN define.", "    // It is here now to allow easier tuning.", "    // Trims the algorithm from processing darks.", "    // The console setting has a different mapping than the quality setting.", "    // This only applies when FXAA_EARLY_EXIT is 1.", "    // This does not apply to PS3,", "    // PS3 was simplified to avoid more shader instructions.", "    //   0.06 - faster but more aliasing in darks", "    //   0.05 - default", "    //   0.04 - slower and less aliasing in darks", "    // Special notes when using FXAA_GREEN_AS_LUMA,", "    //   Likely want to set this to zero.", "    //   As colors that are mostly not-green", "    //   will appear very dark in the green channel!", "    //   Tune by looking at mostly non-green content,", "    //   then start at zero and increase until aliasing is a problem.", "    FxaaFloat fxaaConsoleEdgeThresholdMin,", "    //", "    // Extra constants for 360 FXAA Console only.", "    // Use zeros or anything else for other platforms.", "    // These must be in physical constant registers and NOT immediates.", "    // Immediates will result in compiler un-optimizing.", "    // {xyzw} = float4(1.0, -1.0, 0.25, -0.25)", "    FxaaFloat4 fxaaConsole360ConstDir", ") {", "/*--------------------------------------------------------------------------*/", "    FxaaFloat2 posM;", "    posM.x = pos.x;", "    posM.y = pos.y;", "    #if (FXAA_GATHER4_ALPHA == 1)", "        #if (FXAA_DISCARD == 0)", "            FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);", "            #if (FXAA_GREEN_AS_LUMA == 0)", "                #define lumaM rgbyM.w", "            #else", "                #define lumaM rgbyM.y", "            #endif", "        #endif", "        #if (FXAA_GREEN_AS_LUMA == 0)", "            FxaaFloat4 luma4A = FxaaTexAlpha4(tex, posM);", "            FxaaFloat4 luma4B = FxaaTexOffAlpha4(tex, posM, FxaaInt2(-1, -1));", "        #else", "            FxaaFloat4 luma4A = FxaaTexGreen4(tex, posM);", "            FxaaFloat4 luma4B = FxaaTexOffGreen4(tex, posM, FxaaInt2(-1, -1));", "        #endif", "        #if (FXAA_DISCARD == 1)", "            #define lumaM luma4A.w", "        #endif", "        #define lumaE luma4A.z", "        #define lumaS luma4A.x", "        #define lumaSE luma4A.y", "        #define lumaNW luma4B.w", "        #define lumaN luma4B.z", "        #define lumaW luma4B.x", "    #else", "        FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);", "        #if (FXAA_GREEN_AS_LUMA == 0)", "            #define lumaM rgbyM.w", "        #else", "            #define lumaM rgbyM.y", "        #endif", "        #if (FXAA_GLSL_100 == 1)", "          FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0, 1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 0.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0,-1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 0.0), fxaaQualityRcpFrame.xy));", "        #else", "          FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0, 1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0,-1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));", "        #endif", "    #endif", "/*--------------------------------------------------------------------------*/", "    FxaaFloat maxSM = max(lumaS, lumaM);", "    FxaaFloat minSM = min(lumaS, lumaM);", "    FxaaFloat maxESM = max(lumaE, maxSM);", "    FxaaFloat minESM = min(lumaE, minSM);", "    FxaaFloat maxWN = max(lumaN, lumaW);", "    FxaaFloat minWN = min(lumaN, lumaW);", "    FxaaFloat rangeMax = max(maxWN, maxESM);", "    FxaaFloat rangeMin = min(minWN, minESM);", "    FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;", "    FxaaFloat range = rangeMax - rangeMin;", "    FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);", "    FxaaBool earlyExit = range < rangeMaxClamped;", "/*--------------------------------------------------------------------------*/", "    if(earlyExit)", "        #if (FXAA_DISCARD == 1)", "            FxaaDiscard;", "        #else", "            return rgbyM;", "        #endif", "/*--------------------------------------------------------------------------*/", "    #if (FXAA_GATHER4_ALPHA == 0)", "        #if (FXAA_GLSL_100 == 1)", "          FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0,-1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0,-1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 1.0), fxaaQualityRcpFrame.xy));", "        #else", "          FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1,-1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1,-1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));", "        #endif", "    #else", "        FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));", "        FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));", "    #endif", "/*--------------------------------------------------------------------------*/", "    FxaaFloat lumaNS = lumaN + lumaS;", "    FxaaFloat lumaWE = lumaW + lumaE;", "    FxaaFloat subpixRcpRange = 1.0/range;", "    FxaaFloat subpixNSWE = lumaNS + lumaWE;", "    FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;", "    FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat lumaNESE = lumaNE + lumaSE;", "    FxaaFloat lumaNWNE = lumaNW + lumaNE;", "    FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;", "    FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat lumaNWSW = lumaNW + lumaSW;", "    FxaaFloat lumaSWSE = lumaSW + lumaSE;", "    FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);", "    FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);", "    FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;", "    FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;", "    FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;", "    FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;", "    FxaaFloat lengthSign = fxaaQualityRcpFrame.x;", "    FxaaBool horzSpan = edgeHorz >= edgeVert;", "    FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;", "/*--------------------------------------------------------------------------*/", "    if(!horzSpan) lumaN = lumaW;", "    if(!horzSpan) lumaS = lumaE;", "    if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;", "    FxaaFloat subpixB = (subpixA * (1.0/12.0)) - lumaM;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat gradientN = lumaN - lumaM;", "    FxaaFloat gradientS = lumaS - lumaM;", "    FxaaFloat lumaNN = lumaN + lumaM;", "    FxaaFloat lumaSS = lumaS + lumaM;", "    FxaaBool pairN = abs(gradientN) >= abs(gradientS);", "    FxaaFloat gradient = max(abs(gradientN), abs(gradientS));", "    if(pairN) lengthSign = -lengthSign;", "    FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);", "/*--------------------------------------------------------------------------*/", "    FxaaFloat2 posB;", "    posB.x = posM.x;", "    posB.y = posM.y;", "    FxaaFloat2 offNP;", "    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;", "    offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;", "    if(!horzSpan) posB.x += lengthSign * 0.5;", "    if( horzSpan) posB.y += lengthSign * 0.5;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat2 posN;", "    posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;", "    posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;", "    FxaaFloat2 posP;", "    posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;", "    posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;", "    FxaaFloat subpixD = ((-2.0)*subpixC) + 3.0;", "    FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));", "    FxaaFloat subpixE = subpixC * subpixC;", "    FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));", "/*--------------------------------------------------------------------------*/", "    if(!pairN) lumaNN = lumaSS;", "    FxaaFloat gradientScaled = gradient * 1.0/4.0;", "    FxaaFloat lumaMM = lumaM - lumaNN * 0.5;", "    FxaaFloat subpixF = subpixD * subpixE;", "    FxaaBool lumaMLTZero = lumaMM < 0.0;", "/*--------------------------------------------------------------------------*/", "    lumaEndN -= lumaNN * 0.5;", "    lumaEndP -= lumaNN * 0.5;", "    FxaaBool doneN = abs(lumaEndN) >= gradientScaled;", "    FxaaBool doneP = abs(lumaEndP) >= gradientScaled;", "    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;", "    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;", "    FxaaBool doneNP = (!doneN) || (!doneP);", "    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;", "    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;", "/*--------------------------------------------------------------------------*/", "    if(doneNP) {", "        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "        doneN = abs(lumaEndN) >= gradientScaled;", "        doneP = abs(lumaEndP) >= gradientScaled;", "        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;", "        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;", "        doneNP = (!doneN) || (!doneP);", "        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;", "        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;", "/*--------------------------------------------------------------------------*/", "        #if (FXAA_QUALITY_PS > 3)", "        if(doneNP) {", "            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "            doneN = abs(lumaEndN) >= gradientScaled;", "            doneP = abs(lumaEndP) >= gradientScaled;", "            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;", "            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;", "            doneNP = (!doneN) || (!doneP);", "            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;", "            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;", "/*--------------------------------------------------------------------------*/", "            #if (FXAA_QUALITY_PS > 4)", "            if(doneNP) {", "                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                doneN = abs(lumaEndN) >= gradientScaled;", "                doneP = abs(lumaEndP) >= gradientScaled;", "                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;", "                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;", "                doneNP = (!doneN) || (!doneP);", "                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;", "                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;", "/*--------------------------------------------------------------------------*/", "                #if (FXAA_QUALITY_PS > 5)", "                if(doneNP) {", "                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                    doneN = abs(lumaEndN) >= gradientScaled;", "                    doneP = abs(lumaEndP) >= gradientScaled;", "                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;", "                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;", "                    doneNP = (!doneN) || (!doneP);", "                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;", "                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;", "/*--------------------------------------------------------------------------*/", "                    #if (FXAA_QUALITY_PS > 6)", "                    if(doneNP) {", "                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                        doneN = abs(lumaEndN) >= gradientScaled;", "                        doneP = abs(lumaEndP) >= gradientScaled;", "                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;", "                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;", "                        doneNP = (!doneN) || (!doneP);", "                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;", "                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;", "/*--------------------------------------------------------------------------*/", "                        #if (FXAA_QUALITY_PS > 7)", "                        if(doneNP) {", "                            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                            doneN = abs(lumaEndN) >= gradientScaled;", "                            doneP = abs(lumaEndP) >= gradientScaled;", "                            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;", "                            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;", "                            doneNP = (!doneN) || (!doneP);", "                            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;", "                            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;", "/*--------------------------------------------------------------------------*/", "    #if (FXAA_QUALITY_PS > 8)", "    if(doneNP) {", "        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "        doneN = abs(lumaEndN) >= gradientScaled;", "        doneP = abs(lumaEndP) >= gradientScaled;", "        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;", "        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;", "        doneNP = (!doneN) || (!doneP);", "        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;", "        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;", "/*--------------------------------------------------------------------------*/", "        #if (FXAA_QUALITY_PS > 9)", "        if(doneNP) {", "            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "            doneN = abs(lumaEndN) >= gradientScaled;", "            doneP = abs(lumaEndP) >= gradientScaled;", "            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;", "            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;", "            doneNP = (!doneN) || (!doneP);", "            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;", "            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;", "/*--------------------------------------------------------------------------*/", "            #if (FXAA_QUALITY_PS > 10)", "            if(doneNP) {", "                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                doneN = abs(lumaEndN) >= gradientScaled;", "                doneP = abs(lumaEndP) >= gradientScaled;", "                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;", "                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;", "                doneNP = (!doneN) || (!doneP);", "                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;", "                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;", "/*--------------------------------------------------------------------------*/", "                #if (FXAA_QUALITY_PS > 11)", "                if(doneNP) {", "                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                    doneN = abs(lumaEndN) >= gradientScaled;", "                    doneP = abs(lumaEndP) >= gradientScaled;", "                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;", "                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;", "                    doneNP = (!doneN) || (!doneP);", "                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;", "                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;", "/*--------------------------------------------------------------------------*/", "                    #if (FXAA_QUALITY_PS > 12)", "                    if(doneNP) {", "                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                        doneN = abs(lumaEndN) >= gradientScaled;", "                        doneP = abs(lumaEndP) >= gradientScaled;", "                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;", "                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;", "                        doneNP = (!doneN) || (!doneP);", "                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;", "                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;", "/*--------------------------------------------------------------------------*/", "                    }", "                    #endif", "/*--------------------------------------------------------------------------*/", "                }", "                #endif", "/*--------------------------------------------------------------------------*/", "            }", "            #endif", "/*--------------------------------------------------------------------------*/", "        }", "        #endif", "/*--------------------------------------------------------------------------*/", "    }", "    #endif", "/*--------------------------------------------------------------------------*/", "                        }", "                        #endif", "/*--------------------------------------------------------------------------*/", "                    }", "                    #endif", "/*--------------------------------------------------------------------------*/", "                }", "                #endif", "/*--------------------------------------------------------------------------*/", "            }", "            #endif", "/*--------------------------------------------------------------------------*/", "        }", "        #endif", "/*--------------------------------------------------------------------------*/", "    }", "/*--------------------------------------------------------------------------*/", "    FxaaFloat dstN = posM.x - posN.x;", "    FxaaFloat dstP = posP.x - posM.x;", "    if(!horzSpan) dstN = posM.y - posN.y;", "    if(!horzSpan) dstP = posP.y - posM.y;", "/*--------------------------------------------------------------------------*/", "    FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;", "    FxaaFloat spanLength = (dstP + dstN);", "    FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;", "    FxaaFloat spanLengthRcp = 1.0/spanLength;", "/*--------------------------------------------------------------------------*/", "    FxaaBool directionN = dstN < dstP;", "    FxaaFloat dst = min(dstN, dstP);", "    FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;", "    FxaaFloat subpixG = subpixF * subpixF;", "    FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;", "    FxaaFloat subpixH = subpixG * fxaaQualitySubpix;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;", "    FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);", "    if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;", "    if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;", "    #if (FXAA_DISCARD == 1)", "        return FxaaTexTop(tex, posM);", "    #else", "        return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);", "    #endif", "}", "/*==========================================================================*/", "#endif", "", "void main() {", "  gl_FragColor = FxaaPixelShader(", "    vUv,", "    vec4(0.0),", "    tDiffuse,", "    tDiffuse,", "    tDiffuse,", "    resolution,", "    vec4(0.0),", "    vec4(0.0),", "    vec4(0.0),", "    0.75,", "    0.166,", "    0.0833,", "    0.0,", "    0.0,", "    0.0,", "    vec4(0.0)", "  );", "", "  // TODO avoid querying texture twice for same texel", "  gl_FragColor.a = texture2D(tDiffuse, vUv).a;", "}"].join("\n")
};
/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.EffectComposer = function (renderer, renderTarget) {
  this.renderer = renderer;

  if (renderTarget === undefined) {
    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    };
    var size = renderer.getDrawingBufferSize(new THREE.Vector2());
    renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, parameters);
    renderTarget.texture.name = 'EffectComposer.rt1';
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();
  this.renderTarget2.texture.name = 'EffectComposer.rt2';
  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;
  this.renderToScreen = true;
  this.passes = []; // dependencies

  if (THREE.CopyShader === undefined) {
    console.error('THREE.EffectComposer relies on THREE.CopyShader');
  }

  if (THREE.ShaderPass === undefined) {
    console.error('THREE.EffectComposer relies on THREE.ShaderPass');
  }

  this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
  this._previousFrameTime = Date.now();
};

Object.assign(THREE.EffectComposer.prototype, {
  swapBuffers: function swapBuffers() {
    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  },
  addPass: function addPass(pass) {
    this.passes.push(pass);
    var size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    pass.setSize(size.width, size.height);
  },
  insertPass: function insertPass(pass, index) {
    this.passes.splice(index, 0, pass);
  },
  isLastEnabledPass: function isLastEnabledPass(passIndex) {
    for (var i = passIndex + 1; i < this.passes.length; i++) {
      if (this.passes[i].enabled) {
        return false;
      }
    }

    return true;
  },
  render: function render(deltaTime) {
    // deltaTime value is in seconds
    if (deltaTime === undefined) {
      deltaTime = (Date.now() - this._previousFrameTime) * 0.001;
    }

    this._previousFrameTime = Date.now();
    var currentRenderTarget = this.renderer.getRenderTarget();
    var maskActive = false;
    var pass,
        i,
        il = this.passes.length;

    for (i = 0; i < il; i++) {
      pass = this.passes[i];
      if (pass.enabled === false) continue;
      pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
      pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);

      if (pass.needsSwap) {
        if (maskActive) {
          var context = this.renderer.context;
          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);
          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);
          context.stencilFunc(context.EQUAL, 1, 0xffffffff);
        }

        this.swapBuffers();
      }

      if (THREE.MaskPass !== undefined) {
        if (pass instanceof THREE.MaskPass) {
          maskActive = true;
        } else if (pass instanceof THREE.ClearMaskPass) {
          maskActive = false;
        }
      }
    }

    this.renderer.setRenderTarget(currentRenderTarget);
  },
  reset: function reset(renderTarget) {
    if (renderTarget === undefined) {
      var size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(size.width, size.height);
    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  },
  setSize: function setSize(width, height) {
    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);

    for (var i = 0; i < this.passes.length; i++) {
      this.passes[i].setSize(width, height);
    }
  }
});

THREE.Pass = function () {
  // if set to true, the pass is processed by the composer
  this.enabled = true; // if set to true, the pass indicates to swap read and write buffer after rendering

  this.needsSwap = true; // if set to true, the pass clears its buffer before rendering

  this.clear = false; // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.

  this.renderToScreen = false;
};

Object.assign(THREE.Pass.prototype, {
  setSize: function setSize(width, height) {},
  render: function render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    console.error('THREE.Pass: .render() must be implemented in derived pass.');
  }
}); // Helper for passes that need to fill the viewport with a single quad.

THREE.Pass.FullScreenQuad = function () {
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var geometry = new THREE.PlaneBufferGeometry(2, 2);

  var FullScreenQuad = function FullScreenQuad(material) {
    this._mesh = new THREE.Mesh(geometry, material);
  };

  Object.defineProperty(FullScreenQuad.prototype, 'material', {
    get: function get() {
      return this._mesh.material;
    },
    set: function set(value) {
      this._mesh.material = value;
    }
  });
  Object.assign(FullScreenQuad.prototype, {
    render: function render(renderer) {
      renderer.render(this._mesh, camera);
    }
  });
  return FullScreenQuad;
}();
/**
 * @author alteredq / http://alteredqualia.com/
 */


THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {
  THREE.Pass.call(this);
  this.scene = scene;
  this.camera = camera;
  this.overrideMaterial = overrideMaterial;
  this.clearColor = clearColor;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
  this.clear = true;
  this.clearDepth = false;
  this.needsSwap = false;
};

THREE.RenderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.RenderPass,
  render: function render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    this.scene.overrideMaterial = this.overrideMaterial;
    var oldClearColor, oldClearAlpha;

    if (this.clearColor) {
      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    if (this.clearDepth) {
      renderer.clearDepth();
    }

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

    if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    renderer.render(this.scene, this.camera);

    if (this.clearColor) {
      renderer.setClearColor(oldClearColor, oldClearAlpha);
    }

    this.scene.overrideMaterial = null;
    renderer.autoClear = oldAutoClear;
  }
});
/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function (shader, textureID) {
  THREE.Pass.call(this);
  this.textureID = textureID !== undefined ? textureID : "tDiffuse";

  if (shader instanceof THREE.ShaderMaterial) {
    this.uniforms = shader.uniforms;
    this.material = shader;
  } else if (shader) {
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    this.material = new THREE.ShaderMaterial({
      defines: Object.assign({}, shader.defines),
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    });
  }

  this.fsQuad = new THREE.Pass.FullScreenQuad(this.material);
};

THREE.ShaderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.ShaderPass,
  render: function render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = readBuffer.texture;
    }

    this.fsQuad.material = this.material;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

      if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
      this.fsQuad.render(renderer);
    }
  }
});
/* global THREE */
// equivalent of: WEBOTS_HOME/resources/wren/shaders/hdr_resolve.frag

THREE.HDRResolveShader = {
  uniforms: {
    'tDiffuse': {
      value: null
    },
    'exposure': {
      value: 1.0
    }
  },
  defines: {
    'GAMMA': 2.2
  },
  vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );', '}'].join('\n'),
  fragmentShader: ['uniform sampler2D tDiffuse;', 'uniform float gamma;', 'uniform float exposure;', 'varying vec2 vUv;', 'void main() {', '  vec4 tex = texture2D( tDiffuse, vec2( vUv.x, vUv.y ) );', '  vec3 mapped = vec3(1.0) - exp(-tex.xyz * exposure);', '  mapped = pow(mapped, vec3(1.0 / GAMMA));', '  gl_FragColor = vec4(mapped, 1.0);', '}'].join('\n')
};
/* global THREE */
// equivalent of: WEBOTS_HOME/resources/wren/shaders/bright_pass.frag

THREE.brightPassShader = {
  uniforms: {
    'tDiffuse': {
      value: null
    },
    'threshold': {
      value: 21.0
    },
    'textureSize': {
      value: new THREE.Vector2(800, 600)
    }
  },
  vertexShader: ['varying vec2 texUv;', 'void main() {', '  texUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );', '}'].join('\n'),
  fragmentShader: ['uniform sampler2D tDiffuse;', 'uniform float threshold;', 'uniform vec2 textureSize;', 'varying vec2 texUv;', 'float luma(vec3 color) {', '  return dot(color, vec3(0.299, 0.587, 0.114));', '}', 'bool isnan(float val) {', '  return (val <= 0.0 || 0.0 <= val) ? false : true;', '}', 'void main() {', '  vec4 color = texture2D( tDiffuse, texUv );', '  float totalLuma = luma( color.xyz );', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(0, 1) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(0, -1) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(-1, 0) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(1, 0) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(1, 1) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(1, -1) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(-1, 1) / textureSize).rgb);', '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(-1, -1) / textureSize).rgb);', '  totalLuma /= 9.0;', ' if (totalLuma < threshold)', '   gl_FragColor = vec4(vec3(0.0), 1.0);', ' else {', '   gl_FragColor.r = min(color.r, 4000.0);', '   gl_FragColor.g = min(color.g, 4000.0);', '   gl_FragColor.b = min(color.b, 4000.0);', '   gl_FragColor.a = 1.0;', ' }', '}'].join('\n')
};
/* global THREE */
// equivalent of: WEBOTS_HOME/resources/wren/shaders/blend_bloom.frag

THREE.blendBloomShader = {
  uniforms: {
    'blurTexture1': {
      value: null
    },
    'blurTexture2': {
      value: null
    },
    'blurTexture3': {
      value: null
    },
    'blurTexture4': {
      value: null
    },
    'blurTexture5': {
      value: null
    },
    'blurTexture6': {
      value: null
    }
  },
  vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
  fragmentShader: ['varying vec2 vUv;', 'uniform sampler2D blurTexture1;', 'uniform sampler2D blurTexture2;', 'uniform sampler2D blurTexture3;', 'uniform sampler2D blurTexture4;', 'uniform sampler2D blurTexture5;', 'uniform sampler2D blurTexture6;', 'void main() {', '  gl_FragColor = vec4(0.1 * vec3(', '    0.1 * texture2D(blurTexture1, vUv).rgb + ', '    0.2 * texture2D(blurTexture2, vUv).rgb + ', '    0.4 * texture2D(blurTexture3, vUv).rgb + ', '    0.8 * texture2D(blurTexture4, vUv).rgb + ', '    1.6 * texture2D(blurTexture5, vUv).rgb + ', '    3.2 * texture2D(blurTexture6, vUv).rgb', '  ), 1.0);', '}'].join('\n')
};
/* global THREE */
// equivalent of: WEBOTS_HOME/resources/wren/shaders/gaussian_blur_13_tap.frag

THREE.gaussianBlur13Tap = {
  defines: {
    'KERNEL_RADIUS': 1,
    'SIGMA': 1
  },
  uniforms: {
    'colorTexture': {
      value: null
    },
    'texSize': {
      value: new THREE.Vector2(0.5, 0.5)
    },
    'direction': {
      value: new THREE.Vector2(0.5, 0.5)
    }
  },
  vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
  fragmentShader: ['varying vec2 vUv;', 'uniform sampler2D colorTexture;', 'uniform vec2 texSize;', 'uniform vec2 direction;', 'float gaussianPdf(in float x, in float sigma) {', '  return 0.39894 * exp(-0.5 * x * x/(sigma * sigma))/sigma;', '}', 'void main() {', '  vec2 invSize = 1.0 / texSize;', '  float fSigma = float(SIGMA);', '  float weightSum = gaussianPdf(0.0, fSigma);', '  vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * weightSum;', '  for(int i = 1; i < KERNEL_RADIUS; i ++) {', '    float x = float(i);', '    float w = gaussianPdf(x, fSigma);', '    vec2 uvOffset = direction * invSize * x;', '    vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;', '    vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;', '    diffuseSum += (sample1 + sample2) * w;', '    weightSum += 2.0 * w;', '  }', '  gl_FragColor = vec4(diffuseSum/weightSum, 1.0);', '}'].join('\n')
};
/* global THREE */

THREE.Bloom =
/*#__PURE__*/
function (_THREE$Pass) {
  _inherits(Bloom, _THREE$Pass);

  function Bloom() {
    var _this;

    var resolution = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new THREE.Vector2(256, 256);
    var threshold = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 21.0;

    _classCallCheck(this, Bloom);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Bloom).call(this));
    _this.threshold = threshold;
    _this.resolution = resolution.clone(); // create color only once here, reuse it later inside the render function

    _this.clearColor = new THREE.Color(0, 0, 0); // render targets

    var pars = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    };
    _this.renderTargetsHorizontal = [];
    _this.renderTargetsVertical = [];
    var resx = Math.round(_this.resolution.x / 2);
    var resy = Math.round(_this.resolution.y / 2);
    _this.renderTargetBright = new THREE.WebGLRenderTarget(resx, resy, pars);
    _this.renderTargetBright.texture.name = 'Bloom.bright';
    _this.renderTargetBright.texture.generateMipmaps = false;

    for (var i = 0; i < 6; i++) {
      var renderTargetHorizonal = new THREE.WebGLRenderTarget(resx, resy, pars);
      renderTargetHorizonal.texture.name = 'Bloom.h' + i;
      renderTargetHorizonal.texture.generateMipmaps = false;

      _this.renderTargetsHorizontal.push(renderTargetHorizonal);

      var renderTargetVertical = new THREE.WebGLRenderTarget(resx, resy, pars);
      renderTargetVertical.texture.name = 'Bloom.v' + i;
      renderTargetVertical.texture.generateMipmaps = false;

      _this.renderTargetsVertical.push(renderTargetVertical);

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    } // luminosity high pass material


    if (THREE.brightPassShader === undefined) console.error('Bloom relies on THREE.brightPassShader');
    var brightPassShader = THREE.brightPassShader;
    _this.brightPassUniforms = THREE.UniformsUtils.clone(brightPassShader.uniforms);
    _this.brightPassUniforms['threshold'].value = _this.threshold;
    _this.brightPassUniforms['textureSize'].value = _this.resolution;
    _this.materialBrightPass = new THREE.ShaderMaterial({
      uniforms: _this.brightPassUniforms,
      vertexShader: brightPassShader.vertexShader,
      fragmentShader: brightPassShader.fragmentShader,
      defines: {}
    }); // Gaussian Blur Materials

    if (THREE.gaussianBlur13Tap === undefined) console.error('Bloom relies on THREE.gaussianBlur13Tap');
    _this.separableBlurMaterials = [];
    resx = Math.round(_this.resolution.x / 2);
    resy = Math.round(_this.resolution.y / 2);

    for (var _i = 0; _i < 6; _i++) {
      _this.separableBlurMaterials.push(new THREE.ShaderMaterial(THREE.gaussianBlur13Tap));

      _this.separableBlurMaterials[_i].uniforms['texSize'].value = new THREE.Vector2(resx, resy);
      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    } // Composite material


    if (THREE.brightPassShader === undefined) console.error('Bloom relies on THREE.blendBloomShader');
    _this.compositeMaterial = new THREE.ShaderMaterial(THREE.blendBloomShader);
    _this.compositeMaterial.uniforms['blurTexture1'].value = _this.renderTargetsVertical[0].texture;
    _this.compositeMaterial.uniforms['blurTexture2'].value = _this.renderTargetsVertical[1].texture;
    _this.compositeMaterial.uniforms['blurTexture3'].value = _this.renderTargetsVertical[2].texture;
    _this.compositeMaterial.uniforms['blurTexture4'].value = _this.renderTargetsVertical[3].texture;
    _this.compositeMaterial.uniforms['blurTexture5'].value = _this.renderTargetsVertical[4].texture;
    _this.compositeMaterial.uniforms['blurTexture6'].value = _this.renderTargetsVertical[5].texture;
    _this.compositeMaterial.needsUpdate = true; // copy material

    if (THREE.CopyShader === undefined) console.error('THREE.BloomPass relies on THREE.CopyShader');
    var copyShader = THREE.CopyShader;
    _this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
    _this.copyUniforms['opacity'].value = 1.0;
    _this.materialCopy = new THREE.ShaderMaterial({
      uniforms: _this.copyUniforms,
      vertexShader: copyShader.vertexShader,
      fragmentShader: copyShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });
    _this.enabled = true;
    _this.needsSwap = false;
    _this.oldClearColor = new THREE.Color();
    _this.oldClearAlpha = 1;
    _this.basic = new THREE.MeshBasicMaterial();
    _this.fsQuad = new THREE.Pass.FullScreenQuad(null);
    return _this;
  }

  _createClass(Bloom, [{
    key: "dispose",
    value: function dispose() {
      for (var i = 0; i < this.renderTargetsHorizontal.length; i++) {
        this.renderTargetsHorizontal[i].dispose();
      }

      for (var _i2 = 0; _i2 < this.renderTargetsVertical.length; _i2++) {
        this.renderTargetsVertical[_i2].dispose();
      }

      this.renderTargetBright.dispose();
    }
  }, {
    key: "setSize",
    value: function setSize(width, height) {
      var resx = Math.round(width / 2);
      var resy = Math.round(height / 2);
      this.renderTargetBright.setSize(resx, resy);
      this.brightPassUniforms['textureSize'].value = new THREE.Vector2(width, height);

      for (var i = 0; i < 6; i++) {
        this.renderTargetsHorizontal[i].setSize(resx, resy);
        this.renderTargetsVertical[i].setSize(resx, resy);
        this.separableBlurMaterials[i].uniforms['texSize'].value = new THREE.Vector2(resx, resy);
        resx = Math.round(resx / 2);
        resy = Math.round(resy / 2);
      }
    }
  }, {
    key: "render",
    value: function render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
      this.oldClearColor.copy(renderer.getClearColor());
      this.oldClearAlpha = renderer.getClearAlpha();
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setClearColor(this.clearColor, 0);
      if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST); // Render input to screen

      if (this.renderToScreen) {
        this.fsQuad.material = this.basic;
        this.basic.map = readBuffer.texture;
        renderer.setRenderTarget(null);
        renderer.clear();
        this.fsQuad.render(renderer);
      } // 1. Extract Bright Areas


      this.brightPassUniforms['tDiffuse'].value = readBuffer.texture;
      this.brightPassUniforms['threshold'].value = this.threshold;
      this.fsQuad.material = this.materialBrightPass;
      renderer.setRenderTarget(this.renderTargetBright);
      renderer.clear();
      this.fsQuad.render(renderer);
      /*
      // Code to debug bloom passes.
      if (this.debugMaterial) {
        var width = renderer.getSize().x / 2;
        var height = renderer.getSize().y / 2;
        var texture = new THREE.DataTexture(undefined, width, height, THREE.RGBFormat);
        texture.needsUpdate = true;
        renderer.copyFramebufferToTexture(new THREE.Vector2(), texture);
        this.debugMaterial.map = texture;
        this.debugMaterial.needsUpdate = true;
      }
      */
      // 2. Blur All the mips progressively

      var inputRenderTarget = this.renderTargetBright;

      for (var i = 0; i < 6; i++) {
        this.fsQuad.material = this.separableBlurMaterials[i];
        this.separableBlurMaterials[i].uniforms['colorTexture'].value = inputRenderTarget.texture;
        this.separableBlurMaterials[i].uniforms['direction'].value = new THREE.Vector2(1.0, 0.0);
        renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
        renderer.clear();
        this.fsQuad.render(renderer);
        this.separableBlurMaterials[i].uniforms['colorTexture'].value = this.renderTargetsHorizontal[i].texture;
        this.separableBlurMaterials[i].uniforms['direction'].value = new THREE.Vector2(0.0, 1.0);
        renderer.setRenderTarget(this.renderTargetsVertical[i]);
        renderer.clear();
        this.fsQuad.render(renderer);
        inputRenderTarget = this.renderTargetsVertical[i];
      } // Composite All the mips


      this.fsQuad.material = this.compositeMaterial;
      renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
      renderer.clear();
      this.fsQuad.render(renderer); // Blend it additively over the input texture

      this.fsQuad.material = this.materialCopy;
      this.copyUniforms['tDiffuse'].value = this.renderTargetsHorizontal[0].texture;
      if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);

      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
        this.fsQuad.render(renderer);
      } else {
        renderer.setRenderTarget(readBuffer);
        this.fsQuad.render(renderer);
      } // Restore renderer settings


      renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
      renderer.autoClear = oldAutoClear;
    }
  }]);

  return Bloom;
}(THREE.Pass);
/* global THREE */


'use strict'; // Inspiration:
// https://github.com/lkolbly/threejs-x3dloader/blob/master/X3DLoader.js
// @author https://github.com/brianxu


THREE.FaceIDShader = {
  vertexShader: ['attribute float id;', 'uniform float size;', 'uniform float scale;', 'uniform float baseId;', 'varying vec4 worldId;', 'void main() {', '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);', '  gl_PointSize = size * (scale / length(mvPosition.xyz));', '  float i = baseId + id;', '  vec3 a = fract(vec3(1.0 / 255.0, 1.0 / (255.0 * 255.0), 1.0 / (255.0 * 255.0 * 255.0)) * i);', '  a -= a.xxy * vec3(0.0, 1.0 / 255.0, 1.0 / 255.0);', '  worldId = vec4(a, 1);', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
  fragmentShader: ['#ifdef GL_ES', 'precision highp float;', '#endif', 'varying vec4 worldId;', 'void main() {', '  gl_FragColor = worldId;', '}'].join('\n')
};

THREE.FaceIDMaterial =
/*#__PURE__*/
function (_THREE$ShaderMaterial) {
  _inherits(FaceIDMaterial, _THREE$ShaderMaterial);

  function FaceIDMaterial() {
    _classCallCheck(this, FaceIDMaterial);

    return _possibleConstructorReturn(this, _getPrototypeOf(FaceIDMaterial).call(this, {
      uniforms: {
        baseId: {
          type: 'f',
          value: 0
        },
        size: {
          type: 'f',
          value: 0.01
        },
        scale: {
          type: 'f',
          value: 400
        }
      },
      vertexShader: THREE.FaceIDShader.vertexShader,
      fragmentShader: THREE.FaceIDShader.fragmentShader
    }));
  }

  _createClass(FaceIDMaterial, [{
    key: "setBaseID",
    value: function setBaseID(baseId) {
      this.uniforms.baseId.value = baseId;
    }
  }, {
    key: "setPointSize",
    value: function setPointSize(size) {
      this.uniforms.size.value = size;
    }
  }, {
    key: "setPointScale",
    value: function setPointScale(scale) {
      this.uniforms.scale.value = scale;
    }
  }]);

  return FaceIDMaterial;
}(THREE.ShaderMaterial);

THREE.GPUPicker =
/*#__PURE__*/
function () {
  function GPUPicker() {
    var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, GPUPicker);

    this.pickingScene = new THREE.Scene();
    this.pickingTexture = new THREE.WebGLRenderTarget();
    this.pickingTexture.texture.minFilter = THREE.LinearFilter;
    this.pickingTexture.texture.generateMipmaps = false;
    this.lineShell = typeof option.lineShell !== 'undefined' ? option.lineShell : 4;
    this.pointShell = typeof option.pointShell !== 'undefined' ? option.pointShell : 0.1;
    this.needUpdate = true;
    if (option.renderer) this.setRenderer(option.renderer); // array of original objects

    this.container = [];
    this.objectsMap = {}; // default filter

    this.setFilter();
  }

  _createClass(GPUPicker, [{
    key: "setRenderer",
    value: function setRenderer(renderer) {
      this.renderer = renderer;
      var size = new THREE.Vector2();
      renderer.getSize(size);
      this.resizeTexture(size.x, size.y);
      this.needUpdate = true;
    }
  }, {
    key: "resizeTexture",
    value: function resizeTexture(width, height) {
      this.pickingTexture.setSize(width, height);
      this.pixelBuffer = new Uint8Array(4 * width * height);
      this.needUpdate = true;
    }
  }, {
    key: "setCamera",
    value: function setCamera(camera) {
      this.camera = camera;
      this.needUpdate = true;
    }
  }, {
    key: "update",
    value: function update() {
      if (this.needUpdate) {
        var rt = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.pickingTexture);
        this.renderer.render(this.pickingScene, this.camera); // read the rendering texture

        this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, this.pickingTexture.width, this.pickingTexture.height, this.pixelBuffer);
        this.renderer.setRenderTarget(rt);
        this.needUpdate = false;
      }
    }
  }, {
    key: "setFilter",
    value: function setFilter(func) {
      if (func instanceof Function) this.filterFunc = func;else {
        // default filter
        this.filterFunc = function (object) {
          return true;
        };
      }
    }
  }, {
    key: "setScene",
    value: function setScene(scene) {
      this.pickingScene = scene.clone();

      this._processObject(this.pickingScene, 0);

      this.needUpdate = true;
    }
  }, {
    key: "pick",
    value: function pick(mouse, raycaster) {
      this.update();
      var index = mouse.x + (this.pickingTexture.height - mouse.y) * this.pickingTexture.width; // interpret the pixel as an ID

      var id = this.pixelBuffer[index * 4 + 2] * 255 * 255 + this.pixelBuffer[index * 4 + 1] * 255 + this.pixelBuffer[index * 4 + 0];

      var result = this._getObject(this.pickingScene, 0, id);

      var object = result[1];
      var elementId = id - result[0];

      if (object) {
        if (object.raycastWithID) {
          var intersect = object.raycastWithID(elementId, raycaster);
          if (intersect) intersect.object = object.originalObject;
          return intersect;
        }
      }
    } // get object by id

  }, {
    key: "_getObject",
    value: function _getObject(object, baseId, id) {
      if (typeof object.elementsCount !== 'undefined' && id >= baseId && id < baseId + object.elementsCount) return [baseId, object];
      if (typeof object.elementsCount !== 'undefined') baseId += object.elementsCount;
      var result = [baseId, undefined];

      for (var i = 0; i < object.children.length; i++) {
        result = this._getObject(object.children[i], result[0], id);
        if (result[1] !== undefined) break;
      }

      return result;
    } // process the object to add elementId information

  }, {
    key: "_processObject",
    value: function _processObject(object, baseId) {
      baseId += this._addElementID(object, baseId);

      for (var i = 0; i < object.children.length; i++) {
        baseId = this._processObject(object.children[i], baseId);
      }

      return baseId;
    }
  }, {
    key: "_addElementID",
    value: function _addElementID(object, baseId) {
      if (!this.filterFunc(object) && typeof object.geometry !== 'undefined') {
        object.visible = false;
        return 0;
      }

      if (object.geometry) {
        var __pickingGeometry; // check if geometry has cached geometry for picking


        if (object.geometry.__pickingGeometry) __pickingGeometry = object.geometry.__pickingGeometry;else {
          __pickingGeometry = object.geometry; // convert geometry to buffer geometry

          if (object.geometry instanceof THREE.Geometry) __pickingGeometry = new THREE.BufferGeometry().setFromObject(object);
          var units = 1;
          if (object instanceof THREE.Points) units = 1;else if (object instanceof THREE.Line) units = 2;else if (object instanceof THREE.Mesh) units = 3;
          var el, el3, elementsCount, i, indices, positionBuffer, vertex3, verts, vertexIndex3;

          if (__pickingGeometry.index !== null) {
            __pickingGeometry = __pickingGeometry.clone();
            indices = __pickingGeometry.index.array;
            verts = __pickingGeometry.attributes.position.array;
            delete __pickingGeometry.attributes.position;
            __pickingGeometry.index = null;
            delete __pickingGeometry.attributes.normal;
            elementsCount = indices.length / units;
            positionBuffer = new Float32Array(elementsCount * 3 * units);

            __pickingGeometry.addAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));

            for (el = 0; el < elementsCount; ++el) {
              el3 = units * el;

              for (i = 0; i < units; ++i) {
                vertexIndex3 = 3 * indices[el3 + i];
                vertex3 = 3 * (el3 + i);
                positionBuffer[vertex3] = verts[vertexIndex3];
                positionBuffer[vertex3 + 1] = verts[vertexIndex3 + 1];
                positionBuffer[vertex3 + 2] = verts[vertexIndex3 + 2];
              }
            }

            __pickingGeometry.computeVertexNormals();
          }

          if (object instanceof THREE.Line && !(object instanceof THREE.LineSegments)) {
            verts = __pickingGeometry.attributes.position.array;
            delete __pickingGeometry.attributes.position;
            elementsCount = verts.length / 3 - 1;
            positionBuffer = new Float32Array(elementsCount * units * 3);

            __pickingGeometry.addAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));

            for (el = 0; el < elementsCount; ++el) {
              el3 = 3 * el;
              vertexIndex3 = el3;
              vertex3 = el3 * 2;
              positionBuffer[vertex3] = verts[vertexIndex3];
              positionBuffer[vertex3 + 1] = verts[vertexIndex3 + 1];
              positionBuffer[vertex3 + 2] = verts[vertexIndex3 + 2];
              positionBuffer[vertex3 + 3] = verts[vertexIndex3 + 3];
              positionBuffer[vertex3 + 4] = verts[vertexIndex3 + 4];
              positionBuffer[vertex3 + 5] = verts[vertexIndex3 + 5];
            }

            __pickingGeometry.computeVertexNormals(); // make the renderer render as line segments


            object.__proto__ = THREE.LineSegments.prototype; // eslint-disable-line
          }

          var attributes = __pickingGeometry.attributes;
          var positions = attributes.position.array;
          var vertexCount = positions.length / 3;
          var ids = new THREE.Float32BufferAttribute(vertexCount, 1); // set vertex id color

          for (var _i3 = 0, il = vertexCount / units; _i3 < il; _i3++) {
            for (var j = 0; j < units; ++j) {
              ids.array[_i3 * units + j] = _i3;
            }
          }

          __pickingGeometry.addAttribute('id', ids);

          __pickingGeometry.elementsCount = vertexCount / units; // cache __pickingGeometry inside geometry

          object.geometry.__pickingGeometry = __pickingGeometry;
        } // use __pickingGeometry in the picking mesh

        object.geometry = __pickingGeometry;
        object.elementsCount = __pickingGeometry.elementsCount; // elements count

        var pointSize = object.material.size || 0.01;
        var linewidth = object.material.linewidth || 1;
        object.material = new THREE.FaceIDMaterial();
        object.material.linewidth = linewidth + this.lineShell; // make the line a little wider to hit

        object.material.setBaseID(baseId);
        object.material.setPointSize(pointSize + this.pointShell); // make the point a little wider to hit

        var size = new THREE.Vector2();
        this.renderer.getSize(size);
        object.material.setPointScale(size.y * this.renderer.getPixelRatio() / 2);
        return object.elementsCount;
      }

      return 0;
    }
  }]);

  return GPUPicker;
}();

(function (THREE) {
  // add a originalObject to Object3D
  (function (clone) {
    THREE.Object3D.prototype.clone = function (recursive) {
      var object = clone.call(this, recursive); // keep a ref to originalObject

      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  })(THREE.Object3D.prototype.clone); // add a originalObject to Points


  (function (clone) {
    THREE.Points.prototype.clone = function (recursive) {
      var object = clone.call(this, recursive); // keep a ref to originalObject

      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  })(THREE.Points.prototype.clone); // add a originalObject to Mesh


  (function (clone) {
    THREE.Mesh.prototype.clone = function () {
      var object = clone.call(this); // keep a ref to originalObject

      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  })(THREE.Mesh.prototype.clone); // add a originalObject to Line


  (function (clone) {
    THREE.Line.prototype.clone = function () {
      var object = clone.call(this); // keep a ref to originalObject

      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  })(THREE.Line.prototype.clone);

  THREE.Mesh.prototype.raycastWithID = function () {
    var vA = new THREE.Vector3();
    var vB = new THREE.Vector3();
    var vC = new THREE.Vector3();
    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();
    var intersectionPointWorld = new THREE.Vector3();
    var intersectionPoint = new THREE.Vector3();

    function checkIntersection(object, raycaster, ray, pA, pB, pC, point) {
      var intersect;
      intersect = ray.intersectTriangle(pC, pB, pA, false, point);
      var plane = new THREE.Plane();
      plane.setFromCoplanarPoints(pA, pB, pC);
      intersect = ray.intersectPlane(plane, new THREE.Vector3());
      if (intersect === null) return null;
      intersectionPointWorld.copy(point);
      intersectionPointWorld.applyMatrix4(object.matrixWorld);
      var distance = raycaster.ray.origin.distanceTo(intersectionPointWorld);
      if (distance < raycaster.near || distance > raycaster.far) return null;
      return {
        distance: distance,
        point: intersectionPointWorld.clone(),
        object: object
      };
    }

    return function (elID, raycaster) {
      var geometry = this.geometry;
      var attributes = geometry.attributes;
      inverseMatrix.getInverse(this.matrixWorld);
      ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
      var a, b, c;
      if (geometry.index !== null) console.log('WARNING: raycastWithID does not support indexed vertices');else {
        var position = attributes.position;
        var j = elID * 3;
        a = j;
        b = j + 1;
        c = j + 2;
        vA.fromBufferAttribute(position, a);
        vB.fromBufferAttribute(position, b);
        vC.fromBufferAttribute(position, c);
      }
      var intersection = checkIntersection(this, raycaster, ray, vA, vB, vC, intersectionPoint);

      if (intersection === null) {
        console.log('WARNING: intersectionPoint missing');
        return;
      }

      var face = new THREE.Face3(a, b, c);
      THREE.Triangle.getNormal(vA, vB, vC, face.normal);
      intersection.face = face;
      intersection.faceIndex = a;
      return intersection;
    };
  }();

  THREE.Line.prototype.raycastWithID = function () {
    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();
    var vStart = new THREE.Vector3();
    var vEnd = new THREE.Vector3();
    var interSegment = new THREE.Vector3();
    var interRay = new THREE.Vector3();
    return function (elID, raycaster) {
      inverseMatrix.getInverse(this.matrixWorld);
      ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
      var geometry = this.geometry;

      if (geometry instanceof THREE.BufferGeometry) {
        var attributes = geometry.attributes;
        if (geometry.index !== null) console.log('WARNING: raycastWithID does not support indexed vertices');else {
          var positions = attributes.position.array;
          var i = elID * 6;
          vStart.fromArray(positions, i);
          vEnd.fromArray(positions, i + 3);
          var distance = ray.origin.distanceTo(interRay);
          if (distance < raycaster.near || distance > raycaster.far) return;
          var intersect = {
            distance: distance,
            // What do we want? intersection point on the ray or on the segment??
            // point: raycaster.ray.at( distance ),
            point: interSegment.clone().applyMatrix4(this.matrixWorld),
            index: i,
            face: null,
            faceIndex: null,
            object: this
          };
          return intersect;
        }
      }
    };
  }();

  THREE.Points.prototype.raycastWithID = function () {
    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();
    return function (elID, raycaster) {
      var object = this;
      var geometry = object.geometry;
      inverseMatrix.getInverse(this.matrixWorld);
      ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
      var position = new THREE.Vector3();

      var testPoint = function testPoint(point, index) {
        var rayPointDistance = ray.distanceToPoint(point);
        var intersectPoint = ray.closestPointToPoint(point);
        intersectPoint.applyMatrix4(object.matrixWorld);
        var distance = raycaster.ray.origin.distanceTo(intersectPoint);
        if (distance < raycaster.near || distance > raycaster.far) return;
        var intersect = {
          distance: distance,
          distanceToRay: rayPointDistance,
          point: intersectPoint.clone(),
          index: index,
          face: null,
          object: object
        };
        return intersect;
      };

      var attributes = geometry.attributes;
      var positions = attributes.position.array;
      position.fromArray(positions, elID * 3);
      return testPoint(position, elID);
    };
  }();
})(THREE);
/* global THREE */

/* eslint no-extend-native: ["error", { "exceptions": ["String"] }] */


var webots = window.webots || {};

webots.quaternionToAxisAngle = function (quaternion) {
  var angle, axis;
  var q = quaternion.clone();
  if (q.w > 1.0) q.normalize();
  if (q.w >= 1.0) angle = 0.0;else if (q.w <= -1.0) angle = 2.0 * Math.PI;else angle = 2.0 * Math.acos(q.w);

  if (angle < 0.001) {
    // if the angle is close to zero, then the direction of the axis is not important
    axis = new THREE.Vector3(0.0, 1.0, 0.0);
    angle = 0;
  } else {
    // normalize axes
    var inv = 1.0 / Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
    axis = new THREE.Vector3(q.x * inv, q.y * inv, q.z * inv);
  }

  return {
    'axis': axis,
    'angle': angle
  };
};

webots.parseMillisecondsIntoReadableTime = function (milliseconds) {
  var hours = (milliseconds + 0.9) / (1000 * 60 * 60);
  var absoluteHours = Math.floor(hours);
  var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;
  var minutes = (hours - absoluteHours) * 60;
  var absoluteMinutes = Math.floor(minutes);
  var m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes;
  var seconds = (minutes - absoluteMinutes) * 60;
  var absoluteSeconds = Math.floor(seconds);
  var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;
  var ms = Math.floor((seconds - absoluteSeconds) * 1000);
  if (ms < 10) ms = '00' + ms;else if (ms < 100) ms = '0' + ms;
  return h + ':' + m + ':' + s + ':' + ms;
}; // add startsWith() and endsWith() functions to the String prototype


if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function (prefix) {
    return _this2.slice(0, prefix.length) === prefix;
  };
}

if (typeof String.prototype.endsWith !== 'function') {
  String.prototype.endsWith = function (suffix) {
    return _this2.indexOf(suffix, _this2.length - suffix.length) !== -1;
  };
}
/* exported SystemInfo */


var SystemInfo =
/*#__PURE__*/
function () {
  function SystemInfo() {
    _classCallCheck(this, SystemInfo);
  }

  _createClass(SystemInfo, null, [{
    key: "isMacOS",
    value: function isMacOS() {
      // https://stackoverflow.com/questions/10527983/best-way-to-detect-mac-os-x-or-windows-computers-with-javascript-or-jquery
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    }
  }, {
    key: "isIOS",
    value: function isIOS() {
      // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
      return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
    }
  }, {
    key: "isMobileDevice",
    value: function isMobileDevice() {
      // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  }]);

  return SystemInfo;
}();
/* global webots */


'use strict';

var DialogWindow =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function DialogWindow(parent, mobile) {
    var _this3 = this;

    _classCallCheck(this, DialogWindow);

    this.mobile = mobile;
    this.parent = parent;
    this.panel = document.createElement('div');
    parent.appendChild(this.panel);
    this.params = {
      appendTo: parent,
      open: function open() {
        DialogWindow.openDialog(_this3.panel);
      },
      autoOpen: false,
      resizeStart: DialogWindow.disablePointerEvents,
      resizeStop: DialogWindow.enablePointerEvents,
      dragStart: DialogWindow.disablePointerEvents,
      dragStop: DialogWindow.enablePointerEvents
    };
    if (this.mobile) DialogWindow.addMobileDialogAttributes(this.params, this.panel);
  }

  _createClass(DialogWindow, null, [{
    key: "clampDialogSize",
    value: function clampDialogSize(preferredGeometry) {
      if (typeof $('#playerDiv').height === 'undefined' || typeof $('#playerDiv').width === 'undefined') return preferredGeometry;
      var maxHeight = $('#playerDiv').height() - preferredGeometry.top - $('#toolBar').height() - 20; // 20 is chosen arbitrarily

      var maxWidth = $('#playerDiv').width() - preferredGeometry.left - 20; // 20 is chosen arbitrarily

      var height = preferredGeometry.height;
      var width = preferredGeometry.width;
      if (maxHeight < height) height = maxHeight;
      if (maxWidth < width) width = maxWidth;
      return {
        width: width,
        height: height
      };
    }
  }, {
    key: "openDialog",
    value: function openDialog(dialog) {
      DialogWindow.resizeDialogOnOpen(dialog);
      $(dialog).parent().css('opacity', 0.9);
      $(dialog).parent().hover(function () {
        $(dialog).css('opacity', 0.99);
      }, function (event) {
        $(dialog).css('opacity', 0.9);
      });
    }
  }, {
    key: "resizeDialogOnOpen",
    value: function resizeDialogOnOpen(dialog) {
      var w = $(dialog).parent().width();
      var h = $(dialog).parent().height();
      var clampedSize = DialogWindow.clampDialogSize({
        left: 0,
        top: 0,
        width: w,
        height: h
      });
      if (clampedSize.width < w) $(dialog).dialog('option', 'width', clampedSize.width);
      if (clampedSize.height < h) $(dialog).dialog('option', 'height', clampedSize.height);
    }
  }, {
    key: "createMobileDialog",
    value: function createMobileDialog() {
      // mobile only setup
      var closeButton = $('button:contains("WbClose")');
      closeButton.html('');
      closeButton.removeClass('ui-button-text-only');
      closeButton.addClass('mobile-dialog-close-button');
      closeButton.addClass('ui-button-icon-primary');
      closeButton.prepend('<span class="ui-icon ui-icon-closethick"></span>');
    }
  }, {
    key: "addMobileDialogAttributes",
    value: function addMobileDialogAttributes(params, panel) {
      params.dialogClass = 'mobile-no-default-buttons';
      params.create = DialogWindow.createMobileDialog;
      params.buttons = {
        'WbClose': function WbClose() {
          $(panel).dialog('close');
        }
      };
    } // The following two functions are used to make the resize and drag of the dialog
    // steady (i.e., not loose the grab while resizing/dragging the dialog quickly).

  }, {
    key: "disablePointerEvents",
    value: function disablePointerEvents() {
      document.body.style['pointer-events'] = 'none';
    }
  }, {
    key: "enablePointerEvents",
    value: function enablePointerEvents() {
      document.body.style['pointer-events'] = 'auto';
    }
  }]);

  return DialogWindow;
}();

webots.alert = function (title, message, callback) {
  webots.currentView.ondialogwindow(true);
  var parent = webots.currentView.view3D;
  var panel = document.getElementById('webotsAlert');

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'webotsAlert';
    parent.appendChild(panel);
  }

  panel.innerHTML = message;
  $('#webotsAlert').dialog({
    title: title,
    resizeStart: DialogWindow.disablePointerEvents,
    resizeStop: DialogWindow.enablePointerEvents,
    dragStart: DialogWindow.disablePointerEvents,
    dragStop: DialogWindow.enablePointerEvents,
    appendTo: parent,
    open: function open() {
      DialogWindow.openDialog(panel);
    },
    modal: true,
    width: 400,
    // enough room to display the social network buttons in a line
    buttons: {
      Ok: function Ok() {
        $('#webotsAlert').dialog('close');
      }
    },
    close: function close() {
      if (typeof callback === 'function') callback();
      webots.currentView.ondialogwindow(false);
      $('#webotsAlert').remove();
    }
  });
};

webots.confirm = function (title, message, okCallback, closeCallback) {
  webots.currentView.ondialogwindow(true);
  var parent = webots.currentView.view3D;
  var panel = document.createElement('div');
  panel.id = 'webotsConfirm';
  panel.innerHTML = message;
  parent.appendChild(panel);
  $('#webotsConfirm').dialog({
    title: title,
    resizeStart: DialogWindow.disablePointerEvents,
    resizeStop: DialogWindow.enablePointerEvents,
    dragStart: DialogWindow.disablePointerEvents,
    dragStop: DialogWindow.enablePointerEvents,
    appendTo: parent,
    open: function open() {
      DialogWindow.openDialog(panel);
    },
    modal: true,
    width: 400,
    // enough room to display the social network buttons in a line
    buttons: {
      Ok: function Ok() {
        $('#webotsConfirm').dialog('close');
        if (typeof okCallback === 'function') okCallback();
      },
      Cancel: function Cancel() {
        $('#webotsConfirm').dialog('close');
      }
    },
    close: function close() {
      $('#webotsConfirm').dialog('destroy').remove();
      webots.currentView.ondialogwindow(false);
      if (typeof closeCallback === 'function') closeCallback();
    }
  });
};
/* global DialogWindow, DefaultUrl */


'use strict';

var Console =
/*#__PURE__*/
function (_DialogWindow) {
  _inherits(Console, _DialogWindow);

  // eslint-disable-line no-unused-vars
  function Console(parent, mobile) {
    var _this4;

    _classCallCheck(this, Console);

    _this4 = _possibleConstructorReturn(this, _getPrototypeOf(Console).call(this, parent, mobile));
    _this4.panel.id = 'webotsConsole';
    _this4.panel.className = 'webotsConsole';
    var clampedSize = DialogWindow.clampDialogSize({
      left: 0,
      top: 0,
      width: 600,
      height: 400
    });
    _this4.params.width = clampedSize.width;
    _this4.params.height = clampedSize.height;

    _this4.params.close = function () {
      $('#consoleButton').removeClass('toolBarButtonActive');
    };

    _this4.params.title = 'Console';
    $(_this4.panel).dialog(_this4.params).dialogExtend({
      maximizable: !mobile
    });
    var buttons = document.createElement('div');
    buttons.className = 'webotsConsoleButtons';
    _this4.logs = document.createElement('div');
    _this4.logs.className = 'webotsConsoleLogs';
    var clearButtonIcon = document.createElement('img');
    clearButtonIcon.className = 'webotsConsoleButtonIcon';
    clearButtonIcon.setAttribute('src', DefaultUrl.wwiImagesUrl() + 'trash.png');
    _this4.clearButton = document.createElement('button');
    _this4.clearButton.className = 'webotsConsoleButton';
    _this4.clearButton.disabled = true;
    _this4.clearButton.title = 'Clear the console';

    _this4.clearButton.appendChild(clearButtonIcon);

    _this4.clearButton.addEventListener('click', function () {
      _this4.clear();
    });

    buttons.appendChild(_this4.clearButton);

    _this4.panel.appendChild(buttons);

    _this4.panel.appendChild(_this4.logs);

    return _this4;
  }

  _createClass(Console, [{
    key: "scrollDown",
    value: function scrollDown() {
      if (this.panel) this.panel.scrollTop = this.panel.scrollHeight;
    } // Remove all the logs.

  }, {
    key: "clear",
    value: function clear() {
      if (this.logs) {
        while (this.logs.firstChild) {
          this.logs.removeChild(this.logs.firstChild);
        }
      } else console.clear();

      this.clearButton.disabled = true;
    } // Remove the oldest logs.

  }, {
    key: "purge",
    value: function purge() {
      var historySize = 100; // defines the maximum size of the log.

      if (this.logs) {
        while (this.logs.firstChild && this.logs.childElementCount > historySize) {
          this.logs.removeChild(this.logs.firstChild);
        }
      }
    }
  }, {
    key: "stdout",
    value: function stdout(message) {
      this._log(message, 0);
    }
  }, {
    key: "stderr",
    value: function stderr(message) {
      this._log(message, 1);
    }
  }, {
    key: "info",
    value: function info(message) {
      this._log(message, 2);
    }
  }, {
    key: "error",
    value: function error(message) {
      this._log(message, 3);
    } // private functions

  }, {
    key: "_log",
    value: function _log(message, type) {
      var para = document.createElement('p');
      var style = 'margin:0;';
      var title = '';

      switch (type) {
        case 0:
          style += 'color:Blue;';
          title = 'Webots stdout';
          break;

        case 1:
          style += 'color:Red;';
          title = 'Webots stderr';
          break;

        case 2:
          style += 'color:Gray;';
          title = 'info';
          break;

        case 3:
          style += 'color:Salmon;';
          title = 'error';
          break;
      }

      if (this.logs) {
        para.style.cssText = style;
        para.title = title + ' (' + this._hourString() + ')';
        var t = document.createTextNode(message);
        para.appendChild(t);
        this.logs.appendChild(para);
        this.purge();
        this.scrollDown();
        this.clearButton.disabled = false;
      } else console.log('%c' + message, style);
    }
  }, {
    key: "_hourString",
    value: function _hourString() {
      var d = new Date();
      return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + ':' + (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
    }
  }]);

  return Console;
}(DialogWindow);
/* global DialogWindow, DefaultUrl, webots */


'use strict';

var HelpWindow =
/*#__PURE__*/
function (_DialogWindow2) {
  _inherits(HelpWindow, _DialogWindow2);

  // eslint-disable-line no-unused-vars
  function HelpWindow(parent, mobile, webotsDocUrl) {
    var _this5;

    _classCallCheck(this, HelpWindow);

    _this5 = _possibleConstructorReturn(this, _getPrototypeOf(HelpWindow).call(this, parent, mobile));
    _this5.panel.id = 'webotsHelp';
    _this5.panel.style.overflow = 'hidden';
    _this5.panel.className += 'webotsTabContainer';
    _this5.tabs = document.createElement('div');
    _this5.tabs.id = 'webotsHelpTabs';
    _this5.tabs.className += 'webotsTabs';
    _this5.tabsHeader = document.createElement('ul');

    _this5.tabs.appendChild(_this5.tabsHeader);

    _this5.panel.appendChild(_this5.tabs);

    if (webotsDocUrl) {
      var header = document.createElement('li');
      header.innerHTML = '<a href="#webotsHelpReference">Webots Reference Manual</a>';

      _this5.tabsHeader.appendChild(header);

      var page = document.createElement('div');
      page.id = 'webotsHelpReference';
      page.innerHTML = '<iframe src="' + webotsDocUrl + '"></iframe>';

      _this5.tabs.appendChild(page);

      $('#webotsHelpTabs').tabs();
    }

    var clampedSize = DialogWindow.clampDialogSize({
      left: 5,
      top: 5,
      width: 600,
      height: 600
    });
    _this5.params.width = clampedSize.width;
    _this5.params.height = clampedSize.height;

    _this5.params.close = function () {
      $('#helpButton').removeClass('toolBarButtonActive');
    };

    _this5.params.position = {
      at: 'right-5 top+5',
      my: 'right top',
      of: _this5.parent
    };
    _this5.params.title = 'Help';
    $(_this5.panel).dialog(_this5.params).dialogExtend({
      maximizable: !mobile
    });

    var finalize = function finalize() {
      $('#webotsHelpTabs').tabs('refresh');
      $('#webotsHelpTabs').tabs('option', 'active', 0);
      $(_this5.panel).dialog('open');
    };

    var currentUrl = DefaultUrl.currentScriptUrl();
    var query = '';
    if (webots.showRun) query = '?run=true';
    $.ajax({
      url: currentUrl + 'help.php' + query,
      success: function success(data) {
        // Fix the img src relative URLs.
        var html = data.replace(/ src="images/g, ' src="' + currentUrl + '/images');
        var header = document.createElement('li');
        header.innerHTML = '<a href="#webotsHelpGuide">User Guide</a>';
        $(_this5.tabsHeader).prepend(header);
        var page = document.createElement('div');
        page.id = 'webotsHelpGuide';
        page.innerHTML = html;
        if (document.getElementById('webotsHelpReference')) $('#webotsHelpReference').before(page);else {
          _this5.tabs.appendChild(page);

          $('#webotsHelpTabs').tabs();
        }
        finalize();
      },
      error: finalize
    });
    return _this5;
  }

  return HelpWindow;
}(DialogWindow);
/* global webots, DialogWindow */


'use strict';

var RobotWindow =
/*#__PURE__*/
function (_DialogWindow3) {
  _inherits(RobotWindow, _DialogWindow3);

  // eslint-disable-line no-unused-vars
  function RobotWindow(parent, mobile, name) {
    var _this6;

    _classCallCheck(this, RobotWindow);

    _this6 = _possibleConstructorReturn(this, _getPrototypeOf(RobotWindow).call(this, parent, mobile));
    _this6.name = name;
    _this6.panel.id = name;
    _this6.panel.className = 'webotsTabContainer';
    var clampedSize = DialogWindow.clampDialogSize({
      left: 5,
      top: 5,
      width: 400,
      height: 400
    });
    _this6.params.width = clampedSize.width;
    _this6.params.height = clampedSize.height;
    _this6.params.close = null;
    _this6.params.position = {
      at: 'left+5 top+5',
      my: 'left top',
      of: _this6.parent
    };
    _this6.params.title = 'Robot Window';
    $(_this6.panel).dialog(_this6.params).dialogExtend({
      maximizable: !mobile
    });
    return _this6;
  }

  _createClass(RobotWindow, [{
    key: "setProperties",
    value: function setProperties(properties) {
      $(this.panel).dialog(properties);
    }
  }, {
    key: "geometry",
    value: function geometry() {
      var webotsTabs = this.panel.getElementsByClassName('webotsTabs');
      var activeTabIndex = -1;
      if (webotsTabs.length > 0) activeTabIndex = $(webotsTabs[0]).tabs('option', 'active');
      return {
        width: $(this.panel).dialog('option', 'width'),
        height: $(this.panel).dialog('option', 'height'),
        position: $(this.panel).dialog('option', 'position'),
        activeTabIndex: activeTabIndex,
        open: this.isOpen()
      };
    }
  }, {
    key: "restoreGeometry",
    value: function restoreGeometry(data) {
      $(this.panel).dialog({
        width: data.width,
        height: data.height,
        position: data.position
      });
      var webotsTabs = this.panel.getElementsByClassName('webotsTabs');
      if (data.activeTabIndex >= 0 && webotsTabs.length > 0) $(webotsTabs[0]).tabs('option', 'active', data.activeTabIndex);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.close();
      this.panel.parentNode.removeChild(this.panel);
      this.panel = null;
    }
  }, {
    key: "setContent",
    value: function setContent(content) {
      $(this.panel).html(content);
    }
  }, {
    key: "open",
    value: function open() {
      $(this.panel).dialog('open');
    }
  }, {
    key: "isOpen",
    value: function isOpen() {
      return $(this.panel).dialog('isOpen');
    }
  }, {
    key: "close",
    value: function close() {
      $(this.panel).dialog('close');
    }
  }, {
    key: "send",
    value: function send(message, robot) {
      webots.currentView.sendRobotMessage(message, robot);
    }
  }, {
    key: "receive",
    value: function receive(message, robot) {
      // to be overriden
      console.log("Robot window '" + this.name + "' received message from Robot '" + robot + "': " + message);
    }
  }]);

  return RobotWindow;
}(DialogWindow);
/* global webots, DialogWindow, HelpWindow, DefaultUrl */


var Toolbar =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Toolbar(parent, view) {
    var _this7 = this;

    _classCallCheck(this, Toolbar);

    this.view = view;
    this.domElement = document.createElement('div');
    this.domElement.id = 'toolBar';
    this.domElement.left = document.createElement('div');
    this.domElement.left.className = 'toolBarLeft';

    if (typeof webots.showQuit === 'undefined' || webots.showQuit) {
      // enabled by default
      this.domElement.left.appendChild(this.createToolBarButton('quit', 'Quit the simulation'));

      this.quitButton.onclick = function () {
        _this7.requestQuit();
      };
    }

    this.domElement.left.appendChild(this.createToolBarButton('info', 'Open the information window'));

    this.infoButton.onclick = function () {
      _this7.toggleInfo();
    };

    this.worldSelectionDiv = document.createElement('div');
    this.worldSelectionDiv.id = 'worldSelectionDiv';
    this.domElement.left.appendChild(this.worldSelectionDiv);

    if (webots.showRevert) {
      // disabled by default
      this.domElement.left.appendChild(this.createToolBarButton('revert', 'Save controllers and revert the simulation'));
      this.revertButton.addEventListener('click', function () {
        _this7.reset(true);
      });
    }

    this.domElement.left.appendChild(this.createToolBarButton('reset', 'Save controllers and reset the simulation'));
    this.resetButton.addEventListener('click', function () {
      _this7.reset(false);
    });
    this.domElement.left.appendChild(this.createToolBarButton('step', 'Perform one simulation step'));

    this.stepButton.onclick = function () {
      _this7.step();
    };

    this.domElement.left.appendChild(this.createToolBarButton('real_time', 'Run the simulation in real time'));

    this.real_timeButton.onclick = function () {
      _this7.realTime();
    };

    this.domElement.left.appendChild(this.createToolBarButton('pause', 'Pause the simulation'));

    this.pauseButton.onclick = function () {
      _this7.pause();
    };

    this.pauseButton.style.display = 'none';

    if (webots.showRun) {
      // disabled by default
      this.domElement.left.appendChild(this.createToolBarButton('run', 'Run the simulation as fast as possible'));

      this.runButton.onclick = function () {
        _this7.run();
      };
    }

    var div = document.createElement('div');
    div.className = 'webotsTime';
    var clock = document.createElement('span');
    clock.id = 'webotsClock';
    clock.title = 'Current simulation time';
    clock.innerHTML = webots.parseMillisecondsIntoReadableTime(0);
    div.appendChild(clock);
    var timeout = document.createElement('span');
    timeout.id = 'webotsTimeout';
    timeout.title = 'Simulation time out';
    timeout.innerHTML = webots.parseMillisecondsIntoReadableTime(this.view.timeout >= 0 ? this.view.timeout : 0);
    div.appendChild(document.createElement('br'));
    div.appendChild(timeout);
    this.domElement.left.appendChild(div);
    this.domElement.left.appendChild(this.createToolBarButton('console', 'Open the console window'));

    this.consoleButton.onclick = function () {
      _this7.toggleConsole();
    };

    this.domElement.right = document.createElement('div');
    this.domElement.right.className = 'toolBarRight';
    this.domElement.right.appendChild(this.createToolBarButton('help', 'Get help on the simulator'));

    this.helpButton.onclick = function () {
      _this7.toggleHelp();
    };

    if (this.view.fullscreenEnabled) {
      this.domElement.right.appendChild(this.createToolBarButton('exit_fullscreen', 'Exit fullscreen'));

      this.exit_fullscreenButton.onclick = function () {
        _this7.exitFullscreen();
      };

      this.exit_fullscreenButton.style.display = 'none';
      this.domElement.right.appendChild(this.createToolBarButton('fullscreen', 'Enter fullscreen'));

      this.fullscreenButton.onclick = function () {
        _this7.requestFullscreen();
      };
    }

    this.domElement.appendChild(this.domElement.left);
    this.domElement.appendChild(this.domElement.right);
    parent.appendChild(this.domElement);
    this.enableToolBarButtons(false);

    if (this.view.broadcast && this.quitButton) {
      this.quitButton.disabled = true;
      this.quitButton.classList.add('toolBarButtonDisabled');
      this.view.contextMenu.disableEdit();
    }

    document.addEventListener('fullscreenchange', function () {
      _this7.onFullscreenChange();
    });
    document.addEventListener('webkitfullscreenchange', function () {
      _this7.onFullscreenChange();
    });
    document.addEventListener('mozfullscreenchange', function () {
      _this7.onFullscreenChange();
    });
    document.addEventListener('MSFullscreenChange', function () {
      _this7.onFullscreenChange();
    });
  }

  _createClass(Toolbar, [{
    key: "toggleInfo",
    value: function toggleInfo() {
      this.view.contextMenu.hide();
      if (!this.view.infoWindow) return;

      if (this.view.infoWindow.isOpen()) {
        this.view.infoWindow.close();
        this.infoButton.classList.remove('toolBarButtonActive');
      } else {
        this.view.infoWindow.open();
        this.infoButton.classList.add('toolBarButtonActive');
      }
    }
  }, {
    key: "toggleConsole",
    value: function toggleConsole() {
      this.view.contextMenu.hide();

      if ($('#webotsConsole').is(':visible')) {
        $('#webotsConsole').dialog('close');
        this.consoleButton.classList.remove('toolBarButtonActive');
      } else {
        $('#webotsConsole').dialog('open');
        this.consoleButton.classList.add('toolBarButtonActive');
      }
    }
  }, {
    key: "toggleHelp",
    value: function toggleHelp() {
      this.view.contextMenu.hide();

      if (!this.view.helpWindow) {
        if (!this.view.broadcast && webots.webotsDocUrl) var webotsDocUrl = webots.webotsDocUrl;
        this.view.helpWindow = new HelpWindow(this.view.view3D, this.view.mobileDevice, webotsDocUrl);
        this.helpButton.classList.add('toolBarButtonActive');
      } else if ($('#webotsHelp').is(':visible')) {
        $('#webotsHelp').dialog('close');
        this.helpButton.classList.remove('toolBarButtonActive');
      } else {
        $('#webotsHelp').dialog('open');
        this.helpButton.classList.add('toolBarButtonActive');
      }
    }
  }, {
    key: "exitFullscreen",
    value: function exitFullscreen() {
      this.view.contextMenu.hide();
      if (document.exitFullscreen) document.exitFullscreen();else if (document.msExitFullscreen) document.msExitFullscreen();else if (document.mozCancelFullScreen) document.mozCancelFullScreen();else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, {
    key: "requestFullscreen",
    value: function requestFullscreen() {
      this.view.contextMenu.hide();
      var elem = this.view.view3D;
      if (elem.requestFullscreen) elem.requestFullscreen();else if (elem.msRequestFullscreen) elem.msRequestFullscreen();else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    }
  }, {
    key: "onFullscreenChange",
    value: function onFullscreenChange(event) {
      var element = document.fullScreenElement || document.mozFullScreenElement || document.webkitFullScreenElement || document.msFullScreenElement || document.webkitCurrentFullScreenElement;

      if (element != null) {
        this.fullscreenButton.style.display = 'none';
        this.exit_fullscreenButton.style.display = 'inline';
      } else {
        this.fullscreenButton.style.display = 'inline';
        this.exit_fullscreenButton.style.display = 'none';
      }
    }
  }, {
    key: "requestQuit",
    value: function requestQuit() {
      var _this8 = this;

      if (this.view.editor.hasUnsavedChanges()) {
        var text;
        if (this.view.editor.unloggedFileModified || typeof webots.User1Id === 'undefined' || webots.User1Id === '') text = 'Your changes to the robot controller will be lost because you are not logged in.';else text = 'Your unsaved changes to the robot controller will be lost.';
        var quitDialog = document.getElementById('quitDialog');

        if (!quitDialog) {
          quitDialog = document.createElement('div');
          quitDialog.id = 'quitDialog';
          $(quitDialog).html(text);
          this.view.view3D.appendChild(quitDialog);
          $(quitDialog).dialog({
            title: 'Quit the simulation?',
            modal: true,
            resizable: false,
            appendTo: this.view.view3D,
            open: function open() {
              DialogWindow.openDialog(quitDialog);
            },
            buttons: {
              'Cancel': function Cancel() {
                $(quitDialog).dialog('close');
              },
              'Quit': function Quit() {
                $(quitDialog).dialog('close');

                _this8.view.quitSimulation();
              }
            }
          });
        } else $(quitDialog).dialog('open');

        return;
      }

      this.view.quitSimulation();
    }
  }, {
    key: "reset",
    value: function reset() {
      var revert = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      if (this.view.broadcast) return;
      this.time = 0; // reset time to correctly compute the initial deadline

      if (revert) $('#webotsProgressMessage').html('Reverting simulation...');else $('#webotsProgressMessage').html('Restarting simulation...');
      $('#webotsProgress').show();
      this.runOnLoad = this.pauseButton.style.display === 'inline';
      this.pause();

      for (var i in this.view.editor.filenames) {
        this.view.editor.save(i);
        if (this.view.editor.needToUploadFiles[i]) this.view.editor.upload(i);
      }

      this.view.onrobotwindowsdestroy();

      if (this.view.timeout >= 0) {
        this.view.deadline = this.view.timeout;
        $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(this.view.timeout));
      } else $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(0));

      this.enableToolBarButtons(false);
      if (revert) this.view.stream.socket.send('revert');else this.view.stream.socket.send('reset');
    }
  }, {
    key: "isPaused",
    value: function isPaused() {
      return this.real_timeButton.style.display === 'inline';
    }
  }, {
    key: "pause",
    value: function pause() {
      if (this.view.broadcast) return;
      this.view.contextMenu.hide();
      this.view.stream.socket.send('pause');
    }
  }, {
    key: "realTime",
    value: function realTime() {
      if (this.view.broadcast) return;
      this.view.contextMenu.hide();
      this.view.stream.socket.send('real-time:' + this.view.timeout);
      this.pauseButton.style.display = 'inline';
      this.real_timeButton.style.display = 'none';
      if (typeof this.runButton !== 'undefined') this.runButton.style.display = 'inline';
    }
  }, {
    key: "run",
    value: function run() {
      if (this.view.broadcast) return;
      this.view.contextMenu.hide();
      this.view.stream.socket.send('fast:' + this.view.timeout);
      this.pauseButton.style.display = 'inline';
      this.real_timeButton.style.display = 'inline';
      this.runButton.style.display = 'none';
    }
  }, {
    key: "step",
    value: function step() {
      if (this.view.broadcast) return;
      this.view.contextMenu.hide();
      this.pauseButton.style.display = 'none';
      this.real_timeButton.style.display = 'inline';
      if (typeof this.runButton !== 'undefined') this.runButton.style.display = 'inline';
      this.view.stream.socket.send('step');
    }
  }, {
    key: "enableToolBarButtons",
    value: function enableToolBarButtons(enabled) {
      var buttons = [this.infoButton, this.revertButton, this.resetButton, this.stepButton, this.real_timeButton, this.runButton, this.pauseButton, this.consoleButton, this.worldSelect];

      for (var i in buttons) {
        if (buttons[i]) {
          if (enabled && (!this.view.broadcast || buttons[i] === this.consoleButton)) {
            buttons[i].disabled = false;
            buttons[i].classList.remove('toolBarButtonDisabled');
          } else {
            buttons[i].disabled = true;
            buttons[i].classList.add('toolBarButtonDisabled');
          }
        }
      }
    }
  }, {
    key: "createToolBarButton",
    value: function createToolBarButton(name, tooltip) {
      var buttonName = name + 'Button';
      this[buttonName] = document.createElement('button');
      this[buttonName].id = buttonName;
      this[buttonName].className = 'toolBarButton';
      this[buttonName].title = tooltip;
      this[buttonName].style.backgroundImage = 'url(' + DefaultUrl.wwiImagesUrl() + name + '.png)';
      return this[buttonName];
    }
  }, {
    key: "setMode",
    value: function setMode(mode) {
      var runEnabled = typeof this.runButton !== 'undefined';

      if (mode === 'pause') {
        this.pauseButton.style.display = 'none';
        this.real_timeButton.style.display = 'inline';
        if (runEnabled) this.runButton.style.display = 'inline';
        return;
      }

      this.pauseButton.style.display = 'inline';

      if (runEnabled && (mode === 'run' || mode === 'fast')) {
        this.runButton.style.display = 'none';
        this.real_timeButton.style.display = 'inline';
      } else {
        if (runEnabled) this.runButton.style.display = 'inline';
        this.real_timeButton.style.display = 'none';
      }
    }
  }]);

  return Toolbar;
}();
/* global ace, webots, DialogWindow, DefaultUrl, SystemInfo */


'use strict';

var Editor =
/*#__PURE__*/
function (_DialogWindow4) {
  _inherits(Editor, _DialogWindow4);

  // eslint-disable-line no-unused-vars
  function Editor(parent, mobile, view) {
    var _this9;

    _classCallCheck(this, Editor);

    _this9 = _possibleConstructorReturn(this, _getPrototypeOf(Editor).call(this, parent, mobile));
    _this9.panel.id = 'webotsEditor';
    _this9.panel.className = 'webotsTabContainer';
    _this9.view = view;
    _this9.filenames = [];
    _this9.needToUploadFiles = [];
    _this9.sessions = [];
    var edit = document.createElement('div');
    edit.id = 'webotsEditorTab';
    edit.className = 'webotsTab';
    _this9.editor = ace.edit(edit);
    _this9.sessions[0] = _this9.editor.getSession();
    _this9.currentSession = 0;
    _this9.tabs = document.createElement('div');
    _this9.tabs.id = 'webotsEditorTabs';
    _this9.tabs.className = 'webotsTabs';
    _this9.tabsHeader = document.createElement('ul');

    _this9.tabs.appendChild(_this9.tabsHeader);

    _this9.tabs.appendChild(edit);

    $(_this9.tabs).tabs({
      activate: function activate(event, ui) {
        _this9.currentSession = parseInt(ui.newTab.attr('id').substr(5)); // skip 'file-'

        _this9.editor.setSession(_this9.sessions[_this9.currentSession]);
      }
    });

    _this9.panel.appendChild(_this9.tabs);

    _this9.menu = document.createElement('div');
    _this9.menu.id = 'webotsEditorMenu';
    var saveShortcut;
    if (SystemInfo.isMacOS()) saveShortcut = 'Cmd-S';else saveShortcut = 'Ctrl-S';
    _this9.menu.innerHTML = '<input type="image" id="webotsEditorMenuImage" width="17px" src="' + DefaultUrl.wwiImagesUrl() + 'menu.png">' + '<div id="webotsEditorMenuContent">' + '<div id="webotsEditorSaveAction" class="webotsEditorMenuContentItem" title="Save current file">Save<span style="float:right"><i><small>' + saveShortcut + '</small></i></span></div>' + '<div id="webotsEditorSaveAllAction" class="webotsEditorMenuContentItem" title="Save all the files">Save All</div>' + '<div id="webotsEditorResetAction" class="webotsEditorMenuContentItem" title="Reset current file to the original version">Reset</div>' + '<div id="webotsEditorResetAllAction" class="webotsEditorMenuContentItem" title="Reset all the files to the original version">Reset All</div>' + '</div>';

    _this9.panel.appendChild(_this9.menu);

    var clampedSize = DialogWindow.clampDialogSize({
      left: 0,
      top: 0,
      width: 800,
      height: 600
    });
    _this9.params.width = clampedSize.width;
    _this9.params.height = clampedSize.height;
    _this9.params.close = null;

    _this9.params.resize = function () {
      _this9._resize();
    };

    _this9.params.open = function () {
      DialogWindow.resizeDialogOnOpen(_this9.panel);
    };

    _this9.params.title = 'Editor';
    $(_this9.panel).dialog(_this9.params).dialogExtend({
      maximizable: !mobile
    });

    _this9.editor.commands.addCommand({
      name: 'save',
      bindKey: {
        win: 'Ctrl-S',
        mac: 'Cmd-S'
      },
      exec: function exec(editor) {
        _this9.save(_this9.currentSession);
      }
    });

    $('#webotsEditorSaveAction').click(function () {
      _this9.save(_this9.currentSession);

      _this9._hideMenu();
    });
    $('#webotsEditorSaveAllAction').click(function () {
      for (var i in _this9.filenames) {
        _this9.save(i);
      }

      _this9._hideMenu();
    });
    $('#webotsEditorResetAction').click(function () {
      _this9._openResetConfirmDialog(false);
    });
    $('#webotsEditorResetAllAction').click(function () {
      _this9._openResetConfirmDialog(true);
    });
    $('#webotsEditorMenuImage').click(function () {
      if ($('#webotsEditorMenu').hasClass('pressed')) $('#webotsEditorMenu').removeClass('pressed');else $('#webotsEditorMenu').addClass('pressed');
    });
    $('#webotsEditorMenu').focusout(function () {
      // Let the time to handle the menu actions if needed.
      window.setTimeout(function () {
        if ($('.webotsEditorMenuContentItem:hover').length > 0) return;
        if ($('#webotsEditorMenu').hasClass('pressed')) $('#webotsEditorMenu').removeClass('pressed');
      }, 100);
    });
    return _this9;
  }

  _createClass(Editor, [{
    key: "hasUnsavedChanges",
    value: function hasUnsavedChanges() {
      if (this.unloggedFileModified) return true;

      for (var i in this.filenames) {
        if ($('#filename-' + i).html().endsWith('*')) return true;
      }

      return false;
    } // Upload file to the simulation server.

  }, {
    key: "upload",
    value: function upload(i) {
      this.view.stream.socket.send('set controller:' + this.dirname + '/' + this.filenames[i] + ':' + this.sessions[i].getLength() + '\n' + this.sessions[i].getValue());
      this.needToUploadFiles[i] = false;
    } // Save file to the web site.

  }, {
    key: "save",
    value: function save(i) {
      if ($('#filename-' + i).html().endsWith('*')) {
        // file was modified
        $('#filename-' + i).html(this.filenames[i]);
        this.needToUploadFiles[i] = true;
        if ((typeof webots.User1Id !== 'undefined' || webots.User1Id !== '') && webots.User1Authentication) // user logged in
          this._storeUserFile(i);else this.unloggedFileModified = true;
        if (this.view.time === 0) this.upload(i);else {
          if (typeof this.statusMessage === 'undefined') {
            this.statusMessage = document.createElement('div');
            this.statusMessage.id = 'webotsEditorStatusMessage';
            this.statusMessage.className = 'webotsEditorStatusMessage';
            this.statusMessage.innerHTML = '<font size="2">Reset the simulation to apply the changes.</font>';
          }

          this.panel.appendChild(this.statusMessage);
          setTimeout(function () {
            $('#webotsEditorStatusMessage').remove();
          }, 1500);
        }
      }
    }
  }, {
    key: "addFile",
    value: function addFile(filename, content) {
      var _this10 = this;

      var index = this.filenames.indexOf(filename);

      if (index >= 0) {
        this.needToUploadFiles[index] = false; // just received from the simulation server

        this.sessions[index].setValue(content);
        if ($('#filename-' + index).html().endsWith('*')) $('#filename-' + index).html(filename);
        if (webots.User1Authentication && (typeof webots.User1Id !== 'undefined' || webots.User1Id !== '')) this.storeUserFile(index);
        return;
      }

      index = this.filenames.length;
      this.filenames.push(filename);
      this.needToUploadFiles[index] = false;

      if (index === 0) {
        this.sessions[index].setMode(this._aceMode(filename));
        this.sessions[index].setValue(content);
        $('#webotsEditorMenu').show();
        $('#webotsEditorTabs').show();
      } else this.sessions.push(ace.createEditSession(content, this._aceMode(filename)));

      this.sessions[index].on('change', function (e) {
        _this10._textChange(index);
      });
      $('div#webotsEditorTabs ul').append('<li id="file-' + index + '"><a href="#webotsEditorTab" id="filename-' + index + '">' + filename + '</a></li>');
      $('div#webotsEditorTabs').tabs('refresh');
      if (index === 0) $('div#webotsEditorTabs').tabs('option', 'active', index);
    }
  }, {
    key: "closeAllTabs",
    value: function closeAllTabs() {
      this.editor.setSession(ace.createEditSession('', ''));
      this.filenames = [];
      this.needToUploadFiles = [];
      this.sessions = [];
      this.sessions[0] = this.editor.getSession();
      this.currentSession = 0;
      $('div#webotsEditorTabs ul').empty();
      $('#webotsEditorMenu').hide();
      $('#webotsEditorTabs').hide();
    } // private functions

  }, {
    key: "_resize",
    value: function _resize() {
      var padding = $('#webotsEditorTab').outerHeight() - $('#webotsEditorTab').height();
      $('#webotsEditorTab').height(this.tabs.clientHeight - this.tabsHeader.scrollHeight - padding);
      this.editor.resize();
    }
  }, {
    key: "_hideMenu",
    value: function _hideMenu() {
      if ($('#webotsEditorMenu').hasClass('pressed')) $('#webotsEditorMenu').removeClass('pressed');
    }
  }, {
    key: "_openResetConfirmDialog",
    value: function _openResetConfirmDialog(allFiles) {
      var _this11 = this;

      this.resetAllFiles = allFiles;
      var titleText, message;
      message = 'Permanently reset ';

      if (allFiles) {
        message += 'all the files';
        titleText = 'Reset files?';
      } else {
        message += 'this file';
        titleText = 'Reset file?';
      }

      message += ' to the original version?';
      message += '<br/><br/>Your modifications will be lost.';
      var confirmDialog = document.createElement('div');
      this.panel.appendChild(confirmDialog);
      $(confirmDialog).html(message);
      $(confirmDialog).dialog({
        title: titleText,
        modal: true,
        autoOpen: true,
        resizable: false,
        dialogClass: 'alert',
        open: function open() {
          DialogWindow.openDialog(confirmDialog);
        },
        appendTo: this.parent,
        buttons: {
          'Cancel': function Cancel() {
            $(confirmDialog).dialog('close');
            $('#webotsEditorConfirmDialog').remove();
          },
          'Reset': function Reset() {
            $(confirmDialog).dialog('close');
            $('#webotsEditorConfirmDialog').remove();

            if (_this11.resetAllFiles) {
              _this11.filenames.forEach(function (filename) {
                _this11.view.server.resetController(_this11.dirname + '/' + filename);
              });
            } else _this11.view.server.resetController(_this11.dirname + '/' + _this11.filenames[_this11.currentSession]);
          }
        }
      });

      this._hideMenu();
    }
  }, {
    key: "_textChange",
    value: function _textChange(index) {
      if (!$('#filename-' + index).html().endsWith('*') && this.editor.curOp && this.editor.curOp.command.name) {
        // user change
        $('#filename-' + index).html(this.filenames[index] + '*');
      }
    }
  }, {
    key: "_aceMode",
    value: function _aceMode(filename) {
      if (filename.toLowerCase() === 'makefile') return 'ace/mode/makefile';
      var extension = filename.split('.').pop().toLowerCase();
      if (extension === 'py') return 'ace/mode/python';
      if (extension === 'c' || extension === 'cpp' || extension === 'c++' || extension === 'cxx' || extension === 'cc' || extension === 'h' || extension === 'hpp' || extension === 'h++' || extension === 'hxx' || extension === 'hh') return 'ace/mode/c_cpp';
      if (extension === 'java') return 'ace/mode/java';
      if (extension === 'm') return 'ace/mode/matlab';
      if (extension === 'json') return 'ace/mode/json';
      if (extension === 'xml') return 'ace/mode/xml';
      if (extension === 'yaml') return 'ace/mode/yaml';
      if (extension === 'ini') return 'ace/mode/ini';
      if (extension === 'html') return 'ace/mode/html';
      if (extension === 'js') return 'ace/mode/javascript';
      if (extension === 'css') return 'ace/mode/css';
      return 'ace/mode/text';
    }
  }, {
    key: "_storeUserFile",
    value: function _storeUserFile(i) {
      var _this12 = this;

      var formData = new FormData();
      formData.append('dirname', this.view.server.project + '/controllers/' + this.dirname);
      formData.append('filename', this.filenames[i]);
      formData.append('content', this.sessions[i].getValue());
      $.ajax({
        url: '/ajax/upload-file.php',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function success(data) {
          if (data !== 'OK') _this12.alert('File saving error', data);
        }
      });
    }
  }]);

  return Editor;
}(DialogWindow);

'use strict';

var ContextMenu =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function ContextMenu(authenticatedUser, parentObject, selection) {
    var _this13 = this;

    _classCallCheck(this, ContextMenu);

    this.object = null;
    this.visible = false;
    this.authenticatedUser = authenticatedUser; // Callbacks

    this.onFollowObject = null;
    this.onEditController = null;
    this.onOpenRobotWindow = null;
    this.isFollowedObject = null;
    this.isRobotWindowValid = null; // Create context menu.

    var domElement = document.createElement('ul');
    domElement.id = 'contextMenu';
    domElement.innerHTML = "<li class='ui-widget-header'><div id='contextMenuTitle'>Object</div></li>" + "<li id='contextMenuFollow'><div>Follow</div></li>" + "<li id='contextMenuUnfollow'><div>Unfollow</div></li>" + "<li><div class='ui-state-disabled'>Zoom</div></li>" + '<hr>' + "<li id='contextMenuRobotWindow'><div id='contextMenuRobotWindowDiv'>Robot window</div></li>" + "<li id='contextMenuEditController'><div id='contextMenuEditControllerDiv'>Edit controller</div></li>" + "<li><div class='ui-state-disabled'>Delete</div></li>" + "<li><div class='ui-state-disabled'>Properties</div></li>" + '<hr>' + "<li id='contextMenuHelp'><div id='contextMenuHelpDiv' class='ui-state-disabled'>Help...</div></li>";
    $(parentObject).append(domElement);
    $('#contextMenu').menu({
      items: '> :not(.ui-widget-header)'
    });
    $('#contextMenu').css('position', 'absolute');
    $('#contextMenu').css('z-index', 1);
    $('#contextMenu').css('display', 'none');
    $('#contextMenu').on('menuselect', function (event, ui) {
      if (ui.item.children().hasClass('ui-state-disabled')) return;
      var id = ui.item.attr('id');

      if (id === 'contextMenuFollow') {
        if (typeof _this13.onFollowObject === 'function') _this13.onFollowObject(_this13.object.name);
      } else if (id === 'contextMenuUnfollow') {
        if (typeof _this13.onFollowObject === 'function') _this13.onFollowObject('none');
      } else if (id === 'contextMenuEditController') {
        var controller = _this13.object.userData.controller;
        $('#webotsEditor').dialog('open');
        $('#webotsEditor').dialog('option', 'title', 'Controller: ' + controller);
        if (typeof _this13.onEditController === 'function') _this13.onEditController(controller);
      } else if (id === 'contextMenuRobotWindow') {
        var robotName = _this13.object.userData.name;
        if (typeof _this13.onOpenRobotWindow === 'function') _this13.onOpenRobotWindow(robotName);
      } else if (id === 'contextMenuHelp') window.open(_this13.object.userData.docUrl, '_blank');else console.log('Unknown menu item: ' + id);

      $('#contextMenu').css('display', 'none');
    });
  }

  _createClass(ContextMenu, [{
    key: "disableEdit",
    value: function disableEdit() {
      $('#contextMenuRobotWindowDiv').addClass('ui-state-disabled');
      $('#contextMenuEditControllerDiv').addClass('ui-state-disabled');
    }
  }, {
    key: "toggle",
    value: function toggle() {
      var visible = this.visible;
      if (visible) this.hide();
      return visible;
    }
  }, {
    key: "hide",
    value: function hide() {
      $('#contextMenu').css('display', 'none');
      this.visible = false;
    }
  }, {
    key: "show",
    value: function show(object, position) {
      this.object = object;
      if (typeof object === 'undefined') return;
      var title = object.userData.name;
      if (title == null || title === '') title = 'Object';
      $('#contextMenuTitle').html(title);
      var controller = object.userData.controller;

      if (controller && controller !== '') {
        // the current selection is a robot
        $('#contextMenuEditController').css('display', 'inline');
        if (controller === 'void' || controller.length === 0 || !this.authenticatedUser) $('#contextMenuEditController').children().addClass('ui-state-disabled');
        var robotName = object.userData.name;
        var isValid = false;
        if (typeof this.isRobotWindowValid === 'function') this.isRobotWindowValid(robotName, function (result) {
          isValid = result;
        });
        if (isValid) $('#contextMenuRobotWindow').css('display', 'inline');else $('#contextMenuRobotWindow').css('display', 'none');
      } else {
        $('#contextMenuEditController').css('display', 'none');
        $('#contextMenuRobotWindow').css('display', 'none');
      }

      var isFollowed = false;
      if (typeof this.isFollowedObject === 'function') this.isFollowedObject(object, function (result) {
        isFollowed = result;
      });

      if (isFollowed) {
        $('#contextMenuFollow').css('display', 'none');
        $('#contextMenuUnfollow').css('display', 'inline');
      } else {
        $('#contextMenuFollow').css('display', 'inline');
        $('#contextMenuUnfollow').css('display', 'none');
      }

      if (this.object.userData.docUrl) $('#contextMenuHelpDiv').removeClass('ui-state-disabled');else $('#contextMenuHelpDiv').addClass('ui-state-disabled'); // Ensure that the context menu is completely visible.

      var w = $('#contextMenu').width();
      var h = $('#contextMenu').height();
      var maxWidth = $('#playerDiv').width();
      var maxHeight = $('#playerDiv').height();
      var left;
      var top;
      if (maxWidth != null && w + position.x > maxWidth) left = maxWidth - w;else left = position.x;
      if (maxHeight != null && h + position.y > maxHeight) top = maxHeight - h - $('#toolBar').height();else top = position.y;
      $('#contextMenu').css('left', left + 'px');
      $('#contextMenu').css('top', top + 'px');
      $('#contextMenu').css('display', 'block');
      this.visible = true;
    }
  }]);

  return ContextMenu;
}();
/* global THREE */


'use strict';

var Viewpoint =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Viewpoint() {
    _classCallCheck(this, Viewpoint);

    this.onCameraParametersChanged = null; // After initialization 'followedObjectId' contains the id ('n<id>') of the followed node
    // or 'none' if no object is followed.

    this.followedObjectId = null; // If the followed object has moved since the last time we updated the viewpoint position, this field will contain a
    // vector with the translation applied to the object.

    this.followedObjectDeltaPosition = null;
    this.viewpointMass = 1.0; // Mass of the viewpoint used during the object following algorithm.

    this.viewpointFriction = 0.05; // Friction applied to the viewpoint whenever it is going faster than the followed object.

    this.viewpointForce = null; // Vector with the force that will be applied to the viewpoint for the next delta T.

    this.viewpointVelocity = null; // Current velocity of the viewpoint.

    this.viewpointLastUpdate = undefined; // Last time we updated the position of the viewpoint.
    // Initialize default camera.

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 400);
    this.camera.position.x = 10;
    this.camera.position.y = 10;
    this.camera.position.z = 10;
  }

  _createClass(Viewpoint, [{
    key: "reset",
    value: function reset(time) {
      this.camera.position.copy(this.initialViewpointPosition);
      this.camera.quaternion.copy(this.initialViewpointOrientation);
      this.updateViewpointPosition(true, time);
      this.notifyCameraParametersChanged();
    }
  }, {
    key: "isFollowedObject",
    value: function isFollowedObject(object) {
      return this.followedObjectId && (object.name === this.followedObjectId || object.userData.name === this.followedObjectId);
    }
  }, {
    key: "resetFollow",
    value: function resetFollow() {
      this.followedObjectId = null;
    }
  }, {
    key: "initFollowParameters",
    value: function initFollowParameters() {
      this.initialViewpointPosition = this.camera.position.clone();
      this.initialViewpointOrientation = this.camera.quaternion.clone();
      if (this.camera.userData.followSmoothness != null) this.setViewpointMass(this.camera.userData.followSmoothness);
      if (this.camera.userData.followedId != null) this.follow(this.camera.userData.followedId);else this.follow.followedObjectId = 'none';
    }
  }, {
    key: "follow",
    value: function follow(objectId) {
      this.followedObjectId = objectId;
      this.viewpointForce = new THREE.Vector3(0.0, 0.0, 0.0);
      this.viewpointVelocity = new THREE.Vector3(0.0, 0.0, 0.0);
    }
  }, {
    key: "setViewpointMass",
    value: function setViewpointMass(mass) {
      this.viewpointMass = mass;
      if (this.viewpointMass <= 0.05) this.viewpointMass = 0.0;else {
        if (this.viewpointMass > 1.0) this.viewpointMass = 1.0;
        this.friction = 0.05 / this.viewpointMass;
      }
    }
  }, {
    key: "setFollowedObjectDeltaPosition",
    value: function setFollowedObjectDeltaPosition(newPosition, previousPosition) {
      this.followedObjectDeltaPosition = new THREE.Vector3();
      this.followedObjectDeltaPosition.subVectors(newPosition, previousPosition);
    }
  }, {
    key: "updateViewpointPosition",
    value: function updateViewpointPosition(forcePosition, time) {
      if (this.followedObjectId == null || this.followedObjectId === 'none' || typeof time === 'undefined') return false;
      if (typeof this.viewpointLastUpdate === 'undefined') this.viewpointLastUpdate = time;
      var timeInterval = Math.abs(time - this.viewpointLastUpdate) / 1000;

      if (timeInterval > 0 && this.camera) {
        this.viewpointLastUpdate = time;
        var viewpointDeltaPosition = null;
        if (this.followedObjectDeltaPosition != null) this.viewpointForce.add(this.followedObjectDeltaPosition); // Special case: if the mass is 0 we simply move the viewpoint to its equilibrium position.
        // If timeInterval is too large (longer than 1/10 of a second), the progression won't be smooth either way,
        // so in this case we simply move the viewpoint to the equilibrium position as well.

        if (forcePosition || this.viewpointMass === 0 || timeInterval > 0.1 && this.animation == null) {
          viewpointDeltaPosition = this.viewpointForce.clone();
          this.viewpointVelocity = new THREE.Vector3(0.0, 0.0, 0.0);
        } else {
          var acceleration = this.viewpointForce.clone();
          acceleration.multiplyScalar(timeInterval / this.viewpointMass);
          this.viewpointVelocity.add(acceleration);
          var scalarVelocity = this.viewpointVelocity.length(); // Velocity of the object projected onto the velocity of the viewpoint.

          var scalarObjectVelocityProjection;

          if (this.followedObjectDeltaPosition != null) {
            var objectVelocity = this.followedObjectDeltaPosition.clone();
            objectVelocity.divideScalar(timeInterval);
            scalarObjectVelocityProjection = objectVelocity.dot(this.viewpointVelocity) / scalarVelocity;
          } else scalarObjectVelocityProjection = 0; // The viewpoint is going "faster" than the object, to prevent oscillations we apply a slowing force.


          if (this.viewpointFriction > 0 && scalarVelocity > scalarObjectVelocityProjection) {
            // We apply a friction based on the extra velocity.
            var velocityFactor = (scalarVelocity - (scalarVelocity - scalarObjectVelocityProjection) * this.viewpointFriction) / scalarVelocity;
            this.viewpointVelocity.multiplyScalar(velocityFactor);
          }

          viewpointDeltaPosition = this.viewpointVelocity.clone();
          viewpointDeltaPosition.multiplyScalar(timeInterval);
        }

        this.viewpointForce.sub(viewpointDeltaPosition);
        this.camera.position.add(viewpointDeltaPosition);
        this.followedObjectDeltaPosition = null;
        return true;
      }

      return false;
    }
  }, {
    key: "rotate",
    value: function rotate(params) {
      var yawAngle = -0.005 * params.dx;
      var pitchAngle = -0.005 * params.dy;

      if (params.pickPosition == null) {
        yawAngle /= -8;
        pitchAngle /= -8;
      }

      var voMatrix = new THREE.Matrix4();
      var pitch = new THREE.Vector3();
      var yaw = new THREE.Vector3();
      voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(pitch, yaw, new THREE.Vector3());
      var pitchRotation = new THREE.Quaternion();
      pitchRotation.setFromAxisAngle(pitch, pitchAngle * 2);
      var worldYawRotation = new THREE.Quaternion();
      worldYawRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle * 2); // axis: world up

      var deltaRotation = worldYawRotation.multiply(pitchRotation);
      if (params.pickPosition) this.camera.position.sub(params.pickPosition).applyQuaternion(deltaRotation).add(params.pickPosition);
      this.camera.quaternion.premultiply(deltaRotation);
      this.notifyCameraParametersChanged();
    }
  }, {
    key: "translate",
    value: function translate(params) {
      var voMatrix = new THREE.Matrix4();
      var pitch = new THREE.Vector3();
      var yaw = new THREE.Vector3();
      voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(pitch, yaw, new THREE.Vector3());
      var targetRight = -params.scaleFactor * params.dx;
      var targetUp = params.scaleFactor * params.dy;
      this.camera.position.addVectors(params.initialCameraPosition, pitch.multiplyScalar(targetRight).add(yaw.multiplyScalar(targetUp)));
      this.notifyCameraParametersChanged();
    }
  }, {
    key: "zoomAndTilt",
    value: function zoomAndTilt(params) {
      var voMatrix = new THREE.Matrix4();
      var roll = new THREE.Vector3();
      voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(new THREE.Vector3(), new THREE.Vector3(), roll);
      this.camera.position.add(roll.clone().multiplyScalar(params.zoomScale));
      var zRotation = new THREE.Quaternion();
      zRotation.setFromAxisAngle(roll, params.tiltAngle);
      this.camera.quaternion.premultiply(zRotation);
      this.notifyCameraParametersChanged();
    }
  }, {
    key: "zoom",
    value: function zoom(distance, deltaY) {
      var scaleFactor = 0.02 * distance * (deltaY < 0 ? -1 : 1);
      var voMatrix = new THREE.Matrix4();
      var roll = new THREE.Vector3();
      voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(new THREE.Vector3(), new THREE.Vector3(), roll);
      this.camera.position.add(roll.multiplyScalar(scaleFactor));
      this.notifyCameraParametersChanged();
    }
  }, {
    key: "notifyCameraParametersChanged",
    value: function notifyCameraParametersChanged() {
      var updateScene = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      if (typeof this.onCameraParametersChanged === 'function') this.onCameraParametersChanged(updateScene);
    }
  }]);

  return Viewpoint;
}();

'use strict';

var Selector =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Selector() {
    _classCallCheck(this, Selector);

    this.selectedObject = null;
    this.selectedRepresentations = [];
    this.onSelectionChange = null;
  }

  _createClass(Selector, [{
    key: "select",
    value: function select(object) {
      if (this.selectedObject === object) return;
      this.clearSelection();

      if (!object) {
        if (typeof this.onSelectionChange === 'function') this.onSelectionChange();
        return;
      }

      var children = [object];

      while (children.length > 0) {
        var child = children.pop();

        if (child.userData && child.userData.x3dType === 'Switch') {
          child.visible = true;
          this.selectedRepresentations.push(child);
        }

        if (child.children) children = children.concat(child.children);
      }

      if (this.selectedRepresentations.length > 0) this.selectedObject = object;
      if (typeof this.onSelectionChange === 'function') this.onSelectionChange();
    }
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.selectedRepresentations.forEach(function (representation) {
        representation.visible = false;
      });
      this.selectedRepresentations = [];
      this.selectedObject = null;
    }
  }]);

  return Selector;
}();
/* global webots, THREE, SystemInfo */


'use strict';

var MouseEvents =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function MouseEvents(scene, contextMenu, domElement, mobileDevice) {
    var _this14 = this;

    _classCallCheck(this, MouseEvents);

    this.scene = scene;
    this.contextMenu = contextMenu;
    this.domElement = domElement;
    this.mobileDevice = mobileDevice;
    this.state = {
      'initialized': false,
      'mouseDown': 0,
      'moved': false,
      'wheelFocus': false,
      'wheelTimeout': null,
      'hiddenContextMenu': false
    };
    this.moveParams = {};
    this.enableNavigation = true;

    this.onmousemove = function (event) {
      _this14._onMouseMove(event);
    };

    this.onmouseup = function (event) {
      _this14._onMouseUp(event);
    };

    this.ontouchmove = function (event) {
      _this14._onTouchMove(event);
    };

    this.ontouchend = function (event) {
      _this14._onTouchEnd(event);
    };

    domElement.addEventListener('mousedown', function (event) {
      _this14._onMouseDown(event);
    }, false);
    domElement.addEventListener('mouseover', function (event) {
      _this14._onMouseOver(event);
    }, false);
    domElement.addEventListener('mouseleave', function (event) {
      _this14._onMouseLeave(event);
    }, false);
    domElement.addEventListener('wheel', function (event) {
      _this14._onMouseWheel(event);
    }, false);
    domElement.addEventListener('touchstart', function (event) {
      _this14._onTouchStart(event);
    }, true);
    domElement.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    }, false); // Prevent '#playerDiv' to raise the context menu of the browser.
    // This bug has been seen on Windows 10 / Firefox only.

    domElement.parentNode.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    }, false);
  }

  _createClass(MouseEvents, [{
    key: "_onMouseDown",
    value: function _onMouseDown(event) {
      this.state.wheelFocus = true;

      this._initMouseMove(event);

      switch (event.button) {
        case THREE.MOUSE.LEFT:
          this.state.mouseDown |= 1;
          break;

        case THREE.MOUSE.MIDDLE:
          this.state.mouseDown |= 4;
          break;

        case THREE.MOUSE.RIGHT:
          this.state.mouseDown |= 2;
          break;
      }

      if (SystemInfo.isMacOS() && 'ctrlKey' in event && event['ctrlKey'] && this.state.mouseDown === 1) // On macOS, "Ctrl + left click" should be dealt as a right click.
        this.state.mouseDown = 2;

      if (this.state.mouseDown !== 0) {
        this._setupMoveParameters(event);

        this.state.initialX = event.clientX;
        this.state.initialY = event.clientY;
        document.addEventListener('mousemove', this.onmousemove, false);
        document.addEventListener('mouseup', this.onmouseup, false);
      }

      if (typeof webots.currentView.onmousedown === 'function') webots.currentView.onmousedown(event);
    }
  }, {
    key: "_onMouseMove",
    value: function _onMouseMove(event) {
      if (!this.enableNavigation && event.button === 0) {
        if (typeof webots.currentView.onmousemove === 'function') webots.currentView.onmousemove(event);
        return;
      }

      if (typeof this.state.x === 'undefined') // mousedown event has not been called yet.
        // This could happen for example when another application has focus while loading the scene.
        return;
      if ('buttons' in event) this.state.mouseDown = event.buttons;else if ('which' in event) {
        // Safari only
        switch (event.which) {
          case 0:
            this.state.mouseDown = 0;
            break;

          case 1:
            this.state.mouseDown = 1;
            break;

          case 2:
            this.state.pressedButton = 4;
            break;

          case 3:
            this.state.pressedButton = 2;
            break;

          default:
            this.state.pressedButton = 0;
            break;
        }
      }
      if (SystemInfo.isMacOS() && 'ctrlKey' in event && event['ctrlKey'] && this.state.mouseDown === 1) // On macOS, "Ctrl + left click" should be dealt as a right click.
        this.state.mouseDown = 2;
      if (this.state.mouseDown === 0) return;
      if (this.state.initialTimeStamp === null) // Prevent applying mouse move action before drag initialization in mousedrag event.
        return;
      this.moveParams.dx = event.clientX - this.state.x;
      this.moveParams.dy = event.clientY - this.state.y;

      if (this.state.mouseDown === 1) {
        // left mouse button to rotate viewpoint
        this.scene.viewpoint.rotate(this.moveParams);
      } else {
        if (this.state.mouseDown === 2) {
          // right mouse button to translate viewpoint
          this.moveParams.dx = event.clientX - this.state.initialX;
          this.moveParams.dy = event.clientY - this.state.initialY;
          this.scene.viewpoint.translate(this.moveParams);
        } else if (this.state.mouseDown === 3 || this.state.mouseDown === 4) {
          // both left and right button or middle button to zoom
          this.moveParams.tiltAngle = 0.01 * this.moveParams.dx;
          this.moveParams.zoomScale = this.moveParams.scaleFactor * 5 * this.moveParams.dy;
          this.scene.viewpoint.zoomAndTilt(this.moveParams, true);
        }
      }

      this.state.moved = event.clientX !== this.state.x || event.clientY !== this.state.y;
      this.state.x = event.clientX;
      this.state.y = event.clientY;
      if (typeof webots.currentView.onmousemove === 'function') webots.currentView.onmousemove(event);
      if (typeof webots.currentView.onmousedrag === 'function') webots.currentView.onmousedrag(event);
    }
  }, {
    key: "_onMouseUp",
    value: function _onMouseUp(event) {
      this._clearMouseMove();

      this._selectAndHandleClick();

      document.removeEventListener('mousemove', this.onmousemove, false);
      document.removeEventListener('mouseup', this.onmouseup, false);
      if (typeof webots.currentView.onmouseup === 'function') webots.currentView.onmouseup(event);
    }
  }, {
    key: "_onMouseWheel",
    value: function _onMouseWheel(event) {
      var _this15 = this;

      event.preventDefault(); // do not scroll page

      if (!('initialCameraPosition' in this.moveParams)) this._setupMoveParameters(event); // else another drag event is already active

      if (!this.enableNavigation || this.state.wheelFocus === false) {
        var offset = event.deltaY;
        if (event.deltaMode === 1) offset *= 40; // standard line height in pixel

        window.scroll(0, window.pageYOffset + offset);

        if (this.state.wheelTimeout) {
          // you have to rest at least 1.5 seconds over the x3d canvas
          clearTimeout(this.state.wheelTimeout); // so that the wheel focus will get enabled and

          this.state.wheelTimeout = setTimeout(function (event) {
            _this15._wheelTimeoutCallback(event);
          }, 1500); // allow you to zoom in/out.
        }

        return;
      }

      this.scene.viewpoint.zoom(this.moveParams.distanceToPickPosition, event.deltaY);
      if (typeof webots.currentView.onmousewheel === 'function') webots.currentView.onmousewheel(event);
    }
  }, {
    key: "_wheelTimeoutCallback",
    value: function _wheelTimeoutCallback(event) {
      this.state.wheelTimeout = null;
      this.state.wheelFocus = true;
    }
  }, {
    key: "_onMouseOver",
    value: function _onMouseOver(event) {
      var _this16 = this;

      this.state.wheelTimeout = setTimeout(function (event) {
        _this16._wheelTimeoutCallback(event);
      }, 1500);
    }
  }, {
    key: "_onMouseLeave",
    value: function _onMouseLeave(event) {
      if (this.state.wheelTimeout != null) {
        clearTimeout(this.state.wheelTimeout);
        this.state.wheelTimeout = null;
      }

      this.state.wheelFocus = false;
      if (typeof webots.currentView.onmouseleave === 'function') webots.currentView.onmouseleave(event);
    }
  }, {
    key: "_onTouchMove",
    value: function _onTouchMove(event) {
      if (!this.enableNavigation || event.targetTouches.length === 0 || event.targetTouches.length > 2) return;
      if (this.state.initialTimeStamp === null) // Prevent applying mouse move action before drag initialization in mousedrag event.
        return;
      if (this.state.mouseDown !== 2 !== event.targetTouches.length > 1) // Gesture single/multi touch changed after initialization.
        return;
      var touch = event.targetTouches['0'];
      var x = Math.round(touch.clientX); // discard decimal values returned on android

      var y = Math.round(touch.clientY);

      if (this.state.mouseDown === 2) {
        // translation
        this.moveParams.dx = x - this.state.x;
        this.moveParams.dy = y - this.state.y; // On small phone screens (Android) this is needed to correctly detect clicks and longClicks.

        if (this.state.initialX == null && this.state.initialY == null) {
          this.state.initialX = Math.round(this.state.x);
          this.state.initialY = Math.round(this.state.y);
        }

        if (Math.abs(this.moveParams.dx) < 2 && Math.abs(this.moveParams.dy) < 2 && Math.abs(this.state.initialX - x) < 5 && Math.abs(this.state.initialY - y) < 5) this.state.moved = false;else this.state.moved = true;
        this.moveParams.dx = x - this.state.initialX;
        this.moveParams.dy = y - this.state.initialY;
        this.scene.viewpoint.translate(this.moveParams);
      } else {
        var touch1 = event.targetTouches['1'];
        var x1 = Math.round(touch1.clientX);
        var y1 = Math.round(touch1.clientY);
        var distanceX = x - x1;
        var distanceY = y - y1;
        var newTouchDistance = distanceX * distanceX + distanceY * distanceY;
        var pinchSize = this.state.touchDistance - newTouchDistance;
        var moveX1 = x - this.state.x;
        var moveX2 = x1 - this.state.x1;
        var moveY1 = y - this.state.y;
        var moveY2 = y1 - this.state.y1;
        var ratio = window.devicePixelRatio || 1;

        if (Math.abs(pinchSize) > 500 * ratio) {
          // zoom and tilt
          var d;
          if (Math.abs(moveX2) < Math.abs(moveX1)) d = moveX1;else d = moveX2;
          this.moveParams.tiltAngle = 0.0004 * d;
          this.moveParams.zoomScale = this.moveParams.scaleFactor * 0.015 * pinchSize;
          this.scene.viewpoint.zoomAndTilt(this.moveParams);
        } else if (Math.abs(moveY2 - moveY1) < 3 * ratio && Math.abs(moveX2 - moveX1) < 3 * ratio) {
          // rotation (pitch and yaw)
          this.moveParams.dx = moveX1 * 0.8;
          this.moveParams.dy = moveY1 * 0.5;
          this.scene.viewpoint.rotate(this.moveParams);
        }

        this.state.touchDistance = newTouchDistance;
        this.state.moved = true;
      }

      this.state.x = x;
      this.state.y = y;
      this.state.x1 = x1;
      this.state.y1 = y1;
      if (typeof webots.currentView.ontouchmove === 'function') webots.currentView.ontouchmove(event);
    }
  }, {
    key: "_onTouchStart",
    value: function _onTouchStart(event) {
      this._initMouseMove(event.targetTouches['0']);

      if (event.targetTouches.length === 2) {
        var touch1 = event.targetTouches['1'];
        this.state.x1 = touch1.clientX;
        this.state.y1 = touch1.clientY;
        var distanceX = this.state.x - this.state.x1;
        var distanceY = this.state.y - this.state.y1;
        this.state.touchDistance = distanceX * distanceX + distanceY * distanceY;
        this.state.touchOrientation = Math.atan2(this.state.y1 - this.state.y, this.state.x1 - this.state.x);
        this.state.mouseDown = 3; // two fingers: rotation, tilt, zoom
      } else this.state.mouseDown = 2; // 1 finger: translation or single click


      this._setupMoveParameters(event.targetTouches['0']);

      this.domElement.addEventListener('touchend', this.ontouchend, true);
      this.domElement.addEventListener('touchmove', this.ontouchmove, true);
      if (typeof webots.currentView.ontouchstart === 'function') webots.currentView.ontouchstart(event);
    }
  }, {
    key: "_onTouchEnd",
    value: function _onTouchEnd(event) {
      this._clearMouseMove();

      this._selectAndHandleClick();

      this.domElement.removeEventListener('touchend', this.ontouchend, true);
      this.domElement.removeEventListener('touchmove', this.ontouchmove, true);
      if (typeof webots.currentView.ontouchend === 'function') webots.currentView.ontouchend(event);
    }
  }, {
    key: "_initMouseMove",
    value: function _initMouseMove(event) {
      this.state.x = event.clientX;
      this.state.y = event.clientY;
      this.state.initialX = null;
      this.state.initialY = null;
      this.state.moved = false;
      this.state.initialTimeStamp = Date.now();
      this.state.longClick = false;
      if (this.contextMenu) this.hiddenContextMenu = this.contextMenu.toggle();
    }
  }, {
    key: "_setupMoveParameters",
    value: function _setupMoveParameters(event) {
      this.moveParams = {};
      var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(this.scene.renderer.domElement, event.clientX, event.clientY);
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(this.scene.renderer.domElement, event.clientX, event.clientY);
      this.intersection = this.scene.pick(relativePosition, screenPosition);
      if (this.intersection && this.intersection.object) this.moveParams.pickPosition = this.intersection.point;else this.moveParams.pickPosition = null;

      if (this.intersection == null) {
        var cameraPosition = new THREE.Vector3();
        this.scene.viewpoint.camera.getWorldPosition(cameraPosition);
        this.moveParams.distanceToPickPosition = cameraPosition.length();
      } else this.moveParams.distanceToPickPosition = this.intersection.distance;

      if (this.moveParams.distanceToPickPosition < 0.001) // 1 mm
        this.moveParams.distanceToPickPosition = 0.001; // Webots mFieldOfView corresponds to the horizontal FOV, i.e. viewpoint.fovX.

      this.moveParams.scaleFactor = this.moveParams.distanceToPickPosition * 2 * Math.tan(0.5 * this.scene.viewpoint.camera.fovX);
      var viewHeight = parseFloat($(this.scene.domElement).css('height').slice(0, -2));
      var viewWidth = parseFloat($(this.scene.domElement).css('width').slice(0, -2));
      this.moveParams.scaleFactor /= Math.max(viewHeight, viewWidth);
      this.moveParams.initialCameraPosition = this.scene.viewpoint.camera.position.clone();
    }
  }, {
    key: "_clearMouseMove",
    value: function _clearMouseMove() {
      var timeDelay = this.mobileDevice ? 100 : 1000;
      this.state.longClick = Date.now() - this.state.initialTimeStamp >= timeDelay;
      if (this.state.moved === false) this.previousSelection = this.selection;else this.previousSelection = null;
      this.state.previousMouseDown = this.state.mouseDown;
      this.state.mouseDown = 0;
      this.state.initialTimeStamp = null;
      this.state.initialX = null;
      this.state.initialY = null;
      this.moveParams = {};
    }
  }, {
    key: "_selectAndHandleClick",
    value: function _selectAndHandleClick() {
      if (this.state.moved === false && (!this.state.longClick || this.mobileDevice)) {
        var object;

        if (this.intersection) {
          object = this.intersection.object;
          if (object) object = this.scene.getTopX3dNode(object);
        }

        this.scene.selector.select(object);
        if ((this.mobileDevice && this.state.longClick || !this.mobileDevice && this.state.previousMouseDown === 2) && this.hiddenContextMenu === false && this.contextMenu) // Right click: show popup menu.
          this.contextMenu.show(object, {
            x: this.state.x,
            y: this.state.y
          });
      }
    }
  }]);

  return MouseEvents;
}();

MouseEvents.convertMouseEventPositionToScreenPosition = function (element, eventX, eventY) {
  var rect = element.getBoundingClientRect();
  var pos = new THREE.Vector2();
  pos.x = (eventX - rect.left) / (rect.right - rect.left) * 2 - 1;
  pos.y = -((eventY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
  return pos;
};

MouseEvents.convertMouseEventPositionToRelativePosition = function (element, eventX, eventY) {
  var rect = element.getBoundingClientRect();
  var pos = new THREE.Vector2();
  pos.x = Math.round(eventX - rect.left);
  pos.y = Math.round(eventY - rect.top);
  return pos;
};
/* global THREE */

/* exported TextureLoader, TextureData */


'use strict';

var TextureLoader = {
  createEmptyTexture: function createEmptyTexture(name) {
    if (hasHDRExtension(name)) {
      var texture = new THREE.DataTexture();
      texture.encoding = THREE.RGBEEncoding;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.flipY = true;
      return texture;
    }

    return new THREE.Texture();
  },
  applyTextureTransform: function applyTextureTransform(texture, transformData) {
    this._getInstance().applyTextureTransform(texture, transformData);
  },
  createColoredCubeTexture: function createColoredCubeTexture(color) {
    var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    // Create an off-screen canvas.
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height; // Create RGB values.

    var r = Math.floor(color.r * 255);
    var g = Math.floor(color.g * 255);
    var b = Math.floor(color.b * 255); // Push pixels.

    var data = context.createImageData(width, height);
    var size = width * height;

    for (var i = 0; i < size; i++) {
      var stride = i * 4;
      data.data[stride + 0] = r;
      data.data[stride + 1] = g;
      data.data[stride + 2] = b;
      data.data[stride + 3] = 255;
    }

    context.putImageData(data, 0, 0); // Create the CubeTexture.

    var src = canvas.toDataURL();
    var loader = new THREE.CubeTextureLoader();
    return loader.load([src, src, src, src, src, src]);
  },
  createOrRetrieveTexture: function createOrRetrieveTexture(filename, textureData) {
    console.assert(typeof filename === 'string', 'TextureLoader.createOrRetrieveTexture: name is not a string.');
    return this._getInstance().createOrRetrieveTexture(filename, textureData);
  },
  loadOrRetrieveImage: function loadOrRetrieveImage(filename, texture) {
    var cubeTextureIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
    var onLoad = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
    console.assert(typeof filename === 'string', 'TextureLoader.loadOrRetrieveImage: name is not a string.');
    if (typeof filename === 'undefined' || filename === '') return undefined;
    return this._getInstance().loadOrRetrieveImage(filename, texture, cubeTextureIndex, onLoad);
  },
  setOnTextureLoad: function setOnTextureLoad(onLoad) {
    this._getInstance().onTextureLoad = onLoad;
  },
  setTexturePathPrefix: function setTexturePathPrefix(texturePathPrefix) {
    this._getInstance().texturePathPrefix = texturePathPrefix;
  },
  hasPendingData: function hasPendingData() {
    return this._getInstance().hasPendingData;
  },
  _getInstance: function _getInstance() {
    if (typeof this.instance === 'undefined') this.instance = new _TextureLoaderObject();
    return this.instance;
  }
};

var TextureData =
/*#__PURE__*/
function () {
  function TextureData(transparent, wrap, anisotropy, transform) {
    _classCallCheck(this, TextureData);

    this.transparent = transparent;
    this.wrap = wrap;
    this.anisotropy = anisotropy;
    this.transform = transform;
  }

  _createClass(TextureData, [{
    key: "equals",
    value: function equals(other) {
      return this.transparent === other.transparent && this.anisotropy === other.anisotropy && JSON.stringify(this.wrap) === JSON.stringify(other.wrap) && JSON.stringify(this.transform) === JSON.stringify(other.transform);
    }
  }]);

  return TextureData;
}();

;

var _TextureLoaderObject =
/*#__PURE__*/
function () {
  function _TextureLoaderObject() {
    _classCallCheck(this, _TextureLoaderObject);

    this.images = []; // list of image names

    this.textures = {}; // dictionary <texture file name, array <[texture data, texture object]>

    this.loadingTextures = {}; // dictionary <texture file name, dictionary <'objects': [texture objects], 'onLoad': [callback functions] > >

    this.loadingCubeTextureObjects = {}; // dictionary <cube texture object, dictionary < image name: [cube image index] > >

    this.onTextureLoad = undefined;
    this.texturePathPrefix = '';
    this.hasPendingData = false;
  }

  _createClass(_TextureLoaderObject, [{
    key: "createOrRetrieveTexture",
    value: function createOrRetrieveTexture(filename, textureData) {
      var textures = this.textures[filename];

      if (textures) {
        for (var i in textures) {
          if (textures[i][0].equals(textureData)) return textures[i][1];
        }
      } else this.textures[filename] = []; // Create THREE.Texture or THREE.DataTexture based on image extension.


      var newTexture = TextureLoader.createEmptyTexture(filename);
      this.textures[filename].push([textureData, newTexture]); // Look for already loaded texture or load the texture in an asynchronous way.

      var image = this.loadOrRetrieveImage(filename, newTexture);

      if (typeof image !== 'undefined') {
        // else it could be updated later
        newTexture.image = image;
        newTexture.needsUpdate = true;
      }

      newTexture.userData = {
        'isTransparent': textureData.transparent,
        'url': filename
      };
      newTexture.wrapS = textureData.wrap.s === 'true' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      newTexture.wrapT = textureData.wrap.t === 'true' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      newTexture.anisotropy = textureData.anisotropy;
      if (typeof textureData.transform !== 'undefined') this.applyTextureTransform(newTexture, textureData.transform); // This is the encoding used in Webots.

      newTexture.encoding = THREE.sRGBEncoding;
      return newTexture;
    }
  }, {
    key: "applyTextureTransform",
    value: function applyTextureTransform(texture, transformData) {
      if (transformData !== 'undefined') {
        texture.matrixAutoUpdate = false;

        texture.onUpdate = function () {
          // X3D UV transform matrix differs from THREE.js default one
          // http://www.web3d.org/documents/specifications/19775-1/V3.2/Part01/components/texturing.html#TextureTransform
          var c = Math.cos(-transformData.rotation);
          var s = Math.sin(-transformData.rotation);
          var sx = transformData.scale.x;
          var sy = transformData.scale.y;
          var cx = transformData.center.x;
          var cy = transformData.center.y;
          var tx = transformData.translation.x;
          var ty = transformData.translation.y;
          texture.matrix.set(sx * c, sx * s, sx * (tx * c + ty * s + cx * c + cy * s) - cx, -sy * s, sy * c, sy * (-tx * s + ty * c - cx * s + cy * c) - cy, 0, 0, 1);
        };
      } else {
        texture.matrixAutoUpdate = true;
        texture.onUpdate = null;
      }

      texture.needsUpdate = true;
    }
  }, {
    key: "loadOrRetrieveImage",
    value: function loadOrRetrieveImage(name, texture) {
      var _this17 = this;

      var cubeTextureIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
      var onLoad = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
      if (this.texturePathPrefix) name = this.texturePathPrefix + name;

      if (this.images[name]) {
        if (typeof onLoad !== 'undefined') onLoad(this.images[name]);
        return this.images[name];
      }

      if (texture instanceof THREE.CubeTexture) {
        var missingImages;

        if (this.loadingCubeTextureObjects[texture]) {
          missingImages = this.loadingCubeTextureObjects[texture];
          if (missingImages[name]) missingImages[name].push(cubeTextureIndex);else missingImages[name] = [cubeTextureIndex];
        } else {
          missingImages = {};
          missingImages[name] = [cubeTextureIndex];
          this.loadingCubeTextureObjects[texture] = missingImages;
        }
      }

      if (this.loadingTextures[name]) {
        if (typeof texture !== 'undefined') this.loadingTextures[name].objects.push(texture);
        if (typeof onLoad !== 'undefined') this.loadingTextures[name].onLoad.push(onLoad);
        return undefined; // texture is already loading
      }

      this.loadingTextures[name] = {
        objects: [],
        onLoad: []
      };
      if (typeof texture !== 'undefined') this.loadingTextures[name].objects.push(texture);
      if (typeof onLoad !== 'undefined') this.loadingTextures[name].onLoad.push(onLoad);
      this.hasPendingData = true;

      this._setTimeout(); // Load from url.


      var loader;
      var isHDR = hasHDRExtension(name);

      if (isHDR) {
        loader = new THREE.RGBELoader();
        loader.type = THREE.FloatType;
      } else loader = new THREE.ImageLoader();

      loader.load(name, function (data) {
        if (_this17.loadingTextures[name]) {
          _this17.loadingTextures[name].data = data;

          _this17._onImageLoaded(name);
        } // else image already loaded

      }, undefined, // onProgress callback
      function (err) {
        // onError callback
        console.error('An error happened when loading the texure "' + name + '": ' + err); // else image could be received later
      });
      return undefined;
    }
  }, {
    key: "_onImageLoaded",
    value: function _onImageLoaded(name) {
      var _this18 = this;

      if (!this.loadingTextures[name]) return;
      var image = this.loadingTextures[name].data;
      this.images[name] = image;
      var textureObjects = this.loadingTextures[name].objects; // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.

      var isJPEG = hasJPEGExtension(name);
      var isHDR = isJPEG ? false : hasHDRExtension(name);
      textureObjects.forEach(function (textureObject) {
        if (textureObject instanceof THREE.CubeTexture) {
          var missingImages = _this18.loadingCubeTextureObjects[textureObject];
          var indices = missingImages[name];
          indices.forEach(function (indice) {
            if (indice === 2 || indice === 3) {
              // Flip the top and bottom images of the cubemap to ensure a similar projection as the Webots one.
              if (isHDR) flipHDRImage(image.image);else flipRegularImage(image);
            }

            textureObject.images[indice] = image;
          });
          delete missingImages[name];

          if (Object.keys(missingImages).length === 0) {
            textureObject.needsUpdate = true;
            delete _this18.loadingCubeTextureObjects[textureObject];
          }
        } else {
          if (!isHDR) textureObject.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
          textureObject.image = image;
          textureObject.needsUpdate = true;
        }
      });
      var callbackFunctions = this.loadingTextures[name].onLoad;
      callbackFunctions.forEach(function (callback) {
        if (typeof callback === 'function') callback(image);
      });
      delete this.loadingTextures[name];
      if (typeof this.onTextureLoad === 'function') this.onTextureLoad();

      this._evaluatePendingData();
    }
  }, {
    key: "_setTimeout",
    value: function _setTimeout() {
      var _this19 = this;

      // Set texture loading timeout.
      // If after some time no new textures are loaded, the hasPendingData variable is automatically
      // reset to false in order to handle not found textures.
      // The `this.loadingTextures` dictionary is not reset so that it is still possible to load late textures.
      if (this.timeoutHandle) window.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = window.setTimeout(function () {
        var message = 'ERROR: Texture loader timeout elapsed. The following textures could not be loaded: \n';

        for (var key in _this19.loadingTextures) {
          message += key + '\n';
        }

        console.error(message);
        _this19.hasPendingData = false;
        if (typeof _this19.onTextureLoad === 'function') _this19.onTextureLoad();
      }, 10000); // wait 10 seconds
    }
  }, {
    key: "_evaluatePendingData",
    value: function _evaluatePendingData() {
      this.hasPendingData = false;

      for (var key in this.loadingTextures) {
        if (this.loadingTextures.hasOwnProperty(key)) {
          this.hasPendingData = true;
          break;
        }
      }

      if (this.hasPendingData) this._setTimeout();else if (this.timeoutHandle) window.clearTimeout(this.timeoutHandle);
    }
  }]);

  return _TextureLoaderObject;
}();

; // Inspired from: https://stackoverflow.com/questions/17040360/javascript-function-to-rotate-a-base-64-image-by-x-degrees-and-return-new-base64
// Flip a base64 image by 180 degrees.

function flipRegularImage(base64Image) {
  // Create an off-screen canvas.
  var offScreenCanvas = document.createElement('canvas');
  var context = offScreenCanvas.getContext('2d'); // Set its dimension to rotated size.

  offScreenCanvas.width = base64Image.width;
  offScreenCanvas.height = base64Image.height; // Rotate and draw source image into the off-screen canvas.

  context.scale(-1, -1);
  context.translate(-offScreenCanvas.height, -offScreenCanvas.width);
  context.drawImage(base64Image, 0, 0); // Encode the image to data-uri with base64:

  base64Image.src = offScreenCanvas.toDataURL('image/jpeg', 95);
}

function flipHDRImage(image) {
  var size = image.width * image.height;
  var d = new Float32Array(3 * size);
  var max = 3 * (size - 1);
  var i = 0;
  var c = 0;

  for (i = 0; i < 3 * size; i += 3) {
    var m = max - i;

    for (c = 0; c < 3; c++) {
      d[i + c] = image.data[m + c];
    }
  }

  image.data = d;
}

function hasJPEGExtension(name) {
  return name.search(/\.jpe?g($|\?)/i) > 0 || name.search(/^data:image\/jpeg/) === 0;
}

function hasHDRExtension(name) {
  return name.search(/\.hdr($|\?)/i) > 0 || name.search(/^data:image\/hdr/) === 0;
}
/* exported DefaultUrl */


'use strict';

var DefaultUrl = {
  wwiUrl: function wwiUrl() {
    if (typeof this._wwiUrl === 'undefined') {
      this._wwiUrl = '';
      var scripts = document.getElementsByTagName('script');

      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src;
        if (src.indexOf('?') > 0) src = src.substring(0, src.indexOf('?'));

        if (src.endsWith('webots.js') || src.endsWith('webots.min.js')) {
          this._wwiUrl = src.substr(0, src.lastIndexOf('/') + 1); // remove "webots.js"

          break;
        }
      }
    }

    return this._wwiUrl;
  },
  wwiImagesUrl: function wwiImagesUrl(name) {
    return this.wwiUrl() + 'images/';
  },
  currentScriptUrl: function currentScriptUrl() {
    // Get the directory path to the currently executing script file
    // for example: https://cyberbotics.com/wwi/8.6/
    var scripts = document.querySelectorAll('script[src]');

    for (var i in scripts) {
      var src = scripts[i].src;
      var index = src.indexOf('?');
      if (index > 0) src = src.substring(0, index); // remove query string

      if (!src.endsWith('webots.js') && !src.endsWith('webots.min.js')) continue;
      index = src.lastIndexOf('/');
      return src.substring(0, index + 1);
    }

    return '';
  }
};
/* global webots, Stream, TextureLoader */

'use strict';

var Server =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Server(url, view, onready) {
    _classCallCheck(this, Server);

    this.view = view;
    this.onready = onready; // url has the following form: "ws(s)://cyberbotics2.cyberbotics.com:80/simple/worlds/simple.wbt"

    var n = url.indexOf('/', 6);
    var m = url.lastIndexOf('/');
    this.url = 'http' + url.substring(2, n); // e.g., "http(s)://cyberbotics2.cyberbotics.com:80"

    this.project = url.substring(n + 1, m - 7); // e.g., "simple"

    this.worldFile = url.substring(m + 1); // e.g., "simple.wbt"

    this.controllers = [];
  }

  _createClass(Server, [{
    key: "connect",
    value: function connect() {
      var _this20 = this;

      var xhr = new XMLHttpRequest();
      xhr.open('GET', this.url + '/session', true);
      $('#webotsProgressMessage').html('Connecting to session server...');

      xhr.onreadystatechange = function (e) {
        if (xhr.readyState !== 4) return;
        if (xhr.status !== 200) return;
        var data = xhr.responseText;

        if (data.startsWith('Error:')) {
          $('#webotsProgress').hide();
          var errorMessage = data.substring(6).trim();
          errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.substring(1);
          webots.alert('Session server error', errorMessage);
          return;
        }

        _this20.socket = new WebSocket(data + '/client');

        _this20.socket.onopen = function (event) {
          _this20.onOpen(event);
        };

        _this20.socket.onmessage = function (event) {
          _this20.onMessage(event);
        };

        _this20.socket.onclose = function (event) {
          _this20.view.console.info('Disconnected to the Webots server.');
        };

        _this20.socket.onerror = function (event) {
          _this20.view.console.error('Cannot connect to the simulation server');
        };
      };

      xhr.send();
    }
  }, {
    key: "onOpen",
    value: function onOpen(event) {
      var host = location.protocol + '//' + location.host.replace(/^www./, ''); // remove 'www' prefix

      if (typeof webots.User1Id === 'undefined') webots.User1Id = '';
      if (typeof webots.User1Name === 'undefined') webots.User1Name = '';
      if (typeof webots.User1Authentication === 'undefined') webots.User1Authentication = '';
      if (typeof webots.User2Id === 'undefined') webots.User2Id = '';
      if (typeof webots.User2Name === 'undefined') webots.User2Name = '';
      if (typeof webots.CustomData === 'undefined') webots.CustomData = '';
      this.socket.send('{ "init" : [ "' + host + '", "' + this.project + '", "' + this.worldFile + '", "' + webots.User1Id + '", "' + webots.User1Name + '", "' + webots.User1Authentication + '", "' + webots.User2Id + '", "' + webots.User2Name + '", "' + webots.CustomData + '" ] }');
      $('#webotsProgressMessage').html('Starting simulation...');
    }
  }, {
    key: "onMessage",
    value: function onMessage(event) {
      var message = event.data;

      if (message.indexOf('webots:ws://') === 0 || message.indexOf('webots:wss://') === 0) {
        var url = message.substring(7);
        var httpServerUrl = url.replace(/ws/, 'http'); // Serve the texture images. SSL prefix is supported.

        TextureLoader.setTexturePathPrefix(httpServerUrl + '/');
        this.view.stream = new Stream(url, this.view, this.onready);
        this.view.stream.connect();
      } else if (message.indexOf('controller:') === 0) {
        var n = message.indexOf(':', 11);
        var controller = {};
        controller.name = message.substring(11, n);
        controller.port = message.substring(n + 1);
        this.view.console.info('Using controller ' + controller.name + ' on port ' + controller.port);
        this.controllers.push(controller);
      } else if (message.indexOf('queue:') === 0) this.view.console.error('The server is saturated. Queue to wait: ' + message.substring(6) + ' client(s).');else if (message === '.') {// received every 5 seconds when Webots is running
        // nothing to do
      } else if (message.indexOf('reset controller:') === 0) this.view.stream.socket.send('sync controller:' + message.substring(18).trim());else console.log('Received an unknown message from the Webots server socket: "' + message + '"');
    }
  }, {
    key: "resetController",
    value: function resetController(filename) {
      this.socket.send('{ "reset controller" : "' + filename + '" }');
    }
  }]);

  return Server;
}();
/* global webots */


'use strict';

var Stream =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Stream(wsServer, view, onready) {
    _classCallCheck(this, Stream);

    this.wsServer = wsServer;
    this.view = view;
    this.onready = onready;
    this.socket = null;
    this.videoStream = null;
  }

  _createClass(Stream, [{
    key: "connect",
    value: function connect() {
      var _this21 = this;

      this.socket = new WebSocket(this.wsServer);
      $('#webotsProgressMessage').html('Connecting to Webots instance...');

      this.socket.onopen = function (event) {
        _this21.onSocketOpen(event);
      };

      this.socket.onmessage = function (event) {
        _this21.onSocketMessage(event);
      };

      this.socket.onclose = function (event) {
        _this21.onSocketClose(event);
      };

      this.socket.onerror = function (event) {
        _this21.view.destroyWorld();

        _this21.view.onerror('WebSocket error: ' + event.data);
      };
    }
  }, {
    key: "close",
    value: function close() {
      if (this.socket) this.socket.close();
      if (this.videoStream) this.videoStream.close();
    }
  }, {
    key: "onSocketOpen",
    value: function onSocketOpen(event) {
      var mode = this.view.mode;
      if (mode === 'video') mode += ': ' + this.view.video.width + 'x' + this.view.video.height;else if (this.view.broadcast) mode += ';broadcast';
      this.socket.send(mode);
    }
  }, {
    key: "onSocketClose",
    value: function onSocketClose(event) {
      this.view.onerror('Disconnected from ' + this.wsServer + ' (' + event.code + ')');

      if (event.code > 1001 && event.code < 1016 || event.code === 1001 && this.view.quitting === false) {
        // https://tools.ietf.org/html/rfc6455#section-7.4.1
        webots.alert('Streaming server error', 'Connection closed abnormally.<br>(Error code: ' + event.code + ')<br><br>' + 'Please reset the simulation by clicking ' + '<a href="' + window.location.href + '">here</a>.');
      }

      this.view.destroyWorld();
      if (typeof this.view.onclose === 'function') this.view.onclose();
    }
  }, {
    key: "onSocketMessage",
    value: function onSocketMessage(event) {
      var lines, i;
      var data = event.data;

      if (data.startsWith('robot:') || data.startsWith('stdout:') || data.startsWith('stderr:')) {
        lines = data.split('\n'); // in that case, we support one message per line

        for (i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line === '') // FIXME: should not happen
            continue;
          if (line.startsWith('stdout:')) this.view.console.stdout(line.substring(7));else if (line.startsWith('stderr:')) this.view.console.stderr(line.substring(7));else if (line.startsWith('robot:')) {
            var secondColonIndex = line.indexOf(':', 6);
            var robot = line.substring(6, secondColonIndex);
            var message = line.substring(secondColonIndex + 1);
            this.view.onrobotmessage(robot, message);
          }
        }
      } else if (data.startsWith('application/json:')) {
        if (typeof this.view.time !== 'undefined') {
          // otherwise ignore late updates until the scene loading is completed
          data = data.substring(data.indexOf(':') + 1);
          var frame = JSON.parse(data);
          this.view.time = frame.time;
          $('#webotsClock').html(webots.parseMillisecondsIntoReadableTime(frame.time));

          if (frame.hasOwnProperty('poses')) {
            for (i = 0; i < frame.poses.length; i++) {
              this.view.x3dScene.applyPose(frame.poses[i]);
            }
          }

          if (this.view.x3dScene.viewpoint.updateViewpointPosition(null, this.view.time)) this.view.x3dScene.viewpoint.notifyCameraParametersChanged(false);
          this.view.x3dScene.onSceneUpdate();
        }
      } else if (data.startsWith('node:')) {
        data = data.substring(data.indexOf(':') + 1);
        var parentId = data.split(':')[0];
        data = data.substring(data.indexOf(':') + 1);
        this.view.x3dScene.loadObject(data, parentId);
      } else if (data.startsWith('delete:')) {
        data = data.substring(data.indexOf(':') + 1).trim();
        this.view.x3dScene.deleteObject(data);
      } else if (data.startsWith('model:')) {
        $('#webotsProgressMessage').html('Loading 3D scene...');
        $('#webotsProgressPercent').html('');
        this.view.destroyWorld();
        data = data.substring(data.indexOf(':') + 1).trim();
        if (!data) // received an empty model case: just destroy the view
          return;
        this.view.x3dScene.loadObject(data);
      } else if (data.startsWith('world:')) {
        data = data.substring(data.indexOf(':') + 1).trim();
        var currentWorld = data.substring(0, data.indexOf(':')).trim();
        data = data.substring(data.indexOf(':') + 1).trim();
        this.view.updateWorldList(currentWorld, data.split(';'));
      } else if (data.startsWith('video: ')) {
        console.log('Received data = ' + data);
        var list = data.split(' ');
        var url = list[1];
        var streamId = list[2];
        console.log('Received video message on ' + url + ' stream = ' + streamId);
        this.videoStream = new webots.VideoStream(url, this.view.video, document.getElementById('BitrateViewer'), streamId);
        if (typeof this.onready === 'function') this.onready();
      } else if (data.startsWith('set controller:')) {
        var slash = data.indexOf('/', 15);
        var dirname = data.substring(15, slash);
        var filename = data.substring(slash + 1, data.indexOf(':', slash + 1));
        if (this.view.editor.dirname === dirname) this.view.editor.addFile(filename, data.substring(data.indexOf('\n') + 1)); // remove the first line
        else console.log('Warning: ' + filename + ' not in controller directory: ' + dirname + ' != ' + this.view.editor.dirname);
      } else if (data === 'pause' || data === 'paused by client') {
        this.view.toolBar.setMode('pause'); // Update timeout.

        if (data === 'pause') this.view.isAutomaticallyPaused = undefined;

        if (this.view.timeout > 0 && !this.view.isAutomaticallyPaused) {
          this.view.deadline = this.view.timeout;
          if (typeof this.view.time !== 'undefined') this.view.deadline += this.view.time;
          $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(this.view.deadline));
        }
      } else if (data === 'real-time' || data === 'run' || data === 'fast') {
        this.view.toolBar.setMode(data);
        if (this.view.timeout >= 0) this.view.stream.socket.send('timeout:' + this.view.timeout);
      } else if (data.startsWith('loading:')) {
        data = data.substring(data.indexOf(':') + 1).trim();
        var loadingStatus = data.substring(0, data.indexOf(':')).trim();
        data = data.substring(data.indexOf(':') + 1).trim();
        $('#webotsProgressMessage').html('Loading: ' + loadingStatus);
        $('#webotsProgressPercent').html('<progress value="' + data + '" max="100"></progress>');
      } else if (data === 'scene load completed') {
        this.view.time = 0;
        $('#webotsClock').html(webots.parseMillisecondsIntoReadableTime(0));
        if (typeof this.onready === 'function') this.onready();
      } else if (data === 'reset finished') {
        this.view.resetSimulation();
        if (typeof this.onready === 'function') this.onready();
      } else if (data.startsWith('label')) {
        var semiColon = data.indexOf(';');
        var id = data.substring(data.indexOf(':'), semiColon);
        var previousSemiColon;
        var labelProperties = []; // ['font', 'color', 'size', 'x', 'y', 'text']

        for (i = 0; i < 5; i++) {
          previousSemiColon = semiColon + 1;
          semiColon = data.indexOf(';', previousSemiColon);
          labelProperties.push(data.substring(previousSemiColon, semiColon));
        }

        this.view.setLabel({
          id: id,
          text: data.substring(semiColon + 1, data.length),
          font: labelProperties[0],
          color: labelProperties[1],
          size: labelProperties[2],
          x: labelProperties[3],
          y: labelProperties[4]
        });
      } else console.log('WebSocket error: Unknown message received: "' + data + '"');
    }
  }]);

  return Stream;
}();

'use strict';

var Video =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Video(parentObject, mouseEvents, stream) {
    var _this22 = this;

    _classCallCheck(this, Video);

    this.domElement = document.createElement('video');
    this.domElement.style.background = 'grey';
    this.domElement.id = 'remoteVideo';
    this.domElement["class"] = 'rounded centered';
    this.domElement.autoplay = 'true';
    this.domElement.width = 800;
    this.domElement.height = 600;
    parentObject.appendChild(this.domElement);
    this.mouseEvents = mouseEvents;
    this.stream = stream;

    this.onmousemove = function (e) {
      _this22._onMouseMove(e);
    };
  }

  _createClass(Video, [{
    key: "finalize",
    value: function finalize(onready) {
      var _this23 = this;

      this.domElement.addEventListener('mousedown', function (e) {
        _this23._onMouseDown(e);
      }, false);
      this.domElement.addEventListener('mouseup', function (e) {
        _this23._onMouseUp(e);
      }, false);
      this.domElement.addEventListener('wheel', function (e) {
        _this23._onWheel(e);
      }, false);
      this.domElement.addEventListener('contextmenu', function (e) {
        _this23._onContextMenu(e);
      }, false);
      if (typeof onready === 'function') onready();
    }
  }, {
    key: "sendMouseEvent",
    value: function sendMouseEvent(type, event, wheel) {
      var socket = this.stream.socket;
      if (!socket || socket.readyState !== 1) return;
      var modifier = (event.shiftKey ? 1 : 0) + (event.ctrlKey ? 2 : 0) + (event.altKey ? 4 : 0);
      socket.send('mouse ' + type + ' ' + event.button + ' ' + this.mouseEvents.mouseState.mouseDown + ' ' + event.offsetX + ' ' + event.offsetY + ' ' + modifier + ' ' + wheel);
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      this.domElement.width = width;
      this.domElement.height = height;
      this.stream.socket.send('resize: ' + width + 'x' + height);
    }
  }, {
    key: "_onMouseDown",
    value: function _onMouseDown(event) {
      event.target.addEventListener('mousemove', this.onmousemove, false);
      this.sendMouseEvent(-1, event, 0);
      event.preventDefault();
      return false;
    }
  }, {
    key: "_onMouseMove",
    value: function _onMouseMove(event) {
      if (this.mouseEvents.mouseState.mouseDown === 0) {
        event.target.removeEventListener('mousemove', this.onmousemove, false);
        return false;
      }

      this.sendMouseEvent(0, event, 0);
      return false;
    }
  }, {
    key: "_onMouseUp",
    value: function _onMouseUp(event) {
      event.target.removeEventListener('mousemove', this.onmousemove, false);
      this.sendMouseEvent(1, event, 0);
      event.preventDefault();
      return false;
    }
  }, {
    key: "_onWheel",
    value: function _onWheel(event) {
      this.sendMouseEvent(2, event, Math.sign(event.deltaY));
      return false;
    }
  }, {
    key: "_onContextMenu",
    value: function _onContextMenu(event) {
      event.preventDefault();
      return false;
    }
  }]);

  return Video;
}();
/* global THREE, ActiveXObject, TextureLoader, TextureData */


'use strict'; // Inspiration: https://github.com/lkolbly/threejs-x3dloader/blob/master/X3DLoader.js


THREE.X3DLoader =
/*#__PURE__*/
function () {
  function X3DLoader(scene) {
    _classCallCheck(this, X3DLoader);

    this.scene = scene;
    this.parsedObjects = [];
    this.directionalLights = [];
  }

  _createClass(X3DLoader, [{
    key: "load",
    value: function load(url, onLoad, onProgress, onError) {
      console.log('X3D: Loading ' + url);
      var scope = this;
      var loader = new THREE.FileLoader(scope.manager);
      loader.load(url, function (text) {
        if (typeof onLoad !== 'undefined') onLoad(scope.parse(text));
      });
    }
  }, {
    key: "parse",
    value: function parse(text) {
      var parentObject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      this.directionalLights = [];
      var object;
      console.log('X3D: Parsing');
      var xml = null;

      if (window.DOMParser) {
        var parser = new DOMParser();
        xml = parser.parseFromString(text, 'text/xml');
      } else {
        // Internet Explorer
        xml = new ActiveXObject('Microsoft.XMLDOM');
        xml.async = false;
        xml.loadXML(text);
      } // Parse scene.


      var scene = xml.getElementsByTagName('Scene')[0];

      if (typeof scene !== 'undefined') {
        object = new THREE.Group();
        object.userData.x3dType = 'Group';
        object.name = 'n0';
        this.parsedObjects.push(object); // push before parsing to let _getDefNode work correctly

        this.parseNode(object, scene);
        return this.parsedObjects;
      } // Parse objects.


      var rootObjects = [];
      xml.childNodes.forEach(function (n) {
        if (n.tagName === 'nodes') n.childNodes.forEach(function (child) {
          rootObjects.push(child);
        });else rootObjects.push(n);
      });

      while (rootObjects.length > 0) {
        var node = rootObjects.shift(); // get and remove first item

        if (parentObject) object = parentObject;else object = new THREE.Group();
        this.parsedObjects.push(object); // push before parsing

        this.parseNode(object, node);
      }

      return this.parsedObjects;
    }
  }, {
    key: "parseNode",
    value: function parseNode(parentObject, node) {
      var object = this._getDefNode(node);

      if (typeof object !== 'undefined') {
        var useObject = object.clone();

        this._setCustomId(node, useObject, object);

        parentObject.add(useObject);
        return;
      }

      var hasChildren = false;
      var helperNodes = [];

      if (node.tagName === 'Transform') {
        object = this.parseTransform(node);
        hasChildren = true;
      } else if (node.tagName === 'Shape') object = this.parseShape(node);else if (node.tagName === 'DirectionalLight') object = this.parseDirectionalLight(node);else if (node.tagName === 'PointLight') object = this.parsePointLight(node);else if (node.tagName === 'SpotLight') object = this.parseSpotLight(node, helperNodes);else if (node.tagName === 'Group') {
        object = new THREE.Object3D();
        object.userData.x3dType = 'Group';
        hasChildren = true;
      } else if (node.tagName === 'Switch') {
        object = new THREE.Object3D();
        object.visible = getNodeAttribute(node, 'whichChoice', '-1') !== '-1';
        object.userData.x3dType = 'Switch';
        hasChildren = true;
      } else if (node.tagName === 'Fog') this.parseFog(node);else if (node.tagName === 'Viewpoint') object = this.parseViewpoint(node);else if (node.tagName === 'Background') object = this.parseBackground(node);else if (node.tagName === 'WorldInfo') {
        this.parseWorldInfo(node);
        return;
      } else if (node.tagName === 'Appearance') {
        if (!parentObject.isMesh) {
          console.error("X3DLoader:parsenode: cannot add 'Appearance' node to '" + parentObject.userData.x3dType + "' parent node.");
          return;
        }

        var material = this.parseAppearance(node);
        if (typeof material !== 'undefined') parentObject.material = material;
      } else if (node.tagName === 'PBRAppearance') {
        if (!parentObject.isMesh) {
          console.error("X3DLoader:parsenode: cannot add 'Appearance' node to '" + parentObject.userData.x3dType + "' parent node.");
          return;
        }

        var _material = this.parsePBRAppearance(node);

        if (typeof _material !== 'undefined') parentObject.material = _material;
      } else if (node.tagName === 'TextureTransform') X3DLoader.applyTextureTransformToMaterial(parentObject, this.parseTextureTransform(node));else {
        var geometry = this.parseGeometry(node);

        if (typeof geometry !== 'undefined') {
          if (!parentObject.isMesh) {
            console.error("X3DLoader:parsenode: cannot add 'Appearance' node to '" + parentObject.userData.x3dType + "' parent node.");
            return;
          }

          parentObject.geometry = geometry;
        } else {
          // generic node type
          this.parseChildren(node, parentObject);
          return;
        }
      }

      if (typeof object !== 'undefined') {
        if (object.isObject3D) {
          var isInvisible = getNodeAttribute(node, 'render', 'true').toLowerCase() === 'false';
          if (isInvisible && object.visible) object.visible = false;

          this._setCustomId(node, object);

          parentObject.add(object);
        }

        var docUrl = getNodeAttribute(node, 'docUrl', '');
        if (docUrl) object.userData.docUrl = docUrl;
      }

      if (helperNodes.length > 0) {
        helperNodes.forEach(function (o) {
          parentObject.add(o);
        });
      }

      if (hasChildren) this.parseChildren(node, object);
    }
  }, {
    key: "parseChildren",
    value: function parseChildren(node, currentObject) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (typeof child.tagName !== 'undefined') this.parseNode(currentObject, child);
      }
    }
  }, {
    key: "parseTransform",
    value: function parseTransform(transform) {
      var object = new THREE.Object3D();
      object.userData.x3dType = 'Transform';
      object.userData.solid = getNodeAttribute(transform, 'solid', 'false').toLowerCase() === 'true';
      object.userData.window = getNodeAttribute(transform, 'window', '');
      var controller = getNodeAttribute(transform, 'controller', undefined);
      if (typeof controller !== 'undefined') object.userData.controller = controller;
      object.userData.name = getNodeAttribute(transform, 'name', '');
      var position = convertStringToVec3(getNodeAttribute(transform, 'translation', '0 0 0'));
      object.position.copy(position);
      var scale = convertStringToVec3(getNodeAttribute(transform, 'scale', '1 1 1'));
      object.scale.copy(scale);
      var quaternion = convertStringToQuaternion(getNodeAttribute(transform, 'rotation', '0 1 0 0'));
      object.quaternion.copy(quaternion);
      return object;
    }
  }, {
    key: "parseShape",
    value: function parseShape(shape) {
      var geometry;
      var material;

      for (var i = 0; i < shape.childNodes.length; i++) {
        var child = shape.childNodes[i];
        if (typeof child.tagName === 'undefined') continue; // Check if USE node and return the DEF node.

        var defObject = this._getDefNode(child);

        if (typeof defObject !== 'undefined') {
          if (defObject.isGeometry || defObject.isBufferGeometry) geometry = defObject;else if (defObject.isMaterial) material = defObject; // else error

          continue;
        }

        if (typeof material === 'undefined') {
          if (child.tagName === 'Appearance') {
            // If a sibling PBRAppearance is detected, prefer it.
            var pbrAppearanceChild = false;

            for (var j = 0; j < shape.childNodes.length; j++) {
              var child0 = shape.childNodes[j];

              if (child0.tagName === 'PBRAppearance') {
                pbrAppearanceChild = true;
                break;
              }
            }

            if (pbrAppearanceChild) continue;
            material = this.parseAppearance(child);
          } else if (child.tagName === 'PBRAppearance') material = this.parsePBRAppearance(child);

          if (typeof material !== 'undefined') continue;
        }

        if (typeof geometry === 'undefined') {
          geometry = this.parseGeometry(child);
          if (typeof geometry !== 'undefined') continue;
        }

        console.log('X3dLoader: Unknown node: ' + child.tagName);
      } // Apply default geometry and/or material.


      if (typeof geometry === 'undefined') geometry = createDefaultGeometry();
      if (typeof material === 'undefined') material = createDefaultMaterial(geometry);
      var mesh;
      if (geometry.userData.x3dType === 'IndexedLineSet') mesh = new THREE.LineSegments(geometry, material);else if (geometry.userData.x3dType === 'PointSet') mesh = new THREE.Points(geometry, material);else mesh = new THREE.Mesh(geometry, material);
      mesh.userData.x3dType = 'Shape';
      if (!material.transparent && !material.userData.hasTransparentTexture) // Webots transparent object don't cast shadows.
        mesh.castShadow = getNodeAttribute(shape, 'castShadows', 'false').toLowerCase() === 'true';
      mesh.receiveShadow = true;
      mesh.userData.isPickable = getNodeAttribute(shape, 'isPickable', 'true').toLowerCase() === 'true';
      return mesh;
    }
  }, {
    key: "parseGeometry",
    value: function parseGeometry(node) {
      var geometry;
      if (node.tagName === 'Box') geometry = this.parseBox(node);else if (node.tagName === 'Cone') geometry = this.parseCone(node);else if (node.tagName === 'Cylinder') geometry = this.parseCylinder(node);else if (node.tagName === 'IndexedFaceSet') geometry = this.parseIndexedFaceSet(node);else if (node.tagName === 'Sphere') geometry = this.parseSphere(node);else if (node.tagName === 'Plane') geometry = this.parsePlane(node);else if (node.tagName === 'ElevationGrid') geometry = this.parseElevationGrid(node);else if (node.tagName === 'IndexedLineSet') geometry = this.parseIndexedLineSet(node);else if (node.tagName === 'PointSet') geometry = this.parsePointSet(node);
      if (typeof geometry !== 'undefined') this._setCustomId(node, geometry);
      return geometry;
    }
  }, {
    key: "parseAppearance",
    value: function parseAppearance(appearance) {
      var mat = new THREE.MeshBasicMaterial({
        color: 0xffffff
      });
      mat.userData.x3dType = 'Appearance'; // Get the Material tag.

      var material = appearance.getElementsByTagName('Material')[0];
      var materialSpecifications = {};

      if (typeof material !== 'undefined') {
        var defMaterial = this._getDefNode(material);

        if (typeof defMaterial !== 'undefined') {
          materialSpecifications = {
            'color': defMaterial.color,
            'specular': defMaterial.specular,
            'emissive': defMaterial.emissive,
            'shininess': defMaterial.shininess
          };
        } else {
          // Pull out the standard colors.
          materialSpecifications = {
            'color': convertStringToColor(getNodeAttribute(material, 'diffuseColor', '0.8 0.8 0.8'), false),
            'specular': convertStringToColor(getNodeAttribute(material, 'specularColor', '0 0 0'), false),
            'emissive': convertStringToColor(getNodeAttribute(material, 'emissiveColor', '0 0 0'), false),
            'shininess': parseFloat(getNodeAttribute(material, 'shininess', '0.2')),
            'transparent': getNodeAttribute(appearance, 'sortType', 'auto') === 'transparent'
          };
        }
      } // Check to see if there is a texture.


      var imageTexture = appearance.getElementsByTagName('ImageTexture');
      var colorMap;

      if (imageTexture.length > 0) {
        colorMap = this.parseImageTexture(imageTexture[0], appearance.getElementsByTagName('TextureTransform'));

        if (typeof colorMap !== 'undefined') {
          materialSpecifications.map = colorMap;

          if (colorMap.userData.isTransparent) {
            materialSpecifications.transparent = true;
            materialSpecifications.alphaTest = 0.5; // FIXME needed for example for the target.png in robot_programming.wbt
          }
        }
      }

      mat = new THREE.MeshPhongMaterial(materialSpecifications);
      mat.userData.x3dType = 'Appearance';
      mat.userData.hasTransparentTexture = colorMap && colorMap.userData.isTransparent;
      if (typeof material !== 'undefined') this._setCustomId(material, mat);

      this._setCustomId(appearance, mat);

      return mat;
    }
  }, {
    key: "parsePBRAppearance",
    value: function parsePBRAppearance(pbrAppearance) {
      var roughnessFactor = 2.0; // This factor has been empirically found to match the Webots rendering.

      var isTransparent = false;
      var baseColor = convertStringToColor(getNodeAttribute(pbrAppearance, 'baseColor', '1 1 1'));
      var roughness = parseFloat(getNodeAttribute(pbrAppearance, 'roughness', '0')) * roughnessFactor;
      var metalness = parseFloat(getNodeAttribute(pbrAppearance, 'metalness', '1'));
      var emissiveColor = convertStringToColor(getNodeAttribute(pbrAppearance, 'emissiveColor', '0 0 0'));
      var transparency = parseFloat(getNodeAttribute(pbrAppearance, 'transparency', '0'));
      var materialSpecifications = {
        color: baseColor,
        roughness: roughness,
        metalness: metalness,
        emissive: emissiveColor
      };

      if (transparency) {
        materialSpecifications.opacity = 1.0 - transparency;
        isTransparent = true;
      }

      var textureTransform = pbrAppearance.getElementsByTagName('TextureTransform');
      var imageTextures = pbrAppearance.getElementsByTagName('ImageTexture');

      for (var t = 0; t < imageTextures.length; t++) {
        var imageTexture = imageTextures[t];
        var type = getNodeAttribute(imageTexture, 'type', undefined);

        if (type === 'baseColor') {
          materialSpecifications.map = this.parseImageTexture(imageTexture, textureTransform);

          if (typeof materialSpecifications.map !== 'undefined' && materialSpecifications.map.userData.isTransparent) {
            isTransparent = true;
            materialSpecifications.alphaTest = 0.5; // FIXME needed for example for the target.png in robot_programming.wbt
          }
        } else if (type === 'roughness') {
          materialSpecifications.roughnessMap = this.parseImageTexture(imageTexture, textureTransform);
          if (roughness <= 0.0) materialSpecifications.roughness = roughnessFactor;
        } else if (type === 'metalness') materialSpecifications.metalnessMap = this.parseImageTexture(imageTexture, textureTransform);else if (type === 'normal') materialSpecifications.normalMap = this.parseImageTexture(imageTexture, textureTransform);else if (type === 'emissiveColor') {
          materialSpecifications.emissiveMap = this.parseImageTexture(imageTexture, textureTransform);
          materialSpecifications.emissive = new THREE.Color(0xffffff);
        }
        /* Ambient occlusion not fully working
        else if (type === 'occlusion')
          materialSpecifications.aoMap = this.parseImageTexture(imageTexture, textureTransform);
        */

      }

      var mat = new THREE.MeshStandardMaterial(materialSpecifications);
      mat.userData.x3dType = 'PBRAppearance';
      if (isTransparent) mat.transparent = true;
      mat.userData.hasTransparentTexture = materialSpecifications.map && materialSpecifications.map.userData.isTransparent;

      this._setCustomId(pbrAppearance, mat);

      return mat;
    }
  }, {
    key: "parseImageTexture",
    value: function parseImageTexture(imageTexture, textureTransform, mat) {
      // Issues with DEF and USE image texture with different image transform.
      var texture = this._getDefNode(imageTexture);

      if (typeof texture !== 'undefined') return texture;
      var filename = getNodeAttribute(imageTexture, 'url', '');
      filename = filename.split(/['"\s]/).filter(function (n) {
        return n;
      });
      if (filename[0] == null) return undefined;
      var transformData;

      if (textureTransform && textureTransform[0]) {
        var defTexture = this._getDefNode(textureTransform[0]);

        if (typeof defTexture !== 'undefined') transformData = defTexture.userData.transform;else transformData = this.parseTextureTransform(textureTransform[0]);
      } // Map ImageTexture.TextureProperties.anisotropicDegree to THREE.Texture.anisotropy.


      var anisotropy = 8; // matches with the default value: `ImageTexture.filtering = 4`

      var textureProperties = imageTexture.getElementsByTagName('TextureProperties');
      if (textureProperties.length > 0) anisotropy = parseFloat(getNodeAttribute(textureProperties[0], 'anisotropicDegree', '8'));
      texture = TextureLoader.createOrRetrieveTexture(filename[0], new TextureData(getNodeAttribute(imageTexture, 'isTransparent', 'false').toLowerCase() === 'true', {
        's': getNodeAttribute(imageTexture, 'repeatS', 'true').toLowerCase(),
        't': getNodeAttribute(imageTexture, 'repeatT', 'true').toLowerCase()
      }, anisotropy, transformData));
      if (textureTransform && textureTransform[0]) this._setCustomId(textureTransform[0], texture);

      this._setCustomId(imageTexture, texture);

      return texture;
    }
  }, {
    key: "parseTextureTransform",
    value: function parseTextureTransform(textureTransform) {
      var textureObject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var transformData = {
        'center': convertStringToVec2(getNodeAttribute(textureTransform, 'center', '0 0')),
        'rotation': parseFloat(getNodeAttribute(textureTransform, 'rotation', '0')),
        'scale': convertStringToVec2(getNodeAttribute(textureTransform, 'scale', '1 1')),
        'translation': convertStringToVec2(getNodeAttribute(textureTransform, 'translation', '0 0'))
      };
      if (typeof textureObject !== 'undefined' && textureObject.isTexture) TextureLoader.applyTextureTransform(textureObject, transformData);
      return transformData;
    }
  }, {
    key: "parseIndexedFaceSet",
    value: function parseIndexedFaceSet(ifs) {
      var coordinate = ifs.getElementsByTagName('Coordinate')[0];
      var textureCoordinate = ifs.getElementsByTagName('TextureCoordinate')[0];
      var normal = ifs.getElementsByTagName('Normal')[0];

      if (typeof coordinate !== 'undefined' && 'USE' in coordinate.attributes) {
        console.error("X3DLoader:parseIndexedFaceSet: USE 'Coordinate' node not supported.");
        coordinate = undefined;
      }

      if (typeof textureCoordinate !== 'undefined' && 'USE' in textureCoordinate.attributes) {
        console.error("X3DLoader:parseIndexedFaceSet: USE 'TextureCoordinate' node not supported.");
        textureCoordinate = undefined;
      }

      if (typeof normal !== 'undefined' && 'USE' in normal.attributes) {
        console.error("X3DLoader:parseIndexedFaceSet: USE 'Normal' node not supported.");
        normal = undefined;
      }

      var geometry = new THREE.Geometry();
      var x3dType = getNodeAttribute(ifs, 'x3dType', undefined);
      geometry.userData = {
        'x3dType': typeof x3dType === 'undefined' ? 'IndexedFaceSet' : x3dType
      };
      if (typeof coordinate === 'undefined') return geometry;
      var indicesStr = getNodeAttribute(ifs, 'coordIndex', '').split(/\s/);
      var verticesStr = getNodeAttribute(coordinate, 'point', '').split(/\s/);
      var hasTexCoord = 'texCoordIndex' in ifs.attributes;
      var texcoordIndexStr = hasTexCoord ? getNodeAttribute(ifs, 'texCoordIndex', '') : '';
      var texcoordsStr = hasTexCoord ? getNodeAttribute(textureCoordinate, 'point', '') : '';

      for (var i = 0; i < verticesStr.length; i += 3) {
        var v = new THREE.Vector3();
        v.x = parseFloat(verticesStr[i + 0]);
        v.y = parseFloat(verticesStr[i + 1]);
        v.z = parseFloat(verticesStr[i + 2]);
        geometry.vertices.push(v);
      }

      var normalArray, normalIndicesStr;

      if (typeof normal !== 'undefined') {
        var normalStr = getNodeAttribute(normal, 'vector', '').split(/[\s,]+/);
        normalIndicesStr = getNodeAttribute(ifs, 'normalIndex', '').split(/\s/);
        normalArray = [];

        for (var _i4 = 0; _i4 < normalStr.length; _i4 += 3) {
          normalArray.push(new THREE.Vector3(parseFloat(normalStr[_i4 + 0]), parseFloat(normalStr[_i4 + 1]), parseFloat(normalStr[_i4 + 2])));
        }
      }

      if (hasTexCoord) {
        var isDefaultMapping = getNodeAttribute(ifs, 'defaultMapping', 'false').toLowerCase() === 'true';
        var texcoords = texcoordsStr.split(/\s/);
        var uvs = [];

        for (var _i5 = 0; _i5 < texcoords.length; _i5 += 2) {
          v = new THREE.Vector2();
          v.x = parseFloat(texcoords[_i5 + 0]);
          v.y = parseFloat(texcoords[_i5 + 1]);

          if (isDefaultMapping) {
            // add small offset to avoid using the exact same texture coordinates for a face
            // (i.e. mapping to a line or a point) that is causing a rendering issue
            // https://github.com/cyberbotics/webots/issues/752
            v.x += 0.01 * Math.random();
            v.y += 0.01 * Math.random();
          }

          uvs.push(v);
        }
      } // Now pull out the face indices.


      if (hasTexCoord) var texIndices = texcoordIndexStr.split(/\s/);

      for (var _i6 = 0; _i6 < indicesStr.length; _i6++) {
        var faceIndices = [];
        var uvIndices = [];
        var normalIndices = [];

        while (parseFloat(indicesStr[_i6]) >= 0) {
          faceIndices.push(parseFloat(indicesStr[_i6]));
          if (hasTexCoord) uvIndices.push(parseFloat(texIndices[_i6]));
          if (typeof normalIndicesStr !== 'undefined') normalIndices.push(parseFloat(normalIndicesStr[_i6]));
          _i6++;
        }

        var faceNormal;

        while (faceIndices.length > 3) {
          // Take the last three, make a triangle, and remove the
          // middle one (works for convex & continuously wrapped).
          if (hasTexCoord) {
            // Add to the UV layer.
            geometry.faceVertexUvs[0].push([uvs[parseFloat(uvIndices[uvIndices.length - 3])].clone(), uvs[parseFloat(uvIndices[uvIndices.length - 2])].clone(), uvs[parseFloat(uvIndices[uvIndices.length - 1])].clone()]); // Remove the second-to-last vertex.

            var tmp = uvIndices[uvIndices.length - 1];
            uvIndices.pop();
            uvIndices[uvIndices.length - 1] = tmp;
          }

          faceNormal = undefined;

          if (typeof normal !== 'undefined') {
            faceNormal = [normalArray[normalIndices[faceIndices.length - 3]], normalArray[normalIndices[faceIndices.length - 2]], normalArray[normalIndices[faceIndices.length - 1]]];
          } // Make a face.


          geometry.faces.push(new THREE.Face3(faceIndices[faceIndices.length - 3], faceIndices[faceIndices.length - 2], faceIndices[faceIndices.length - 1], faceNormal)); // Remove the second-to-last vertex.

          tmp = faceIndices[faceIndices.length - 1];
          faceIndices.pop();
          faceIndices[faceIndices.length - 1] = tmp;
        } // Make a face with the final three.


        if (faceIndices.length === 3) {
          if (hasTexCoord) {
            geometry.faceVertexUvs[0].push([uvs[parseFloat(uvIndices[uvIndices.length - 3])].clone(), uvs[parseFloat(uvIndices[uvIndices.length - 2])].clone(), uvs[parseFloat(uvIndices[uvIndices.length - 1])].clone()]);
          }

          if (typeof normal !== 'undefined') {
            faceNormal = [normalArray[normalIndices[faceIndices.length - 3]], normalArray[normalIndices[faceIndices.length - 2]], normalArray[normalIndices[faceIndices.length - 1]]];
          }

          geometry.faces.push(new THREE.Face3(faceIndices[0], faceIndices[1], faceIndices[2], faceNormal));
        }
      }

      geometry.computeBoundingSphere();
      if (typeof normal === 'undefined') geometry.computeVertexNormals();

      this._setCustomId(coordinate, geometry);

      if (hasTexCoord) this._setCustomId(textureCoordinate, geometry);
      return geometry;
    }
  }, {
    key: "parseIndexedLineSet",
    value: function parseIndexedLineSet(ils) {
      var coordinate = ils.getElementsByTagName('Coordinate')[0];

      if (typeof coordinate !== 'undefined' && 'USE' in coordinate.attributes) {
        console.error("X3DLoader:parseIndexedLineSet: USE 'Coordinate' node not supported.");
        coordinate = undefined;
      }

      var geometry = new THREE.BufferGeometry();
      geometry.userData = {
        'x3dType': 'IndexedLineSet'
      };
      if (typeof coordinate === 'undefined') return geometry;
      var indicesStr = getNodeAttribute(ils, 'coordIndex', '').trim().split(/\s/);
      var verticesStr = getNodeAttribute(coordinate, 'point', '').trim().split(/\s/);
      var positions = new Float32Array(verticesStr.length * 3);

      for (var i = 0; i < verticesStr.length; i += 3) {
        positions[i] = parseFloat(verticesStr[i + 0]);
        positions[i + 1] = parseFloat(verticesStr[i + 1]);
        positions[i + 2] = parseFloat(verticesStr[i + 2]);
      }

      var indices = [];

      for (var _i7 = 0; _i7 < indicesStr.length; _i7++) {
        while (parseFloat(indicesStr[_i7]) >= 0) {
          indices.push(parseFloat(indicesStr[_i7]));
          _i7++;
        }
      }

      geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.computeBoundingSphere();

      this._setCustomId(coordinate, geometry);

      return geometry;
    }
  }, {
    key: "parseElevationGrid",
    value: function parseElevationGrid(eg) {
      var heightStr = getNodeAttribute(eg, 'height', undefined);
      var xDimension = parseInt(getNodeAttribute(eg, 'xDimension', '0'));
      var xSpacing = parseFloat(getNodeAttribute(eg, 'xSpacing', '1'));
      var zDimension = parseInt(getNodeAttribute(eg, 'zDimension', '0'));
      var zSpacing = parseFloat(getNodeAttribute(eg, 'zSpacing', '1'));
      var width = (xDimension - 1) * xSpacing;
      var depth = (zDimension - 1) * zSpacing;
      var geometry = new THREE.PlaneBufferGeometry(width, depth, xDimension - 1, zDimension - 1);
      geometry.userData = {
        'x3dType': 'ElevationGrid'
      };
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(width / 2, 0, depth / 2); // center located in the corner

      if (typeof heightStr === 'undefined') return geometry; // Set height and adjust uv mappings.

      var heightArray = heightStr.trim().split(/\s/);
      var vertices = geometry.getAttribute('position').array;
      var uv = geometry.getAttribute('uv').array;
      var maxIndex = heightArray.length;
      var i = 0;
      var v = 1;

      for (var dx = 0; dx < xDimension; dx++) {
        for (var dz = 0; dz < zDimension; dz++) {
          var index = xDimension * dx + dz;
          if (index < maxIndex) vertices[i + 1] = parseFloat(heightArray[index]);
          uv[v] = -uv[v];
          i += 3;
          v += 2;
        }
      }

      geometry.computeVertexNormals();
      return geometry;
    }
  }, {
    key: "parseBox",
    value: function parseBox(box) {
      var size = convertStringToVec3(getNodeAttribute(box, 'size', '2 2 2'));
      var boxGeometry = new THREE.BoxBufferGeometry(size.x, size.y, size.z);
      boxGeometry.userData = {
        'x3dType': 'Box'
      };
      return boxGeometry;
    }
  }, {
    key: "parseCone",
    value: function parseCone(cone) {
      var radius = getNodeAttribute(cone, 'bottomRadius', '1');
      var height = getNodeAttribute(cone, 'height', '2');
      var subdivision = getNodeAttribute(cone, 'subdivision', '32');
      var side = getNodeAttribute(cone, 'side', 'true').toLowerCase() === 'true';
      var bottom = getNodeAttribute(cone, 'bottom', 'true').toLowerCase() === 'true'; // Note: the three.js Cone is created with thetaStart = Math.PI / 2 to match X3D texture mapping.

      var coneGeometry;
      if (side && bottom) coneGeometry = new THREE.ConeBufferGeometry(radius, height, subdivision, 1, false, Math.PI / 2);else {
        coneGeometry = new THREE.Geometry();

        if (side) {
          var sideGeometry = new THREE.ConeGeometry(radius, height, subdivision, 1, true, Math.PI / 2);
          coneGeometry.merge(sideGeometry);
        }

        if (bottom) {
          var bottomGeometry = new THREE.CircleGeometry(radius, subdivision);
          var bottomMatrix = new THREE.Matrix4();
          bottomMatrix.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
          bottomMatrix.setPosition(new THREE.Vector3(0, -height / 2, 0));
          coneGeometry.merge(bottomGeometry, bottomMatrix);
        }
      }
      coneGeometry.userData = {
        'x3dType': 'Cone'
      };
      coneGeometry.rotateY(Math.PI / 2);
      return coneGeometry;
    }
  }, {
    key: "parseCylinder",
    value: function parseCylinder(cylinder) {
      var radius = getNodeAttribute(cylinder, 'radius', '1');
      var height = getNodeAttribute(cylinder, 'height', '2');
      var subdivision = getNodeAttribute(cylinder, 'subdivision', '32');
      var bottom = getNodeAttribute(cylinder, 'bottom', 'true').toLowerCase() === 'true';
      var side = getNodeAttribute(cylinder, 'side', 'true').toLowerCase() === 'true';
      var top = getNodeAttribute(cylinder, 'top', 'true').toLowerCase() === 'true'; // Note: the three.js Cylinder is created with thetaStart = Math.PI / 2 to match X3D texture mapping.

      var cylinderGeometry;
      if (bottom && side && top) cylinderGeometry = new THREE.CylinderBufferGeometry(radius, radius, height, subdivision, 1, false, Math.PI / 2);else {
        cylinderGeometry = new THREE.Geometry();

        if (side) {
          var sideGeometry = new THREE.CylinderGeometry(radius, radius, height, subdivision, 1, true, Math.PI / 2);
          cylinderGeometry.merge(sideGeometry);
        }

        if (top) {
          var topGeometry = new THREE.CircleGeometry(radius, subdivision);
          var topMatrix = new THREE.Matrix4();
          topMatrix.makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2));
          topMatrix.setPosition(new THREE.Vector3(0, height / 2, 0));
          cylinderGeometry.merge(topGeometry, topMatrix);
        }

        if (bottom) {
          var bottomGeometry = new THREE.CircleGeometry(radius, subdivision);
          var bottomMatrix = new THREE.Matrix4();
          bottomMatrix.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
          bottomMatrix.setPosition(new THREE.Vector3(0, -height / 2, 0));
          cylinderGeometry.merge(bottomGeometry, bottomMatrix);
        }
      }
      cylinderGeometry.userData = {
        'x3dType': 'Cylinder'
      };
      cylinderGeometry.rotateY(Math.PI / 2);
      return cylinderGeometry;
    }
  }, {
    key: "parseSphere",
    value: function parseSphere(sphere) {
      var radius = getNodeAttribute(sphere, 'radius', '1');
      var subdivision = getNodeAttribute(sphere, 'subdivision', '8,8').split(',');
      var ico = getNodeAttribute(sphere, 'ico', 'false').toLowerCase() === 'true';
      var sphereGeometry;

      if (ico) {
        sphereGeometry = new THREE.IcosahedronBufferGeometry(radius, subdivision[0]);
        sphereGeometry.rotateY(Math.PI / 2);
      } else sphereGeometry = new THREE.SphereBufferGeometry(radius, subdivision[0], subdivision[1], -Math.PI / 2); // thetaStart: -Math.PI/2


      sphereGeometry.userData = {
        'x3dType': 'Sphere'
      };
      return sphereGeometry;
    }
  }, {
    key: "parsePlane",
    value: function parsePlane(plane) {
      var size = convertStringToVec2(getNodeAttribute(plane, 'size', '1,1'));
      var planeGeometry = new THREE.PlaneBufferGeometry(size.x, size.y);
      planeGeometry.userData = {
        'x3dType': 'Plane'
      };
      planeGeometry.rotateX(-Math.PI / 2);
      return planeGeometry;
    }
  }, {
    key: "parsePointSet",
    value: function parsePointSet(pointSet) {
      var coordinate = pointSet.getElementsByTagName('Coordinate')[0];
      var geometry = new THREE.BufferGeometry();
      geometry.userData = {
        'x3dType': 'PointSet'
      };
      if (typeof coordinate === 'undefined') return geometry;
      var coordStrArray = getNodeAttribute(coordinate, 'point', '').trim().split(/\s/);
      var color = pointSet.getElementsByTagName('Color')[0];
      var count = coordStrArray.length;
      var colorStrArray;
      geometry.userData.isColorPerVertex = false;

      if (typeof color !== 'undefined') {
        colorStrArray = getNodeAttribute(color, 'color', '').trim().split(/\s/);

        if (typeof colorStrArray !== 'undefined') {
          if (count !== colorStrArray.length) {
            count = Math.min(count, colorStrArray.length);
            console.error("X3DLoader:parsePointSet: 'coord' and 'color' fields size doesn't match.");
          }

          geometry.userData.isColorPerVertex = true;
        }
      }

      var positions = new Float32Array(count);

      for (var i = 0; i < count; i++) {
        positions[i] = parseFloat(coordStrArray[i]);
      }

      geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

      if (geometry.userData.isColorPerVertex) {
        var colors = new Float32Array(count);

        for (var _i8 = 0; _i8 < count; _i8++) {
          colors[_i8] = parseFloat(colorStrArray[_i8]);
        }

        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
      }

      geometry.computeBoundingBox();
      return geometry;
    }
  }, {
    key: "parseDirectionalLight",
    value: function parseDirectionalLight(light) {
      var on = getNodeAttribute(light, 'on', 'true').toLowerCase() === 'true';
      if (!on) return;
      var color = convertStringToColor(getNodeAttribute(light, 'color', '1 1 1'), false);
      var direction = convertStringToVec3(getNodeAttribute(light, 'direction', '0 0 -1'));
      var intensity = parseFloat(getNodeAttribute(light, 'intensity', '1'));
      var castShadows = getNodeAttribute(light, 'castShadows', 'false').toLowerCase() === 'true';
      var lightObject = new THREE.DirectionalLight(color.getHex(), intensity);

      if (castShadows) {
        lightObject.castShadow = true;
        var shadowMapSize = parseFloat(getNodeAttribute(light, 'shadowMapSize', '1024'));
        lightObject.shadow.mapSize.width = shadowMapSize;
        lightObject.shadow.mapSize.height = shadowMapSize;
        lightObject.shadow.radius = parseFloat(getNodeAttribute(light, 'shadowsRadius', '1.5'));
        lightObject.shadow.bias = parseFloat(getNodeAttribute(light, 'shadowBias', '0.000001'));
        lightObject.shadow.camera.near = parseFloat(getNodeAttribute(light, 'zNear', '0.001;'));
        lightObject.shadow.camera.far = parseFloat(getNodeAttribute(light, 'zFar', '2000'));
      }

      lightObject.position.set(-direction.x, -direction.y, -direction.z);
      lightObject.userData = {
        'x3dType': 'DirectionalLight'
      }; // Position of the directional light will be adjusted at the end of the load
      // based on the size of the scene so that all the objects are illuminated by this light.

      this.directionalLights.push(lightObject);
      return lightObject;
    }
  }, {
    key: "parsePointLight",
    value: function parsePointLight(light) {
      var on = getNodeAttribute(light, 'on', 'true').toLowerCase() === 'true';
      if (!on) return;
      var attenuation = convertStringToVec3(getNodeAttribute(light, 'attenuation', '1 0 0'));
      var color = convertStringToColor(getNodeAttribute(light, 'color', '1 1 1'), false);
      var intensity = parseFloat(getNodeAttribute(light, 'intensity', '1'));
      var location = convertStringToVec3(getNodeAttribute(light, 'location', '0 0 0'));
      var radius = parseFloat(getNodeAttribute(light, 'radius', '100'));
      var castShadows = getNodeAttribute(light, 'castShadows', 'false').toLowerCase() === 'true';
      var lightObject = new THREE.PointLight(color.getHex()); // Tradeoff to let cohabit VRML light attenuation and the three.js light "physically correct mode".
      // - The intensity is attenuated by the total amount of the VRML attenuation.
      // - The biggest attenuation component defines the `decay` "exponent".

      lightObject.intensity = intensity / attenuation.manhattanLength();
      if (attenuation.x > 0) lightObject.decay = 0;
      if (attenuation.y > 0) lightObject.decay = 1;
      if (attenuation.z > 0) lightObject.decay = 2;
      lightObject.distance = radius;

      if (castShadows) {
        lightObject.castShadow = true;
        var shadowMapSize = parseFloat(getNodeAttribute(light, 'shadowMapSize', '512'));
        lightObject.shadow.mapSize.width = shadowMapSize;
        lightObject.shadow.mapSize.height = shadowMapSize;
        lightObject.shadow.radius = parseFloat(getNodeAttribute(light, 'shadowsRadius', '1'));
        lightObject.shadow.bias = parseFloat(getNodeAttribute(light, 'shadowBias', '0'));
        lightObject.shadow.camera.near = parseFloat(getNodeAttribute(light, 'zNear', '0.001;'));
        lightObject.shadow.camera.far = radius;
      }

      lightObject.position.copy(location);
      lightObject.userData = {
        'x3dType': 'PointLight'
      };
      return lightObject;
    }
  }, {
    key: "parseSpotLight",
    value: function parseSpotLight(light, helperNodes) {
      var on = getNodeAttribute(light, 'on', 'true').toLowerCase() === 'true';
      if (!on) return;
      var attenuation = convertStringToVec3(getNodeAttribute(light, 'attenuation', '1 0 0'));
      var beamWidth = parseFloat(getNodeAttribute(light, 'beamWidth', '0.785'));
      var color = convertStringToColor(getNodeAttribute(light, 'color', '1 1 1'), false);
      var cutOffAngle = parseFloat(getNodeAttribute(light, 'cutOffAngle', '0.785'));
      var direction = convertStringToVec3(getNodeAttribute(light, 'direction', '0 0 -1'));
      var intensity = parseFloat(getNodeAttribute(light, 'intensity', '1'));
      var location = convertStringToVec3(getNodeAttribute(light, 'location', '0 0 0'));
      var radius = parseFloat(getNodeAttribute(light, 'radius', '100'));
      var castShadows = getNodeAttribute(light, 'castShadows', 'false').toLowerCase() === 'true';
      var lightObject = new THREE.SpotLight(color.getHex());
      lightObject.intensity = intensity / attenuation.manhattanLength();
      if (attenuation.x > 0) lightObject.decay = 0;
      if (attenuation.y > 0) lightObject.decay = 1;
      if (attenuation.z > 0) lightObject.decay = 2;
      lightObject.distance = radius;
      lightObject.angle = cutOffAngle;
      if (beamWidth > cutOffAngle) lightObject.penumbra = 0.0;else lightObject.penumbra = 1.0 - beamWidth / cutOffAngle;

      if (castShadows) {
        lightObject.castShadow = true;
        var shadowMapSize = parseFloat(getNodeAttribute(light, 'shadowMapSize', '512'));
        lightObject.shadow.mapSize.width = shadowMapSize;
        lightObject.shadow.mapSize.height = shadowMapSize;
        lightObject.shadow.radius = parseFloat(getNodeAttribute(light, 'shadowsRadius', '1'));
        lightObject.shadow.bias = parseFloat(getNodeAttribute(light, 'shadowBias', '0'));
        lightObject.shadow.camera.near = parseFloat(getNodeAttribute(light, 'zNear', '0.001;'));
        lightObject.shadow.camera.far = radius;
      }

      lightObject.position.copy(location);
      lightObject.target = new THREE.Object3D();
      lightObject.target.position.addVectors(lightObject.position, direction);
      lightObject.target.userData.x3dType = 'LightTarget';
      helperNodes.push(lightObject.target);
      lightObject.userData = {
        'x3dType': 'SpotLight'
      };
      return lightObject;
    }
  }, {
    key: "parseBackground",
    value: function parseBackground(background) {
      this.scene.scene.background = convertStringToColor(getNodeAttribute(background, 'skyColor', '0 0 0'));
      this.scene.scene.userData.luminosity = parseFloat(getNodeAttribute(background, 'luminosity', '1.0'));
      this.scene.scene.irradiance = undefined;
      var backgroundEnabled = false;
      var irradianceEnabled = false;
      var backgroundFields = ['leftUrl', 'rightUrl', 'topUrl', 'bottomUrl', 'backUrl', 'frontUrl'];
      var irradianceFields = ['leftIrradianceUrl', 'rightIrradianceUrl', 'topIrradianceUrl', 'bottomIrradianceUrl', 'backIrradianceUrl', 'frontIrradianceUrl'];
      var backgroundURLs = [];
      var irradianceURLs = [];

      for (var i = 0; i < 6; i++) {
        var url = getNodeAttribute(background, backgroundFields[i], undefined);

        if (typeof url !== 'undefined') {
          backgroundEnabled = true;
          url = url.split(/['"\s]/).filter(function (n) {
            return n;
          })[0];
        }

        backgroundURLs.push(url);
        url = getNodeAttribute(background, irradianceFields[i], undefined);

        if (typeof url !== 'undefined') {
          irradianceEnabled = true;
          url = url.split(/['"\s]/).filter(function (n) {
            return n;
          })[0];
        }

        irradianceURLs.push(url);
      }

      if (backgroundEnabled) {
        var cubeTexture = new THREE.CubeTexture();
        cubeTexture.encoding = THREE.sRGBEncoding;

        for (var _i9 = 0; _i9 < 6; _i9++) {
          if (typeof backgroundURLs[_i9] === 'undefined') continue; // Look for already loaded texture or load the texture in an asynchronous way.

          TextureLoader.loadOrRetrieveImage(backgroundURLs[_i9], cubeTexture, _i9);
        }

        this.scene.scene.background = cubeTexture;
        cubeTexture.needsUpdate = true;
      }

      if (irradianceEnabled) {
        var _cubeTexture = new THREE.CubeTexture();

        _cubeTexture.format = THREE.RGBFormat;
        _cubeTexture.type = THREE.FloatType;

        for (var _i10 = 0; _i10 < 6; _i10++) {
          if (typeof irradianceURLs[_i10] === 'undefined') continue; // Look for already loaded texture or load the texture in an asynchronous way.

          TextureLoader.loadOrRetrieveImage(irradianceURLs[_i10], _cubeTexture, _i10);
        }

        this.scene.scene.userData.irradiance = _cubeTexture;
        _cubeTexture.needsUpdate = true;
      } // Light offset: empirically found to match the Webots rendering.


      var ambientLight = new THREE.AmbientLight(0xffffff);
      this.scene.scene.add(ambientLight);
      return undefined;
    }
  }, {
    key: "parseViewpoint",
    value: function parseViewpoint(viewpoint) {
      var fov = parseFloat(getNodeAttribute(viewpoint, 'fieldOfView', '0.785'));
      var near = parseFloat(getNodeAttribute(viewpoint, 'zNear', '0.1'));
      var far = parseFloat(getNodeAttribute(viewpoint, 'zFar', '2000'));

      if (typeof this.scene.viewpoint !== 'undefined') {
        this.scene.viewpoint.camera.near = near;
        this.scene.viewpoint.camera.far = far;
      } else {
        console.log('Parse Viewpoint: error camera'); // Set default aspect ratio to 1. It will be updated on window resize.

        this.scene.viewpoint.camera = new THREE.PerspectiveCamera(0.785, 1, near, far);
      } // camera.fov should be updated at each window resize.


      this.scene.viewpoint.camera.fovX = fov; // radians

      this.scene.viewpoint.camera.fov = THREE.Math.radToDeg(horizontalToVerticalFieldOfView(fov, this.scene.viewpoint.camera.aspect)); // degrees

      if ('position' in viewpoint.attributes) {
        var position = getNodeAttribute(viewpoint, 'position', '0 0 10');
        this.scene.viewpoint.camera.position.copy(convertStringToVec3(position));
      }

      if ('orientation' in viewpoint.attributes) {
        var quaternion = convertStringToQuaternion(getNodeAttribute(viewpoint, 'orientation', '0 1 0 0'));
        this.scene.viewpoint.camera.quaternion.copy(quaternion);
      }

      this.scene.viewpoint.camera.updateProjectionMatrix(); // Set Webots specific attributes.

      this.scene.viewpoint.camera.userData.x3dType = 'Viewpoint';
      this.scene.viewpoint.camera.userData.followedId = getNodeAttribute(viewpoint, 'followedId', null);
      this.scene.viewpoint.camera.userData.followSmoothness = getNodeAttribute(viewpoint, 'followSmoothness', null);
      this.scene.viewpoint.camera.userData.exposure = parseFloat(getNodeAttribute(viewpoint, 'exposure', '1.0'));
      return undefined;
    }
  }, {
    key: "parseWorldInfo",
    value: function parseWorldInfo(worldInfo) {
      this.scene.worldInfo.title = getNodeAttribute(worldInfo, 'title', '');
      this.scene.worldInfo.window = getNodeAttribute(worldInfo, 'window', '');
    }
  }, {
    key: "parseFog",
    value: function parseFog(fog) {
      var colorInt = convertStringToColor(getNodeAttribute(fog, 'color', '1 1 1'), false).getHex();
      var visibilityRange = parseFloat(getNodeAttribute(fog, 'visibilityRange', '0'));
      var fogObject = null;
      var fogType = getNodeAttribute(fog, 'fogType', 'LINEAR');
      if (fogType === 'LINEAR') fogObject = new THREE.Fog(colorInt, 0.001, visibilityRange);else fogObject = new THREE.FogExp2(colorInt, 1.0 / visibilityRange);
      this.scene.scene.fog = fogObject;
      return undefined;
    }
  }, {
    key: "_setCustomId",
    value: function _setCustomId(node, object, defNode) {
      // Some THREE.js nodes, like the material and IndexedFaceSet, merges multiple X3D nodes.
      // In order to be able to retrieve the node to be updated, we need to assign to the object all the ids of the merged X3D nodes.
      if (!node || !object) return;
      var id = getNodeAttribute(node, 'id', undefined);

      if (typeof id !== 'undefined') {
        if (object.name !== '') object.name = object.name + ';' + String(id);else object.name = String(id);

        if (defNode) {
          if (typeof defNode.userData.USE === 'undefined') defNode.userData.USE = String(id);else defNode.userData.USE = defNode.userData.USE + ';' + String(id);
        }
      }
    }
  }, {
    key: "_getDefNode",
    value: function _getDefNode(node) {
      var useNodeId = getNodeAttribute(node, 'USE', undefined);
      if (typeof useNodeId === 'undefined') return undefined; // Look for node in previously parsed objects

      var defNode = this.scene.getObjectById(useNodeId, false, this.parsedObjects);
      if (typeof defNode !== 'undefined') return defNode; // Look for node in the already loaded scene

      defNode = this.scene.getObjectById(useNodeId, false, this.scene.root);
      if (typeof defNode === 'undefined') console.error('X3dLoader: no matching DEF node "' + useNodeId + '" node.');
      return defNode;
    }
  }], [{
    key: "applyTextureTransformToMaterial",
    value: function applyTextureTransformToMaterial(material, textureTransform) {
      if (typeof material === 'undefined' || !material.isMaterial) {
        console.error('X3DLoader:parseTextureTransform: invalid parent object.');
        return;
      }

      var maps = [material.map, material.roughnessMap, material.metalnessMap, material.normalMap, material.emissiveMap, material.aoMap];
      maps.forEach(function (map) {
        if (map && map.isTexture) TextureLoader.applyTextureTransform(map, textureTransform);
      });
    }
  }]);

  return X3DLoader;
}();

function getNodeAttribute(node, attributeName, defaultValue) {
  console.assert(node && node.attributes);
  if (attributeName in node.attributes) return node.attributes.getNamedItem(attributeName).value;
  return defaultValue;
}

function createDefaultGeometry() {
  var geometry = new THREE.Geometry();
  geometry.userData = {
    'x3dType': 'unknown'
  };
  return geometry;
}

;

function createDefaultMaterial(geometry) {
  var material;
  if (typeof geometry !== 'undefined' && geometry.userData.x3dType === 'PointSet' && geometry.userData.isColorPerVertex) material = new THREE.PointsMaterial({
    size: 4,
    sizeAttenuation: false,
    vertexColors: THREE.VertexColors
  });else material = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });
  return material;
}

;

function convertStringToVec2(s) {
  s = s.split(/\s/);
  var v = new THREE.Vector2(parseFloat(s[0]), parseFloat(s[1]));
  return v;
}

function convertStringToVec3(s) {
  s = s.split(/\s/);
  var v = new THREE.Vector3(parseFloat(s[0]), parseFloat(s[1]), parseFloat(s[2]));
  return v;
}

function convertStringToQuaternion(s) {
  var pos = s.split(/\s/);
  var q = new THREE.Quaternion();
  q.setFromAxisAngle(new THREE.Vector3(parseFloat(pos[0]), parseFloat(pos[1]), parseFloat(pos[2])), parseFloat(pos[3]));
  return q;
}

function convertStringToColor(s) {
  var sRGB = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var v = convertStringToVec3(s);
  var color = new THREE.Color(v.x, v.y, v.z);
  if (sRGB) color.convertSRGBToLinear();
  return color;
}

function horizontalToVerticalFieldOfView(hFov, aspectRatio) {
  // Units of the angles: radians.
  // reference: WbViewpoint::updateFieldOfViewY()
  // According to VRML standards, the meaning of mFieldOfView depends on the aspect ratio:
  // the view angle is taken with respect to the largest dimension
  if (aspectRatio < 1.0) return hFov;
  return 2.0 * Math.atan(Math.tan(0.5 * hFov) / aspectRatio);
}

THREE.X3DLoader.textures = {};
/* global THREE, Selector, TextureLoader, Viewpoint */

/* global convertStringToVec2, convertStringToVec3, convertStringToQuaternion, convertStringToColor, horizontalToVerticalFieldOfView */

/* global createDefaultGeometry, createDefaultMaterial */

'use strict';

var X3dScene =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function X3dScene(domElement) {
    _classCallCheck(this, X3dScene);

    this.domElement = domElement;
    this.root = undefined;
    this.worldInfo = {};
    this.viewpoint = undefined;
    this.sceneModified = false;
    this.useNodeCache = {};
    this.objectsIdCache = {};
  }

  _createClass(X3dScene, [{
    key: "init",
    value: function init() {
      var _this24 = this;

      var texturePathPrefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      this.renderer = new THREE.WebGLRenderer({
        'antialias': false
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setClearColor(0xffffff, 1.0);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

      this.renderer.gammaInput = false;
      this.renderer.gammaOutput = false;
      this.renderer.physicallyCorrectLights = true;
      this.domElement.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.renderAllAtLoad = false;
      this.viewpoint = new Viewpoint();

      this.viewpoint.onCameraParametersChanged = function (updateScene) {
        if (_this24.gpuPicker) _this24.gpuPicker.needUpdate = true;
        if (updateScene) _this24.render();
      };

      this.selector = new Selector();

      this.selector.onSelectionChange = function () {
        _this24.render();
      };

      this.gpuPicker = new THREE.GPUPicker({
        renderer: this.renderer,
        debug: false
      });
      this.gpuPicker.setFilter(function (object) {
        return object.isMesh && 'x3dType' in object.userData && object.userData.isPickable !== false; // true or undefined
      });
      this.gpuPicker.setScene(this.scene);
      this.gpuPicker.setCamera(this.viewpoint.camera); // add antialiasing post-processing effects

      this.composer = new THREE.EffectComposer(this.renderer);
      var renderPass = new THREE.RenderPass(this.scene, this.viewpoint.camera);
      this.composer.addPass(renderPass);
      this.bloomPass = new THREE.Bloom(new THREE.Vector2(window.innerWidth, window.innerHeight));
      this.composer.addPass(this.bloomPass);
      this.hdrResolvePass = new THREE.ShaderPass(THREE.HDRResolveShader);
      this.composer.addPass(this.hdrResolvePass);
      var fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      this.composer.addPass(fxaaPass);
      this.resize();
      this.destroyWorld();
      TextureLoader.setTexturePathPrefix(texturePathPrefix);
      TextureLoader.setOnTextureLoad(function () {
        if (_this24.renderAllAtLoad && !TextureLoader.hasPendingData()) {
          _this24.renderAllAtLoad = false;

          _this24.scene.traverse(function (object) {
            object.frustumCulled = true;
          });
        }

        _this24.render();
      });
    }
  }, {
    key: "render",
    value: function render() {
      // Apply pass uniforms.
      this.hdrResolvePass.material.uniforms['exposure'].value = 2.0 * this.viewpoint.camera.userData.exposure; // Factor empirically found to match the Webots rendering.

      this.bloomPass.threshold = this.viewpoint.camera.userData.bloomThreshold;
      this.bloomPass.enabled = this.bloomPass.threshold >= 0;
      if (typeof this.preRender === 'function') this.preRender(this.scene, this.viewpoint.camera);
      this.composer.render();
      if (typeof this.postRender === 'function') this.postRender(this.scene, this.viewpoint.camera);
    }
  }, {
    key: "resize",
    value: function resize() {
      var width = this.domElement.clientWidth;
      var height = this.domElement.clientHeight;
      this.viewpoint.camera.aspect = width / height;
      if (this.viewpoint.camera.fovX) this.viewpoint.camera.fov = THREE.Math.radToDeg(horizontalToVerticalFieldOfView(this.viewpoint.camera.fovX, this.viewpoint.camera.aspect));
      this.viewpoint.camera.updateProjectionMatrix();
      this.gpuPicker.resizeTexture(width, height);
      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
      this.render();
    }
  }, {
    key: "onSceneUpdate",
    value: function onSceneUpdate() {
      this.sceneModified = true;
      this.render();
    }
  }, {
    key: "destroyWorld",
    value: function destroyWorld() {
      this.selector.clearSelection();
      if (!this.scene) return;

      for (var i = this.scene.children.length - 1; i >= 0; i--) {
        this.scene.remove(this.scene.children[i]);
      }

      this.objectsIdCache = {};
      this.useNodeCache = {};
      this.root = undefined;
      this.scene.background = new THREE.Color(0, 0, 0);
      /*
      // Code to debug bloom passes.
      var geometry = new THREE.PlaneGeometry(5, 5);
      var material = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});
      this.bloomPass.debugMaterial = material;
      var plane = new THREE.Mesh(geometry, material);
      this.scene.add(plane);
      */

      this.onSceneUpdate();
      this.render();
    }
  }, {
    key: "deleteObject",
    value: function deleteObject(id) {
      var context = {};
      var object = this.getObjectById('n' + id, false, 'scene', context);

      if (typeof object !== 'undefined') {
        var parent;

        if (typeof context !== 'undefined' && typeof context.field !== 'undefined') {
          parent = context.parent;
          if (object.isMaterial) parent[context.field] = createDefaultMaterial(parent.geometry);else if (object.isGeometry || object.isBufferGeometry) parent[context.field] = createDefaultGeometry();else parent[context.field] = undefined;
        } else {
          parent = object.parent;
          object.parent.remove(object);
        }

        delete this.objectsIdCache[id];
        if (typeof parent !== 'undefined') this._updateUseNodesIfNeeded(parent, parent.name.split(';'));
      }

      if (object === this.root) this.root = undefined;
      this.onSceneUpdate();
      this.render();
    }
  }, {
    key: "loadWorldFile",
    value: function loadWorldFile(url, onLoad) {
      var _this25 = this;

      this.objectsIdCache = {};
      var loader = new THREE.X3DLoader(this);
      loader.load(url, function (object3d) {
        if (object3d.length > 0) {
          _this25.scene.add(object3d[0]);

          _this25.root = object3d[0];
        }

        _this25._setupLights(loader.directionalLights);

        _this25._setupEnvironmentMap();

        if (_this25.gpuPicker) {
          _this25.gpuPicker.setScene(_this25.scene);

          _this25.sceneModified = false;
        } // Render all the objects at scene load.
        // The frustumCulled parameter will be set back to TRUE once all the textures are loaded.


        _this25.scene.traverse(function (o) {
          o.frustumCulled = false;
        });

        _this25.renderAllAtLoad = true;

        _this25.onSceneUpdate();

        if (typeof onLoad === 'function') onLoad();
      });
    }
  }, {
    key: "loadObject",
    value: function loadObject(x3dObject, parentId) {
      var _this26 = this;

      var parentObject;
      if (parentId && parentId !== 0) parentObject = this.getObjectById('n' + parentId);
      var loader = new THREE.X3DLoader(this);
      var objects = loader.parse(x3dObject, parentObject);
      if (typeof parentObject !== 'undefined') this._updateUseNodesIfNeeded(parentObject, parentObject.name.split(';'));else {
        console.assert(objects.length <= 1 && typeof this.root === 'undefined'); // only one root object is supported

        objects.forEach(function (o) {
          _this26.scene.add(o);
        });
        this.root = objects[0];
      }

      this._setupLights(loader.directionalLights);

      this._setupEnvironmentMap();

      if (typeof parentObject === 'undefined') {
        // Render all the objects at scene load.
        // The frustumCulled parameter will be set back to TRUE once all the textures are loaded.
        this.scene.traverse(function (o) {
          o.frustumCulled = false;
        });
        this.renderAllAtLoad = true;
      }

      this.onSceneUpdate();
    }
  }, {
    key: "applyPose",
    value: function applyPose(pose) {
      var appliedFields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var id = pose.id;
      var fields = appliedFields;

      for (var key in pose) {
        if (key === 'id') continue;
        if (fields.indexOf(key) !== -1) continue;
        var newValue = pose[key];
        var object = this.getObjectById('n' + id, true);
        if (typeof object === 'undefined') continue; // error

        var valid = true;

        if (key === 'translation') {
          if (object.isTexture) {
            var translation = convertStringToVec2(newValue);

            if (object.userData && object.userData.transform) {
              object.userData.transform.translation = translation;
              object.needsUpdate = true;
              this.sceneModified = true;
            }
          } else if (object.isObject3D) {
            var newPosition = convertStringToVec3(newValue); // Followed object moved.

            if (this.viewpoint.followedObjectId && (id === this.viewpoint.followedObjectId || // animation case
            'n' + id === this.viewpoint.followedObjectId || // streaming case
            object.userData.name === this.viewpoint.followedObjectId)) {
              // If this is the followed object, we save a vector with the translation applied
              // to the object to compute the new position of the viewpoint.
              this.viewpoint.setFollowedObjectDeltaPosition(newPosition, object.position);
            }

            object.position.copy(newPosition);
            this.sceneModified = true;
          }
        } else if (key === 'rotation' && object.isObject3D) {
          // Transform node
          var quaternion = convertStringToQuaternion(newValue);
          object.quaternion.copy(quaternion);
          this.sceneModified = true;
        } else if (object.isMaterial) {
          if (key === 'baseColor') object.color = convertStringToColor(newValue); // PBRAppearance node
          else if (key === 'diffuseColor') object.color = convertStringToColor(newValue, false); // Appearance node
            else if (key === 'emissiveColor') object.emissive = convertStringToColor(newValue, object.userData.x3dType === 'PBRAppearance');
        } else if (key === 'render' && object.isObject3D) object.visible = newValue.toLowerCase() === 'true';else valid = false;

        if (valid) fields.push(key);

        this._updateUseNodesIfNeeded(object, id);
      }

      return fields;
    }
  }, {
    key: "pick",
    value: function pick(relativePosition, screenPosition) {
      if (this.sceneModified) {
        this.gpuPicker.setScene(this.scene);
        this.sceneModified = false;
      }

      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.viewpoint.camera);
      return this.gpuPicker.pick(relativePosition, raycaster);
    }
  }, {
    key: "getCamera",
    value: function getCamera() {
      return this.viewpoint.camera;
    }
  }, {
    key: "getTopX3dNode",
    value: function getTopX3dNode(node) {
      // If it exists, return the upmost Solid, otherwise the top node.
      var upmostSolid;

      while (node) {
        if (node.userData && node.userData.solid) upmostSolid = node;
        if (node.parent === this.scene) break;
        node = node.parent;
      }

      if (typeof upmostSolid !== 'undefined') return upmostSolid;
      return node;
    }
  }, {
    key: "getObjectById",
    value: function getObjectById(id) {
      var skipBoundingObject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var object = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'scene';
      var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      // @param 'object':
      //     Global case: object is the root object in which to search for.
      //     Special case to have a good default value: if object === 'scene', then the scene is used.
      if (object === 'scene') object = this.scene;

      if (!object || skipBoundingObject && typeof object.userData !== 'undefined' && object.userData.x3dType === 'Switch') {
        context.parent = undefined;
        return undefined;
      }

      if (Array.isArray(object)) {
        for (var i = 0, l = object.length; i < l; i++) {
          var o = this.getObjectById(id, skipBoundingObject, object[i], context);
          if (typeof o !== 'undefined') return o;
        }
      }

      if (typeof this.objectsIdCache[id] !== 'undefined') {
        context.field = this.objectsIdCache[id].context.field;
        context.parent = this.objectsIdCache[id].context.parent;
        return this.objectsIdCache[id].object;
      }

      if (object.name && object.name.includes(id)) {
        this.objectsIdCache[id] = {
          'object': object,
          'context': context
        };
        return object;
      }

      var childObject;

      if (object.children) {
        for (var childIndex in object.children) {
          context.parent = object;
          childObject = this.getObjectById(id, skipBoundingObject, object.children[childIndex], context);
          if (typeof childObject !== 'undefined') return childObject;
        }

        ;
      }

      if (object.isMesh || object.isLineSegments || object.isPoint) {
        if (object.material) {
          childObject = this.getObjectById(id, skipBoundingObject, object.material, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'material';
            context.parent = object;
            return childObject;
          }
        }

        if (object.geometry) {
          childObject = this.getObjectById(id, skipBoundingObject, object.geometry, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'geometry';
            context.parent = object;
            return childObject;
          }
        }
      } else if (object.isMaterial) {
        if (object.map) {
          childObject = this.getObjectById(id, skipBoundingObject, object.map, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'map';
            context.parent = object;
            return childObject;
          }
        }

        if (object.aoMap) {
          childObject = this.getObjectById(id, skipBoundingObject, object.aoMap, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'aoMap';
            context.parent = object;
            return childObject;
          }
        }

        if (object.roughnessMap) {
          childObject = this.getObjectById(id, skipBoundingObject, object.roughnessMap, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'roughnessMap';
            context.parent = object;
            return childObject;
          }
        }

        if (object.metalnessMap) {
          childObject = this.getObjectById(id, skipBoundingObject, object.metalnessMap, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'metalnessMap';
            context.parent = object;
            return childObject;
          }
        }

        if (object.normalMap) {
          childObject = this.getObjectById(id, skipBoundingObject, object.normalMap, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'normalMap';
            context.parent = object;
            return childObject;
          }
        }

        if (object.emissiveMap) {
          childObject = this.getObjectById(id, skipBoundingObject, object.emissiveMap, context);

          if (typeof childObject !== 'undefined') {
            context.field = 'emissiveMap';
            context.parent = object;
            return childObject;
          }
        } // only fields set in x3d.js are checked

      }

      return undefined;
    } // private functions

  }, {
    key: "_setupLights",
    value: function _setupLights(directionalLights) {
      if (!this.root) return;
      var sceneBox = new THREE.Box3();
      sceneBox.setFromObject(this.root);
      var boxSize = new THREE.Vector3();
      sceneBox.getSize(boxSize);
      var boxCenter = new THREE.Vector3();
      sceneBox.getCenter(boxCenter);
      var halfWidth = boxSize.x / 2 + boxCenter.x;
      var halfDepth = boxSize.z / 2 + boxCenter.z;
      var maxSize = 2 * Math.max(halfWidth, boxSize.y / 2 + boxCenter.y, halfDepth);
      directionalLights.forEach(function (light) {
        light.position.multiplyScalar(maxSize);
        light.shadow.camera.far = Math.max(maxSize, light.shadow.camera.far);
        light.shadow.camera.left = -maxSize;
        light.shadow.camera.right = maxSize;
        light.shadow.camera.top = maxSize;
        light.shadow.camera.bottom = -maxSize;
      });
    }
  }, {
    key: "_setupEnvironmentMap",
    value: function _setupEnvironmentMap() {
      var _this27 = this;

      var isHDR = false;
      var backgroundMap;

      if (this.scene.background) {
        if (this.scene.background.isColor) {
          var color = this.scene.background.clone();
          color.convertLinearToSRGB();
          backgroundMap = TextureLoader.createColoredCubeTexture(color);
        } else backgroundMap = this.scene.background;
      }

      if (typeof this.scene.userData.irradiance !== 'undefined') {
        isHDR = true;
        backgroundMap = this.scene.userData.irradiance;
      }

      this.scene.traverse(function (child) {
        if (child.isMesh && child.material && child.material.isMeshStandardMaterial) {
          var material = child.material;
          material.envMap = backgroundMap;
          material.envMapIntensity = isHDR ? 0.6 : 1.0; // Factor empirically found to match the Webots rendering.

          if (typeof _this27.scene.userData.luminosity !== 'undefined') material.envMapIntensity *= _this27.scene.userData.luminosity;
          material.needsUpdate = true;
        }
      });
    }
  }, {
    key: "_updateUseNodesIfNeeded",
    value: function _updateUseNodesIfNeeded(object, id) {
      var _this28 = this;

      if (!object) return;

      if (Array.isArray(id)) {
        if (id.length > 1) id.forEach(function (item) {
          return _this28._updateUseNodesIfNeeded(object, item);
        });else id = id[0];
      }

      if (typeof this.useNodeCache[id] === 'undefined') {
        var node = object;
        var source;

        while (node && node !== this.root) {
          if (typeof node.userData.USE !== 'undefined') source = node;
          node = node.parent;
        }

        this.useNodeCache[id] = {
          'source': source
        };

        if (typeof source !== 'undefined') {
          this.useNodeCache[id].target = [];
          source.userData.USE.split(';').forEach(function (useId) {
            var useObject = _this28.getObjectById(useId);

            if (typeof useObject !== 'undefined') _this28.useNodeCache[id].target.push(useObject);
          });
        }
      }

      if (typeof this.useNodeCache[id].source !== 'undefined') {
        // clone again changed DEF node instance
        var sourceNode = this.useNodeCache[id].source;
        var targetNodes = this.useNodeCache[id].target;
        var newTargetNodes = [];

        for (var i = 0, l = targetNodes.length; i < l; i++) {
          var target = targetNodes[i];
          var newClone = sourceNode.clone();
          newClone.name = target.name;
          var parent = target.parent;
          var index = parent.children.indexOf(target);
          parent.remove(target); // manually add new child to keep the same child index.

          parent.children.splice(index, 0, newClone);
          newClone.parent = parent;
          object.dispatchEvent({
            type: 'added'
          });
          newTargetNodes.push(newClone);
        }

        this.useNodeCache[id].target = newTargetNodes;
      }
    }
  }]);

  return X3dScene;
}();
/* global DefaultUrl, TextureLoader */


'use strict';

var Animation =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Animation(url, scene, view, gui, loop) {
    _classCallCheck(this, Animation);

    this.url = url;
    this.scene = scene;
    this.view = view;
    this.gui = typeof gui === 'undefined' || gui === 'play' ? 'real_time' : 'pause';
    this.loop = typeof loop === 'undefined' ? true : loop;
    this.sliding = false;
    this.onReady = null;
  }

  _createClass(Animation, [{
    key: "init",
    value: function init(onReady) {
      var _this29 = this;

      this.onReady = onReady;
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.open('GET', this.url, true);
      xmlhttp.overrideMimeType('application/json');

      xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) _this29._setup(JSON.parse(xmlhttp.responseText));
      };

      xmlhttp.send();
    } // Return the animation status: play or pause.
    // This should be used to store the current animation status and restore it later when calling webots.View.setAnimation().
    // This is for example used in robotbenchmark.net benchmark page.

  }, {
    key: "getStatus",
    value: function getStatus() {
      return this.gui === 'real_time' ? 'play' : 'pause';
    } // private methods

  }, {
    key: "_setup",
    value: function _setup(data) {
      var _this30 = this;

      this.data = data; // extract animated node ids: remove empty items and convert to integer

      this.allIds = this.data.ids.split(';').filter(Boolean).map(function (s) {
        return parseInt(s);
      }); // Automatically start the animation only when all the textures are loaded.

      if (this.gui === 'real_time' && TextureLoader.hasPendingData()) this.gui = 'play_on_load'; // wait for textures loading
      // Create play bar.

      var div = document.createElement('div');
      div.id = 'playBar';
      this.view.view3D.appendChild(div);
      this.button = document.createElement('button');
      this.button.id = 'playPauseButton';
      var action = this.gui === 'real_time' ? 'pause' : 'real_time';
      this.button.style.backgroundImage = 'url(' + DefaultUrl.wwiImagesUrl() + action + '.png)';
      this.button.style.padding = '0';
      this.button.addEventListener('click', function () {
        _this30._triggerPlayPauseButton();
      });
      div.appendChild(this.button);
      var slider = document.createElement('div');
      slider.id = 'playSlider';
      div.appendChild(slider);
      this.playSlider = $('#playSlider').slider();

      this._connectSliderEvents(); // Initialize animation data.


      this.start = new Date().getTime();
      this.step = 0;
      this.previousStep = 0;

      this._updateAnimation(); // Notify creation completed.


      if (typeof this.onReady === 'function') this.onReady();
    }
  }, {
    key: "_elapsedTime",
    value: function _elapsedTime() {
      var end = new Date().getTime();
      return end - this.start;
    }
  }, {
    key: "_triggerPlayPauseButton",
    value: function _triggerPlayPauseButton() {
      var _this31 = this;

      this.button.style.backgroundImage = 'url(' + DefaultUrl.wwiImagesUrl() + this._getIconBaseName(this.gui) + '.png)';

      if (this.gui === 'real_time') {
        this.gui = 'pause';

        if (this.step < 0 || this.step >= this.data.frames.length) {
          this.start = new Date().getTime();

          this._updateAnimationState();
        } else this.start = new Date().getTime() - this.data.basicTimeStep * this.step;
      } else {
        this.gui = 'real_time';
        this.start = new Date().getTime() - this.data.basicTimeStep * this.step;
        window.requestAnimationFrame(function () {
          _this31._updateAnimation();
        });
      }
    }
  }, {
    key: "_connectSliderEvents",
    value: function _connectSliderEvents() {
      var _this32 = this;

      this.playSlider = this.playSlider.slider({
        change: function change(e, ui) {
          _this32._updateSlider(ui.value); // continue running the animation


          _this32._updateAnimation();
        },
        slide: function slide(e, ui) {
          _this32._updateSlider(ui.value);
        },
        start: function start(e, ui) {
          _this32.sliding = true;
        },
        stop: function stop(e, ui) {
          _this32.sliding = false;
        }
      });
    }
  }, {
    key: "_disconnectSliderEvents",
    value: function _disconnectSliderEvents() {
      this.playSlider.slider({
        change: null,
        slide: null
      });
    }
  }, {
    key: "_updateSlider",
    value: function _updateSlider(value) {
      var clampedValued = Math.min(value, 99); // set maximum value to get valid step index

      var requestedStep = Math.floor(this.data.frames.length * clampedValued / 100);
      this.start = new Date().getTime() - Math.floor(this.data.basicTimeStep * this.step);

      this._updateAnimationState(requestedStep);
    }
  }, {
    key: "_updateAnimationState",
    value: function _updateAnimationState() {
      var requestedStep = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var automaticMove = typeof requestedStep === 'undefined';

      if (automaticMove) {
        requestedStep = Math.floor(this._elapsedTime() / this.data.basicTimeStep);

        if (requestedStep < 0 || requestedStep >= this.data.frames.length) {
          if (this.loop) {
            if (requestedStep > this.data.frames.length) {
              requestedStep = 0;
              this.previousStep = 0;
              this.start = new Date().getTime();
            } else return;
          } else if (this.gui === 'real_time') {
            this._triggerPlayPauseButton();

            return;
          } else return;
        }
      }

      if (requestedStep === this.step) return;
      this.step = requestedStep;
      var p;
      var appliedIds = [];

      if (this.data.frames[this.step].hasOwnProperty('poses')) {
        var poses = this.data.frames[this.step].poses;

        for (p = 0; p < poses.length; p++) {
          appliedIds[poses[p].id] = this.scene.applyPose(poses[p]);
        }
      }

      var x3dScene = this.view.x3dScene; // lookback mechanism: search in history

      if (this.step !== this.previousStep + 1) {
        var previousPoseStep;
        if (this.step > this.previousStep) // in forward animation check only the changes since last pose
          previousPoseStep = this.previousStep;else previousPoseStep = 0;

        for (var i in this.allIds) {
          var id = this.allIds[i];
          var appliedFields = appliedIds[id];

          for (var f = this.step - 1; f >= previousPoseStep; f--) {
            if (this.data.frames[f].poses) {
              for (p = 0; p < this.data.frames[f].poses.length; p++) {
                if (this.data.frames[f].poses[p].id === id) appliedFields = x3dScene.applyPose(this.data.frames[f].poses[p], appliedFields);
              }
            }
          }
        }
      }

      if (automaticMove) {
        this._disconnectSliderEvents();

        this.playSlider.slider('option', 'value', 100 * this.step / this.data.frames.length);

        this._connectSliderEvents();
      }

      this.previousStep = this.step;
      this.view.time = this.data.frames[this.step].time;
      x3dScene.viewpoint.updateViewpointPosition(!automaticMove | this.step === 0, this.view.time);
      x3dScene.viewpoint.notifyCameraParametersChanged();
    }
  }, {
    key: "_updateAnimation",
    value: function _updateAnimation() {
      var _this33 = this;

      if (this.gui === 'real_time' && !this.sliding) {
        this._updateAnimationState();

        window.requestAnimationFrame(function () {
          _this33._updateAnimation();
        });
      } else if (this.gui === 'play_on_load') {
        if (!TextureLoader.hasPendingData()) this._triggerPlayPauseButton();
        window.requestAnimationFrame(function () {
          _this33._updateAnimation();
        });
      }
    }
  }, {
    key: "_getIconBaseName",
    value: function _getIconBaseName() {
      return this.gui === 'real_time' ? 'real_time' : 'pause';
    }
  }]);

  return Animation;
}();
/*
 * Injects a Webots 3D view inside a HTML tag.
 * @class
 * @classdesc
 *   The Webots view object displays a 3D view on a web page.
 *   This view represents a Webots simulation world that may be
 *   connected to a webots instance running on a remote server.
 * @example
 *   // Example: Initialize from a Webots streaming server
 *   var view = new webots.View(document.getElementById("myDiv"));
 *   view.open("ws://localhost:80/simple/worlds/simple.wbt");
 *   // or view.open("ws://localhost:80");
 *   // or view.open("file.x3d");
 *   view.onready = () => {
 *       // the initialization is done
 *   }
 *   view.onclose = () => {
 *       view = null;
 *   }
 */

/* global webots */

/* global Animation, Console, ContextMenu, Editor, MouseEvents, DefaultUrl, RobotWindow, TextureLoader */

/* global Server, Stream, SystemInfo, Toolbar, Video, X3dScene */

/* global MathJax: false */

/* eslint no-eval: "off" */

/* The following member variables should be set by the application:

webots.User1Id             // ID of the main user (integer value > 0). If 0 or unset, the user is not logged in.
webots.User1Name           // user name of the main user.
webots.User1Authentication // password hash or authentication for the main user (empty or unset if user not authenticated).
webots.User2Id             // ID of the secondary user (in case of a soccer match between two different users). 0 or unset if not used.
webots.User2Name           // user name of the secondary user.
webots.CustomData          // application specific data to be passed to the simulation server
webots.showRevert          // defines whether the revert button should be displayed
webots.showQuit            // defines whether the quit button should be displayed
webots.showRun             // defines whether the run button should be displayed
*/


webots.View =
/*#__PURE__*/
function () {
  function View(view3D, mobile) {
    var _this34 = this;

    _classCallCheck(this, View);

    webots.currentView = this;

    this.onerror = function (text) {
      console.log('%c' + text, 'color:black');

      _this34.onrobotwindowsdestroy();
    };

    this.onstdout = function (text) {
      console.log('%c' + text, 'color:blue');
    };

    this.onstderr = function (text) {
      console.log('%c' + text, 'color:red');
    };

    this.onrobotmessage = function (robot, message) {
      if (typeof _this34.robotWindowNames[robot] === 'undefined') {
        console.log("Robot '" + robot + "' has no associated robot window");
        return;
      }

      _this34.robotWindows[_this34.robotWindowNames[robot]].receive(message, robot);
    };

    this.onrobotwindowsdestroy = function () {
      _this34.robotWindowsGeometries = {};

      for (var win in _this34.robotWindows) {
        _this34.robotWindowsGeometries[win] = _this34.robotWindows[win].geometry();

        _this34.robotWindows[win].destroy();
      }

      _this34.infoWindow = undefined;
      _this34.robotWindows = {}; // delete robot windows

      _this34.robotWindowNames = {};
    };

    this.onquit = function () {
      // If the simulation page URL is this https://mydomain.com/mydir/mysimulation.html, the quit action redirects to the
      // folder level, e.g., https://mydomain.com/mydir/
      // If the simulation page is https://mydomain.com/mydir/mysimulation/, the quit action redirects to the upper level:
      // https://mydomain.com/mydir/
      // You can change this behavior by overriding this onquit() method.
      var currentLocation = window.location.href; // Remove filename or last directory name from url and keep the final slash.S

      var quitDestination = currentLocation.substring(0, currentLocation.lastIndexOf('/', currentLocation.length - 2) + 1);
      window.location = quitDestination;
    };

    this.onresize = function () {
      if (!_this34.x3dScene) return; // Sometimes the page is not fully loaded by that point and the field of view is not yet available.
      // In that case we add a callback at the end of the queue to try again when all other callbacks are finished.

      if (_this34.x3dScene.root === null) {
        setTimeout(_this34.onresize, 0);
        return;
      }

      _this34.x3dScene.resize();
    };

    this.ondialogwindow = function (opening) {
      // Pause the simulation if needed when a pop-up dialog window is open
      // and restart running the simulation when it is closed.
      if (opening && typeof _this34.isAutomaticallyPaused === 'undefined') {
        _this34.isAutomaticallyPaused = _this34.toolBar && _this34.toolBar.pauseButton && _this34.toolBar.pauseButton.style.display === 'inline';

        _this34.toolBar.pauseButton.click();
      } else if (!opening && _this34.isAutomaticallyPaused) {
        _this34.toolBar.real_timeButton.click();

        _this34.isAutomaticallyPaused = undefined;
      }
    };

    window.onresize = this.onresize; // Map robot name to robot window name used as key in robotWindows lists.

    this.robotWindowNames = {};
    this.robotWindows = {};
    this.view3D = view3D;
    this.view3D.className = view3D.className + ' webotsView';
    if (typeof mobile === 'undefined') this.mobileDevice = SystemInfo.isMobileDevice();else this.mobileDevice = mobile;
    this.fullscreenEnabled = !SystemInfo.isIOS();
    if (!this.fullscreenEnabled) // Add tag needed to run standalone web page in fullscreen on iOS.
      $('head').append('<meta name="apple-mobile-web-app-capable" content="yes">'); // Prevent the backspace key to quit the simulation page.

    var rx = /INPUT|SELECT|TEXTAREA/i;
    $(document).bind('keydown keypress', function (e) {
      if (e.which === 8) {
        // backspace key
        if (!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly) e.preventDefault();
      }
    });
    this.debug = false;
    this.timeout = 60 * 1000; // default to one minute

    this.time = undefined;
    this.deadline = this.timeout;
    this.runOnLoad = false;
    this.quitting = false;
  }

  _createClass(View, [{
    key: "setTimeout",
    value: function setTimeout(timeout) {
      // expressed in seconds
      if (timeout < 0) {
        this.timeout = timeout;
        this.deadline = 0;
        return;
      }

      this.timeout = timeout * 1000; // convert to millisecons

      this.deadline = this.timeout;
      if (typeof this.time !== 'undefined') this.deadline += this.time;
    }
  }, {
    key: "setWebotsDocUrl",
    value: function setWebotsDocUrl(url) {
      webots.webotsDocUrl = url;
    }
  }, {
    key: "setAnimation",
    value: function setAnimation(url, gui, loop) {
      if (typeof gui === 'undefined') gui = 'play';
      if (typeof loop === 'undefined') loop = true;
      this.animation = new Animation(url, this.x3dScene, this, gui, loop);
    }
  }, {
    key: "open",
    value: function open(url, mode) {
      var _this35 = this;

      var texturePathPrefix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      this.url = url;
      if (typeof mode === 'undefined') mode = 'x3d';
      this.mode = mode;

      var initWorld = function initWorld() {
        if (_this35.isWebSocketProtocol) {
          _this35.progress = document.createElement('div');
          _this35.progress.id = 'webotsProgress';
          _this35.progress.innerHTML = "<div><img src='" + DefaultUrl.wwiImagesUrl() + "load_animation.gif'>" + "</div><div id='webotsProgressMessage'>Initializing...</div>" + "</div><div id='webotsProgressPercent'></div>";

          _this35.view3D.appendChild(_this35.progress);

          if (typeof _this35.toolBar === 'undefined') _this35.toolBar = new Toolbar(_this35.view3D, _this35);

          if (_this35.url.endsWith('.wbt')) {
            // url expected form: "ws://localhost:80/simple/worlds/simple.wbt"
            var callback;
            if (_this35.mode === 'video') callback = _this35.video.finalize;else callback = finalizeWorld;
            _this35.server = new Server(_this35.url, _this35, callback);

            _this35.server.connect();
          } else {
            // url expected form: "ws://cyberbotics2.cyberbotics.com:80"
            var httpServerUrl = _this35.url.replace(/ws/, 'http'); // Serve the texture images. SSL prefix is supported.


            _this35.stream = new Stream(_this35.url, _this35, finalizeWorld);
            TextureLoader.setTexturePathPrefix(httpServerUrl + '/');

            _this35.stream.connect();
          }
        } else // assuming it's an URL to a .x3d file
          _this35.x3dScene.loadWorldFile(_this35.url, finalizeWorld);
      };

      var finalizeWorld = function finalizeWorld() {
        $('#webotsProgressMessage').html('Loading HTML and Javascript files...');
        if (_this35.x3dScene.viewpoint.followedObjectId == null || _this35.broadcast) _this35.x3dScene.viewpoint.initFollowParameters();else // Reset follow parameters.
          _this35.x3dScene.viewpoint.follow(_this35.x3dScene.viewpoint.followedObjectId);

        if (!_this35.isWebSocketProtocol) {
          // skip robot windows initialization
          if (_this35.animation != null) _this35.animation.init(loadFinalize);else loadFinalize();

          _this35.onresize();

          return;
        }

        var loadRobotWindow = function loadRobotWindow(windowName, nodeName) {
          _this35.robotWindowNames[nodeName] = windowName;
          var win = new RobotWindow(_this35.view3D, _this35.mobileDevice, windowName);
          _this35.robotWindows[windowName] = win; // Initialize robot windows dialogs.

          function closeInfoWindow() {
            $('#infoButton').removeClass('toolBarButtonActive');
          }

          if (windowName === infoWindowName) {
            var user;

            if (typeof webots.User1Id !== 'undefined' && webots.User1Id !== '') {
              user = ' [' + webots.User1Name;
              if (typeof webots.User2Id !== 'undefined' && webots.User2Id !== '') user += '/' + webots.User2Name;
              user += ']';
            } else user = '';

            win.setProperties({
              title: _this35.x3dScene.worldInfo.title + user,
              close: closeInfoWindow
            });
            _this35.infoWindow = win;
          } else win.setProperties({
            title: 'Robot: ' + nodeName
          });

          pendingRequestsCount++;
          $.get('window/' + windowName + '/' + windowName + '.html', function (data) {
            // Fix the img src relative URLs.
            var d = data.replace(/ src='/g, ' src=\'window/' + windowName + '/').replace(/ src="/g, ' src="window/' + windowName + '/');
            win.setContent(d);
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, win[0]]);
            $.get('window/' + windowName + '/' + windowName + '.js', function (data) {
              eval(data);
              pendingRequestsCount--;
              if (pendingRequestsCount === 0) loadFinalize();
            }).fail(function () {
              pendingRequestsCount--;
              if (pendingRequestsCount === 0) loadFinalize();
            });
          }).fail(function () {
            if (windowName === infoWindowName) _this35.infoWindow = undefined;
            pendingRequestsCount--;
            if (pendingRequestsCount === 0) loadFinalize();
          });
        };

        var infoWindowName = _this35.x3dScene.worldInfo.window;
        var pendingRequestsCount = 1; // start from 1 so that it can be 0 only after the loop is completed and all the nodes are checked

        var nodes = _this35.x3dScene.root ? _this35.x3dScene.root.children : [];
        nodes.forEach(function (node) {
          if (node.isObject3D && node.userData && node.userData.window && node.userData.name) loadRobotWindow(node.userData.window, node.userData.name);
        });
        pendingRequestsCount--; // notify that loop is completed

        if (pendingRequestsCount === 0) // If no pending requests execute loadFinalize
          // otherwise it will be executed when the last request will be handled.
          loadFinalize();
      };

      var loadFinalize = function loadFinalize() {
        $('#webotsProgress').hide();
        if (_this35.toolBar) _this35.toolBar.enableToolBarButtons(true);
        if (typeof _this35.onready === 'function') _this35.onready(); // Restore robot windows.

        if (_this35.robotWindowsGeometries) {
          // on reset
          for (var win in _this35.robotWindows) {
            if (win in _this35.robotWindowsGeometries) {
              _this35.robotWindows[win].restoreGeometry(_this35.robotWindowsGeometries[win]);

              if (_this35.robotWindowsGeometries[win].open) {
                if (_this35.robotWindows[win] === _this35.infoWindow) _this35.toolBar.toggleInfo();else _this35.robotWindows[win].open();
              }
            }
          }
        } else if (_this35.infoWindow && !_this35.broadcast) // at first load
          _this35.toolBar.toggleInfo();

        if (_this35.runOnLoad && _this35.toolBar) _this35.toolBar.realTime();
      };

      if (mode === 'video') {
        this.url = url;
        this.video = new Video(this.view3D, this.mouseEvents);
        initWorld();
        return;
      }

      if (mode !== 'x3d') {
        console.log('Error: webots.View.open: wrong mode argument: ' + mode);
        return;
      }

      if (this.broadcast) this.setTimeout(-1);
      this.isWebSocketProtocol = this.url.startsWith('ws://') || this.url.startsWith('wss://');

      if (typeof this.x3dScene === 'undefined') {
        this.x3dDiv = document.createElement('div');
        this.x3dDiv.className = 'webots3DView';
        this.view3D.appendChild(this.x3dDiv);
        this.x3dScene = new X3dScene(this.x3dDiv);
        this.x3dScene.init(texturePathPrefix);
        var param = document.createElement('param');
        param.name = 'showProgress';
        param.value = false;
        this.x3dScene.domElement.appendChild(param);
      }

      if (typeof this.contextMenu === 'undefined' && this.isWebSocketProtocol) {
        var authenticatedUser = !this.broadcast;
        if (authenticatedUser && typeof webots.User1Id !== 'undefined' && webots.User1Id !== '') authenticatedUser = Boolean(webots.User1Authentication);
        this.contextMenu = new ContextMenu(authenticatedUser, this.view3D);

        this.contextMenu.onEditController = function (controller) {
          _this35.editController(controller);
        };

        this.contextMenu.onFollowObject = function (id) {
          _this35.x3dScene.viewpoint.follow(id);
        };

        this.contextMenu.isFollowedObject = function (object3d, setResult) {
          setResult(_this35.x3dScene.viewpoint.isFollowedObject(object3d));
        };

        this.contextMenu.onOpenRobotWindow = function (robotName) {
          _this35.openRobotWindow(robotName);
        };

        this.contextMenu.isRobotWindowValid = function (robotName, setResult) {
          setResult(_this35.robotWindows[_this35.robotWindowNames[robotName]]);
        };
      }

      if (typeof this.mouseEvents === 'undefined') this.mouseEvents = new MouseEvents(this.x3dScene, this.contextMenu, this.x3dDiv, this.mobileDevice);
      if (typeof this.console === 'undefined') this.console = new Console(this.view3D, this.mobileDevice);
      if (typeof this.editor === 'undefined') this.editor = new Editor(this.view3D, this.mobileDevice, this);
      initWorld();
    }
  }, {
    key: "close",
    value: function close() {
      if (this.server) this.server.socket.close();
      if (this.stream) this.stream.close();
    }
  }, {
    key: "sendRobotMessage",
    value: function sendRobotMessage(message, robot) {
      this.stream.socket.send('robot:' + robot + ':' + message);
      if (this.toolBar.isPaused()) // if paused, make a simulation step
        webots.currentView.stream.socket.send('step'); // so that the robot controller handles the message
      // FIXME: there seems to be a bug here: after that step, the current time is not incremented in the web interface,
      // this is because the next 'application/json:' is not received, probably because it gets overwritten by the
      // answer to the robot message...
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      if (this.video) this.video.resize(width, height);
    }
  }, {
    key: "getControllerUrl",
    value: function getControllerUrl(name) {
      if (!this.server) return;
      var port = 0;

      for (var i in this.server.controllers) {
        if (this.server.controllers[i].name === name) {
          port = this.server.controllers[i].port;
          break;
        }
      }

      if (port === 0) return;
      return this.url.substring(0, this.url.indexOf(':', 6) + 1) + port;
    } // Functions for internal use.

  }, {
    key: "updateWorldList",
    value: function updateWorldList(currentWorld, worlds) {
      var _this36 = this;

      if (!this.toolBar || this.broadcast) // Do not show world list if no toolbar exists or in broadcast mode,
        // where multiple users can connect to the same Webots instance.
        return;
      if (typeof this.worldSelect !== 'undefined') this.toolBar.worldSelectionDiv.removeChild(this.worldSelect);
      if (worlds.length <= 1) return;
      this.worldSelect = document.createElement('select');
      this.worldSelect.id = 'worldSelection';
      this.worldSelect.classList.add('select-css');
      this.toolBar.worldSelectionDiv.appendChild(this.worldSelect);

      for (var i in worlds) {
        var option = document.createElement('option');
        option.value = worlds[i];
        option.text = worlds[i];
        this.worldSelect.appendChild(option);
        if (currentWorld === worlds[i]) this.worldSelect.selectedIndex = i;
      }

      this.worldSelect.onchange = function () {
        if (_this36.broadcast || typeof _this36.worldSelect === 'undefined') return;
        if (_this36.toolBar) _this36.toolBar.enableToolBarButtons(false);

        _this36.x3dScene.viewpoint.resetFollow();

        _this36.onrobotwindowsdestroy();

        $('#webotsProgressMessage').html('Loading ' + _this36.worldSelect.value + '...');
        $('#webotsProgress').show();

        _this36.stream.socket.send('load:' + _this36.worldSelect.value);
      };
    }
  }, {
    key: "setLabel",
    value: function setLabel(properties) {
      var labelElement = document.getElementById('label' + properties.id);

      if (labelElement == null) {
        labelElement = document.createElement('div');
        labelElement.id = 'label' + properties.id;
        labelElement.className = 'webotsLabel';
        this.x3dDiv.appendChild(labelElement);
      }

      labelElement.style.fontFamily = properties.font;
      labelElement.style.color = properties.color;
      labelElement.style.fontSize = $(this.x3dDiv).height() * properties.size / 2.25 + 'px'; // 2.25 is an empirical value to match with Webots appearance

      labelElement.style.left = $(this.x3dDiv).width() * properties.x + 'px';
      labelElement.style.top = $(this.x3dDiv).height() * properties.y + 'px';
      labelElement.innerHTML = properties.text;
    }
  }, {
    key: "removeLabels",
    value: function removeLabels() {
      var labels = document.getElementsByClassName('webotsLabel');

      for (var i = labels.length - 1; i >= 0; i--) {
        var element = labels.item(i);
        element.parentNode.removeChild(element);
      }
    }
  }, {
    key: "resetSimulation",
    value: function resetSimulation() {
      this.removeLabels();
      $('#webotsClock').html(webots.parseMillisecondsIntoReadableTime(0));
      this.deadline = this.timeout;
      if (this.deadline >= 0) $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(this.deadline));else $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(0));
      this.x3dScene.viewpoint.reset(this.time);
    }
  }, {
    key: "quitSimulation",
    value: function quitSimulation() {
      if (this.broadcast) return;
      $('#webotsProgressMessage').html('Bye bye...');
      $('#webotsProgress').show();
      this.quitting = true;
      this.onquit();
    }
  }, {
    key: "destroyWorld",
    value: function destroyWorld() {
      if (this.x3dScene) this.x3dScene.destroyWorld();
      this.removeLabels();
    }
  }, {
    key: "editController",
    value: function editController(controller) {
      if (this.editor.dirname !== controller) {
        this.editor.closeAllTabs();
        this.editor.dirname = controller;
        this.stream.socket.send('get controller:' + controller);
      }
    }
  }, {
    key: "openRobotWindow",
    value: function openRobotWindow(robotName) {
      var win = this.robotWindows[this.robotWindowNames[robotName]];

      if (win) {
        if (win === this.infoWindow) {
          if (!this.infoWindow.isOpen()) this.toolBar.toggleInfo();
        } else win.open();
      } else console.log('No valid robot window for robot: ' + robotName);
    }
  }]);

  return View;
}();

webots.window = function (name) {
  var win = webots.currentView.robotWindows[name];
  if (!win) console.log("Robot window '" + name + "' not found.");
  return win;
};
'use strict';

function toggleFullScreen() {
  // eslint-disable-line no-unused-vars
  // reference: https://stackoverflow.com/questions/3900701/onclick-go-full-screen
  if (document.fullScreenElement && document.fullScreenElement !== null || !document.mozFullScreen && !document.webkitIsFullScreen) {
    if (document.documentElement.requestFullScreen) document.documentElement.requestFullScreen();else if (document.documentElement.mozRequestFullScreen) document.documentElement.mozRequestFullScreen();else if (document.documentElement.webkitRequestFullScreen) document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  } else {
    if (document.cancelFullScreen) document.cancelFullScreen();else if (document.mozCancelFullScreen) document.mozCancelFullScreen();else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
  }
}
/* global Map */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Observable =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Observable() {
    _classCallCheck(this, Observable);

    this.observers = new Map();
  }

  _createClass(Observable, [{
    key: "addObserver",
    value: function addObserver(label, callback) {
      this.observers.has(label) || this.observers.set(label, []);
      this.observers.get(label).push(callback);
    }
  }, {
    key: "notify",
    value: function notify(label, e) {
      var observers = this.observers.get(label);

      if (observers && observers.length) {
        observers.forEach(function (callback) {
          callback(e);
        });
      }
    }
  }]);

  return Observable;
}();
/* global THREE */
'use strict';
/**
 * @author spidersharma / http://eduperiment.com/
 */

THREE.OutlinePass = function (resolution, scene, camera, selectedObjects) {
  this.renderScene = scene;
  this.renderCamera = camera;
  this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
  this.visibleEdgeColor = new THREE.Color(1, 1, 1);
  this.hiddenEdgeColor = new THREE.Color(0.1, 0.04, 0.02);
  this.edgeGlow = 0.0;
  this.usePatternTexture = false;
  this.edgeThickness = 1.0;
  this.edgeStrength = 3.0;
  this.downSampleRatio = 2;
  this.pulsePeriod = 0;
  THREE.Pass.call(this);
  this.resolution = resolution !== undefined ? new THREE.Vector2(resolution.x, resolution.y) : new THREE.Vector2(256, 256);
  var pars = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  };
  var resx = Math.round(this.resolution.x / this.downSampleRatio);
  var resy = Math.round(this.resolution.y / this.downSampleRatio);
  this.maskBufferMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });
  this.maskBufferMaterial.side = THREE.DoubleSide;
  this.renderTargetMaskBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, pars);
  this.renderTargetMaskBuffer.texture.name = 'OutlinePass.mask';
  this.renderTargetMaskBuffer.texture.generateMipmaps = false;
  this.depthMaterial = new THREE.MeshDepthMaterial();
  this.depthMaterial.side = THREE.DoubleSide;
  this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
  this.depthMaterial.blending = THREE.NoBlending;
  this.prepareMaskMaterial = this.getPrepareMaskMaterial();
  this.prepareMaskMaterial.side = THREE.DoubleSide;
  this.prepareMaskMaterial.fragmentShader = replaceDepthToViewZ(this.prepareMaskMaterial.fragmentShader, this.renderCamera);
  this.renderTargetDepthBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, pars);
  this.renderTargetDepthBuffer.texture.name = 'OutlinePass.depth';
  this.renderTargetDepthBuffer.texture.generateMipmaps = false;
  this.renderTargetMaskDownSampleBuffer = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetMaskDownSampleBuffer.texture.name = 'OutlinePass.depthDownSample';
  this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps = false;
  this.renderTargetBlurBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetBlurBuffer1.texture.name = 'OutlinePass.blur1';
  this.renderTargetBlurBuffer1.texture.generateMipmaps = false;
  this.renderTargetBlurBuffer2 = new THREE.WebGLRenderTarget(Math.round(resx / 2), Math.round(resy / 2), pars);
  this.renderTargetBlurBuffer2.texture.name = 'OutlinePass.blur2';
  this.renderTargetBlurBuffer2.texture.generateMipmaps = false;
  this.edgeDetectionMaterial = this.getEdgeDetectionMaterial();
  this.renderTargetEdgeBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetEdgeBuffer1.texture.name = 'OutlinePass.edge1';
  this.renderTargetEdgeBuffer1.texture.generateMipmaps = false;
  this.renderTargetEdgeBuffer2 = new THREE.WebGLRenderTarget(Math.round(resx / 2), Math.round(resy / 2), pars);
  this.renderTargetEdgeBuffer2.texture.name = 'OutlinePass.edge2';
  this.renderTargetEdgeBuffer2.texture.generateMipmaps = false;
  var MAX_EDGE_THICKNESS = 4;
  var MAX_EDGE_GLOW = 4;
  this.separableBlurMaterial1 = this.getSeperableBlurMaterial(MAX_EDGE_THICKNESS);
  this.separableBlurMaterial1.uniforms['texSize'].value = new THREE.Vector2(resx, resy);
  this.separableBlurMaterial1.uniforms['kernelRadius'].value = 1;
  this.separableBlurMaterial2 = this.getSeperableBlurMaterial(MAX_EDGE_GLOW);
  this.separableBlurMaterial2.uniforms['texSize'].value = new THREE.Vector2(Math.round(resx / 2), Math.round(resy / 2));
  this.separableBlurMaterial2.uniforms['kernelRadius'].value = MAX_EDGE_GLOW; // Overlay material

  this.overlayMaterial = this.getOverlayMaterial(); // copy material

  if (THREE.CopyShader === undefined) console.error('THREE.OutlinePass relies on THREE.CopyShader');
  var copyShader = THREE.CopyShader;
  this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
  this.copyUniforms['opacity'].value = 1.0;
  this.materialCopy = new THREE.ShaderMaterial({
    uniforms: this.copyUniforms,
    vertexShader: copyShader.vertexShader,
    fragmentShader: copyShader.fragmentShader,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true
  });
  this.enabled = true;
  this.needsSwap = false;
  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;
  this.fsQuad = new THREE.Pass.FullScreenQuad(null);
  this.tempPulseColor1 = new THREE.Color();
  this.tempPulseColor2 = new THREE.Color();
  this.textureMatrix = new THREE.Matrix4();

  function replaceDepthToViewZ(string, camera) {
    var type = camera.isPerspectiveCamera ? 'perspective' : 'orthographic';
    return string.replace(/DEPTH_TO_VIEW_Z/g, type + 'DepthToViewZ');
  }
};

THREE.OutlinePass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.OutlinePass,
  dispose: function dispose() {
    this.renderTargetMaskBuffer.dispose();
    this.renderTargetDepthBuffer.dispose();
    this.renderTargetMaskDownSampleBuffer.dispose();
    this.renderTargetBlurBuffer1.dispose();
    this.renderTargetBlurBuffer2.dispose();
    this.renderTargetEdgeBuffer1.dispose();
    this.renderTargetEdgeBuffer2.dispose();
  },
  setSize: function setSize(width, height) {
    this.renderTargetMaskBuffer.setSize(width, height);
    var resx = Math.round(width / this.downSampleRatio);
    var resy = Math.round(height / this.downSampleRatio);
    this.renderTargetMaskDownSampleBuffer.setSize(resx, resy);
    this.renderTargetBlurBuffer1.setSize(resx, resy);
    this.renderTargetEdgeBuffer1.setSize(resx, resy);
    this.separableBlurMaterial1.uniforms['texSize'].value = new THREE.Vector2(resx, resy);
    resx = Math.round(resx / 2);
    resy = Math.round(resy / 2);
    this.renderTargetBlurBuffer2.setSize(resx, resy);
    this.renderTargetEdgeBuffer2.setSize(resx, resy);
    this.separableBlurMaterial2.uniforms['texSize'].value = new THREE.Vector2(resx, resy);
  },
  changeVisibilityOfSelectedObjects: function changeVisibilityOfSelectedObjects(bVisible) {
    function gatherSelectedMeshesCallBack(object) {
      if (object.isMesh) {
        if (bVisible) {
          object.visible = object.userData.oldVisible;
          delete object.userData.oldVisible;
        } else {
          object.userData.oldVisible = object.visible;
          object.visible = bVisible;
        }
      }
    }

    for (var i = 0; i < this.selectedObjects.length; i++) {
      var selectedObject = this.selectedObjects[i];
      selectedObject.traverse(gatherSelectedMeshesCallBack);
    }
  },
  changeVisibilityOfNonSelectedObjects: function changeVisibilityOfNonSelectedObjects(bVisible) {
    var selectedMeshes = [];

    function gatherSelectedMeshesCallBack(object) {
      if (object.isMesh) selectedMeshes.push(object);
    }

    for (var i = 0; i < this.selectedObjects.length; i++) {
      var selectedObject = this.selectedObjects[i];
      selectedObject.traverse(gatherSelectedMeshesCallBack);
    }

    function VisibilityChangeCallBack(object) {
      if (object.isMesh || object.isLine || object.isSprite || object.isTransformControls) {
        // robot-designer note: this causes issues with the selector mechanism.
        var bFound = false;

        for (var i = 0; i < selectedMeshes.length; i++) {
          var selectedObjectId = selectedMeshes[i].id;

          if (selectedObjectId === object.id) {
            bFound = true;
            break;
          }
        }

        if (!bFound) {
          var visibility = object.visible;
          if (!bVisible || object.bVisible) object.visible = bVisible;
          object.bVisible = visibility;
        }
      }
    }

    this.renderScene.traverse(VisibilityChangeCallBack);
  },
  updateTextureMatrix: function updateTextureMatrix() {
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    this.textureMatrix.multiply(this.renderCamera.projectionMatrix);
    this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse);
  },
  render: function render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    if (this.selectedObjects.length > 0) {
      this.oldClearColor.copy(renderer.getClearColor());
      this.oldClearAlpha = renderer.getClearAlpha();
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);
      renderer.setClearColor(0xffffff, 1); // Make selected objects invisible
      // this.changeVisibilityOfSelectedObjects(false); // robot-designer note: this cause issues with the selector mechanism.

      var currentBackground = this.renderScene.background;
      this.renderScene.background = null; // 1. Draw Non Selected objects in the depth buffer

      this.renderScene.overrideMaterial = this.depthMaterial;
      renderer.setRenderTarget(this.renderTargetDepthBuffer);
      renderer.clear();
      renderer.render(this.renderScene, this.renderCamera); // Make selected objects visible
      // this.changeVisibilityOfSelectedObjects(true); // robot-designer note: this cause issues with the selector mechanism.
      // Update Texture Matrix for Depth compare

      this.updateTextureMatrix(); // Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects

      this.changeVisibilityOfNonSelectedObjects(false);
      this.renderScene.overrideMaterial = this.prepareMaskMaterial;
      this.prepareMaskMaterial.uniforms['cameraNearFar'].value = new THREE.Vector2(this.renderCamera.near, this.renderCamera.far);
      this.prepareMaskMaterial.uniforms['depthTexture'].value = this.renderTargetDepthBuffer.texture;
      this.prepareMaskMaterial.uniforms['textureMatrix'].value = this.textureMatrix;
      renderer.setRenderTarget(this.renderTargetMaskBuffer);
      renderer.clear();
      renderer.render(this.renderScene, this.renderCamera);
      this.renderScene.overrideMaterial = null;
      this.changeVisibilityOfNonSelectedObjects(true);
      this.renderScene.background = currentBackground; // 2. Downsample to Half resolution

      this.fsQuad.material = this.materialCopy;
      this.copyUniforms['tDiffuse'].value = this.renderTargetMaskBuffer.texture;
      renderer.setRenderTarget(this.renderTargetMaskDownSampleBuffer);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.tempPulseColor1.copy(this.visibleEdgeColor);
      this.tempPulseColor2.copy(this.hiddenEdgeColor);

      if (this.pulsePeriod > 0) {
        var scalar = (1 + 0.25) / 2 + Math.cos(performance.now() * 0.01 / this.pulsePeriod) * (1.0 - 0.25) / 2;
        this.tempPulseColor1.multiplyScalar(scalar);
        this.tempPulseColor2.multiplyScalar(scalar);
      } // 3. Apply Edge Detection Pass


      this.fsQuad.material = this.edgeDetectionMaterial;
      this.edgeDetectionMaterial.uniforms['maskTexture'].value = this.renderTargetMaskDownSampleBuffer.texture;
      this.edgeDetectionMaterial.uniforms['texSize'].value = new THREE.Vector2(this.renderTargetMaskDownSampleBuffer.width, this.renderTargetMaskDownSampleBuffer.height);
      this.edgeDetectionMaterial.uniforms['visibleEdgeColor'].value = this.tempPulseColor1;
      this.edgeDetectionMaterial.uniforms['hiddenEdgeColor'].value = this.tempPulseColor2;
      renderer.setRenderTarget(this.renderTargetEdgeBuffer1);
      renderer.clear();
      this.fsQuad.render(renderer); // 4. Apply Blur on Half res

      this.fsQuad.material = this.separableBlurMaterial1;
      this.separableBlurMaterial1.uniforms['colorTexture'].value = this.renderTargetEdgeBuffer1.texture;
      this.separableBlurMaterial1.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionX;
      this.separableBlurMaterial1.uniforms['kernelRadius'].value = this.edgeThickness;
      renderer.setRenderTarget(this.renderTargetBlurBuffer1);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.separableBlurMaterial1.uniforms['colorTexture'].value = this.renderTargetBlurBuffer1.texture;
      this.separableBlurMaterial1.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetEdgeBuffer1);
      renderer.clear();
      this.fsQuad.render(renderer); // Apply Blur on quarter res

      this.fsQuad.material = this.separableBlurMaterial2;
      this.separableBlurMaterial2.uniforms['colorTexture'].value = this.renderTargetEdgeBuffer1.texture;
      this.separableBlurMaterial2.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetBlurBuffer2);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.separableBlurMaterial2.uniforms['colorTexture'].value = this.renderTargetBlurBuffer2.texture;
      this.separableBlurMaterial2.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetEdgeBuffer2);
      renderer.clear();
      this.fsQuad.render(renderer); // Blend it additively over the input texture

      this.fsQuad.material = this.overlayMaterial;
      this.overlayMaterial.uniforms['maskTexture'].value = this.renderTargetMaskBuffer.texture;
      this.overlayMaterial.uniforms['edgeTexture1'].value = this.renderTargetEdgeBuffer1.texture;
      this.overlayMaterial.uniforms['edgeTexture2'].value = this.renderTargetEdgeBuffer2.texture;
      this.overlayMaterial.uniforms['patternTexture'].value = this.patternTexture;
      this.overlayMaterial.uniforms['edgeStrength'].value = this.edgeStrength;
      this.overlayMaterial.uniforms['edgeGlow'].value = this.edgeGlow;
      this.overlayMaterial.uniforms['usePatternTexture'].value = this.usePatternTexture;
      if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);
      renderer.setRenderTarget(readBuffer);
      this.fsQuad.render(renderer);
      renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
      renderer.autoClear = oldAutoClear;
    }

    if (this.renderToScreen) {
      this.fsQuad.material = this.materialCopy;
      this.copyUniforms['tDiffuse'].value = readBuffer.texture;
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    }
  },
  getPrepareMaskMaterial: function getPrepareMaskMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        'depthTexture': {
          value: null
        },
        'cameraNearFar': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'textureMatrix': {
          value: new THREE.Matrix4()
        }
      },
      vertexShader: ['varying vec4 projTexCoord;', 'varying vec4 vPosition;', 'uniform mat4 textureMatrix;', 'void main() {', '  vPosition = modelViewMatrix * vec4(position, 1.0);', '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);', '  projTexCoord = textureMatrix * worldPosition;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['#include <packing>', 'varying vec4 vPosition;', 'varying vec4 projTexCoord;', 'uniform sampler2D depthTexture;', 'uniform vec2 cameraNearFar;', 'void main() {', '  float depth = unpackRGBAToDepth(texture2DProj(depthTexture, projTexCoord));', '  float viewZ = - DEPTH_TO_VIEW_Z(depth, cameraNearFar.x, cameraNearFar.y);', '  float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;', '  gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);', '}'].join('\n')
    });
  },
  getEdgeDetectionMaterial: function getEdgeDetectionMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        'maskTexture': {
          value: null
        },
        'texSize': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'visibleEdgeColor': {
          value: new THREE.Vector3(1.0, 1.0, 1.0)
        },
        'hiddenEdgeColor': {
          value: new THREE.Vector3(1.0, 1.0, 1.0)
        }
      },
      vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['varying vec2 vUv;', 'uniform sampler2D maskTexture;', 'uniform vec2 texSize;', 'uniform vec3 visibleEdgeColor;', 'uniform vec3 hiddenEdgeColor;', 'void main() {', '  vec2 invSize = 1.0 / texSize;', '  vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);', '  vec4 c1 = texture2D(maskTexture, vUv + uvOffset.xy);', '  vec4 c2 = texture2D(maskTexture, vUv - uvOffset.xy);', '  vec4 c3 = texture2D(maskTexture, vUv + uvOffset.yw);', '  vec4 c4 = texture2D(maskTexture, vUv - uvOffset.yw);', '  float diff1 = (c1.r - c2.r)*0.5;', '  float diff2 = (c3.r - c4.r)*0.5;', '  float d = length(vec2(diff1, diff2));', '  float a1 = min(c1.g, c2.g);', '  float a2 = min(c3.g, c4.g);', '  float visibilityFactor = min(a1, a2);', '  vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;', '  gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);', '}'].join('\n')
    });
  },
  getSeperableBlurMaterial: function getSeperableBlurMaterial(maxRadius) {
    return new THREE.ShaderMaterial({
      defines: {
        'MAX_RADIUS': maxRadius
      },
      uniforms: {
        'colorTexture': {
          value: null
        },
        'texSize': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'direction': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'kernelRadius': {
          value: 1.0
        }
      },
      vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['#include <common>', 'varying vec2 vUv;', 'uniform sampler2D colorTexture;', 'uniform vec2 direction;', 'uniform vec2 texSize;', 'uniform float kernelRadius;', 'float gaussianPdf(in float x, in float sigma) {', '  return 0.39894 * exp(-0.5 * x * x/(sigma * sigma))/sigma;', '}', 'void main() {', '  vec2 invSize = 1.0 / texSize;', '  float weightSum = gaussianPdf(0.0, kernelRadius);', '  vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * weightSum;', '  vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);', '  vec2 uvOffset = delta;', '  for(int i = 1; i <= MAX_RADIUS; i ++) {', '    float w = gaussianPdf(uvOffset.x, kernelRadius);', '    vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;', '    vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;', '    diffuseSum += ((sample1 + sample2) * w);', '    weightSum += (2.0 * w);', '    uvOffset += delta;', '  }', '  gl_FragColor = vec4(diffuseSum/weightSum, 1.0);', '}'].join('\n')
    });
  },
  getOverlayMaterial: function getOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        'maskTexture': {
          value: null
        },
        'edgeTexture1': {
          value: null
        },
        'edgeTexture2': {
          value: null
        },
        'patternTexture': {
          value: null
        },
        'edgeStrength': {
          value: 1.0
        },
        'edgeGlow': {
          value: 1.0
        },
        'usePatternTexture': {
          value: 0.0
        }
      },
      vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['varying vec2 vUv;', 'uniform sampler2D maskTexture;', 'uniform sampler2D edgeTexture1;', 'uniform sampler2D edgeTexture2;', 'uniform sampler2D patternTexture;', 'uniform float edgeStrength;', 'uniform float edgeGlow;', 'uniform bool usePatternTexture;', 'void main() {', '  vec4 edgeValue1 = texture2D(edgeTexture1, vUv);', '  vec4 edgeValue2 = texture2D(edgeTexture2, vUv);', '  vec4 maskColor = texture2D(maskTexture, vUv);', '  vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);', '  float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;', '  vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;', '  vec4 finalColor = edgeStrength * maskColor.r * edgeValue;', '  if(usePatternTexture)', '    finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);', '  gl_FragColor = finalColor;', '}'].join('\n'),
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });
  }
});
THREE.OutlinePass.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
THREE.OutlinePass.BlurDirectionY = new THREE.Vector2(0.0, 1.0);
/* global THREE */
'use strict';
/**
 * @author arodic / https://github.com/arodic
 * robot-designer: modified to correctly handle the events and adjust the gizmo colors
 */

THREE.TransformControls = function (camera, domElement) {
  THREE.Object3D.call(this);
  domElement = domElement !== undefined ? domElement : document;
  this.visible = false;

  var _gizmo = new THREE.TransformControlsGizmo();

  this.add(_gizmo);

  var _plane = new THREE.TransformControlsPlane();

  this.add(_plane);
  var scope = this; // Define properties with getters/setter
  // Setting the defined property will automatically trigger change event
  // Defined properties are passed down to gizmo and plane

  defineProperty('camera', camera);
  defineProperty('object', undefined);
  defineProperty('enabled', true);
  defineProperty('axis', null);
  defineProperty('mode', 'translate');
  defineProperty('translationSnap', null);
  defineProperty('rotationSnap', null);
  defineProperty('space', 'world');
  defineProperty('size', 1);
  defineProperty('dragging', false);
  defineProperty('showX', true);
  defineProperty('showY', true);
  defineProperty('showZ', true);
  var changeEvent = {
    type: 'change'
  };
  var mouseDownEvent = {
    type: 'mouseDown'
  };
  var mouseUpEvent = {
    type: 'mouseUp',
    mode: scope.mode
  };
  var objectChangeEvent = {
    type: 'objectChange'
  }; // Reusable utility variables

  var ray = new THREE.Raycaster();

  var _tempVector = new THREE.Vector3();

  var _tempVector2 = new THREE.Vector3();

  var _tempQuaternion = new THREE.Quaternion();

  var _unit = {
    X: new THREE.Vector3(1, 0, 0),
    Y: new THREE.Vector3(0, 1, 0),
    Z: new THREE.Vector3(0, 0, 1)
  };
  var pointStart = new THREE.Vector3();
  var pointEnd = new THREE.Vector3();
  var offset = new THREE.Vector3();
  var rotationAxis = new THREE.Vector3();
  var startNorm = new THREE.Vector3();
  var endNorm = new THREE.Vector3();
  var rotationAngle = 0;
  var cameraPosition = new THREE.Vector3();
  var cameraQuaternion = new THREE.Quaternion();
  var cameraScale = new THREE.Vector3();
  var parentPosition = new THREE.Vector3();
  var parentQuaternion = new THREE.Quaternion();
  var parentQuaternionInv = new THREE.Quaternion();
  var parentScale = new THREE.Vector3();
  var worldPositionStart = new THREE.Vector3();
  var worldQuaternionStart = new THREE.Quaternion();
  var worldScaleStart = new THREE.Vector3();
  var worldPosition = new THREE.Vector3();
  var worldQuaternion = new THREE.Quaternion();
  var worldQuaternionInv = new THREE.Quaternion();
  var worldScale = new THREE.Vector3();
  var eye = new THREE.Vector3();
  var positionStart = new THREE.Vector3();
  var quaternionStart = new THREE.Quaternion();
  var scaleStart = new THREE.Vector3(); // TODO: remove properties unused in plane and gizmo

  defineProperty('worldPosition', worldPosition);
  defineProperty('worldPositionStart', worldPositionStart);
  defineProperty('worldQuaternion', worldQuaternion);
  defineProperty('worldQuaternionStart', worldQuaternionStart);
  defineProperty('cameraPosition', cameraPosition);
  defineProperty('cameraQuaternion', cameraQuaternion);
  defineProperty('pointStart', pointStart);
  defineProperty('pointEnd', pointEnd);
  defineProperty('rotationAxis', rotationAxis);
  defineProperty('rotationAngle', rotationAngle);
  defineProperty('eye', eye);
  domElement.addEventListener('mousedown', onPointerDown, false);
  domElement.addEventListener('touchstart', onPointerDown, false);
  domElement.addEventListener('mousemove', onPointerHover, false);
  domElement.addEventListener('touchmove', onPointerHover, false);
  domElement.addEventListener('touchmove', onPointerMove, false);
  document.addEventListener('mouseup', onPointerUp, false);
  domElement.addEventListener('touchend', onPointerUp, false);
  domElement.addEventListener('touchcancel', onPointerUp, false);
  domElement.addEventListener('touchleave', onPointerUp, false);

  this.dispose = function () {
    domElement.removeEventListener('mousedown', onPointerDown);
    domElement.removeEventListener('touchstart', onPointerDown);
    domElement.removeEventListener('mousemove', onPointerHover);
    domElement.removeEventListener('touchmove', onPointerHover);
    domElement.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    domElement.removeEventListener('touchend', onPointerUp);
    domElement.removeEventListener('touchcancel', onPointerUp);
    domElement.removeEventListener('touchleave', onPointerUp);
    this.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }; // Set current object


  this.attach = function (object) {
    this.object = object;
    this.visible = true;
  }; // Detatch from object


  this.detach = function () {
    this.object = undefined;
    this.visible = false;
    this.axis = null;
  }; // Defined getter, setter and store for a property


  function defineProperty(propName, defaultValue) {
    var propValue = defaultValue;
    Object.defineProperty(scope, propName, {
      get: function get() {
        return propValue !== undefined ? propValue : defaultValue;
      },
      set: function set(value) {
        if (propValue !== value) {
          propValue = value;
          _plane[propName] = value;
          _gizmo[propName] = value;
          scope.dispatchEvent({
            type: propName + '-changed',
            value: value
          });
          scope.dispatchEvent(changeEvent);
        }
      }
    });
    scope[propName] = defaultValue;
    _plane[propName] = defaultValue;
    _gizmo[propName] = defaultValue;
  } // updateMatrixWorld  updates key transformation variables


  this.updateMatrixWorld = function () {
    if (this.object !== undefined) {
      this.object.updateMatrixWorld();
      this.object.parent.matrixWorld.decompose(parentPosition, parentQuaternion, parentScale);
      this.object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      parentQuaternionInv.copy(parentQuaternion).inverse();
      worldQuaternionInv.copy(worldQuaternion).inverse();
    }

    this.camera.updateMatrixWorld();
    this.camera.matrixWorld.decompose(cameraPosition, cameraQuaternion, cameraScale);
    if (this.camera instanceof THREE.PerspectiveCamera) eye.copy(cameraPosition).sub(worldPosition).normalize();else if (this.camera instanceof THREE.OrthographicCamera) eye.copy(cameraPosition).normalize();
    THREE.Object3D.prototype.updateMatrixWorld.call(this);
  };

  this.pointerHover = function (pointer) {
    if (this.object === undefined || this.dragging === true || pointer.button !== undefined && pointer.button !== 0) return;
    ray.setFromCamera(pointer, this.camera);
    var intersect = ray.intersectObjects(_gizmo.picker[this.mode].children, true)[0] || false;
    if (intersect) this.axis = intersect.object.name;else this.axis = null;
  };

  this.pointerDown = function (pointer) {
    if (this.object === undefined || this.dragging === true || pointer.button !== undefined && pointer.button !== 0) return;

    if ((pointer.button === 0 || pointer.button === undefined) && this.axis !== null) {
      ray.setFromCamera(pointer, this.camera);
      var planeIntersect = ray.intersectObjects([_plane], true)[0] || false;

      if (planeIntersect) {
        var space = this.space;
        if (this.mode === 'scale') space = 'local';else if (this.axis === 'E' || this.axis === 'XYZE' || this.axis === 'XYZ') space = 'world';

        if (space === 'local' && this.mode === 'rotate') {
          var snap = this.rotationSnap;
          if (this.axis === 'X' && snap) this.object.rotation.x = Math.round(this.object.rotation.x / snap) * snap;
          if (this.axis === 'Y' && snap) this.object.rotation.y = Math.round(this.object.rotation.y / snap) * snap;
          if (this.axis === 'Z' && snap) this.object.rotation.z = Math.round(this.object.rotation.z / snap) * snap;
        }

        this.object.updateMatrixWorld();
        this.object.parent.updateMatrixWorld();
        positionStart.copy(this.object.position);
        quaternionStart.copy(this.object.quaternion);
        scaleStart.copy(this.object.scale);
        this.object.matrixWorld.decompose(worldPositionStart, worldQuaternionStart, worldScaleStart);
        pointStart.copy(planeIntersect.point).sub(worldPositionStart);
      }

      this.dragging = true;
      mouseDownEvent.mode = this.mode;
      this.dispatchEvent(mouseDownEvent);
    }
  };

  this.pointerMove = function (pointer) {
    var axis = this.axis;
    var mode = this.mode;
    var object = this.object;
    var space = this.space;
    if (mode === 'scale') space = 'local';else if (axis === 'E' || axis === 'XYZE' || axis === 'XYZ') space = 'world';
    if (object === undefined || axis === null || this.dragging === false || pointer.button !== undefined && pointer.button !== 0) return;
    ray.setFromCamera(pointer, this.camera);
    var planeIntersect = ray.intersectObjects([_plane], true)[0] || false;
    if (planeIntersect === false) return;
    pointEnd.copy(planeIntersect.point).sub(worldPositionStart);

    if (mode === 'translate') {
      // Apply translate
      offset.copy(pointEnd).sub(pointStart);
      if (space === 'local' && axis !== 'XYZ') offset.applyQuaternion(worldQuaternionInv);
      if (axis.indexOf('X') === -1) offset.x = 0;
      if (axis.indexOf('Y') === -1) offset.y = 0;
      if (axis.indexOf('Z') === -1) offset.z = 0;
      if (space === 'local' && axis !== 'XYZ') offset.applyQuaternion(quaternionStart).divide(parentScale);else offset.applyQuaternion(parentQuaternionInv).divide(parentScale);
      object.position.copy(offset).add(positionStart); // Apply translation snap

      if (this.translationSnap) {
        if (space === 'local') {
          object.position.applyQuaternion(_tempQuaternion.copy(quaternionStart).inverse());
          if (axis.search('X') !== -1) object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
          if (axis.search('Y') !== -1) object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
          if (axis.search('Z') !== -1) object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
          object.position.applyQuaternion(quaternionStart);
        }

        if (space === 'world') {
          if (object.parent) object.position.add(_tempVector.setFromMatrixPosition(object.parent.matrixWorld));
          if (axis.search('X') !== -1) object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
          if (axis.search('Y') !== -1) object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
          if (axis.search('Z') !== -1) object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
          if (object.parent) object.position.sub(_tempVector.setFromMatrixPosition(object.parent.matrixWorld));
        }
      }
    } else if (mode === 'scale') {
      if (axis.search('XYZ') !== -1) {
        var d = pointEnd.length() / pointStart.length();
        if (pointEnd.dot(pointStart) < 0) d *= -1;

        _tempVector2.set(d, d, d);
      } else {
        _tempVector.copy(pointStart);

        _tempVector2.copy(pointEnd);

        _tempVector.applyQuaternion(worldQuaternionInv);

        _tempVector2.applyQuaternion(worldQuaternionInv);

        _tempVector2.divide(_tempVector);

        if (axis.search('X') === -1) _tempVector2.x = 1;
        if (axis.search('Y') === -1) _tempVector2.y = 1;
        if (axis.search('Z') === -1) _tempVector2.z = 1;
      } // Apply scale


      object.scale.copy(scaleStart).multiply(_tempVector2);
    } else if (mode === 'rotate') {
      offset.copy(pointEnd).sub(pointStart);
      var ROTATION_SPEED = 20 / worldPosition.distanceTo(_tempVector.setFromMatrixPosition(this.camera.matrixWorld));

      if (axis === 'E') {
        rotationAxis.copy(eye);
        rotationAngle = pointEnd.angleTo(pointStart);
        startNorm.copy(pointStart).normalize();
        endNorm.copy(pointEnd).normalize();
        rotationAngle *= endNorm.cross(startNorm).dot(eye) < 0 ? 1 : -1;
      } else if (axis === 'XYZE') {
        rotationAxis.copy(offset).cross(eye).normalize();
        rotationAngle = offset.dot(_tempVector.copy(rotationAxis).cross(this.eye)) * ROTATION_SPEED;
      } else if (axis === 'X' || axis === 'Y' || axis === 'Z') {
        rotationAxis.copy(_unit[axis]);

        _tempVector.copy(_unit[axis]);

        if (space === 'local') _tempVector.applyQuaternion(worldQuaternion);
        rotationAngle = offset.dot(_tempVector.cross(eye).normalize()) * ROTATION_SPEED;
      } // Apply rotation snap


      if (this.rotationSnap) rotationAngle = Math.round(rotationAngle / this.rotationSnap) * this.rotationSnap;
      this.rotationAngle = rotationAngle; // Apply rotate

      if (space === 'local' && axis !== 'E' && axis !== 'XYZE') {
        object.quaternion.copy(quaternionStart);
        object.quaternion.multiply(_tempQuaternion.setFromAxisAngle(rotationAxis, rotationAngle)).normalize();
      } else {
        rotationAxis.applyQuaternion(parentQuaternionInv);
        object.quaternion.copy(_tempQuaternion.setFromAxisAngle(rotationAxis, rotationAngle));
        object.quaternion.multiply(quaternionStart).normalize();
      }
    }

    this.dispatchEvent(changeEvent);
    this.dispatchEvent(objectChangeEvent);
  };

  this.pointerUp = function (pointer) {
    if (pointer.button !== undefined && pointer.button !== 0) return;

    if (this.dragging && this.axis !== null) {
      mouseUpEvent.mode = this.mode;
      this.dispatchEvent(mouseUpEvent);
    }

    this.dragging = false;
    if (pointer.button === undefined) this.axis = null;
  }; // normalize mouse / touch pointer and remap {x,y} to view space.


  function getPointer(event) {
    var pointer = event.changedTouches ? event.changedTouches[0] : event;
    var rect = domElement.getBoundingClientRect();
    return {
      x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
      y: -(pointer.clientY - rect.top) / rect.height * 2 + 1,
      button: event.button
    };
  } // mouse / touch event handlers


  function onPointerHover(event) {
    if (!scope.enabled) return;
    scope.pointerHover(getPointer(event));
  }

  function onPointerDown(event) {
    if (!scope.enabled) return;
    document.addEventListener('mousemove', onPointerMove, false);
    scope.pointerHover(getPointer(event));
    scope.pointerDown(getPointer(event));
  }

  function onPointerMove(event) {
    if (!scope.enabled) return;
    scope.pointerMove(getPointer(event));
  }

  function onPointerUp(event) {
    if (!scope.enabled) return;
    document.removeEventListener('mousemove', onPointerMove, false);
    scope.pointerUp(getPointer(event));
  } // TODO: depricate


  this.getMode = function () {
    return scope.mode;
  };

  this.setMode = function (mode) {
    scope.mode = mode;
  };

  this.setTranslationSnap = function (translationSnap) {
    scope.translationSnap = translationSnap;
  };

  this.setRotationSnap = function (rotationSnap) {
    scope.rotationSnap = rotationSnap;
  };

  this.setSize = function (size) {
    scope.size = size;
  };

  this.setSpace = function (space) {
    scope.space = space;
  };

  this.update = function () {
    console.warn('THREE.TransformControls: update function has been depricated.');
  };
};

THREE.TransformControls.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
  constructor: THREE.TransformControls,
  isTransformControls: true
});

THREE.TransformControlsGizmo = function () {
  'use strict';

  THREE.Object3D.call(this);
  this.type = 'TransformControlsGizmo'; // shared materials

  var gizmoMaterial = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false
  });
  var gizmoLineMaterial = new THREE.LineBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    linewidth: 1,
    fog: false
  }); // Make unique material for each axis/color

  var matInvisible = gizmoMaterial.clone();
  matInvisible.opacity = 0.15;
  var matHelper = gizmoMaterial.clone();
  matHelper.opacity = 0.33;
  var matRed = gizmoMaterial.clone();
  matRed.color.set(0xff0000);
  var matGreen = gizmoMaterial.clone();
  matGreen.color.set(0x00ff00);
  var matBlue = gizmoMaterial.clone();
  matBlue.color.set(0x0000ff);
  var matWhiteTransperent = gizmoMaterial.clone();
  matWhiteTransperent.opacity = 0.25;
  var matYellowTransparent = matWhiteTransperent.clone();
  matYellowTransparent.color.set(0xffff00);
  var matCyanTransparent = matWhiteTransperent.clone();
  matCyanTransparent.color.set(0x00ffff);
  var matMagentaTransparent = matWhiteTransperent.clone();
  matMagentaTransparent.color.set(0xff00ff);
  var matYellow = gizmoMaterial.clone();
  matYellow.color.set(0xffff00);
  var matLineRed = gizmoLineMaterial.clone();
  matLineRed.color.set(0xff0000);
  var matLineGreen = gizmoLineMaterial.clone();
  matLineGreen.color.set(0x00ff00);
  var matLineBlue = gizmoLineMaterial.clone();
  matLineBlue.color.set(0x0000ff);
  var matLineCyan = gizmoLineMaterial.clone();
  matLineCyan.color.set(0x00ffff);
  var matLineMagenta = gizmoLineMaterial.clone();
  matLineMagenta.color.set(0xff00ff);
  var matLineYellow = gizmoLineMaterial.clone();
  matLineYellow.color.set(0xffff00);
  var matLineGray = gizmoLineMaterial.clone();
  matLineGray.color.set(0x787878);
  var matLineYellowTransparent = matLineYellow.clone();
  matLineYellowTransparent.opacity = 0.25; // reusable geometry

  var arrowGeometry = new THREE.CylinderBufferGeometry(0, 0.05, 0.2, 12, 1, false);
  var scaleHandleGeometry = new THREE.BoxBufferGeometry(0.125, 0.125, 0.125);
  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.addAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));

  var CircleGeometry = function CircleGeometry(radius, arc) {
    var geometry = new THREE.BufferGeometry();
    var vertices = [];

    for (var i = 0; i <= 64 * arc; ++i) {
      vertices.push(0, Math.cos(i / 32 * Math.PI) * radius, Math.sin(i / 32 * Math.PI) * radius);
    }

    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }; // Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position


  var TranslateHelperGeometry = function TranslateHelperGeometry(radius, arc) {
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));
    return geometry;
  }; // Gizmo definitions - custom hierarchy definitions for setupGizmo() function


  var gizmoTranslate = {
    X: [[new THREE.Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, -Math.PI / 2], null, 'fwd'], [new THREE.Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, Math.PI / 2], null, 'bwd'], [new THREE.Line(lineGeometry, matLineRed)]],
    Y: [[new THREE.Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, 'fwd'], [new THREE.Mesh(arrowGeometry, matGreen), [0, 1, 0], [Math.PI, 0, 0], null, 'bwd'], [new THREE.Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]]],
    Z: [[new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 1], [Math.PI / 2, 0, 0], null, 'fwd'], [new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 1], [-Math.PI / 2, 0, 0], null, 'bwd'], [new THREE.Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0]]],
    XYZ: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.1, 0), matWhiteTransperent), [0, 0, 0], [0, 0, 0]]],
    XY: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.295, 0.295), matYellowTransparent), [0.15, 0.15, 0]], [new THREE.Line(lineGeometry, matLineYellow), [0.18, 0.3, 0], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineYellow), [0.3, 0.18, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]],
    YZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.295, 0.295), matCyanTransparent), [0, 0.15, 0.15], [0, Math.PI / 2, 0]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.18, 0.3], [0, 0, Math.PI / 2], [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.3, 0.18], [0, -Math.PI / 2, 0], [0.125, 1, 1]]],
    XZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.295, 0.295), matMagentaTransparent), [0.15, 0, 0.15], [-Math.PI / 2, 0, 0]], [new THREE.Line(lineGeometry, matLineMagenta), [0.18, 0, 0.3], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineMagenta), [0.3, 0, 0.18], [0, -Math.PI / 2, 0], [0.125, 1, 1]]]
  };
  var pickerTranslate = {
    X: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0.6, 0, 0], [0, 0, -Math.PI / 2]]],
    Y: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0.6, 0]]],
    Z: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0, 0.6], [Math.PI / 2, 0, 0]]],
    XYZ: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.2, 0), matInvisible)]],
    XY: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0.2, 0]]],
    YZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), matInvisible), [0, 0.2, 0.2], [0, Math.PI / 2, 0]]],
    XZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0, 0.2], [-Math.PI / 2, 0, 0]]]
  };
  var helperTranslate = {
    START: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']],
    END: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']],
    DELTA: [[new THREE.Line(TranslateHelperGeometry(), matHelper), null, null, null, 'helper']],
    X: [[new THREE.Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']],
    Y: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, -1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']],
    Z: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, 0, -1e3], [0, -Math.PI / 2, 0], [1e6, 1, 1], 'helper']]
  };
  var gizmoRotate = {
    X: [[new THREE.Line(CircleGeometry(1, 0.5), matLineRed)], [new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.04, 0), matRed), [0, 0, 0.99], null, [1, 3, 1]]],
    Y: [[new THREE.Line(CircleGeometry(1, 0.5), matLineGreen), null, [0, 0, -Math.PI / 2]], [new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.04, 0), matGreen), [0, 0, 0.99], null, [3, 1, 1]]],
    Z: [[new THREE.Line(CircleGeometry(1, 0.5), matLineBlue), null, [0, Math.PI / 2, 0]], [new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.04, 0), matBlue), [0.99, 0, 0], null, [1, 3, 1]]],
    E: [[new THREE.Line(CircleGeometry(1.25, 1), matLineYellowTransparent), null, [0, Math.PI / 2, 0]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [1.17, 0, 0], [0, 0, -Math.PI / 2], [1, 1, 0.001]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [-1.17, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.001]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [0, -1.17, 0], [Math.PI, 0, 0], [1, 1, 0.001]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [0, 1.17, 0], [0, 0, 0], [1, 1, 0.001]]],
    XYZE: [[new THREE.Line(CircleGeometry(1, 1), matLineGray), null, [0, Math.PI / 2, 0]]]
  };
  var helperRotate = {
    AXIS: [[new THREE.Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']]
  };
  var pickerRotate = {
    X: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1, 0.1, 4, 24), matInvisible), [0, 0, 0], [0, -Math.PI / 2, -Math.PI / 2]]],
    Y: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1, 0.1, 4, 24), matInvisible), [0, 0, 0], [Math.PI / 2, 0, 0]]],
    Z: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1, 0.1, 4, 24), matInvisible), [0, 0, 0], [0, 0, -Math.PI / 2]]],
    E: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1.25, 0.1, 2, 24), matInvisible)]],
    XYZE: [[new THREE.Mesh(new THREE.SphereBufferGeometry(0.7, 10, 8), matInvisible)]]
  };
  var gizmoScale = {
    X: [[new THREE.Mesh(scaleHandleGeometry, matRed), [0.8, 0, 0], [0, 0, -Math.PI / 2]], [new THREE.Line(lineGeometry, matLineRed), null, null, [0.8, 1, 1]]],
    Y: [[new THREE.Mesh(scaleHandleGeometry, matGreen), [0, 0.8, 0]], [new THREE.Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2], [0.8, 1, 1]]],
    Z: [[new THREE.Mesh(scaleHandleGeometry, matBlue), [0, 0, 0.8], [Math.PI / 2, 0, 0]], [new THREE.Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0], [0.8, 1, 1]]],
    XY: [[new THREE.Mesh(scaleHandleGeometry, matYellowTransparent), [0.85, 0.85, 0], null, [2, 2, 0.2]], [new THREE.Line(lineGeometry, matLineYellow), [0.855, 0.98, 0], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineYellow), [0.98, 0.855, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]],
    YZ: [[new THREE.Mesh(scaleHandleGeometry, matCyanTransparent), [0, 0.85, 0.85], null, [0.2, 2, 2]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.855, 0.98], [0, 0, Math.PI / 2], [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.98, 0.855], [0, -Math.PI / 2, 0], [0.125, 1, 1]]],
    XZ: [[new THREE.Mesh(scaleHandleGeometry, matMagentaTransparent), [0.85, 0, 0.85], null, [2, 0.2, 2]], [new THREE.Line(lineGeometry, matLineMagenta), [0.855, 0, 0.98], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineMagenta), [0.98, 0, 0.855], [0, -Math.PI / 2, 0], [0.125, 1, 1]]],
    XYZX: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.125, 0.125, 0.125), matWhiteTransperent), [1.1, 0, 0]]],
    XYZY: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.125, 0.125, 0.125), matWhiteTransperent), [0, 1.1, 0]]],
    XYZZ: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.125, 0.125, 0.125), matWhiteTransperent), [0, 0, 1.1]]]
  };
  var pickerScale = {
    X: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible), [0.5, 0, 0], [0, 0, -Math.PI / 2]]],
    Y: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible), [0, 0.5, 0]]],
    Z: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible), [0, 0, 0.5], [Math.PI / 2, 0, 0]]],
    XY: [[new THREE.Mesh(scaleHandleGeometry, matInvisible), [0.85, 0.85, 0], null, [3, 3, 0.2]]],
    YZ: [[new THREE.Mesh(scaleHandleGeometry, matInvisible), [0, 0.85, 0.85], null, [0.2, 3, 3]]],
    XZ: [[new THREE.Mesh(scaleHandleGeometry, matInvisible), [0.85, 0, 0.85], null, [3, 0.2, 3]]],
    XYZX: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [1.1, 0, 0]]],
    XYZY: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 1.1, 0]]],
    XYZZ: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, 1.1]]]
  };
  var helperScale = {
    X: [[new THREE.Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']],
    Y: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, -1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']],
    Z: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, 0, -1e3], [0, -Math.PI / 2, 0], [1e6, 1, 1], 'helper']]
  }; // Creates an Object3D with gizmos described in custom hierarchy definition.

  var setupGizmo = function setupGizmo(gizmoMap) {
    var gizmo = new THREE.Object3D();

    for (var name in gizmoMap) {
      for (var i = gizmoMap[name].length; i--;) {
        var object = gizmoMap[name][i][0].clone();
        var position = gizmoMap[name][i][1];
        var rotation = gizmoMap[name][i][2];
        var scale = gizmoMap[name][i][3];
        var tag = gizmoMap[name][i][4]; // name and tag properties are essential for picking and updating logic.

        object.name = name;
        object.tag = tag;
        if (position) object.position.set(position[0], position[1], position[2]);
        if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
        if (scale) object.scale.set(scale[0], scale[1], scale[2]);
        object.updateMatrix();
        var tempGeometry = object.geometry.clone();
        tempGeometry.applyMatrix(object.matrix);
        object.geometry = tempGeometry;
        object.renderOrder = Infinity;
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);
        gizmo.add(object);
      }
    }

    return gizmo;
  }; // Reusable utility variables


  var tempVector = new THREE.Vector3(0, 0, 0);
  var tempEuler = new THREE.Euler();
  var alignVector = new THREE.Vector3(0, 1, 0);
  var zeroVector = new THREE.Vector3(0, 0, 0);
  var lookAtMatrix = new THREE.Matrix4();
  var tempQuaternion = new THREE.Quaternion();
  var tempQuaternion2 = new THREE.Quaternion();
  var identityQuaternion = new THREE.Quaternion();
  var unitX = new THREE.Vector3(1, 0, 0);
  var unitY = new THREE.Vector3(0, 1, 0);
  var unitZ = new THREE.Vector3(0, 0, 1); // Gizmo creation

  this.gizmo = {};
  this.picker = {};
  this.helper = {};
  this.add(this.gizmo['translate'] = setupGizmo(gizmoTranslate));
  this.add(this.gizmo['rotate'] = setupGizmo(gizmoRotate));
  this.add(this.gizmo['scale'] = setupGizmo(gizmoScale));
  this.add(this.picker['translate'] = setupGizmo(pickerTranslate));
  this.add(this.picker['rotate'] = setupGizmo(pickerRotate));
  this.add(this.picker['scale'] = setupGizmo(pickerScale));
  this.add(this.helper['translate'] = setupGizmo(helperTranslate));
  this.add(this.helper['rotate'] = setupGizmo(helperRotate));
  this.add(this.helper['scale'] = setupGizmo(helperScale)); // Pickers should be hidden always

  this.picker['translate'].visible = false;
  this.picker['rotate'].visible = false;
  this.picker['scale'].visible = false; // updateMatrixWorld will update transformations and appearance of individual handles

  this.updateMatrixWorld = function () {
    var space = this.space;
    if (this.mode === 'scale') space = 'local'; // scale always oriented to local rotation

    var quaternion = space === 'local' ? this.worldQuaternion : identityQuaternion; // Show only gizmos for current transform mode

    this.gizmo['translate'].visible = this.mode === 'translate';
    this.gizmo['rotate'].visible = this.mode === 'rotate';
    this.gizmo['scale'].visible = this.mode === 'scale';
    this.helper['translate'].visible = this.mode === 'translate';
    this.helper['rotate'].visible = this.mode === 'rotate';
    this.helper['scale'].visible = this.mode === 'scale';
    var handles = [];
    handles = handles.concat(this.picker[this.mode].children);
    handles = handles.concat(this.gizmo[this.mode].children);
    handles = handles.concat(this.helper[this.mode].children);

    for (var i = 0; i < handles.length; i++) {
      var handle = handles[i]; // hide aligned to camera

      handle.visible = true;
      handle.rotation.set(0, 0, 0);
      handle.position.copy(this.worldPosition);
      var eyeDistance = this.worldPosition.distanceTo(this.cameraPosition);
      handle.scale.set(1, 1, 1).multiplyScalar(eyeDistance * this.size / 7); // TODO: simplify helpers and consider decoupling from gizmo

      if (handle.tag === 'helper') {
        handle.visible = false;

        if (handle.name === 'AXIS') {
          handle.position.copy(this.worldPositionStart);
          handle.visible = !!this.axis;

          if (this.axis === 'X') {
            tempQuaternion.setFromEuler(tempEuler.set(0, 0, 0));
            handle.quaternion.copy(quaternion).multiply(tempQuaternion);
            if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) > 0.9) handle.visible = false;
          }

          if (this.axis === 'Y') {
            tempQuaternion.setFromEuler(tempEuler.set(0, 0, Math.PI / 2));
            handle.quaternion.copy(quaternion).multiply(tempQuaternion);
            if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) > 0.9) handle.visible = false;
          }

          if (this.axis === 'Z') {
            tempQuaternion.setFromEuler(tempEuler.set(0, Math.PI / 2, 0));
            handle.quaternion.copy(quaternion).multiply(tempQuaternion);
            if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) > 0.9) handle.visible = false;
          }

          if (this.axis === 'XYZE') {
            tempQuaternion.setFromEuler(tempEuler.set(0, Math.PI / 2, 0));
            alignVector.copy(this.rotationAxis);
            handle.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(zeroVector, alignVector, unitY));
            handle.quaternion.multiply(tempQuaternion);
            handle.visible = this.dragging;
          }

          if (this.axis === 'E') handle.visible = false;
        } else if (handle.name === 'START') {
          handle.position.copy(this.worldPositionStart);
          handle.visible = this.dragging;
        } else if (handle.name === 'END') {
          handle.position.copy(this.worldPosition);
          handle.visible = this.dragging;
        } else if (handle.name === 'DELTA') {
          handle.position.copy(this.worldPositionStart);
          handle.quaternion.copy(this.worldQuaternionStart);
          tempVector.set(1e-10, 1e-10, 1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(-1);
          tempVector.applyQuaternion(this.worldQuaternionStart.clone().inverse());
          handle.scale.copy(tempVector);
          handle.visible = this.dragging;
        } else {
          handle.quaternion.copy(quaternion);
          if (this.dragging) handle.position.copy(this.worldPositionStart);else handle.position.copy(this.worldPosition);
          if (this.axis) handle.visible = this.axis.search(handle.name) !== -1;
        } // If updating helper, skip rest of the loop


        continue;
      } // Align handles to current local or world rotation


      handle.quaternion.copy(quaternion);

      if (this.mode === 'translate' || this.mode === 'scale') {
        // Hide translate and scale axis facing the camera
        var AXIS_HIDE_TRESHOLD = 0.99;
        var PLANE_HIDE_TRESHOLD = 0.2;
        var AXIS_FLIP_TRESHOLD = 0.0;

        if (handle.name === 'X' || handle.name === 'XYZX') {
          if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'Y' || handle.name === 'XYZY') {
          if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'Z' || handle.name === 'XYZZ') {
          if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'XY') {
          if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'YZ') {
          if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'XZ') {
          if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        } // Flip translate and scale axis ocluded behind another axis


        if (handle.name.search('X') !== -1) {
          if (alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
            if (handle.tag === 'fwd') handle.visible = false;else handle.scale.x *= -1;
          } else if (handle.tag === 'bwd') handle.visible = false;
        }

        if (handle.name.search('Y') !== -1) {
          if (alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
            if (handle.tag === 'fwd') handle.visible = false;else handle.scale.y *= -1;
          } else if (handle.tag === 'bwd') handle.visible = false;
        }

        if (handle.name.search('Z') !== -1) {
          if (alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
            if (handle.tag === 'fwd') handle.visible = false;else handle.scale.z *= -1;
          } else if (handle.tag === 'bwd') handle.visible = false;
        }
      } else if (this.mode === 'rotate') {
        // Align handles to current local or world rotation
        tempQuaternion2.copy(quaternion);
        alignVector.copy(this.eye).applyQuaternion(tempQuaternion.copy(quaternion).inverse());
        if (handle.name.search('E') !== -1) handle.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(this.eye, zeroVector, unitY));

        if (handle.name === 'X') {
          tempQuaternion.setFromAxisAngle(unitX, Math.atan2(-alignVector.y, alignVector.z));
          tempQuaternion.multiplyQuaternions(tempQuaternion2, tempQuaternion);
          handle.quaternion.copy(tempQuaternion);
        }

        if (handle.name === 'Y') {
          tempQuaternion.setFromAxisAngle(unitY, Math.atan2(alignVector.x, alignVector.z));
          tempQuaternion.multiplyQuaternions(tempQuaternion2, tempQuaternion);
          handle.quaternion.copy(tempQuaternion);
        }

        if (handle.name === 'Z') {
          tempQuaternion.setFromAxisAngle(unitZ, Math.atan2(alignVector.y, alignVector.x));
          tempQuaternion.multiplyQuaternions(tempQuaternion2, tempQuaternion);
          handle.quaternion.copy(tempQuaternion);
        }
      } // Hide disabled axes


      handle.visible = handle.visible && (handle.name.indexOf('X') === -1 || this.showX);
      handle.visible = handle.visible && (handle.name.indexOf('Y') === -1 || this.showY);
      handle.visible = handle.visible && (handle.name.indexOf('Z') === -1 || this.showZ);
      handle.visible = handle.visible && (handle.name.indexOf('E') === -1 || this.showX && this.showY && this.showZ); // highlight selected axis

      handle.material._opacity = handle.material._opacity || handle.material.opacity;
      handle.material._color = handle.material._color || handle.material.color.clone();
      handle.material.color.copy(handle.material._color);
      handle.material.opacity = handle.material._opacity;

      if (!this.enabled) {
        handle.material.opacity *= 0.5;
        handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
      } else if (this.axis) {
        if (handle.name === this.axis) {
          handle.material.opacity = 1.0;
          handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
        } else if (this.axis.split('').some(function (a) {
          return handle.name === a;
        })) {
          handle.material.opacity = 1.0;
          handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
        } else {
          handle.material.opacity *= 0.25;
          handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
        }
      }
    }

    THREE.Object3D.prototype.updateMatrixWorld.call(this);
  };
};

THREE.TransformControlsGizmo.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
  constructor: THREE.TransformControlsGizmo,
  isTransformControlsGizmo: true
});

THREE.TransformControlsPlane = function () {
  'use strict';

  THREE.Mesh.call(this, new THREE.PlaneBufferGeometry(100000, 100000, 2, 2), new THREE.MeshBasicMaterial({
    visible: false,
    wireframe: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.1
  }));
  this.type = 'TransformControlsPlane';
  var unitX = new THREE.Vector3(1, 0, 0);
  var unitY = new THREE.Vector3(0, 1, 0);
  var unitZ = new THREE.Vector3(0, 0, 1);
  var tempVector = new THREE.Vector3();
  var dirVector = new THREE.Vector3();
  var alignVector = new THREE.Vector3();
  var tempMatrix = new THREE.Matrix4();
  var identityQuaternion = new THREE.Quaternion();

  this.updateMatrixWorld = function () {
    var space = this.space;
    this.position.copy(this.worldPosition);
    if (this.mode === 'scale') space = 'local'; // scale always oriented to local rotation

    unitX.set(1, 0, 0).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);
    unitY.set(0, 1, 0).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);
    unitZ.set(0, 0, 1).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion); // Align the plane for current transform mode, axis and space.

    alignVector.copy(unitY);

    switch (this.mode) {
      case 'translate':
      case 'scale':
        switch (this.axis) {
          case 'X':
            alignVector.copy(this.eye).cross(unitX);
            dirVector.copy(unitX).cross(alignVector);
            break;

          case 'Y':
            alignVector.copy(this.eye).cross(unitY);
            dirVector.copy(unitY).cross(alignVector);
            break;

          case 'Z':
            alignVector.copy(this.eye).cross(unitZ);
            dirVector.copy(unitZ).cross(alignVector);
            break;

          case 'XY':
            dirVector.copy(unitZ);
            break;

          case 'YZ':
            dirVector.copy(unitX);
            break;

          case 'XZ':
            alignVector.copy(unitZ);
            dirVector.copy(unitY);
            break;

          case 'XYZ':
          case 'E':
            dirVector.set(0, 0, 0);
            break;
        }

        break;

      case 'rotate':
      default:
        // special case for rotate
        dirVector.set(0, 0, 0);
    }

    if (dirVector.length() === 0) {
      // If in rotate mode, make the plane parallel to camera
      this.quaternion.copy(this.cameraQuaternion);
    } else {
      tempMatrix.lookAt(tempVector.set(0, 0, 0), dirVector, alignVector);
      this.quaternion.setFromRotationMatrix(tempMatrix);
    }

    THREE.Object3D.prototype.updateMatrixWorld.call(this);
  };
};

THREE.TransformControlsPlane.prototype = Object.assign(Object.create(THREE.Mesh.prototype), {
  constructor: THREE.TransformControlsPlane,
  isTransformControlsPlane: true
});
"use strict";

// Source: https://gist.github.com/dsamarin/3050311
function UndoItem(perform, data) {
  this.perform = perform;
  this.data = data;
}
/**
 * UndoStack:
 * Easy undo-redo in JavaScript.
 **/


function UndoStack(self) {
  this.stack = [];
  this.current = -1;
  this.self = self;
}
/**
 * UndoStack#push (action, data);
 * perform(true, data)  -> Function which performs redo based on previous state
 * perform(false, data) -> Function which performs undo based on current state
 * data -> Argument passed to undo/redo functions
 **/


UndoStack.prototype.push = function (perform, data) {
  this.current++; // We need to invalidate all undo items after this new one
  // or people are going to be very confused.

  this.stack.splice(this.current);
  this.stack.push(new UndoItem(perform, data));
};

UndoStack.prototype.undo = function () {
  var item;

  if (this.current >= 0) {
    item = this.stack[this.current];
    item.perform.call(this.self, false, item.data);
    this.current--;
  } else throw new Error('Already at oldest change');
};

UndoStack.prototype.redo = function () {
  var item;
  item = this.stack[this.current + 1];

  if (item) {
    item.perform.call(this.self, true, item.data);
    this.current++;
  } else throw new Error('Already at newest change');
};

UndoStack.prototype.canUndo = function () {
  return this.current >= 0;
};

UndoStack.prototype.canRedo = function () {
  return this.stack[this.current + 1] !== undefined;
};

UndoStack.prototype.invalidateAll = function () {
  this.stack = [];
  this.current = -1;
};
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Asset =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Asset(name, assetData) {
    _classCallCheck(this, Asset);

    this.name = name;
    this.root = assetData.root === true;
    this.proto = assetData.proto;
    this.icon = assetData.icon;
    this.slotType = assetData.slotType;
    this.slots = assetData.slots;
    this.parameters = assetData.parameters;
  }

  _createClass(Asset, [{
    key: "getSlotNames",
    value: function getSlotNames() {
      return Object.keys(this.slots);
    }
  }, {
    key: "getRobotName",
    value: function getRobotName() {
      return this.name.split('/')[0];
    }
  }]);

  return Asset;
}();
/* global Asset, Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var AssetLibrary =
/*#__PURE__*/
function (_Observable) {
  _inherits(AssetLibrary, _Observable);

  // eslint-disable-line no-unused-vars
  function AssetLibrary() {
    var _this;

    var pathPrefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    _classCallCheck(this, AssetLibrary);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(AssetLibrary).call(this));
    _this.pathPrefix = pathPrefix;
    _this.assets = [];
    _this.robotNames = [];
    fetch(_this.pathPrefix + 'robot-designer/assets/assets.json').then(function (response) {
      return response.text();
    }).then(function (txt) {
      return _this._loadAssets(JSON.parse(txt));
    });
    return _this;
  }

  _createClass(AssetLibrary, [{
    key: "getPath",
    value: function getPath() {
      return this.pathPrefix + 'robot-designer/assets/';
    }
  }, {
    key: "getRobotNames",
    value: function getRobotNames() {
      return this.robotNames;
    }
  }, {
    key: "getAssetByName",
    value: function getAssetByName(assetName) {
      for (var a = 0; a < this.assets.length; a++) {
        if (this.assets[a].name === assetName) return this.assets[a];
      }

      return undefined;
    }
  }, {
    key: "_loadAssets",
    value: function _loadAssets(assetsData) {
      var _this2 = this;

      Object.keys(assetsData).forEach(function (assetName) {
        var assetData = assetsData[assetName];
        var asset = new Asset(assetName, assetData);
        asset.icon = _this2.pathPrefix + asset.icon;

        _this2.assets.push(asset);

        var robotName = asset.getRobotName();
        if (!_this2.robotNames.includes(robotName)) _this2.robotNames.push(robotName);
      });
      this.notify('loaded', null);
    }
  }]);

  return AssetLibrary;
}(Observable);
/* global Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Part =
/*#__PURE__*/
function (_Observable) {
  _inherits(Part, _Observable);

  // eslint-disable-line no-unused-vars
  function Part(asset) {
    var _this;

    _classCallCheck(this, Part);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Part).call(this));
    _this.asset = asset;
    _this.name = asset.name;
    _this.translation = [0.0, 0.0, 0.0];
    _this.quaternion = [0.0, 0.0, 0.0, 1.0];
    _this.slots = {};
    asset.getSlotNames().forEach(function (name) {
      _this.slots[name] = null;
    });
    return _this;
  }

  _createClass(Part, [{
    key: "translate",
    value: function translate(translation) {
      this.translation = translation;
      this.notify('Translated', {
        'translation': translation
      });
    }
  }, {
    key: "rotate",
    value: function rotate(quaternion) {
      this.quaternion = quaternion;
      this.notify('Rotated', {
        'quaternion': quaternion
      });
    }
  }, {
    key: "addPart",
    value: function addPart(slotName, part) {
      console.assert(!this.slots[slotName]);
      part.parent = this;
      this.slots[slotName] = part;
      this.notify('PartAdded', {
        'part': part,
        'slotName': slotName
      }); // Notify the creation of the subparts if any.
      // `part` may contain subparts when redo multiple parts at the same time.
      // This notification is required to create the mediators of the sub parts,
      // and so actually create the THREEjs meshes and attach them correctly.

      for (var subSlotName in part.slots) {
        var slot = part.slots[subSlotName];

        if (slot) {
          slot._applyFooRecursively(function (child) {
            child.parent.notify('PartAdded', {
              'part': child,
              'slotName': child.parent.slotName(child)
            });
          });
        }
      }
    }
  }, {
    key: "removePart",
    value: function removePart(part) {
      for (var slotName in this.slots) {
        if (this.slots[slotName] === part) {
          this.slots[slotName] = null;
          this.notify('PartRemoved', {
            'part': part,
            'slotName': slotName
          });
        }
      }
    }
  }, {
    key: "changeColor",
    value: function changeColor(color) {
      this.color = color;
      this.notify('ColorChanged', {
        'color': color
      });
    }
  }, {
    key: "slotName",
    value: function slotName(part) {
      for (var slotName in this.slots) {
        if (this.slots[slotName] === part) return slotName;
      }

      return null;
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var o = {};
      o.modelName = this.name;
      if (this.translation[0] !== 0.0 || this.translation[1] !== 0.0 || this.translation[2] !== 0.0) o.translation = this.translation;
      if (this.quaternion[0] !== 0.0 || this.quaternion[1] !== 0.0 || this.quaternion[2] !== 0.0 || this.quaternion[3] !== 1.0) o.quaternion = this.quaternion;
      if (typeof this.color !== 'undefined') o.color = this.color;
      o.slots = {};

      for (var slotName in this.slots) {
        if (this.slots[slotName]) o.slots[slotName] = this.slots[slotName].serialize();
      }

      return o;
    }
  }, {
    key: "webotsExport",
    value: function webotsExport() {
      var indent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var i = '  '.repeat(indent); // Indentation string.

      var s = this.asset.proto;
      s += ' {\n';
      s += i + '  translation ' + translationToWebotsString(this.translation) + '\n';
      s += i + '  rotation ' + quaternionToWebotsString(this.quaternion) + '\n';
      if (typeof this.color !== 'undefined') s += i + '  color "' + this.color + '"\n';

      for (var slotName in this.slots) {
        if (this.slots[slotName]) s += i + '  ' + slotName + ' ' + this.slots[slotName].webotsExport(indent + 1);
      }

      s += i + '}\n';
      return s;
    }
  }, {
    key: "getAvailableSlotTypes",
    value: function getAvailableSlotTypes() {
      var availableSlotTypes = [];

      for (var slotName in this.slots) {
        if (this.slots[slotName] === null) availableSlotTypes.push(this.asset.slots[slotName].type);else availableSlotTypes = availableSlotTypes.concat(this.slots[slotName].getAvailableSlotTypes());
      }

      return availableSlotTypes;
    }
  }, {
    key: "_applyFooRecursively",
    value: function _applyFooRecursively(foo) {
      foo(this);

      for (var slotName in this.slots) {
        var slot = this.slots[slotName];
        if (slot) slot._applyFooRecursively(foo);
      }
    }
  }]);

  return Part;
}(Observable);

function quaternionToAxisAngle(q) {
  // refrerence: http://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
  var axis = [0.0, 1.0, 0.0];
  var angle = 2 * Math.acos(q[3]);
  var s = Math.sqrt(1.0 - q[3] * q[3]); // assuming quaternion normalised then w is less than 1, so term always positive.

  if (s < 0.001) {
    // test to avoid divide by zero, s is always positive due to sqrt
    // if s close to zero then direction of axis not important
    axis[0] = q[0]; // if it is important that axis is normalised then replace with x=1; y=z=0;

    axis[1] = q[1];
    axis[2] = q[2];
  } else {
    axis[0] = q[0] / s; // normalise axis

    axis[1] = q[1] / s;
    axis[2] = q[2] / s;
  }

  return [axis, angle];
}

;

function quaternionToWebotsString(q) {
  var axisAndAngle = quaternionToAxisAngle(q);
  return axisAndAngle[0][0] + ' ' + axisAndAngle[0][1] + ' ' + axisAndAngle[0][2] + ' ' + axisAndAngle[1];
}

function translationToWebotsString(t) {
  return t[0] + ' ' + t[1] + ' ' + t[2];
}
/* global Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Robot =
/*#__PURE__*/
function (_Observable) {
  _inherits(Robot, _Observable);

  // eslint-disable-line no-unused-vars
  function Robot() {
    var _this;

    _classCallCheck(this, Robot);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Robot).call(this));
    _this.rootPart = null;
    return _this;
  }

  _createClass(Robot, [{
    key: "hasRootPart",
    value: function hasRootPart() {
      return this.rootPart !== null;
    }
  }, {
    key: "addRootPart",
    value: function addRootPart(part) {
      part.parent = this;
      this.rootPart = part;
      this.notify('RootPartAdded', part); // Notify the creation of the subparts if any.
      // `part` may contain subparts when redo multiple parts at the same time.
      // This notification is required to create the mediators of the sub parts,
      // and so actually create the THREEjs meshes and attach them correctly.

      for (var subSlotName in part.slots) {
        var slot = part.slots[subSlotName];

        if (slot) {
          slot._applyFooRecursively(function (child) {
            child.parent.notify('PartAdded', {
              'part': child,
              'slotName': child.parent.slotName(child)
            });
          });
        }
      }
    }
  }, {
    key: "removePart",
    value: function removePart() {
      this.rootPart = null;
      this.notify('RootPartRemoved');
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var o = {};
      if (this.rootPart) o.rootPart = this.rootPart.serialize();
      return o;
    }
  }, {
    key: "webotsExport",
    value: function webotsExport() {
      var s = '';
      s += '#VRML_SIM R2019a utf8\n';
      s += 'WorldInfo {\n';
      s += '  basicTimeStep 8\n';
      s += '}\n';
      s += 'Viewpoint {\n';
      s += '  orientation -0.02 -0.96 -0.27 3.0\n';
      s += '  position -0.07 0.43 -0.7\n';
      s += '  follow "Tinkerbots"\n';
      s += '}\n';
      s += 'TexturedBackground {\n';
      s += '  texture "empty_office"\n';
      s += '}\n';
      s += 'TexturedBackgroundLight {\n';
      s += '  texture "empty_office"\n';
      s += '}\n';
      s += 'Floor {\n';
      s += '  size 1000 1000\n';
      s += '}\n';
      if (this.rootPart) s += this.rootPart.webotsExport();
      return s;
    }
  }, {
    key: "getAvailableSlotTypes",
    value: function getAvailableSlotTypes() {
      if (this.rootPart === null) return [];
      var availableSlotTypes = this.rootPart.getAvailableSlotTypes();
      availableSlotTypes = availableSlotTypes.filter(function (v, i, a) {
        return a.indexOf(v) === i;
      }); // unique

      return availableSlotTypes;
    }
  }]);

  return Robot;
}(Observable);
/* global Observable, UndoStack */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Commands =
/*#__PURE__*/
function (_Observable) {
  _inherits(Commands, _Observable);

  // eslint-disable-line no-unused-vars
  function Commands() {
    var _this;

    _classCallCheck(this, Commands);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Commands).call(this));
    _this.undoStack = new UndoStack(null);
    return _this;
  }

  _createClass(Commands, [{
    key: "undo",
    value: function undo() {
      if (this.canUndo()) this.undoStack.undo();
      this.notify('updated', null);
    }
  }, {
    key: "redo",
    value: function redo() {
      if (this.canRedo()) this.undoStack.redo();
      this.notify('updated', null);
    }
  }, {
    key: "canUndo",
    value: function canUndo() {
      return this.undoStack.canUndo();
    }
  }, {
    key: "canRedo",
    value: function canRedo() {
      return this.undoStack.canRedo();
    }
  }, {
    key: "_pushAction",
    value: function _pushAction(perform, data) {
      var returnedValue = perform.call(this, true, data);
      this.undoStack.push(perform, data);
      this.notify('updated', null);
      return returnedValue;
    }
  }, {
    key: "addPart",
    value: function addPart(parent, slot, part) {
      var that = this;

      this._pushAction(function (redo, data) {
        if (redo) parent.addPart(slot, part);else {
          parent.removePart(part);
          that.notify('AnyPartRemoved', null);
        }
      }, []);
    }
  }, {
    key: "translatePart",
    value: function translatePart(part, translation) {
      var previousTranslation = part.translation;

      this._pushAction(function (redo, data) {
        if (redo) part.translate(translation);else part.translate(previousTranslation);
      }, []);
    }
  }, {
    key: "rotatePart",
    value: function rotatePart(part, quaternion) {
      var previousQuaternion = part.quaternion;

      this._pushAction(function (redo, data) {
        if (redo) part.rotate(quaternion);else part.rotate(previousQuaternion);
      }, []);
    }
  }, {
    key: "addRootPart",
    value: function addRootPart(robot, part) {
      var that = this;

      this._pushAction(function (redo, data) {
        if (redo) robot.addRootPart(part);else {
          robot.removePart();
          that.notify('AnyPartRemoved', null);
        }
      }, []);
    }
  }, {
    key: "removePart",
    value: function removePart(part) {
      var that = this;
      var parent = part.parent;
      var slotName = parent.slotName(part);

      this._pushAction(function (redo, data) {
        if (redo) {
          parent.removePart(part);
          that.notify('AnyPartRemoved', null);
        } else parent.addPart(slotName, part);
      }, []);
    }
  }, {
    key: "removeRootPart",
    value: function removeRootPart(robot, part) {
      var that = this;

      this._pushAction(function (redo, data) {
        if (redo) {
          robot.removePart();
          that.notify('AnyPartRemoved', null);
        } else robot.addRootPart(part);
      }, []);

      this.notify('AnyPartRemoved', null);
    }
  }, {
    key: "changeColor",
    value: function changeColor(part, color) {
      var previousColor = part.color;

      this._pushAction(function (redo, data) {
        if (redo) part.changeColor(color);else part.changeColor(previousColor);
      }, []);
    }
  }]);

  return Commands;
}(Observable);
/* global Part, THREE */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotController =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotController(assetLibrary, commands, robot) {
    _classCallCheck(this, RobotController);

    this.assetLibrary = assetLibrary;
    this.commands = commands;
    this.robot = robot;
  }

  _createClass(RobotController, [{
    key: "addPart",
    value: function addPart(parent, modelName, closestSlotName) {
      var asset = this.assetLibrary.getAssetByName(modelName);
      var part = new Part(asset);
      if (!parent || parent === this.robot) this.commands.addRootPart(this.robot, part);else this.commands.addPart(parent, closestSlotName, part);
    }
  }, {
    key: "removePart",
    value: function removePart(part) {
      var parent = part.parent;
      if (!parent || parent === this.robot) this.commands.removeRootPart(this.robot, part);else this.commands.removePart(part);
    }
  }, {
    key: "translatePart",
    value: function translatePart(part, translation) {
      var previousTranslation = new THREE.Vector3(part.translation[0], part.translation[1], part.translation[2]);
      if (translation.distanceTo(previousTranslation) > 0.001) this.commands.translatePart(part, [translation.x, translation.y, translation.z]);
    }
  }, {
    key: "rotatePart",
    value: function rotatePart(part, quaternion) {
      var previousQuaternion = new THREE.Quaternion(part.quaternion[0], part.quaternion[1], part.quaternion[2], part.quaternion[3]);
      if (quaternion.angleTo(previousQuaternion) > 0.01) this.commands.rotatePart(part, [quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
    }
  }, {
    key: "changeColor",
    value: function changeColor(part, color) {
      if (color !== part.color) this.commands.changeColor(part, color);
    }
  }]);

  return RobotController;
}();
/* global Ghost, MouseEvents */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Dragger =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Dragger(robotViewer, robotController) {
    _classCallCheck(this, Dragger);

    this.robotViewer = robotViewer;
    this.robotController = robotController;
    this.draggedPartName = null;
    this.draggedPart = undefined;
    this.slotType = null;
    this.ghost = new Ghost(robotViewer.scene);
  }

  _createClass(Dragger, [{
    key: "dragStart",
    value: function dragStart(part, slotType) {
      this.draggedPart = part;
      this.slotType = slotType;
    }
  }, {
    key: "dragEnter",
    value: function dragEnter() {
      this.robotViewer.slotAnchors.showSlots(this.slotType);
      this.ghost.addGhost(this.draggedPart);
    }
  }, {
    key: "dragOver",
    value: function dragOver(x, y) {
      var domElement = this.robotViewer.robotViewerElement;
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, x, y);
      var projection = this.robotViewer.projectScreenPositionOnSlotsAnchors(screenPosition);

      if (projection) {
        var closestSlot = this.robotViewer.getClosestSlot(screenPosition, this.slotType);

        if (closestSlot) {
          this.robotViewer.slotAnchors.highlight(closestSlot);
          this.ghost.moveGhostToSlot(closestSlot);
          return;
        }
      }

      projection = this.robotViewer.projectScreenPositionOnFloor(screenPosition);
      this.ghost.moveGhostToFloor(projection);
    }
  }, {
    key: "dragLeave",
    value: function dragLeave() {
      this.robotViewer.slotAnchors.hideSlots(this.robotViewer.scene);
      this.ghost.removeGhost();
    }
  }, {
    key: "drop",
    value: function drop(x, y) {
      var domElement = this.robotViewer.robotViewerElement;
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, x, y);
      var closestSlot = this.robotViewer.getClosestSlot(screenPosition, this.slotType);

      if (closestSlot) {
        var parent = closestSlot;

        do {
          if (parent.userData.isPartContainer) {
            this.robotController.addPart(parent.mediator.model, this.draggedPart, closestSlot.userData.slotName);
            break;
          }

          parent = parent.parent;
        } while (parent);
      } else this.robotController.addPart(null, this.draggedPart, '');

      this.robotViewer.slotAnchors.hideSlots(this.robotViewer.scene);
      this.ghost.removeGhost();
    }
  }]);

  return Dragger;
}();
/* global THREE */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Ghost =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Ghost(scene) {
    _classCallCheck(this, Ghost);

    this.scene = scene;
    this.ghost = null;
    this.pathPrefix = 'models/';
    if (typeof Ghost.assetsPathPrefix !== 'undefined') this.pathPrefix = Ghost.assetsPathPrefix + this.pathPrefix;
  }

  _createClass(Ghost, [{
    key: "addGhost",
    value: function addGhost(modelName) {
      var _this = this;

      this.ghost = new THREE.Object3D();
      this.ghost.userData.isGhost = true;
      var model = this.pathPrefix + modelName + '/model.x3d';
      var loader = new THREE.X3DLoader();
      loader.load(model, function (object3dList) {
        if (!_this.ghost || !Array.isArray(object3dList) || object3dList.length === 0) return;

        _this.ghost.add(object3dList[0]);

        _this.ghost.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.material.transparent = true;
            child.material.opacity = 0.5;
          }
        });
      });
      this.scene.add(this.ghost);
    }
  }, {
    key: "moveGhostToFloor",
    value: function moveGhostToFloor(projection) {
      if (!this.ghost) return;
      this.scene.add(this.ghost);
      this.ghost.position.copy(projection);
    }
  }, {
    key: "moveGhostToSlot",
    value: function moveGhostToSlot(slot) {
      if (!this.ghost) return;
      this.ghost.position.copy(new THREE.Vector3());
      slot.add(this.ghost);
    }
  }, {
    key: "removeGhost",
    value: function removeGhost() {
      if (!this.ghost) return;
      this.ghost.parent.remove(this.ghost);
      this.ghost = null;
    }
  }]);

  return Ghost;
}();
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/* global THREE, Part, Robot */
var Handle =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Handle(robotController, domElement, camera, scene, orbitControls) {
    var _this = this;

    _classCallCheck(this, Handle);

    this.robotController = robotController;
    this.scene = scene;
    this.mode = 'select';
    this.part = null;
    this.control = new THREE.TransformControls(camera, domElement);
    this.control.isTransformControls = true; // To be detected correctly by OutlinePass.

    this.control.visible = false;
    this.control.enabled = false;
    this.control.setSpace('local');
    this.control.addEventListener('dragging-changed', function (event) {
      orbitControls.enabled = !event.value;
    });
    this.control.addEventListener('change', function (event) {
      if (!_this.target) return;

      if (_this.part && _this.mode === 'translate') {
        var position = _this.target.position;

        _this.robotController.translatePart(_this.part, position);
      }

      if (_this.part && _this.mode === 'rotate') {
        var quaternion = _this.target.quaternion;

        _this.robotController.rotatePart(_this.part, quaternion);
      }
    });
  }

  _createClass(Handle, [{
    key: "attachToObject",
    value: function attachToObject(object) {
      var _this2 = this;

      this.detach();
      this.part = object.mediator.model;
      this.part.addObserver('Translated', function (d) {
        _this2._updateTargetPosition();
      });
      this.part.addObserver('Rotated', function (d) {
        _this2._updateTargetPosition();
      });
      this.target = new THREE.Object3D();
      this.target.userData.isHandleTarget = true;

      this._updateTargetPosition();

      object.parent.add(this.target);
      this.control.attach(this.target);
      this.setMode(this.mode); // update visibility.
      // Uncomment to visualize the target:
      // var geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      // var material = new THREE.MeshBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0.5});
      // var cube = new THREE.Mesh(geometry, material);
      // this.target.add(cube);
    }
  }, {
    key: "setMode",
    value: function setMode(mode) {
      this.mode = mode;

      if (mode === 'select') {
        this.control.visible = false;
        this.control.enabled = false;
      } else if (mode === 'translate') {
        this.control.visible = true;
        this.control.enabled = true;
        this.control.setMode('translate');
      } else if (mode === 'rotate') {
        this.control.visible = true;
        this.control.enabled = true;
        this.control.setMode('rotate');
      }

      this._updateConstraints();
    }
  }, {
    key: "detach",
    value: function detach() {
      this.control.detach();

      if (this.target) {
        this.target.parent.remove(this.target);
        this.target = null;
      }

      this.part = null;
    }
  }, {
    key: "showHandle",
    value: function showHandle() {
      this.scene.add(this.control);
    }
  }, {
    key: "hideHandle",
    value: function hideHandle() {
      this.scene.remove(this.control);
    }
  }, {
    key: "isDragging",
    value: function isDragging() {
      return this.control.dragging;
    }
  }, {
    key: "_updateTargetPosition",
    value: function _updateTargetPosition() {
      if (!this.target) return;
      this.target.position.copy(new THREE.Vector3(this.part.translation[0], this.part.translation[1], this.part.translation[2]));
      this.target.quaternion.copy(new THREE.Quaternion(this.part.quaternion[0], this.part.quaternion[1], this.part.quaternion[2], this.part.quaternion[3]));
      this.target.updateMatrix();
    }
  }, {
    key: "_updateConstraints",
    value: function _updateConstraints() {
      if (!this.part) return;
      var parentPart = this.part.parent;
      console.assert(parentPart);

      if (this.mode !== 'select') {
        if (parentPart instanceof Robot) {
          this.control.rotationSnap = null;
          this.control.translationSnap = null;
          this.control.showX = true;
          this.control.showY = true;
          this.control.showZ = true;
          return;
        }

        if (parentPart instanceof Part) {
          var slotName = parentPart.slotName(this.part);

          if (slotName) {
            var slotData = parentPart.asset.slots[slotName];
            this.control.rotationSnap = slotData.rotationSnap === -1 ? null : slotData.rotationSnap;
            this.control.translationSnap = slotData.translationSnap === -1 ? null : slotData.translationSnap;

            if (this.mode === 'rotate') {
              if (this.control.rotationSnap === 0) {
                this.control.showX = false;
                this.control.showY = false;
                this.control.showZ = false;
              } else if (slotData.rotationGizmoVisibility === undefined) {
                this.control.showX = true;
                this.control.showY = true;
                this.control.showZ = true;
              } else {
                this.control.showX = slotData.rotationGizmoVisibility[0];
                this.control.showY = slotData.rotationGizmoVisibility[1];
                this.control.showZ = slotData.rotationGizmoVisibility[2];
              }

              return;
            } else if (this.mode === 'translate') {
              if (this.control.translationSnap === 0) {
                this.control.showX = false;
                this.control.showY = false;
                this.control.showZ = false;
              } else if (slotData.translationHandleVisibility === undefined) {
                this.control.showX = true;
                this.control.showY = true;
                this.control.showZ = true;
              } else {
                this.control.showX = slotData.translationHandleVisibility[0];
                this.control.showY = slotData.translationHandleVisibility[1];
                this.control.showZ = slotData.translationHandleVisibility[2];
              }

              return;
            }
          }
        }
      } // select mode or invalid structure.


      this.control.rotationSnap = null;
      this.control.translationSnap = null;
      this.control.showX = false;
      this.control.showY = false;
      this.control.showZ = false;
    }
  }]);

  return Handle;
}();
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Highlightor =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Highlightor(outlinePass) {
    _classCallCheck(this, Highlightor);

    this.outlinePass = outlinePass;
  }

  _createClass(Highlightor, [{
    key: "highlight",
    value: function highlight(part) {
      var selectedRepresentations = [];
      part.children.forEach(function (child) {
        if (child.userData.isRepresentation) selectedRepresentations.push(child);
      });
      if (selectedRepresentations.length > 0) this.outlinePass.selectedObjects = selectedRepresentations;
    }
  }, {
    key: "clearHighlight",
    value: function clearHighlight() {
      this.outlinePass.selectedObjects = [];
    }
  }]);

  return Highlightor;
}();
/* global THREE, convertStringToVec3, convertStringToQuaternion */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PartMediator =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function PartMediator(part) {
    var _this = this;

    _classCallCheck(this, PartMediator);

    this.model = part;
    this.pathPrefix = 'models/';
    if (typeof PartMediator.assetsPathPrefix !== 'undefined') this.pathPrefix = PartMediator.assetsPathPrefix + this.pathPrefix; // Create the root container.

    this.rootObject = new THREE.Object3D(); // The THREEjs container (contains the slots container and the part representation.)

    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this;
    this.rootObject.userData.isPartContainer = true; // Create the representation (async load).

    var model = this.pathPrefix + this.model.name + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, function (object3dList) {
      if (!Array.isArray(object3dList) || object3dList.length === 0) return;
      _this.representation = object3dList[0]; // The THREEjs representation of the part.

      _this.representation.userData.isRepresentation = true;

      _this.rootObject.add(_this.representation);
    }); // Create the slot containers.

    this.childrenSlots = {};
    Object.keys(this.model.asset.slots).forEach(function (slotName) {
      var slot = _this.model.asset.slots[slotName];
      var object = new THREE.Object3D();
      object.userData.isSlotContainer = true;
      object.userData.slotType = slot.type;
      object.userData.slotName = slotName;
      var position = convertStringToVec3(slot.translation ? slot.translation : '0 0 0');
      object.position.copy(position);
      var quaternion = convertStringToQuaternion(slot.rotation ? slot.rotation : '0 1 0 0');
      object.quaternion.copy(quaternion);

      _this.rootObject.add(object);

      _this.childrenSlots[slotName] = object;
    }); // Link signals

    this.model.addObserver('PartAdded', function (d) {
      return _this.onPartAdded(d);
    });
    this.model.addObserver('PartRemoved', function (d) {
      return _this.onPartRemoved(d);
    });
    this.model.addObserver('Translated', function (d) {
      return _this.onTranslated(d);
    });
    this.model.addObserver('Rotated', function (d) {
      return _this.onRotated(d);
    });
    this.model.addObserver('ColorChanged', function (d) {
      return _this.onColorChanged(d);
    }); // Apply initial parameters.

    this.onTranslated({
      'translation': this.model.translation
    });
    this.onRotated({
      'quaternion': this.model.quaternion
    });
    if (typeof this.model.color !== 'undefined') this.onColorChanged({
      'color': this.model.color
    });
  }

  _createClass(PartMediator, [{
    key: "onPartAdded",
    value: function onPartAdded(data) {
      // Create the new part mediator, attach its root parts to this slot.
      var mediator = new PartMediator(data.part);
      this.childrenSlots[data.slotName].add(mediator.rootObject);
    }
  }, {
    key: "onPartRemoved",
    value: function onPartRemoved(data) {
      // Remove the child part containers.
      // The slot container should contain only one part container and eventually the handle target.
      for (var c = this.childrenSlots[data.slotName].children.length - 1; c >= 0; c--) {
        // technique to loop through array while removing array items.
        var child = this.childrenSlots[data.slotName].children[c];
        if (child.userData.isPartContainer) child.parent.remove(child);else console.assert(child.userData.isHandleTarget);
      }
    }
  }, {
    key: "onTranslated",
    value: function onTranslated(data) {
      var translation = new THREE.Vector3(data.translation[0], data.translation[1], data.translation[2]);
      this.rootObject.position.copy(translation);
      this.rootObject.updateMatrix();
    }
  }, {
    key: "onRotated",
    value: function onRotated(data) {
      var quaternion = new THREE.Quaternion(data.quaternion[0], data.quaternion[1], data.quaternion[2], data.quaternion[3]);
      this.rootObject.quaternion.copy(quaternion);
      this.rootObject.updateMatrix();
    }
  }, {
    key: "onColorChanged",
    value: function onColorChanged(data) {
      // TODO: color should not be hardcoded here.
      if (!this.representation) return; // TODO: this.representation may not exists a this point :-(

      this.representation.traverse(function (child) {
        if (child.isMesh) {
          if (data.color === 'yellow') child.material.color = new THREE.Color('rgb(100%, 60%, 0%)');else if (data.color === 'blue') child.material.color = new THREE.Color('rgb(0%, 45%, 100%)');
        }
      });
    }
  }]);

  return PartMediator;
}();
/* global THREE, PartMediator */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotMediator =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotMediator(robot) {
    var _this = this;

    _classCallCheck(this, RobotMediator);

    this.model = robot; // Create the root container.

    this.rootObject = new THREE.Object3D();
    this.rootObject.name = 'robot';
    this.rootObject.model = this;
    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this; // Link signals

    this.model.addObserver('RootPartAdded', function (e) {
      return _this.onRootPartAdded(e);
    });
    this.model.addObserver('RootPartRemoved', function (e) {
      return _this.onRootPartRemoved(e);
    });
  }

  _createClass(RobotMediator, [{
    key: "onRootPartAdded",
    value: function onRootPartAdded(part) {
      this.rootPartMediator = new PartMediator(part);
      this.rootObject.add(this.rootPartMediator.rootObject);
    }
  }, {
    key: "onRootPartRemoved",
    value: function onRootPartRemoved() {
      this.rootObject.remove(this.rootPartMediator.rootObject);
      this.rootPartMediator = null;
    }
  }]);

  return RobotMediator;
}();
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PartBrowser =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function PartBrowser(assetLibraryElement, assetLibrary, dragStartCallback) {
    var _this = this;

    _classCallCheck(this, PartBrowser);

    this.assetLibraryElement = assetLibraryElement;
    this.assetLibrary = assetLibrary;
    this.robotsTabDivs = {};
    this.partIconDivs = [];
    this.dragStartCallback = dragStartCallback;
    this.selectElement = document.createElement('select');
    this.selectElement.classList.add('nrp-robot-designer-part-browser-select');
    this.selectElement.addEventListener('change', function () {
      _this.showParts();
    });
    var labelBlock = document.createElement('div');
    labelBlock.classList.add('nrp-robot-designer-part-browser-label');
    labelBlock.innerHTML = '<p>Library</p>';
    labelBlock.appendChild(this.selectElement);
    this.assetLibraryElement.appendChild(labelBlock);
  }

  _createClass(PartBrowser, [{
    key: "loadAssets",
    value: function loadAssets() {
      var _this2 = this;

      // create robots tabs
      this.assetLibrary.getRobotNames().forEach(function (robotName) {
        // content
        var div = document.createElement('div');
        div.id = _this2._capitalize(robotName);
        div.classList.add('nrp-robot-designer-part-browser-content');
        _this2.robotsTabDivs[robotName] = div;

        _this2.assetLibraryElement.appendChild(div); // tab button


        var option = document.createElement('option');
        option.classList.add('nrp-robot-designer-part-browser-option');
        option.setAttribute('value', robotName);
        option.innerHTML = _this2._capitalize(robotName);

        _this2.selectElement.appendChild(option);
      });
      this.assetLibrary.assets.forEach(function (asset) {
        var div = document.createElement('div');
        var iconDiv = document.createElement('div');
        iconDiv.classList.add('part-icon');
        iconDiv.setAttribute('draggable', true);
        iconDiv.setAttribute('part', asset.name);

        if (!asset.root) {
          iconDiv.classList.add('hidden');
          iconDiv.setAttribute('slotType', asset.slotType);
        }

        iconDiv.innerHTML = '<img draggable="false" src="' + asset.icon + '" />';
        iconDiv.addEventListener('dragstart', function (event) {
          _this2.dragStartCallback(event);
        });
        div.appendChild(iconDiv);

        _this2.partIconDivs.push(iconDiv);

        _this2.robotsTabDivs[asset.getRobotName()].appendChild(iconDiv);
      });
      this.showParts(this.selectElement.firstChild, this.assetLibrary.getRobotNames()[0]);
    }
  }, {
    key: "update",
    value: function update(robot) {
      var availableSlotTypes = robot.getAvailableSlotTypes();

      for (var d = 0; d < this.partIconDivs.length; d++) {
        var div = this.partIconDivs[d];

        if (availableSlotTypes.length === 0) {
          if (div.getAttribute('slotType')) div.classList.add('hidden');else div.classList.remove('hidden');
        } else {
          div.classList.remove('hidden');

          if (div.getAttribute('slotType')) {
            if (availableSlotTypes.indexOf(div.getAttribute('slotType')) > -1) {
              div.classList.remove('part-icon-disabled');
              div.draggable = true;
            } else {
              div.classList.add('part-icon-disabled');
              div.draggable = false;
            }
          } else div.classList.add('hidden');
        }
      }
    }
  }, {
    key: "showParts",
    value: function showParts() {
      var robotName = this.selectElement.options[this.selectElement.selectedIndex].value;

      for (var key in this.robotsTabDivs) {
        this.robotsTabDivs[key].style.display = 'none';
      }

      this.robotsTabDivs[robotName].style.display = 'block';
    }
  }, {
    key: "_capitalize",
    value: function _capitalize(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  }]);

  return PartBrowser;
}();
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PartViewer =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function PartViewer(robotController, element, selector) {
    var _this = this;

    _classCallCheck(this, PartViewer);

    this.robotController = robotController;
    this.element = element;
    selector.addObserver('SelectionChanged', function (d) {
      return _this._showPart(d.part);
    });

    this._cleanupDiv('No selection');
  }

  _createClass(PartViewer, [{
    key: "_showPart",
    value: function _showPart(part) {
      if (part === null) this._cleanupDiv('No selection');else {
        var model = part.mediator.model;
        var asset = model.asset;

        this._populateDiv(model, asset.parameters);
      }
    }
  }, {
    key: "_populateDiv",
    value: function _populateDiv(model, parameters) {
      var _this2 = this;

      this.element.innerHTML = ''; // add name label.

      var nameLabel = document.createElement('p');
      nameLabel.innerHTML = 'Name: <span class="part-name-label">' + model.name + '</span>';
      this.element.appendChild(nameLabel);
      var text = document.createElement('p');

      if (!parameters) {
        text.innerHTML = '<i>No parameters<i>';
        this.element.appendChild(text);
        return;
      } // create parameter forms.


      var form = document.createElement('form');

      if ('color' in parameters) {
        text.style.display = 'inline';
        var textContent = document.createTextNode('Color: ');
        text.appendChild(textContent);
        form.appendChild(text);
        var select = document.createElement('select');
        select.style.display = 'inline';

        for (var c in parameters.color) {
          var option = document.createElement('option');
          var optionText = document.createTextNode(parameters.color[c]);
          var valueAtt = document.createAttribute('value');
          valueAtt.value = parameters.color[c];
          option.setAttributeNode(valueAtt);
          option.appendChild(optionText);
          select.appendChild(option);
        }

        select.addEventListener('change', function (event) {
          var color = event.target.value;

          _this2.robotController.changeColor(model, color);
        });
        form.appendChild(select);
      }

      this.element.appendChild(form);
    }
  }, {
    key: "_cleanupDiv",
    value: function _cleanupDiv(text) {
      this.element.innerHTML = '<p><i>' + text + '</i></p>';
    }
  }]);

  return PartViewer;
}();
/* global THREE, Handle, PartSelector, SlotAnchors, Highlightor */
'use strict'; // 1. dom
// 2. renderer
// 3. resize events
// 4. refresh events
// 5. pass + compose + controls
// 6. mouse interactions

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotViewer =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotViewer(robotViewerElement, robotController, commands, sceneRgbColor) {
    var _this = this;

    _classCallCheck(this, RobotViewer);

    this.robotViewerElement = robotViewerElement;
    this.robotController = robotController;
    this.renderer = new THREE.WebGLRenderer({
      'antialias': false
    });
    this.renderer.setClearColor(0x000, 1.0);
    this.renderer.gammaInput = false;
    this.renderer.gammaOutput = false;
    this.renderer.physicallyCorrectLights = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(sceneRgbColor);
    this.camera = new THREE.PerspectiveCamera(45, 0.3, 0.001, 100);
    this.camera.position.x = 0.1;
    this.camera.position.y = 0.1;
    this.camera.position.z = 0.1;
    this.camera.lookAt(this.scene.position);
    var light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.userData = {
      'x3dType': 'DirectionalLight'
    };
    this.scene.add(light);
    var light2 = new THREE.AmbientLight(0x404040);
    this.scene.add(light2);
    var grid = new THREE.GridHelper(5, 50, 0x880088, 0x440044);
    grid.matrixAutoUpdate = false;
    this.scene.add(grid);
    this.controls = new THREE.OrbitControls(this.camera, this.robotViewerElement);
    this.composer = new THREE.EffectComposer(this.renderer);
    var renderPass = new THREE.RenderPass(this.scene, this.camera);
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

    window.onresize = function () {
      return _this.resize();
    }; // when the window has been resized.


    this.robotViewerElement.appendChild(this.renderer.domElement);
    this.resize();
    this.highlightor = new Highlightor(this.highlightOutlinePass);
    this.selector = new PartSelector(this.selectionOutlinePass);
    this.handle = new Handle(this.robotController, this.robotViewerElement, this.camera, this.scene, this.controls); // reset selection and handles when any part is removed

    commands.addObserver('AnyPartRemoved', function () {
      return _this.clearSelection();
    });
    this.gpuPicker = new THREE.GPUPicker({
      renderer: this.renderer,
      debug: false
    });
    this.gpuPicker.setFilter(function (object) {
      return object instanceof THREE.Mesh && 'x3dType' in object.userData;
    });
    this.slotAnchors = new SlotAnchors(this.scene);
    this.resize();
  }

  _createClass(RobotViewer, [{
    key: "render",
    value: function render() {
      var _this2 = this;

      requestAnimationFrame(function () {
        return _this2.render();
      });
      this.composer.render();
    }
  }, {
    key: "resize",
    value: function resize() {
      var width = this.robotViewerElement.clientWidth;
      var height = this.robotViewerElement.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      if (this.gpuPicker) this.gpuPicker.resizeTexture(width, height);
      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
      this.render();
    }
  }, {
    key: "getClosestSlot",
    value: function getClosestSlot(screenPosition, slotType) {
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var ray = raycaster.ray;
      var closestSlot = null;
      var closestSqDistance = Number.POSITIVE_INFINITY;
      var robotObject = this.scene.getObjectByName('robot');
      if (!robotObject) return;
      robotObject.traverse(function (obj) {
        if (obj.userData.isSlotContainer && obj.userData.slotType === slotType) {
          var slot = obj;
          var slotGlobalPosition = slot.localToWorld(new THREE.Vector3());
          var sqDistance = ray.distanceSqToPoint(slotGlobalPosition);

          if (closestSqDistance > sqDistance) {
            closestSlot = slot;
            closestSqDistance = sqDistance;
          }
        }
      }); // if Math.sqrt(closestSqDistance) < 0.01)...

      return closestSlot;
    }
  }, {
    key: "projectScreenPositionOnFloor",
    value: function projectScreenPositionOnFloor(screenPosition) {
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var planA = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
      planA.geometry.rotateX(-Math.PI / 2);
      var planB = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
      planB.geometry.rotateX(Math.PI / 2);
      var intersects = raycaster.intersectObjects([planA, planB]);
      if (intersects.length > 0) return intersects[0].point;
    }
  }, {
    key: "projectScreenPositionOnSlotsAnchors",
    value: function projectScreenPositionOnSlotsAnchors(screenPosition) {
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var intersects = raycaster.intersectObjects(this.slotAnchors.slots());
      if (intersects.length > 0) return intersects[0].point;
    }
  }, {
    key: "getPartAt",
    value: function getPartAt(relativePosition, screenPosition) {
      if (this.handle.control.pointerHover(screenPosition)) return undefined;
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
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.selector.clearSelection();
      this.handle.detach();
    }
  }]);

  return RobotViewer;
}();
/* global Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var PartSelector =
/*#__PURE__*/
function (_Observable) {
  _inherits(PartSelector, _Observable);

  // eslint-disable-line no-unused-vars
  function PartSelector(outlinePass) {
    var _this;

    _classCallCheck(this, PartSelector);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(PartSelector).call(this));
    _this.outlinePass = outlinePass;
    _this.selectedPart = null;
    return _this;
  }

  _createClass(PartSelector, [{
    key: "selectPart",
    value: function selectPart(part) {
      var selectedRepresentations = [];
      part.children.forEach(function (child) {
        if (child.userData.isRepresentation) selectedRepresentations.push(child);
      });

      if (selectedRepresentations.length > 0) {
        this.selectedPart = part;
        this.outlinePass.selectedObjects = selectedRepresentations;
        this.notify('SelectionChanged', {
          'part': this.selectedPart
        });
      }
    }
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.selectedPart = null;
      this.outlinePass.selectedObjects = [];
      this.notify('SelectionChanged', {
        'part': null
      });
    }
  }]);

  return PartSelector;
}(Observable);
/* global THREE */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var SlotAnchors =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function SlotAnchors(scene) {
    _classCallCheck(this, SlotAnchors);

    this.scene = scene;
    this.slotRepresentation = new THREE.BoxGeometry(0.011, 0.011, 0.011);
    this.regularMaterial = new THREE.MeshBasicMaterial({
      color: 0x10ff30,
      transparent: true,
      opacity: 0.8
    });
    this.highlightedMaterial = new THREE.MeshBasicMaterial({
      color: 0x0040ff,
      transparent: true,
      opacity: 0.8
    });
    this.slotRepresentationList = [];
    this.highlightedMesh = null;
  }

  _createClass(SlotAnchors, [{
    key: "showSlots",
    value: function showSlots(slotType) {
      var _this = this;

      this.hideSlots();
      this.scene.traverse(function (obj) {
        if (obj.userData.isSlotContainer && obj.userData.slotType === slotType && obj.children.length === 0) {
          var mesh = new THREE.Mesh(_this.slotRepresentation, _this.regularMaterial);
          mesh.userData.isSlotRepresentation = true;
          mesh.matrixAutoUpdate = false;
          mesh.name = 'slot representation';
          obj.add(mesh);

          _this.slotRepresentationList.push(mesh);
        }
      });
    }
  }, {
    key: "slots",
    value: function slots() {
      return this.slotRepresentationList;
    }
  }, {
    key: "hideSlots",
    value: function hideSlots(scene) {
      this.unhighlight();
      this.slotRepresentationList.forEach(function (obj) {
        obj.parent.remove(obj);
      });
      this.slotRepresentationList = [];
    }
  }, {
    key: "highlight",
    value: function highlight(slot) {
      this.unhighlight();
      var mesh = slot.getObjectByName('slot representation');

      if (mesh) {
        mesh.material = this.highlightedMaterial;
        this.highlightedMesh = mesh;
      }
    }
  }, {
    key: "unhighlight",
    value: function unhighlight() {
      if (this.highlightedMesh) {
        this.highlightedMesh.material = this.regularMaterial;
        this.highlightedMesh = null;
      }
    }
  }]);

  return SlotAnchors;
}();
/* global AssetLibrary, Commands, Dragger, Ghost, PartBrowser, PartMediator, PartViewer, Robot, RobotController, RobotMediator, RobotViewer */

/* global MouseEvents, TextureLoader */

/* global toggleFullScreen */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotDesigner =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotDesigner() {
    var _this = this;

    var domElement = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    var sceneRgbColor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0x000;
    var isStandAlone = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    _classCallCheck(this, RobotDesigner);

    this.pathPrefix = '';
    var scripts = document.getElementsByTagName('script');

    for (var i = 0; i < scripts.length; i++) {
      var url = scripts[i].src;

      if (url && (url.endsWith('robot_designer.js') || url.endsWith('web-robot-designer.js'))) {
        this.pathPrefix = url.substring(0, url.lastIndexOf('/', url.lastIndexOf('/', url.lastIndexOf('/') - 1) - 1) + 1);
        break;
      }
    }

    this._createDomElements(domElement, isStandAlone);

    this.assetLibrary = new AssetLibrary(this.pathPrefix);
    this.partBrowser = new PartBrowser(this.assetLibraryElement, this.assetLibrary, function (event) {
      _this.dragStart(event);
    });
    this.assetLibrary.addObserver('loaded', function () {
      _this.partBrowser.loadAssets();
    });
    TextureLoader.setTexturePathPrefix(this.pathPrefix);
    Ghost.assetsPathPrefix = this.assetLibrary.getPath();
    PartMediator.assetsPathPrefix = this.assetLibrary.getPath();
    this.commands = new Commands();
    this.commands.addObserver('updated', function () {
      return _this._updateUndoRedoButtons();
    });
    this.commands.addObserver('updated', function () {
      return _this.partBrowser.update(_this.robot);
    });
    this.robot = new Robot();
    this.robotMediator = new RobotMediator(this.robot);
    this.robotController = new RobotController(this.assetLibrary, this.commands, this.robot);
    this.robotViewer = new RobotViewer(this.robotViewerElement, this.robotController, this.commands, sceneRgbColor);
    this.robotViewer.scene.add(this.robotMediator.rootObject);
    this.highlightOutlinePass = this.robotViewer.highlightOutlinePass;
    this.dragger = new Dragger(this.robotViewer, this.robotController);
    this.partViewer = new PartViewer(this.robotController, this.partViewerElement, this.robotViewer.selector);
  } // events


  _createClass(RobotDesigner, [{
    key: "resize",
    value: function resize() {
      this.robotViewer.resize();
    }
  }, {
    key: "openExportModal",
    value: function openExportModal() {
      // eslint-disable-line no-unused-vars
      var modal = document.getElementById('nrp-robot-designer-modal-window');
      modal.style.display = 'block';
      var span = document.getElementsByClassName('modal-close-button')[0];

      span.onclick = function () {
        modal.style.display = 'none';
      };

      window.onclick = function (event) {
        if (event.target === modal) modal.style.display = 'none';
      };
    }
  }, {
    key: "exportToFile",
    value: function exportToFile(format) {
      // eslint-disable-line no-unused-vars
      var mimeType = '';
      var data = '';
      var filename = '';

      if (format === 'json') {
        mimeType = 'text/json';
        data = JSON.stringify(this.robot.serialize(), null, 2);
        filename = 'robot.json';
      } else if (format === 'webots') {
        mimeType = 'text/txt';
        data = this.robot.webotsExport();
        filename = 'robot.wbt';
      } else {
        console.assert(false); // Invalid format.

        return;
      }

      if (typeof this.onExport === 'function') {
        this.onExport(data);
        return;
      }

      var blob = new Blob([data], {
        type: mimeType
      });
      var e = document.createEvent('MouseEvents');
      var a = document.createElement('a');
      a.download = filename;
      a.href = window.URL.createObjectURL(blob);
      a.dataset.downloadurl = [mimeType, a.download, a.href].join(':');
      e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      a.dispatchEvent(e);
    }
  }, {
    key: "changeMode",
    value: function changeMode(mode) {
      this.selectButton.classList.remove('nrp-robot-designer-fas-selected');
      this.translateButton.classList.remove('nrp-robot-designer-fas-selected');
      this.rotateButton.classList.remove('nrp-robot-designer-fas-selected');
      if (mode === 'select') this.selectButton.classList.add('nrp-robot-designer-fas-selected');else if (mode === 'translate') this.translateButton.classList.add('nrp-robot-designer-fas-selected');else if (mode === 'rotate') this.rotateButton.classList.add('nrp-robot-designer-fas-selected');
      this.robotViewer.handle.setMode(mode);
    }
  }, {
    key: "mouseDown",
    value: function mouseDown(ev) {
      var domElement = this.robotViewer.robotViewerElement;
      var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(domElement, ev.clientX, ev.clientY);
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, ev.clientX, ev.clientY); // get picked part that will be selected on mouseUp if the mouse doesn't move

      this.partToBeSelected = this.robotViewer.getPartAt(relativePosition, screenPosition);
      this.mouseDownPosition = {
        x: ev.clientX,
        y: ev.clientY
      };
    }
  }, {
    key: "mouseUp",
    value: function mouseUp(ev) {
      if (typeof this.partToBeSelected === 'undefined' || typeof this.mouseDownPosition === 'undefined') return; // compute Manhattan length

      var length = Math.abs(this.mouseDownPosition.x - ev.clientX) + Math.abs(this.mouseDownPosition.y - ev.clientY);

      if (length < 20) {
        // the mouse was moved by less than 20 pixels (determined empirically)
        // select part
        this.robotViewer.selector.selectPart(this.partToBeSelected);
        this.robotViewer.handle.attachToObject(this.partToBeSelected);
      }

      this.partToBeSelected = undefined;
      this.mouseDownPosition = undefined;
    }
  }, {
    key: "deleteSelectedPart",
    value: function deleteSelectedPart() {
      var mesh = this.robotViewer.selector.selectedPart;

      if (mesh) {
        var parent = mesh;

        do {
          if (parent.userData.isPartContainer) {
            this.robotController.removePart(parent.mediator.model);
            break;
          }

          parent = parent.parent;
        } while (parent);
      }

      this.robotViewer.clearSelection();
    }
  }, {
    key: "mouseMove",
    value: function mouseMove(ev) {
      if (this.robotViewer.handle.isDragging()) return;
      var domElement = this.robotViewer.robotViewerElement;
      var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(domElement, ev.clientX, ev.clientY);
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, ev.clientX, ev.clientY);
      var part = this.robotViewer.getPartAt(relativePosition, screenPosition);
      if (part) this.robotViewer.highlightor.highlight(part);else this.robotViewer.highlightor.clearHighlight();
    }
  }, {
    key: "dragStart",
    value: function dragStart(ev) {
      var part = ev.target.getAttribute('part');
      var slotType = ev.target.getAttribute('slotType');
      ev.dataTransfer.setData('text', part); // Cannot be used on Chrome. Cannot be dropped on Firefox.
      // https://stackoverflow.com/a/40923520/2210777

      var img = document.createElement('img');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      ev.dataTransfer.setDragImage(img, 0, 0);
      this.dragger.dragStart(part, slotType);
    }
  }, {
    key: "dragOver",
    value: function dragOver(ev) {
      ev.preventDefault();
      ev.dataTransfer.getData('text'); // Cannot be used on Chrome. Cannot be dropped on Firefox.

      this.dragger.dragOver(ev.clientX, ev.clientY);
    } // DOM setup

  }, {
    key: "_createDomElements",
    value: function _createDomElements(domElement, isStandAlone) {
      var _this2 = this;

      this.part = document.createElement('div');
      this.part.classList.add('nrp-robot-designer');
      this.part.id = 'nrp-robot-designer';
      if (typeof domElement === 'undefined') document.body.appendChild(this.part);else domElement.appendChild(this.part);

      if (isStandAlone) {
        var header = document.createElement('div');
        header.classList.add('header');
        header.innerHTML = "<span>NRP Robot Designer</span>\n        <i class=\"nrp-robot-designer-fas fas fa-robot\"></i>\n        <span class=\"menu-item\">File</span>\n        <span class=\"menu-item\">Help</span>";
        this.part.appendChild(header);
      }

      this.toolbar = document.createElement('div');
      this.toolbar.classList.add('menu');
      this.toolbar.innerHTML = "\n      <i id=\"nrp-robot-designer-export-button\" class=\"nrp-robot-designer-fas fas fa-file-export\"></i>\n      <span>-</span>\n      <i id=\"nrp-robot-designer-undo-button\" class=\"nrp-robot-designer-fas fas fa-undo nrp-robot-designer-fas-disabled\"></i>\n      <i id=\"nrp-robot-designer-redo-button\" class=\"nrp-robot-designer-fas fas fa-redo nrp-robot-designer-fas-disabled\"></i>\n      <span>-</span>\n      <i id=\"nrp-robot-designer-select-button\" class=\"nrp-robot-designer-fas fas nrp-robot-designer-fas-selected fa-mouse-pointer\"></i>\n      <i id=\"nrp-robot-designer-translate-button\" class=\"nrp-robot-designer-fas fas fa-arrows-alt\"></i>\n      <i id=\"nrp-robot-designer-rotate-button\" class=\"nrp-robot-designer-fas fas fa-sync-alt\"></i>\n      <span>-</span>\n      <i id=\"nrp-robot-designer-delete-button\" class=\"nrp-robot-designer-fas fas fa-trash-alt\"></i>";

      if (isStandAlone) {
        this.toolbar.innerHTML += "\n        <span>-</span>\n        <i id=\"nrp-robot-designer-maximize-button\" class=\"nrp-robot-designer-fas fas fa-window-maximize\"></i>";
      }

      this.part.appendChild(this.toolbar);
      var exportButton = document.getElementById('nrp-robot-designer-export-button');
      exportButton.addEventListener('click', function () {
        _this2.openExportModal();
      });
      this.undoButton = document.getElementById('nrp-robot-designer-undo-button');
      this.undoButton.addEventListener('click', function () {
        _this2.commands.undo();
      });
      this.redoButton = document.getElementById('nrp-robot-designer-redo-button');
      this.redoButton.addEventListener('click', function () {
        _this2.commands.redo();
      });
      this.selectButton = document.getElementById('nrp-robot-designer-select-button');
      this.selectButton.addEventListener('click', function () {
        _this2.changeMode('select');
      });
      this.translateButton = document.getElementById('nrp-robot-designer-translate-button');
      this.translateButton.addEventListener('click', function () {
        _this2.changeMode('translate');
      });
      this.rotateButton = document.getElementById('nrp-robot-designer-rotate-button');
      this.rotateButton.addEventListener('click', function () {
        _this2.changeMode('rotate');
      });
      var deleteButton = document.getElementById('nrp-robot-designer-delete-button');
      deleteButton.addEventListener('click', function () {
        _this2.deleteSelectedPart();
      });
      var maximizeButton = document.getElementById('nrp-robot-designer-maximize-button');
      if (maximizeButton) maximizeButton.addEventListener('click', function () {
        toggleFullScreen();
      });
      this.assetLibraryElement = document.createElement('div');
      this.assetLibraryElement.classList.add('part-browser');
      this.assetLibraryElement.classList.add('designer-group');
      this.part.appendChild(this.assetLibraryElement);
      var partViewerContainer = document.createElement('div');
      partViewerContainer.classList.add('part-viewer');
      partViewerContainer.classList.add('designer-group');
      partViewerContainer.innerHTML = "<p class=\"designer-group-title\">Part viewer</p>";
      this.partViewerElement = document.createElement('div');
      partViewerContainer.appendChild(this.partViewerElement);
      this.part.appendChild(partViewerContainer);
      this.robotViewerElement = document.createElement('div');
      this.robotViewerElement.classList.add('main');
      this.robotViewerElement.addEventListener('drop', function (event) {
        event.preventDefault();

        _this2.dragger.drop(event.clientX, event.clientY);
      });
      this.robotViewerElement.addEventListener('dragenter', function (event) {
        _this2.dragger.dragEnter();
      });
      this.robotViewerElement.addEventListener('dragover', function (event) {
        _this2.dragOver(event);
      });
      this.robotViewerElement.addEventListener('dragleave', function (event) {
        _this2.dragger.dragLeave();
      });
      this.robotViewerElement.addEventListener('mousemove', function (event) {
        _this2.mouseMove(event);
      });
      this.robotViewerElement.addEventListener('mousedown', function (event) {
        _this2.mouseDown(event);
      });
      this.robotViewerElement.addEventListener('mouseup', function (event) {
        _this2.mouseUp(event);
      });
      this.part.appendChild(this.robotViewerElement); // export modal window

      var modalWindow = document.createElement('div');
      modalWindow.id = 'nrp-robot-designer-modal-window';
      modalWindow.classList.add('modal');
      modalWindow.innerHTML = "<div class=\"modal-content\">\n       <span class=\"modal-close-button\">&times;</span>\n       <div class=\"modal-grid\">\n         <button type=\"button\" id=\"nrp-robot-designer-json-export-button\"  class=\"nrp-button\">Export to JSON</button>\n         <button type=\"button\" id=\"nrp-robot-designer-webots-export-button\" class=\"nrp-button\">Export to Webots</button>\n         <button type=\"button\" id=\"nrp-robot-designer-nrp-export-button\" class=\"nrp-button nrp-button-disabled\">Export to NRP</button>\n       </div>\n     </div>";
      this.part.appendChild(modalWindow);
      var jsonExportButton = document.getElementById('nrp-robot-designer-json-export-button');
      jsonExportButton.addEventListener('click', function () {
        _this2.exportToFile('json');
      });
      var webotsExportButton = document.getElementById('nrp-robot-designer-webots-export-button');
      webotsExportButton.addEventListener('click', function () {
        _this2.exportToFile('webots');
      });
      var nrpExportButton = document.getElementById('nrp-robot-designer-nrp-export-button');
      nrpExportButton.addEventListener('click', function () {
        alert('Coming soon...');
      });
    }
  }, {
    key: "_updateUndoRedoButtons",
    value: function _updateUndoRedoButtons() {
      if (this.commands.canRedo()) this.redoButton.classList.remove('nrp-robot-designer-fas-disabled');else this.redoButton.classList.add('nrp-robot-designer-fas-disabled');
      if (this.commands.canUndo()) this.undoButton.classList.remove('nrp-robot-designer-fas-disabled');else this.undoButton.classList.add('nrp-robot-designer-fas-disabled');
    }
  }]);

  return RobotDesigner;
}();
