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

DEPENDENCIES_PATH = app/dependencies
THEEEJS_VERSION = 105
WEBOTS_VERSION = R2020a

JS_SOURCES = \
  $(DEPENDENCIES_PATH)/webots-module.js \
  app/bin/fullscreen.js \
  app/bin/observable.js \
  app/bin/outline_pass.js \
  app/bin/transform_controls.js \
  app/bin/undo_stack.js \
  app/assets/asset.js \
  app/assets/asset_library.js \
  app/model/part.js \
  app/model/robot.js \
  app/commands/commands.js \
  app/controller/robot_controller.js \
  app/view/dragger.js \
  app/view/ghost.js \
  app/view/handle.js \
  app/view/highlightor.js \
  app/view/mediator/part_mediator.js \
  app/view/mediator/robot_mediator.js \
  app/view/part_browser.js \
  app/view/part_viewer.js \
  app/view/robot_viewer.js \
  app/view/part_selector.js \
  app/view/slot_anchors.js \
  app/robot_designer.js

# external sources to be downloaded and minified
THREEJS_EXAMPLE_URL = https://cdn.jsdelivr.net/gh/mrdoob/three.js@r$(THEEEJS_VERSION)/examples/js/
THREEJS_EXAMPLE_SOURCES = \
  controls/OrbitControls.js
LOCAL_THREEJS_EXAMPLE_SOURCES = $(addprefix $(DEPENDENCIES_PATH)/,$(THREEJS_EXAMPLE_SOURCES))

# Token file used to determine when the last successful installation occurred.
INSTALL_TOKEN = app/install.token

.PHONY: release debug profile update cleanse clean

NPM_EXISTS = $(shell which npm 2> /dev/null)

ifeq ($(NPM_EXISTS),)
release debug profile update:
	@echo "# Please install nodejs to build 'webots.min.js' using the instructions on the GitHub wiki."
else
release debug profile update: app/web-robot-designer.js
endif

app/web-robot-designer.js: $(JS_SOURCES) $(LOCAL_THREEJS_EXAMPLE_SOURCES) $(INSTALL_TOKEN)
	@echo "# compressing web-robot-designer.js"
	@node_modules/.bin/babel $(LOCAL_THREEJS_EXAMPLE_SOURCES) $(JS_SOURCES) -o app/web-robot-designer.js --presets "@babel/preset-env"

$(LOCAL_THREEJS_EXAMPLE_SOURCES):
	$(eval FILENAME=$(@:$(DEPENDENCIES_PATH)/%=%))
	@echo "# downloading three.js $@"
	@mkdir -p $(dir $@)
	@wget -qN -O $@ $(THREEJS_EXAMPLE_URL)$(FILENAME)

$(DEPENDENCIES_PATH)/webots-module.js:
	@echo "# downloading $@"
	@mkdir -p $(dir $@)
	@wget -qN -O $@ https://www.cyberbotics.com/files/repository/www/wwi/$(WEBOTS_VERSION)/webots-module.js

$(INSTALL_TOKEN): package.json
	@echo "# installing npm dependencies"
	@npm --silent install 1> /dev/null
	@touch $(INSTALL_TOKEN)

cleanse: clean
	@echo "# uninstalling npm dependencies"
	@npm --silent uninstall 1> /dev/null
	@rm -fr node_modules $(INSTALL_TOKEN) package-lock.json

clean:
	@rm -fr app/web-robot-designer.js $(DEPENDENCIES_PATH)
