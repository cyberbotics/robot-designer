'use strict';

class AssetComponent { // eslint-disable-line no-unused-vars
  constructor(assetLibraryElement, assetLibrary) {
    this.assetLibraryElement = assetLibraryElement;
    this.assetLibrary = assetLibrary;
    this.partIconDivs = [];
  }

  loadAssets() {
    this.assetLibrary.assets.forEach((asset) => {
      var div = document.createElement('div');
      if (asset.root) {
        div.innerHTML = '' +
          '<div class="part-icon" draggable="true" ondragstart="dragStart(event)" part="' + asset.name + '" >' +
            '<img draggable="false" src="' + asset.icon + '" />' +
          '</div>';
      } else {
        div.innerHTML = '' +
          '<div class="part-icon hidden" draggable="true" ondragstart="dragStart(event)" part="' + asset.name + '" slotType="' + asset.slotType + '">' +
            '<img draggable="false" src="' + asset.icon + '" />' +
          '</div>';
      }
      this.partIconDivs.push(div.firstChild);
      this.assetLibraryElement.appendChild(div.firstChild);
    });
  }

  update(scene) {
    // TODO Passing the scene as an argument is not clean.
    // At some point, Asset and Slot classes would be useful.
    var availableSlotTypes = [];
    scene.traverse(function(obj) {
      if (obj.userData.x3dType === 'Slot' && obj.children.length === 0)
        availableSlotTypes.push(obj.userData.slotType);
    });
    availableSlotTypes = availableSlotTypes.filter((v, i, a) => a.indexOf(v) === i); // unique
    for (let d = 0; d < this.partIconDivs.length; d++) {
      var div = this.partIconDivs[d];
      if (availableSlotTypes.length === 0) {
        if (div.getAttribute('slotType'))
          div.classList.add('hidden');
        else
          div.classList.remove('hidden');
      } else {
        if (div.getAttribute('slotType')) {
          if (availableSlotTypes.indexOf(div.getAttribute('slotType')) > -1)
            div.classList.remove('hidden');
          else
            div.classList.add('hidden');
        } else
          div.classList.add('hidden');
      }
    }
  }
}
