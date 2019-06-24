# Copyright 1996-2019 Cyberbotics Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

JS_SOURCES = \
  bin/Fullscreen.js \
  bin/Observable.js \
  bin/UndoStack.js \
  assets/asset.js \
  assets/asset_library.js \
  model/part.js \
  model/robot.js \
  commands/commands.js \
  controller/robot_controller.js \
  view/dragger.js \
  view/ghost.js \
  view/handle.js \
  view/highlightor.js \
  view/mediator/part_mediator.js \
  view/mediator/robot_mediator.js \
  view/part_browser.js \
  view/part_viewer.js \
  view/robot_viewer.js \
  view/part_selector.js \
  view/slot_anchors.js \
  robot_designer.js

BABEL_JS_SOURCES = \
  node_modules/@babel/polyfill/dist/polyfill.js

DEPENDENCIES_PATH = dependencies
THEEEJS_VERSION = 104

# external sources to be downloaded and minified
THREEJS_EXAMPLE_URL = https://cdn.jsdelivr.net/gh/mrdoob/three.js@r$(THEEEJS_VERSION)/examples/js/
THREEJS_EXAMPLE_SOURCES = \
  controls/OrbitControls.js \
  controls/TransformControls.js \
  postprocessing/OutlinePass.js
LOCAL_THREEJS_EXAMPLE_SOURCES = $(addprefix $(DEPENDENCIES_PATH)/,$(THREEJS_EXAMPLE_SOURCES))

# Token file used to determine when the last successful installation occurred.
INSTALL_TOKEN = install.token

.PHONY: release debug profile update cleanse clean

NPM_EXISTS = $(shell which npm 2> /dev/null)

ifeq ($(NPM_EXISTS),)
release debug profile update:
	@echo "# Please install nodejs to build 'webots.min.js' using the instructions on the GitHub wiki."
else
release debug profile update: robot-designer.min.js
endif

robot-designer.min.js: $(JS_SOURCES) $(LOCAL_THREEJS_EXAMPLE_SOURCES) $(INSTALL_TOKEN)
	@echo "# compressing robot-designer.min.js"
	node_modules/.bin/babel $(LOCAL_THREEJS_EXAMPLE_SOURCES) $(JS_SOURCES) $(BABEL_JS_SOURCES) -o robot-designer.tmp1.js --presets "@babel/preset-env"
	@node_modules/.bin/minify robot-designer.tmp1.js -o robot-designer.min.js
	@rm robot-designer.tmp1.js

$(LOCAL_THREEJS_EXAMPLE_SOURCES):
	$(eval FILENAME=$(@:$(DEPENDENCIES_PATH)/%=%))
	@echo "# downloading three.js $@"
	@mkdir -p $(dir $@)
	wget -qN -O $@ $(THREEJS_EXAMPLE_URL)$(FILENAME)

$(INSTALL_TOKEN): package.json
	@echo "# installing npm dependencies"
	@npm --silent install 1> /dev/null
	@touch $(INSTALL_TOKEN)

cleanse: clean
	@echo "# uninstalling npm dependencies"
	@npm --silent uninstall 1> /dev/null
	@rm -fr node_modules $(INSTALL_TOKEN) package-lock.json

clean:
	@rm -fr *.min.js $(DEPENDENCIES_PATH)
