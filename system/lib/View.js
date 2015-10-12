/**
 * @author Geolffrey Mena <gmjun2000@gmail.com>
 */

'use strict';

/**
 * Class for View handling.
 *
 * @class
 */


var WARNING_MODEL = {
	ERROR: {
		NOPACK      : 'Error packing model',
		OBJECTNEEDED: 'Object need to set in model'
	}
};


function View () {
	this.Http = new Http;
	this.Storage = new Storage;
	this.dir = null;
	this.tpl = null;
}

/**Search for the template
 * @param {string} template
 * @return {object}
 */
View.add ('lookup', function (template) {
	var _conf = {
		url        : setting.app_path + '/templates/' + template,
		contentType: 'text/plain'
	};

	return this.Http.request (_conf);
});

//Set the template
View.add ('seekTpl', function (template) {
	var _self = this,
		_repo = _self.Storage,
		_template = null, _save = {};

	if ( !_.isSet (_repo.get ('templates')) ) {
		_repo.set ('templates', {});
	}

	_template = _repo.get ('templates');
	_self.dir = template;

	return (new Promise (function (resolve, reject) {
		if ( template in _template ) {
			_self.tpl = _template[template];
			resolve (_self)
		} else {
			//Get the template
			_self.lookup (template).then (function (temp) {
				_save[template] = temp;
				_repo.append ('templates', _save);
				_self.tpl = temp;
				resolve (_self);
			}).catch (function () {
				reject (template);
				_.error (_.WARNING_SYRUP.ERROR.NONETWORK, '(View .seekTpl)');
			});
		}
	}));

});

//Return to render html
View.add ('getTpl', function () {
	return this.tpl;
});

//Clear View from Storage
View.add ('clear', function () {
	this.Storage.clear ('templates');
	return this;
});

//Clear View from Storage
View.add ('cleanCache', function () {
	if ( this.dir ) {
		var old_templates = this.Storage.get ('templates');
		if ( old_templates ) {
			delete old_templates[this.dir]
		}

		this.Storage.set ('templates', old_templates);
		this.dir = null;
	}

	return this;
});

//Parse the View
View.add ('render', function (_template, _fields) {
	var _self = this;
	return (new Promise (function (resolve, reject) {
		_fields = _.isObject (_template) && _template || _fields;
		_template = !_.isObject (_template) && _.isString (_template) && _template || _self.tpl;

		(new Workers).set ('/workers/setting/Parser').then (function (worker) {
			worker.send ({ template: _template, fields: _fields });
			worker.on ('message', function (e) {
				resolve (e.data)
			})
		});
	}));
});

