## Assets Definition

The assets defining the robot parts have to be listed one after the other in the `assets.json` file.
This section describes the supported properties.

Here is a simple example of valid `asset.json`:
```
{
  "tinkerbots/base": {
    "proto": "TinkerbotsBase",
    "icon": "/robot-designer/assets/models/tinkerbots/base/icon.png",
    "root": true,
    "slots": {
      "upSlot": {
        "type": "tinkerbots",
        "translation": "0 0 0.02",
        "rotationSnap": 1.5708,
        "rotationGizmoVisibility": [false, false, true],
        "translationSnap": 0
      }
    }
  }
}
```

### Part Properties

The part is identified by a name that should represent the path in which the part model stored in a X3D file named `model.x3d` is located.
These properties are mandatory and need to be specified for each part:

- `proto`: string that specifies the name of model used for the export. This should for example match the Webots PROTO name.

- `icon`: string that specifies the path to the model icon to be shown in the part browser.

- `slots`: list of slots specifying where other parts can be connected. The slot properties are defined in the next section.

Other optional properties:

* `root`: boolean that specifies if the part is the main robot core. Default value is *false*.

* `slotType`: string that specifies the slot type of the current part.

### Slot Properties

In order to have a user-friendly slot snap system, slots have different properties.
It is important that the slot identifier matched the Webots PROTO model slot name in order to have a fully working export mechanism.

- `type`: string that specifies the slot type of the current part. Only parts having a matching `slotType` can be connected.

- `translation`: 3D vector string that specifies the slot position: for example *"0 0 0.02"*.

- `rotation`: 3D vector string that specifies the slot orientation using Euler axis-angle format: for example *"0 0 1 1.5708"*.

- `translationSnap`: size of translation step used when moving the connected part using the translation handles: for example *0.01*. Default value is *-1* that corresponds to an infinitesimal step size. Setting `translationSnap` to *0* will disable moving the connected part.

- `translationHandleVisibility`: boolean array that specifies which of the *x*, *y*, or *z* translation axis are enabled: for example *[false, false, true]* will only enable translation on the *z*-axis. Default value is *[true, true, true]*.

- `rotationSnap`: size of rotation step used when moving the connected part using the rotation gizmo: for example *1.5708*. Default value is *-1* that corresponds to an infinitesimal step size. Setting `rotationSnap` to *0* will disable rotating the connected part.

- `rotationGizmoVisibility`: boolean array that specifies which of the *x*, *y*, or *z* rotation axis are enabled: for example *[false, false, true]* will only enable rotation on the *z*-axis. Default value is *[true, true, true]*.
