class AssetLibraryComponent { // eslint-disable-line no-unused-vars
  constructor(assetLibraryElement) {
    this.assetLibraryElement = assetLibraryElement;
    this.partIconDivs = [];

    fetch('/robot-designer/assets/assets.json')
      .then(response => response.text())
      .then((txt) => this.loadAssets(JSON.parse(txt)));
  }

  loadAssets(assets) {
    var that = this;
    Object.keys(assets).forEach(function(assetName) {
      var asset = assets[assetName];

      var div = document.createElement('div');
      if (asset.root)
        div.innerHTML = '' +
          '<div class="part-icon" draggable="true" ondragstart="dragStart(event)" part="' + assetName + '" >' +
            '<img draggable="false" src="' + asset.icon + '" />' +
          '</div>';
      else
        div.innerHTML = '' +
          '<div class="part-icon hidden" draggable="true" ondragstart="dragStart(event)" part="' + assetName + '" slotType="' + asset.slotType + '">' +
            '<img draggable="false" src="' + asset.icon + '" />' +
          '</div>';
      that.partIconDivs.push(div.firstChild);
      that.assetLibraryElement.appendChild(div.firstChild);
    });
  }

  update(scene) {
    // TODO Passing the scene as an argument is not clean.
    // At some point, Asset and Slot classes would be useful.
    var availableSlotTypes = [];
    scene.traverse(function(obj) {
      if (obj.userData.x3dType === 'Slot' && obj.children.length == 0)
        availableSlotTypes.push(obj.userData.slotType);
    });
    availableSlotTypes = availableSlotTypes.filter((v, i, a) => a.indexOf(v) === i); // unique
    console.log(availableSlotTypes);
    for (var d = 0; d < this.partIconDivs.length; d++) {
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
