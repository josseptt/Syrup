/**
 * Created by gmena on 07-26-14.
 */

'use strict';

/**Http
 * @constructor
 */


function Http () {
	this.xhr = new window.XMLHttpRequest
			   || new window.ActiveXObject ("Microsoft.XMLHTTP");
	this.xhr_list = [];
	this.upload = null;
	this.before = null;
	this.complete = null;
	this.progress = null;
	this.state = null;
	this.abort = null;
	this.error = null;
	this.time_out = null;
}

/*** Event handler
 * @param event
 * @param callback
 * @return void
 * */
Http.add ('on', function (event, callback) {
	var self = this;
	return [
		{
			before  : function () {
				self.before = callback;
			},
			complete: function () {
				self.complete = callback;
			},
			abort   : function () {
				self.abort = callback;
			},
			state   : function () {
				self.state = callback;
			},
			timeout : function () {
				self.time_out = callback;
			},
			progress: function () {
				self.progress = callback;
			}
		}[event] ()
	]

});

/** Http Request
 * @param config
 * @param callback
 * @return object
 *
 * Config object {
 *  url: (string) the request url
 *  type: (string) the request type GET or POST
 *	async: bool,
 *	timeout: (int) request timeout,
 *	processor: (string) ajax server side processor file extension,
 *	token: (string or bool) CSRF token needed?,
 *	contentType: (string) the content type,
 *	data: (object) the request data,
 *	upload: (bool) is upload process?
 *
 * }
 * **/
Http.add ('request', function (config) {
	if ( !_.isObject (config) ) {
		throw (WARNING_SYRUP.ERROR.NOOBJECT)
	}

	var _self = this,
		_xhr = _self.xhr,
		_async = config.async || true,
		_type = (config.method || 'GET').toUpperCase (),
		_timeout = config.timeout || 0xFA0,
		_cors = config.cors || false,
		_processor = config.processor || setting.processor,
		_token = config.token || null,
		_contentType = config.contentType || 'application/x-www-form-urlencoded;charset=utf-8',
		_data = config.data || null,
		_contentHeader = {
			header: 'Content-Type',
			value : _contentType
		};


	return (new Promise (function (resolve, reject) {

		if ( !_.isSet (config.url) )
			reject (WARNING_SYRUP.ERROR.NOURL);

		if ( !_.isFormData (_data)
			 && _.isSet (_data)
			 && _contentType !== 'auto'
		) {
			_data = _.jsonToQueryString (_data);
		}

		if ( _type === 'GET' && _.isSet (_data) ) {
			_processor += '?' + _data;
		}

		//Process url
		_processor = config.url + (_processor || '');
		_xhr.open (_type, _processor, _async);
		_xhr.timeout = _timeout;

		//Setting Headers
		if ( !_.isFormData (_data) && _contentType !== 'auto' ) {
			_self.requestHeader (
				_contentHeader.header,
				_contentHeader.value
			);
		}

		//Cors?
		if ( _.isSet (_cors) )
			_xhr.withCredentials = true;

		//Using Token
		if ( _.isSet (_token) )
			_self.requestHeader ("X-CSRFToken", _token);

		//If upload needed
		if ( _.isSet (config.upload) && _.isBoolean (config.upload) ) {
			_self.upload = _self.xhr.upload;
			_xhr = _self.upload;
		}

		//Event Listeners
		_xhr.addEventListener ('load', function (e) {
			if ( this.status >= 0xC8 && this.status < 0x190 ) {
				var _response = this.response || this.responseText;
				if ( _.isJson (_response) ) {
					_response = JSON.parse (_response);
				}
				resolve (_response);
			}
		});

		_xhr.addEventListener ('progress', function (e) {
			if ( _self.progress ) {
				_self.progress (e);
			}
		}, false);

		_xhr.addEventListener ('readystatechange', function (e) {
			if ( this.readyState ) {
				if ( !!_self.state ) {
					_self.state (this.readyState, e);
				}
			}
		});

		_xhr.addEventListener ('abort', function (e) {
			if ( !!_self.abort ) {
				_self.abort (e);
			}
		});

		_xhr.addEventListener ('timeout', function (e) {
			if ( !!_self.time_out ) {
				_self.time_out (e);
			}
		});

		_xhr.addEventListener ('loadend', function (e) {
			if ( !!_self.complete ) {
				_self.complete (e);
			}
		});

		_xhr.addEventListener ('loadstart', function (e) {
			if ( !!_self.before ) {
				_self.before (e);
			}
		});

		_xhr.addEventListener ('error', function (e) {
			reject (e);
		});


		//Send
		_self.xhr_list.push (_self.xhr);
		_xhr.send (_type !== 'GET' ? _data : null);
	}));

});


/**Get request
 * @param url
 * @param data
 * @param callback
 * */
Http.add ('get', function (url, data) {
	var _conf = {
		url : url || location.href,
		data: data || {}
	};

	this.kill ();
	return this.request (_conf);
});


/**Post request
 * @param url
 * @param data
 * @param callback
 * */
Http.add ('post', function (url, data) {
	var _conf = {
		method: 'POST',
		url   : url || location.href,
		data  : data || {}
	};

	this.kill ();
	return this.request (_conf);
});


/** Set Request Header
 * @param header
 * @param type
 * @return object
 * **/
Http.add ('requestHeader', function (header, type) {
	this.xhr.setRequestHeader (header, type);
	return this;
});

//Kill Http
Http.add ('kill', function () {
	var i = this.xhr_list.length;
	while ( i-- ) {
		if ( !!this.xhr_list[i] )
			this.xhr_list[i].abort ();
	}
	this.xhr_list.length = 0;

	return this;
});

