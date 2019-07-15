/* global Asset, Observable */
'use strict';

class AssetLibrary extends Observable { // eslint-disable-line no-unused-vars
  constructor() {
    super();
    this.assets = [];
    this.robotNames = [];

    this.packagePath = '';
    let scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      let url = scripts[i].src;
      if (url && (url.endsWith('robot_designer.js') || url.endsWith('robot-designer.min.js'))) {
        this.packagePath = url.substring(0, url.lastIndexOf('/', url.lastIndexOf('/', url.lastIndexOf('/') - 1) - 1) + 1);
        break;
      }
    }
    fetch(this.packagePath + 'robot-designer/assets/assets.json')
      .then(response => response.text())
      .then((txt) => this._loadAssets(JSON.parse(txt)));
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
      asset.icon = this.packagePath + asset.icon;
      this.assets.push(asset);
      let robotName = asset.getRobotName();
      if (!this.robotNames.includes(robotName))
        this.robotNames.push(robotName);
    });

    this.notify('loaded', null);
  }
}
