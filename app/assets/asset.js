'use strict';

class Asset { // eslint-disable-line no-unused-vars
  constructor(name, assetData) {
    this.name = name;
    this.root = assetData.root === true;
    this.icon = assetData.icon;
    this.slotType = assetData.slotType;
    this.slots = assetData.slots;
  }

  getSlotNames() {
    return Object.keys(this.slots);
  }
}
