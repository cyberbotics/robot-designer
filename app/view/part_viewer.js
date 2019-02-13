'use strict';

class PartViewer { // eslint-disable-line no-unused-vars
  constructor(robotController, element, selector) {
    this.robotController = robotController;
    this.element = element;
    selector.addObserver('SelectionChanged', (d) => this._showPart(d.part));
    this._cleanupDiv('No selection');
  }

  _showPart(part) {
    if (part === null)
      this._cleanupDiv('No selection');
    else {
      var model = part.mediator.model;
      var asset = model.asset;
      this._populateDiv(model, asset.parameters);
    }
  }

  _populateDiv(model, parameters) {
    this.element.innerHTML = '';

    // add name label.
    var nameLabel = document.createElement('p');
    nameLabel.innerHTML = 'Name: ' + model.name;
    this.element.appendChild(nameLabel);

    var text = document.createElement('p');
    if (!parameters) {
      text.innerHTML = '<i>No parameters<i>';
      this.element.appendChild(text);
      return;
    }

    // create parameter forms.
    var form = document.createElement('form');
    if ('color' in parameters) {
      text.style.display = 'inline';
      var textContent = document.createTextNode('Color: ');
      text.appendChild(textContent);
      form.appendChild(text);
      var select = document.createElement('select');
      select.style.display = 'inline';
      for (let c in parameters.color) {
        var option = document.createElement('option');
        var optionText = document.createTextNode(parameters.color[c]);
        var valueAtt = document.createAttribute('value');
        valueAtt.value = parameters.color[c];
        option.setAttributeNode(valueAtt);
        option.appendChild(optionText);
        select.appendChild(option);
      }
      select.addEventListener('change', (event) => {
        var color = event.target.value;
        this.robotController.changeColor(model, color);
      });
      form.appendChild(select);
    }
    this.element.appendChild(form);
  }

  _cleanupDiv(text) {
    this.element.innerHTML = '<p><i>' + text + '</i></p>';
  }
}
