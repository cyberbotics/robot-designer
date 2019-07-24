/* global Asset, Observable */
'use strict';

class AssetLibrary extends Observable { // eslint-disable-line no-unused-vars
  constructor(pathPrefix = '') {
    super();
    this.pathPrefix = pathPrefix;
    this.assets = [];
    this.robotNames = [];

    fetch(this.pathPrefix + 'robot-designer/assets/assets.json')
      .then(response => response.text())
      .then((txt) => this._loadAssets(JSON.parse(txt)));
  }

  getPath() {
    return this.pathPrefix + 'robot-designer/assets/';
  }

  getRobotNames() {
    return this.robotNames;
  }

  getAssetByName(assetName) {
    for (let a = 0; a < this.assets.length; a++) {
      if (this.assets[a].name === assetName)
        return this.assets[a];
    }
    return undefined;
  }

  _loadAssets(assetsData) {
    Object.keys(assetsData).forEach((assetName) => {
      var assetData = assetsData[assetName];
      var asset = new Asset(assetName, assetData);
      asset.icon = this.pathPrefix + asset.icon;
      this.assets.push(asset);
      let robotName = asset.getRobotName();
      if (!this.robotNames.includes(robotName))
        this.robotNames.push(robotName);
    });

    this.notify('loaded', null);
  }
}
