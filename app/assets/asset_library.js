/* global Asset, Observable */
'use strict';

class AssetLibrary extends Observable { // eslint-disable-line no-unused-vars
  constructor() {
    super();
    this.assets = [];
    fetch('/robot-designer/assets/assets.json')
      .then(response => response.text())
      .then((txt) => this._loadAssets(JSON.parse(txt)));
  }

  _loadAssets(assetsData) {
    Object.keys(assetsData).forEach((assetName) => {
      var assetData = assetsData[assetName];
      var asset = new Asset(assetName, assetData);
      this.assets.push(asset);
    });
    this.notify('loaded', null);
  }
}
