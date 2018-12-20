# Short-term TODO list

## App features

- Part browser
- Part viewer
- Translation / Rotation
- PBR appearance
- Build process (using Babel, JSCompress or so)
- Part rejection mechanism (based on THREE.js AABB?)

### Integration to Webots

- Webots Exporter (=> .wbt)

### Integration to NRP

- Gazebo exporter
- CSS for NRP based on NRP requirements (cf. mockup)
- Simplify in prevision of the integration with the NRP toolbar
- Simple Gazebo models of the assets

## Webots assets importer

### Script

- If possible, automatize the assets importation.

### Webots

- Export Slots with types, etc.
- Export creaseAngle (for THREE.js) in addition of normals (for X3Dom)
- Export PBRAppearance (for THREE.js) in addition of Appearance (for X3Dom)

## Known issues

- Design document does not match well the implementation.
- Increase the use of ECS6
