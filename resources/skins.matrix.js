/**
 * MATRIX skin — animated digital rain + terminal clock.
 *
 * The rain is drawn on a fixed canvas behind the skin panels. It is intentionally
 * lightweight: 30 fps max, device pixel ratio capped at 2, animation paused when
 * the tab is hidden, and completely disabled for users who prefer reduced motion.
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

		function getDpr() {
			return Math.min( window.devicePixelRatio || 1, 2 );
		}

		function drawStatic() {
			var w = window.innerWidth;
			var h = window.innerHeight;
			ctx.setTransform( dpr, 0, 0, dpr, 0, 0 );
			ctx.clearRect( 0, 0, w, h );
			ctx.fillStyle = '#000';
			ctx.fillRect( 0, 0, w, h );
			ctx.font = fontSize + 'px "Share Tech Mono", monospace';
			ctx.textBaseline = 'top';
			for ( var i = 0; i < columns; i++ ) {
				var x = i * fontSize;
				var y = Math.random() * h;
				ctx.fillStyle = 'rgba(0, 255, 65, ' + ( 0.12 + Math.random() * 0.3 ) + ')';
				ctx.fillText( chars.charAt( Math.floor( Math.random() * chars.length ) ), x, y );
			}
		}

		function resize() {
			var w = window.innerWidth;
			var h = window.innerHeight;
			dpr = getDpr();
			canvas.width = Math.floor( w * dpr );
			canvas.height = Math.floor( h * dpr );
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
			if ( reduceMotion ) {
				drawStatic();
			}
		}

		function draw( now ) {
			if ( !reduceMotion && now - lastFrame < frameInterval ) {
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

				if ( r > 0.985 ) {
					ctx.fillStyle = '#ffffff';
					ctx.shadowColor = '#00ff41';
					ctx.shadowBlur = 12;
				} else if ( r > 0.8 ) {
					ctx.fillStyle = 'rgba(190, 255, 205, 0.95)';
					ctx.shadowColor = '#00ff41';
					ctx.shadowBlur = 6;
				} else {
					ctx.fillStyle = 'rgba(0, 255, 65, ' + ( 0.35 + Math.random() * 0.55 ) + ')';
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
			if ( reduceMotion ) {
				drawStatic();
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
				resize();
				start();
			};
			if ( motionQuery.addEventListener ) {
				motionQuery.addEventListener( 'change', onMotionChange );
			} else if ( motionQuery.addListener ) {
				motionQuery.addListener( onMotionChange );
			}
		}

		if ( canvas && ctx ) {
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
