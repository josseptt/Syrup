/**
 * Created by gmena on 07-26-14.
 * Interceptor: ['redirect']
 */


(function (window) {

	var WARNING_ROUTE = {
		ERROR: {
			BADINSTANCE: 'App instance needed'
		}
	};

	'use strict';
	/**Router
	 * @constructor
	 */
	function Router () {
		this.routes = {};
		this.history = window.history;
		this.cleanParam = /([\w]+:)/g;
		this.findParams = /([\w]+:[\w\[\]\-\+\(\)]+)/g;
		this.onpopstate = {};
		this.interceptors = {};
		this.breadcrumbs = [];
		this.module = null;
		this.default = true;

		var _self = this;

		//Set Pop State
		window.addEventListener ('popstate', function (e) {
			//Get the route name
			if ( _.isSet (e.state) && 'route_name' in e.state ) {
				if ( e.state.route_name in _self.onpopstate ) {
					_.each (_self.onpopstate[e.state.route_name], function (v, i) {
						v (e.state, e);

						//Intercept pop state
						_self._handleInterceptor ('redirect', e);

					}, true);
				}
			}
		});

	}

	/**Set the target
	 * @param {object} routes
	 * @return {object}
	 * */
	Router.add ('connect', function (to_route) {
		if ( !(to_route instanceof AppClass) )
			_.error (WARNING_ROUTE.ERROR.BADINSTANCE, '(Router .route)');

		this.module = to_route;
		to_route.lazy = true;
		return this;
	});

	/**Set the routes
	 * @param {object} routes
	 * @return {object}
	 * */
	Router.add ('set', function (routes) {
		var _self = this;

		return (new Promise (function (resolve, reject) {
			_self.routes = _.extend (_self.routes, routes);
			resolve (_self);
		}))
	});

	/**Delegate routes
	 * @param {string} route_name
	 * @param {object} conf
	 * @returns {object}
	 */
	Router.add ('when', function (route_name, conf) {
		_.assert (route_name, _.WARNING_SYRUP.ERROR.NOPARAM, '(Router .when)');
		var _self = this,
			_router;

		//No app. Nothing to do!!
		if (
			!(conf && 'app' in conf)
			|| !(route_name in _self.routes)
		)
			return _self;

		//No route?
		if ( !(route_name in _self.onpopstate) )
			_self.onpopstate[route_name] = [];

		//Append a new route
		_self.onpopstate[route_name].push (function (state, e) {
			//Handle tpl?
			_self._handleSkull (conf, function () {
				//On main tpl is handled, what to do?


				if ( conf.app in _self.module.appCollection ) {
					//Intercept init
					//Inject params
					_self.module.appCollection[conf.app].intercept ({
						'init': function (mod) {
							mod.uri = {
								params     : state,
								breadcrumbs: _self.breadcrumbs,
								route      : _self.routes[route_name]
							}
						}
					});

					//Taste recipes
					_self.module.appCollection[conf.app].taste ();
				}

			}, [state, e])

		});

		//First action
		//Routing!!!
		if (
			_self.default
			&& (_router = _self._route (route_name))
		) {
			//No default
			//No more routing after found!!!
			_self.default = false;
			_self.redirect (route_name, _router.query, _router);
		}

		return _self;

	});

	/**Live Redirect
	 * @param {string} url
	 * @return {object}
	 * */
	Router.add ('liveRedirect', function (url) {
		location.href = url;
		return this;
	});

	/**Redirect to route
	 * @param {string} route_name
	 * @return {object}
	 * */
	Router.add ('redirect', function (route_name, params, config) {
		_.assert (route_name, _.WARNING_SYRUP.ERROR.NOPARAM, '(Router .redirect)');

		var _self = this,
			_the_route = null,
			_the_new_route = null,
			_params = null, _config = {
				trigger: true
			};

		//Redirect
		return (new Promise (function (resolve, reject) {

			//Not routing
			if ( !(route_name in _self.routes) ) {
				reject (route_name);
				return;
			}

			//Params and config
			_params = _.isObject (params) && params || {};
			_config = _.extend (_config, config || {}, true);

			//Set old regex in state object
			_the_new_route = _the_route = _self.routes[route_name];

			//Clean Uri? or Rewrite rules or the route
			_the_new_route = 'uri' in _config && _config.uri
							 || _self._rewriteRules (_the_new_route, _params)
							 || _the_new_route;

			//Resolve params
			_params = (_.getObjectSize (_params) > 0 && _params)
					  || _self._reverseUriParams (
					  _config.uri || _the_new_route,
					  _the_route, 'route' in _config && _config.route
				) || {};

			//Set state in history
			_self._triggerPopState (
				_.extend (_params, { 'route_name': route_name }),
				route_name, _the_new_route, _config
			);

			//Resolve Promise
			resolve (_the_new_route);

		}));
	});

	/** Default route
	 * @param  {object} interceptors
	 * @return {object}
	 * */
	Router.add ('otherwise', function (route_name, conf) {
		if (
			_.isString (route_name)
			&& route_name in this.routes
			&& this.default
		) {
			this.when (route_name, conf);
			this.redirect (route_name, {});
		}

		return this;
	});

	/** Reverse, from route to uri
	 * @param  {string} route_name
	 * @param {object} params
	 * @return {string}
	 * */
	Router.add ('reverse', function (route_name, params) {
		if ( route_name in this.routes )
			return this._rewriteRules (this.routes[route_name], params || {})
				   || this.routes[route_name];

		return _.emptyStr;
	});

	/** Interceptors
	 * @param  {object} interceptors
	 * @return {object}
	 * */
	Router.add ('intercept', function (interceptors) {
		if ( _.isObject (interceptors) )
			MiddleWare.intercept (this, interceptors);
		return this;
	});

	/** Clean Interceptors
	 * @param  {string} type
	 * @return {object}
	 * */
	Router.add ('interceptClean', function (type) {
		//Clean the interceptor
		MiddleWare.cleanInterceptor (this, type);
		return this;
	});

	/** Routing
	 * @param {string} route_name
	 * @return {void}
	 */
	Router.add ('_route', function (route_name) {
		var _the_route = this.routes[route_name],
			_query_params = _.queryStringToJson (location.search),
			_uri_path = this._rewriteRules (_the_route, _query_params) || location.pathname,
			_uri_path_slash_index = _.oChars (_uri_path, '/'),
			_the_route_slash_index = _.oChars (_the_route, '/');

		//Clean param from route
		_the_route = this._cleanedUriParams (_the_route);

		//In route '/' slash not needed at end
		if ( _uri_path_slash_index > _the_route_slash_index
		) {
			//Remove last slash from pathname
			_uri_path = _.truncateString (_uri_path, -1);
		} else if ( _the_route_slash_index > _uri_path_slash_index ) {
			//In route '/' slash needed at end
			//Append slash to route
			_uri_path += '/';
		}

		return this._matchUri (_the_route, _uri_path) ? {
			uri  : _uri_path,
			route: _the_route,
			query: _query_params,
			match: true
		} : false;
	});

	/** Handle Tpl Skulls
	 * @param {string} tpl
	 * @param {function} callback
	 * @return {void}
	 */
	Router.add ('_handleSkull', function (conf, callback, params) {
		var _view = new View;

		//Clear cache?
		if ( !conf.cache )
			_view.cleanCache (conf.tpl);

		//Get the tpl skull
		_view.seekTpl (conf.tpl).then (function (view) {
			// Find main
			var _main = _$ ('[sp-app]');
			// Exist the skull?
			if ( _main.exist )
				_main.html (view.getTpl ());

			//Execute
			callback.apply (conf.app, params);
		});
	});

	/** Handle the interceptors
	 * @param {string} type
	 * @param {object} param
	 * @return {void}
	 * */
	Router.add ('_handleInterceptor', function (type, param) {
		//Trigger Interceptors
		MiddleWare.trigger (
			MiddleWare.getInterceptors (this, type),
			[param, this]
		);

		//Clean the interceptor
		//MiddleWare.cleanInterceptor(this, type);
	});

	/** Match the uri
	 * @param {string} _the_route
	 * @param {string} _uri_path
	 * @return {string}
	 */
	Router.add ('_matchUri', function (_the_route, _uri_path) {
		//Clean param from route
		return (_.toRegExp ('^' + _the_route + '$').test (_uri_path))
	});

	/** Clean params from RegExp
	 * @param {string} _the_route
	 * @return {string}
	 */
	Router.add ('_cleanedUriParams', function (_the_route) {
		//Clean param from route
		return _.replace (_the_route, this.cleanParam, _.emptyStr);
	});

	/** Get params from uri, using regexp
	 * @param {string} _the_route
	 * @return {string}
	 */
	Router.add ('_reverseUriParams', function (_the_uri, _the_route, clean_route) {
		var _match = _.replaceInArray (':', _.emptyStr, _the_route.match (this.cleanParam)),
			_route = clean_route || this._cleanedUriParams (_the_route);

		return _match && _.toObject (
				_match, _.compactArray (
					_the_uri.split (
						_.toRegExp (_route)
					)
				)
			) || {}

	});

	/** Uri rewrite
	 * @param {string} _the_new_route
	 * @param {object} _params
	 * @return {void}
	 * */
	Router.add ('_rewriteRules', function (_the_new_route, _params) {

		//Exists params?
		//Rewrite rules uri
		//Get the params groups
		var _findParams = this.findParams,
			_get_groups = _.getObjectSize (_params) > 0 && _.getRegExpGroup (
					_the_new_route, _findParams, _.getObjectKeys (_params)
				);

		//Rewrite URL
		return (_get_groups && _.replace (
				_the_new_route, _findParams,
				_.toObject (
					_.getObjectValues (_get_groups),
					_.getObjectValues (_params)
				)
			)) || false;

	});

	//Go back
	Router.add ('goBack', function () {
		//pop last
		this.breadcrumbs.pop (); //actual
		var _previous = this.breadcrumbs.pop (); //previous

		//Set state in history
		this._triggerPopState (
			_previous.params,
			_previous.route,
			_previous.new_route,
			{ trigger: true }
		);
	});


	/** Trigger the pop state
	 * @param {object} _params
	 * @param {string} route_name
	 * @param {string} _the_new_route
	 * @return {void}
	 * */
	Router.add ('_triggerPopState', function (_params, route_name, _the_new_route, _config) {
		//Set state in history
		//Two times, for trigger "popstate"

		if ( _config.trigger ) {
			//Push states
			this.breadcrumbs.push ({ params: _params, route: route_name, new_route: _the_new_route });
			this.history.pushState (_params, route_name, _the_new_route);
			this.history.pushState (_params, route_name, _the_new_route);
			this.history.back ();
		}


	});

	//Global access
	window.Router = Router;

}) (window);