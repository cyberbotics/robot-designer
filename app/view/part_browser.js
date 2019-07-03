'use strict';

class PartBrowser { // eslint-disable-line no-unused-vars
  constructor(assetLibraryElement, assetLibrary, dragStartCallback) {
    this.assetLibraryElement = assetLibraryElement;
    this.assetLibrary = assetLibrary;
    this.robotsTabDivs = {};
    this.partIconDivs = [];
    this.dragStartCallback = dragStartCallback;

    this.selectElement = document.createElement('select');
    this.selectElement.classList.add('nrp-robot-designer-part-browser-select');
    this.selectElement.addEventListener('change', () => { this.showParts(); });

    var labelBlock = document.createElement('div');
    labelBlock.classList.add('nrp-robot-designer-part-browser-label');
    labelBlock.innerHTML = '<p>Library</p>';
    labelBlock.appendChild(this.selectElement);
    this.assetLibraryElement.appendChild(labelBlock);
  }

  loadAssets() {
    // create robots tabs
    this.assetLibrary.getRobotNames().forEach((robotName) => {
      // content
      let div = document.createElement('div');
      div.id = this._capitalize(robotName);
      div.classList.add('nrp-robot-designer-part-browser-content');
      this.robotsTabDivs[robotName] = div;
      this.assetLibraryElement.appendChild(div);

      // tab button
      let option = document.createElement('option');
      option.classList.add('nrp-robot-designer-part-browser-option');
      option.setAttribute('value', robotName);
      option.innerHTML = this._capitalize(robotName);
      this.selectElement.appendChild(option);
    });

    this.assetLibrary.assets.forEach((asset) => {
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
      iconDiv.addEventListener('dragstart', (event) => { this.dragStartCallback(event); });
      div.appendChild(iconDiv);
      this.partIconDivs.push(iconDiv);
      this.robotsTabDivs[asset.getRobotName()].appendChild(iconDiv);
    });

    this.showParts(this.selectElement.firstChild, this.assetLibrary.getRobotNames()[0]);
  }

  update(robot) {
    var availableSlotTypes = robot.getAvailableSlotTypes();
    for (let d = 0; d < this.partIconDivs.length; d++) {
      var div = this.partIconDivs[d];
      if (availableSlotTypes.length === 0) {
        if (div.getAttribute('slotType'))
          div.classList.add('hidden');
        else
          div.classList.remove('hidden');
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
        } else
          div.classList.add('hidden');
      }
    }
  }

  showParts() {
    var robotName = this.selectElement.options[this.selectElement.selectedIndex].value;

    for (let key in this.robotsTabDivs)
      this.robotsTabDivs[key].style.display = 'none';

    this.robotsTabDivs[robotName].style.display = 'block';
  }

  _capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
