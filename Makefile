# See the README for installation instructions.

NODE_PATH = ./node_modules
JS_COMPILER = $(NODE_PATH)/uglify-js/bin/uglifyjs
CS_COMPILER = $(NODE_PATH)/coffee-script/bin/coffee
JS_TESTER = $(NODE_PATH)/vows/bin/vows

JS_FILES = \
	d3.data_grid.js

CS_FILES = \
	data_grid.coffee

all: \
	$(CS_FILES) \
	$(JS_FILES) \
	$(JS_FILES:.js=.min.js) \
	package.json

d3.data_grid.js: \
	src/start.js\
	build/root.js \
	src/picnet/search.js \
	build/data_grid.js \
	src/end.js

root.coffee:
	mkdir -p build
	$(CS_COMPILER) -b -o build/ -c src/root.coffee

data_grid.coffee: root.coffee
	mkdir -p build
	$(CS_COMPILER) -b -o build/ -c src/data_grid/data_grid.coffee

test: all
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@

d3.%: Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@
	@chmod a-w $@

install:
	mkdir -p node_modules
	npm install

package.json: d3.data_grid.js src/package.js
	node src/package.js > $@

clean:
	rm -f d3*.js
