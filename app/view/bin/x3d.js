/* global THREE, ActiveXObject */

// Inspiration: https://github.com/lkolbly/threejs-x3dloader/blob/master/X3DLoader.js

THREE.X3DLoader = function(manager) {
  this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
};

THREE.X3DLoader.prototype = {
  constructor: THREE.X3DLoader,

  load: function(url, onLoad, onProgress, onError) {
    console.log('X3D: Loading ' + url);
    var scope = this;
    var loader = new THREE.FileLoader(scope.manager);
    loader.load(url, function(text) {
      onLoad(scope.parse(text));
    });
  },

  parse: function(text) {
    var object = new THREE.Object3D();

    console.log('X3D: Parsing');

    var xml = null;
    if (window.DOMParser) {
      var parser = new DOMParser();
      xml = parser.parseFromString(text, 'text/xml');
    } else { // Internet Explorer
      xml = new ActiveXObject('Microsoft.XMLDOM');
      xml.async = false;
      xml.loadXML(text);
    }

    var scene = xml.getElementsByTagName('Scene')[0];
    this.parseNode(object, scene);

    return object;
  },

  parseNode: function(object, node) {
    console.log('Parse Node');

    var currentObject = object;
    if (node.tagName === 'Transform') {
      console.log('Parse Transform');

      currentObject = new THREE.Object3D();

      var position = convertStringToVec3(getNodeAttribute(node, 'translation', '0 0 0'));
      currentObject.position.copy(position);
      var scale = convertStringToVec3(getNodeAttribute(node, 'scale', '1 1 1'));
      currentObject.scale.copy(scale);
      var quaternion = convertStringToQuaternion(getNodeAttribute(node, 'rotation', '0 1 0 0'));
      currentObject.quaternion.copy(quaternion);

      object.add(currentObject);
    }

    // Parse children.
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (typeof child.tagName === 'undefined')
        continue;
      if (child.tagName === 'Shape') {
        var shape = this.parseShape(child);
        currentObject.add(shape);
      } else if (child.tagName === 'Slot') {
        var slot = this.parseSlot(child);
        if (slot)
          currentObject.add(slot);
      } else
        this.parseNode(currentObject, child);
    }
  },

  parseSlot: function(slot) {
    console.log('Parse Slot');

    var type = getNodeAttribute(slot, 'slotType', '');
    if (type !== 'tinkerbots')
      return; // TODO: deal with this in a generic way.

    var object = new THREE.Object3D();
    object.name = 'slot';
    object.userdata = {
      slotType: type,
      slotName: getNodeAttribute(slot, 'slotName', '')
    };
    var position = convertStringToVec3(getNodeAttribute(slot, 'translation', '0 0 0'));
    object.position.copy(position);
    var quaternion = convertStringToQuaternion(getNodeAttribute(slot, 'rotation', '0 1 0 0'));
    object.quaternion.copy(quaternion);

    return object;
  },

  parseShape: function(shape) {
    console.log('Parse Shape');

    var geometry = new THREE.Geometry();
    var material = new THREE.MeshBasicMaterial({color: 0xffffff});

    for (var i = 0; i < shape.childNodes.length; i++) {
      var child = shape.childNodes[i];
      if (typeof child.tagName === 'undefined')
        continue;
      if (child.tagName === 'Appearance')
        material = this.parseAppearance(child);
      else if (child.tagName === 'IndexedFaceSet')
        geometry = this.parseIndexedFaceSet(child);
      else if (child.tagName === 'Sphere')
        geometry = this.parseSphere(child);
      else
        console.log('Unknown node: ' + child.tagName);
    }

    var mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'mesh'; // TODO: Couldn't we find a better way to reference a mesh?
    return mesh;
  },

  parseAppearance: function(appearance) {
    console.log('Parse Appearance');

    var mat = new THREE.MeshBasicMaterial({color: 0xffffff});

    // Get the Material tag
    var material = appearance.getElementsByTagName('Material')[0];
    if (material === undefined)
      return mat;

    // Pull out the standard colors
    var diffuse = convertStringTorgb(getNodeAttribute(material, 'diffuseColor', '0.8 0.8 0.8'));
    var specular = convertStringTorgb(getNodeAttribute(material, 'specularColor', '0 0 0'));
    var emissive = convertStringTorgb(getNodeAttribute(material, 'emissiveColor', '0 0 0'));
    var shininess = parseFloat(getNodeAttribute(material, 'shininess', '0.2'));

    // Check to see if there is a texture
    var imageTexture = appearance.getElementsByTagName('ImageTexture');
    var colorMap;
    if (imageTexture.length > 0)
      colorMap = this.parseImageTexture(imageTexture[0]);

    var materialSpecifications = {color: diffuse, specular: specular, emissive: emissive, shininess: shininess};
    if (colorMap)
      materialSpecifications.map = colorMap;

    mat = new THREE.MeshPhongMaterial(materialSpecifications);

    return mat;
  },

  parseImageTexture: function(imageTexture) {
    console.log('Parse ImageTexture');
    // Possible improvement: load the texture in an asynchronous way.

    var filename = getNodeAttribute(imageTexture, 'url', '');
    filename = filename.split(/['"\s]/).filter(n => n);
    var that = this;
    var loader = new THREE.TextureLoader();
    var texture = loader.load(
      filename[0],
      function(texture) { // onLoad callback
        if (that.ontextureload !== undefined)
          that.ontextureload();
      },
      undefined, // onProgress callback
      function(err) { // onError callback
        console.error('An error happened when loading' + filename + ': ' + err);
      }
    );
    return texture;
  },

  parseIndexedFaceSet: function(ifs) {
    console.log('Parse IndexedFaceSet');

    var coordinate = ifs.getElementsByTagName('Coordinate')[0];
    var textureCoordinate = ifs.getElementsByTagName('TextureCoordinate')[0];

    var geometry = new THREE.Geometry();

    var indices = getNodeAttribute(ifs, 'coordIndex', '').split(/\s/);
    var verticesStr = getNodeAttribute(coordinate, 'point', '');
    var hasTexCoord = 'texCoordIndex' in ifs.attributes;
    var texcoordIndexStr = hasTexCoord ? getNodeAttribute(ifs, 'texCoordIndex', '') : '';
    var texcoordsStr = hasTexCoord ? getNodeAttribute(textureCoordinate, 'point', '') : '';
    // var creaseAngle = parseFloat(getNodeAttribute(ifs, 'creaseAngle', '0'));

    var verts = verticesStr.split(/\s/);
    for (var i = 0; i < verts.length; i += 3) {
      var v = new THREE.Vector3();
      v.x = parseFloat(verts[i + 0]);
      v.y = parseFloat(verts[i + 1]);
      v.z = parseFloat(verts[i + 2]);
      geometry.vertices.push(v);
    }

    if (hasTexCoord) {
      var texcoords = texcoordsStr.split(/\s/);
      var uvs = [];
      for (i = 0; i < texcoords.length; i += 2) {
        v = new THREE.Vector2();
        v.x = parseFloat(texcoords[i + 0]);
        v.y = parseFloat(texcoords[i + 1]);
        uvs.push(v);
      }
    }

    // Now pull out the face indices
    if (hasTexCoord)
      var texIndices = texcoordIndexStr.split(/\s/);
    for (i = 0; i < indices.length; i++) {
      var faceIndices = [];
      var uvIndices = [];
      while (parseFloat(indices[i]) >= 0) {
        faceIndices.push(parseFloat(indices[i]));
        if (hasTexCoord)
          uvIndices.push(parseFloat(texIndices[i]));
        i++;
      }

      while (faceIndices.length > 3) {
        // Take the last three, make a triangle, and remove the
        // middle one (works for convex & continuously wrapped)
        if (hasTexCoord) {
          // Add to the UV layer
          geometry.faceVertexUvs[0].push([
            uvs[parseFloat(uvIndices[uvIndices.length - 3])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 2])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 1])].clone()
          ]);
          // Remove the second-to-last vertex
          var tmp = uvIndices[uvIndices.length - 1];
          uvIndices.pop();
          uvIndices[uvIndices.length - 1] = tmp;
        }
        // Make a face
        geometry.faces.push(new THREE.Face3(
          faceIndices[faceIndices.length - 3],
          faceIndices[faceIndices.length - 2],
          faceIndices[faceIndices.length - 1]
        ));
        // Remove the second-to-last vertex
        tmp = faceIndices[faceIndices.length - 1];
        faceIndices.pop();
        faceIndices[faceIndices.length - 1] = tmp;
      }

      // Make a face with the final three
      if (faceIndices.length === 3) {
        if (hasTexCoord) {
          geometry.faceVertexUvs[0].push([
            uvs[parseFloat(uvIndices[uvIndices.length - 3])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 2])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 1])].clone()
          ]);
        }

        geometry.faces.push(new THREE.Face3(
          faceIndices[0], faceIndices[1], faceIndices[2]
        ));
      }
    }

    geometry.computeBoundingSphere();
    geometry.computeFaceNormals();

    return geometry;
  },

  parseSphere: function(sphere) {
    console.log('Parse Sphere');

    var radius = getNodeAttribute(sphere, 'radius', '1');
    var subdivision = getNodeAttribute(sphere, 'subdivision', '8,8').split(',');
    return new THREE.SphereGeometry(radius, subdivision[0], subdivision[1]);
  }
};

function getNodeAttribute(node, attributeName, defaultValue) {
  if (attributeName in node.attributes)
    return node.attributes.getNamedItem(attributeName).value;
  return defaultValue;
}

function convertStringToVec3(s) {
  s = s.split(/\s/);
  var v = new THREE.Vector3(parseFloat(s[0]), parseFloat(s[1]), parseFloat(s[2]));
  return v;
}

function convertStringToQuaternion(s) {
  var pos = s.split(/\s/);
  var q = new THREE.Quaternion();
  q.setFromAxisAngle(
    new THREE.Vector3(parseFloat(pos[0]), parseFloat(pos[1]), parseFloat(pos[2])),
    parseFloat(pos[3])
  );
  return q;
}

function convertStringTorgb(s) {
  var v = convertStringToVec3(s);
  return new THREE.Color(v.x, v.y, v.z);
}
