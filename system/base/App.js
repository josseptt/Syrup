/**
 * Created by gmena on 07-31-14.
 */
"use strict";

function Apps () {
	this.root = null;
	this.lib = null;
	this.app = null;
	this.scope = {};
	this.modules = {};
	this.onchange = {};
	this.ondrop = {};
}

/** Blend a method in global Syrup object
 * @param name
 * @param dependencies []
 * @return object
 * **/
Apps.add ('blend', function (name, dependencies) {
	var _self = new Apps;
	_self.lib = new Libs;
	_self.root = name;
	_self.scope = {};
	_self.app = _$ ('[sp-app="' + name + '"]');
	_self.lib.blend (name, dependencies);

	return _self;
});

/** Make a recipe for blend
 *  @param moduleId string
 *  @param module function
 *  @return object
 * */
Apps.add ('recipe', function (moduleId, module) {
	if ( _.isSet (this.root) ) {
		if ( _.isSet (module) ) {
			this.temp = moduleId;
			this.modules[moduleId] = {
				creator : module,
				instance: null
			};
			this._taste (moduleId);
		}
	}
	return this;
});

/**Object Observer
 * @param moduleId
 * **/
Apps.add ('_watch', function (moduleId) {
	var _self = this;
	Object.observe (_self.scope, function (change) {
		_.each (change, function (v) {
			if ( _.isSet (_self.onchange[v.name])
				 && _.getObjectSize (v.object) > 0
				 && moduleId === v.name
			) {
				_self.onchange[v.name] ({
					name  : v.name,
					old   : v.oldValue,
					type  : v.type,
					object: v.object[v.name]
				});

			}
		});
	});

});

/**Add new child module
 * @param moduleId
 * @return void
 * **/
Apps.add ('_add', function (moduleId) {
	if ( !_.isObject (this.scope[moduleId]) )
		this.scope[moduleId] = {};
});

/**Trigger code execution
 * @param moduleId
 * @return void
 * **/
Apps.add ('_trigger', function (moduleId) {
	if ( _.isSet (this.modules[moduleId]) )
		return this.modules[moduleId].creator (_, _$, this.scope);
	return {}
});

/** Append global service
 * @param name
 * @param callback function
 * @return void
 *
 * */
Apps.add ('service', function (name, callback) {
	this.lib.cook (name, callback);
});

/** Append global services
 * @param object
 * @return void
 *
 * */
Apps.add ('services', function (object) {
	this.lib.supply (object);
});


Apps.add ('value', function () {

});

/**Set Scope
 * @param moduleId
 * @param object
 * @return void
 * **/
Apps.add ('setScope', function (moduleId, object) {
	if ( _.isSet (this.scope[moduleId]) ) {
		this.scope[moduleId] = object;
	}
	return this;
});

/**Get Scope
 * @param moduleId
 * @return object
 * **/
Apps.add ('getScope', function (moduleId) {
	if ( _.isSet (this.scope[moduleId]) ) {
		return this.scope[moduleId];
	}
	return {};
});

Apps.add ('when', function (event, name, callback) {
	var self = this;
	return [
		{
			change: function () {
				self.onchange[name] = callback;
			},
			drop  : function () {
				self.ondrop[name] = callback;
			}
		}[event] ()
	]
});

/** Render the View
 * @param moduleId
 * @param template
 * @return object
 */
Apps.add ('_serve', function (moduleId, template) {
	var _self = this,
		_template = null,
		_scope = _self.scope[moduleId];

	//Is set the appundefine
	if ( _self.app.exist ) {
		_self.app.find ('[sp-recipe="' + moduleId + '"]', function (mod) {
			mod.find ('[sp-view]', function (_dom) {
				if ( _.getObjectSize (_scope) > 0 ) {
					if ( _.isSet (template) && _.isString (template) ) {
						Require.request ('/view/' + template, function () {
							_template = new Template;
							if ( moduleId in _template.__proto__ )
								_template[moduleId] (_scope, function (my_html) {
									_dom.html (my_html);
								})
						})
					} else {
						mod.find ('[sp-tpl]', function (_dom_template) {
							var _parse = _dom_template.html ();
							if ( _.isSet (_parse) ) {
								_template = new Template;
								_template.parse (_parse, _scope, function (result) {
									_dom.html (result);
								});
							}
						});

					}
				}
			});
		})
	}

	return this;
});

//Execute Module
Apps.add ('_taste', function (moduleId) {
	var _self = this;

	if ( _.isSet (_self.modules[moduleId]) && _.isSet (_self.root) ) {

		//Initialize module
		_self._add (moduleId);
		_self.modules[moduleId].instance = _self._trigger (moduleId);
		_self.modules[moduleId].instance.name = moduleId;
		_self.modules[moduleId].instance.parent = _self.root;

		//Binding Methods
		_self.modules[moduleId].instance.setScope = function (object) {
			if ( _.isObject (object) ) {
				_self.setScope (moduleId, object);
				return this;
			}
		};

		_self.modules[moduleId].instance.getScope = function () {
			return _self.getScope (moduleId);
		};

		_self.modules[moduleId].instance.when = function (event, callback) {
			_self.when (event, moduleId, callback);
		};

		_self.modules[moduleId].instance.serve = function (_template) {
			_self._serve (moduleId, _template || null);
			return this;
		};

		_self.modules[moduleId].instance.listen = function (event, callback) {
			if ( _self.app.exist )
				_self.app.find ('[sp-recipe="' + moduleId + '"]', function (mod) {
					mod.listen (event, '[sp-' + event + ']', callback);
				});

			return this;
		};

		//Observe scope
		_self._watch (moduleId);

		//Init the module
		if ( _.isSet (_self.modules[moduleId].instance.init) ) {
			_self.modules[moduleId].instance.init (this.lib.get (_self.root));
			//_self._serve (moduleId, _self.modules[moduleId].instance.template || true);
		}
	}

	return this;
});

Apps.add ('drop', function (moduleId) {
	if ( _.isSet (this.modules[moduleId]) ) {
		if ( this.modules[moduleId].instance ) {
			if ( this.modules[moduleId].instance.destroy )
				this.modules[moduleId].instance.destroy (this.lib.get (this.root));

			if ( this.ondrop[moduleId] )
				this.ondrop[moduleId] (moduleId);

			this.modules[moduleId] = null;
		}
	}
	return this;
});


Apps.add ('dropAll', function () {
	var _self = this;
	_.each (this.modules, function (module, id) {
		_self.drop (id);
	});
	return this;
});

window.App = new Apps;