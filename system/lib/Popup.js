/**
 * Created by gmena on 07-26-14.
 */

'use strict';
/**Popup
 * @constructor
 */

var WARNING_SYRUP_POPUP = {
	ERROR: {
		NOPOPUP: 'There are no popup created.'
	}
};

function Popup () {
	this.nav = _.getNav ();
	this.popup = null;
	this.popupClass = '.popupBox';
	this.overlay = null;
	this.overlayClass = '.overlayFondo';
	this.conf = {
		popup:   {
			'overflow':        'hidden',
			'backgroundColor': '#fff',
			'position':        'absolute',
			'zIndex':          '1200'
		},
		overlay: {
			'backgroundColor': 'rgba(0, 0, 0, 0.7)',
			'height':          '100%',
			'width':           '100%',
			'position':        'fixed',
			'top':             '0',
			'left':            '0',
			'zIndex':          '1000'
		}
	};

}

//Extend Conf
Popup.add ( 'conf', function ( conf ) {
	if ( _.isSet ( conf.popup ) ) {
		_.extend ( this.conf.popup, conf.popup, true );
	}

	if ( _.isSet ( conf.overlay ) ) {
		_.extend ( this.conf.overlay, conf.overlay, true );
	}
} );

//Create Popup
Popup.add ( 'create', function ( contenido, width, height ) {

	this.conf.popup[this.nav.nav === 'firefox'
		? 'MozBoxSizing' : 'boxSizing'] = 'border-box';

	var _popup = _$ ( '<div class="popupBox"></div>' ),
	    _overlay = _$ ( '<div class="overlayFondo"></div>' ),
	    _top , _left,
	    _body = _$ ( 'body' ),
	    _window = _$ ( window ),
	    _windowWidth = _window.width (),
	    _windowHeigth = _window.height ();

	this.popup = _popup;
	this.overlay = _overlay;

	_overlay.css ( this.conf.overlay );
	_popup.css ( this.conf.popup );
	_body.append ( _popup );
	_body.append ( _overlay );
	_popup.html ( contenido );

	if ( !_.isSet ( height ) ) {
		height = _popup.height ();
	}

	if ( !_.isSet ( width ) ) {
		width = _popup.width ();
	}

	_top = Math.abs ( Math.ceil ( (_windowHeigth - height) / 2 ) );
	_left = Math.abs ( Math.ceil ( (_windowWidth - width) / 2 ) );

	if ( height > _windowHeigth ) {
		height = (_windowHeigth - (_top * 2));
	}

	if ( width > _windowWidth ) {
		width = (_windowWidth - (_left * 2));
	}

	_popup.width ( width );
	_popup.height ( height );
	_popup.offset ( {y: _top, x: _left} );
	return {top: _top, left: _left, width: width, height: height};
} );


//Remove Popup
Popup.add ( 'remove', function () {
	if ( !this.overlay || !this.popup ) {
		_.warning ( WARNING_SYRUP_POPUP.ERROR.NOPOPUP );
		return;
	}

	this.overlay.remove ();
	this.popup.remove ();
	this.overlay = null;
	this.popup = null;
} );

