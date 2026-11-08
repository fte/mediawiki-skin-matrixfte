/**
 * MATRIX skin — animated digital rain + terminal clock.
 *
 * The rain is drawn on a fixed canvas behind the skin panels. Rendering is
 * capped at 30 fps and the backing bitmap is limited on large/high-DPI screens.
 * Animation is paused when the tab is hidden and disabled for reduced motion.
 *
 * ResourceLoader may execute skin modules before the body is parsed, so every
 * DOM lookup happens inside init(), called on DOMContentLoaded.
 */
( function () {
	'use strict';

	function init() {
		var canvas = document.getElementById( 'matrix-canvas' );
		var ctx = canvas && canvas.getContext ? canvas.getContext( '2d' ) : null;
		var reduceMotion = window.matchMedia
			? window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
			: false;
		var chars = 'アカサタナハマヤラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%"\'#&_(),.;:?!\\|{}<>[]^~';
		var fontSize = 16;
		var columns = 0;
		var drops = [];
		var dpr = 1;
		var lastFrame = 0;
		var frameInterval = 1000 / 30;
		var rafId = null;
		var resizeTimer = null;
		// Bound the backing bitmap memory (about 32 MiB for RGBA pixels).
		var maxCanvasPixels = 8 * 1024 * 1024;
		var maxDpr = 2;
		// Reuse a small palette instead of constructing/parsing rgba strings per glyph.
		var greenPalette = [
			'rgba(0, 255, 65, 0.35)',
			'rgba(0, 255, 65, 0.5)',
			'rgba(0, 255, 65, 0.7)',
			'rgba(0, 255, 65, 0.9)'
		];

		function getDpr( w, h ) {
			var requestedDpr = Math.min( window.devicePixelRatio || 1, maxDpr );
			var pixelBudgetDpr = Math.sqrt( maxCanvasPixels / ( w * h ) );
			return Math.min( requestedDpr, pixelBudgetDpr );
		}

		function resize() {
			// The canvas is hidden by CSS in reduced-motion mode; do no canvas work.
			if ( !canvas || !ctx || reduceMotion ) {
				return;
			}
			var w = window.innerWidth;
			var h = window.innerHeight;
			dpr = getDpr( w, h );
			canvas.width = Math.max( 1, Math.floor( w * dpr ) );
			canvas.height = Math.max( 1, Math.floor( h * dpr ) );
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
			fontSize = w < 700 ? 13 : 16;
			columns = Math.max( 1, Math.floor( w / fontSize ) );
			drops = [];
			for ( var i = 0; i < columns; i++ ) {
				drops[ i ] = Math.random() * ( h / fontSize );
			}
			ctx.setTransform( dpr, 0, 0, dpr, 0, 0 );
			ctx.font = fontSize + 'px "Share Tech Mono", monospace';
			ctx.textBaseline = 'top';
		}

		function draw( now ) {
			if ( reduceMotion || document.hidden ) {
				rafId = null;
				return;
			}
			if ( now - lastFrame < frameInterval ) {
				rafId = window.requestAnimationFrame( draw );
				return;
			}
			lastFrame = now;

			var w = window.innerWidth;
			var h = window.innerHeight;
			ctx.fillStyle = 'rgba(0, 0, 0, 0.085)';
			ctx.fillRect( 0, 0, w, h );
			ctx.font = fontSize + 'px "Share Tech Mono", monospace';
			ctx.textBaseline = 'top';

			for ( var i = 0; i < columns; i++ ) {
				var ch = chars.charAt( Math.floor( Math.random() * chars.length ) );
				var x = i * fontSize;
				var y = drops[ i ] * fontSize;
				var r = Math.random();

				if ( r > 0.995 ) {
					ctx.fillStyle = '#ffffff';
					ctx.shadowColor = '#00ff41';
					ctx.shadowBlur = 8;
				} else if ( r > 0.9 ) {
					ctx.fillStyle = 'rgba(190, 255, 205, 0.95)';
					ctx.shadowColor = '#00ff41';
					ctx.shadowBlur = 4;
				} else {
					ctx.fillStyle = greenPalette[ Math.floor( Math.random() * greenPalette.length ) ];
					ctx.shadowBlur = 0;
				}

				ctx.fillText( ch, x, y );

				if ( y > h && Math.random() > 0.975 ) {
					drops[ i ] = 0;
				} else {
					drops[ i ] += 1;
				}
			}

			ctx.shadowBlur = 0;
			rafId = window.requestAnimationFrame( draw );
		}

		function start() {
			if ( reduceMotion || document.hidden || !canvas || !ctx ) {
				return;
			}
			if ( rafId !== null ) {
				window.cancelAnimationFrame( rafId );
			}
			lastFrame = 0;
			rafId = window.requestAnimationFrame( draw );
		}

		function stop() {
			if ( rafId !== null ) {
				window.cancelAnimationFrame( rafId );
				rafId = null;
			}
		}

		window.addEventListener( 'resize', function () {
			window.clearTimeout( resizeTimer );
			resizeTimer = window.setTimeout( function () {
				resize();
				stop();
				start();
			}, 150 );
		} );

		document.addEventListener( 'visibilitychange', function () {
			if ( document.hidden ) {
				stop();
			} else {
				start();
			}
		} );

		if ( window.matchMedia ) {
			var motionQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );
			var onMotionChange = function ( event ) {
				reduceMotion = event.matches;
				stop();
				if ( !reduceMotion ) {
					resize();
					start();
				}
			};
			if ( motionQuery.addEventListener ) {
				motionQuery.addEventListener( 'change', onMotionChange );
			} else if ( motionQuery.addListener ) {
				motionQuery.addListener( onMotionChange );
			}
		}

		if ( canvas && ctx && !reduceMotion ) {
			resize();
			start();
			if ( document.fonts && document.fonts.ready ) {
				document.fonts.ready.then( function () {
					stop();
					resize();
					start();
				} );
			}
		}

		/* Pages spéciales : la barre d'onglets peut être vide. On la masque
		   même si le navigateur ne supporte pas :has(). */
		var pageTools = document.getElementById( 'page-tools' );
		if ( pageTools && !pageTools.querySelector( 'a' ) ) {
			pageTools.hidden = true;
		}

		/* Terminal clock (UTC, because the Matrix has no timezone). */
		var clock = document.getElementById( 'matrix-clock' );
		function tick() {
			if ( !clock ) {
				return;
			}
			var d = new Date();
			var pad = function ( n ) {
				return String( n ).padStart( 2, '0' );
			};
			clock.textContent = pad( d.getUTCHours() ) + ':' +
				pad( d.getUTCMinutes() ) + ':' +
				pad( d.getUTCSeconds() ) + ' UTC';
		}
		if ( clock ) {
			tick();
			window.setInterval( tick, 1000 );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init, { once: true } );
	} else {
		init();
	}
}() );
