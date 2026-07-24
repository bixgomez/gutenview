/**
 * GutenView: Remove-block button.
 *
 * Adds a "minus" button beside the "+" that core shows on a new, empty block
 * (`.block-editor-block-list__empty-block-inserter`), so an accidentally added
 * block can be removed right there instead of digging through the block toolbar's
 * overflow menu.
 *
 * The button reuses core's own button classes so it is visually identical to the
 * "+", and removes the currently selected block via the public block-editor store
 * action. Removal is undoable with the editor's normal undo.
 *
 * Core renders that inserter transiently (it appears and disappears as empty
 * blocks come and go), so we watch for it and re-inject as needed.
 *
 * @package GutenView
 */

( function () {
	'use strict';

	/* Matches the geometry of core's plus icon, so the pair look like a set. */
	var MINUS_SVG =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M6 11H17.5V12.5H6V11Z"></path></svg>';

	/*
	 * Documents currently being watched, as { doc, obs } records.
	 *
	 * The editor swaps the canvas iframe on post-to-post navigation and when
	 * toggling the code editor, so entries have to be released rather than
	 * accumulated: a discarded Document whose observer is still connected keeps
	 * the whole document tree alive for the rest of the session.
	 */
	var watchers = [];

	/**
	 * Translated button label, if wp.i18n is available.
	 *
	 * @return {string}
	 */
	function label() {
		if ( window.wp && window.wp.i18n && window.wp.i18n.__ ) {
			return window.wp.i18n.__( 'Remove block', 'gutenview' );
		}
		return 'Remove block';
	}

	/**
	 * Remove the block currently selected (the empty one the inserter belongs to).
	 */
	function removeCurrentBlock() {
		if ( ! window.wp || ! window.wp.data ) {
			return;
		}
		try {
			var clientId = window.wp.data
				.select( 'core/block-editor' )
				.getSelectedBlockClientId();
			if ( clientId ) {
				window.wp.data.dispatch( 'core/block-editor' ).removeBlock( clientId );
			}
		} catch ( e ) {
			// Store API changed / unavailable: fail silently.
		}
	}

	/**
	 * Inject the minus button into one empty-block inserter.
	 *
	 * @param {Element} inserter
	 */
	function decorate( inserter ) {
		if ( ! inserter || inserter.querySelector( '.gutenview-remove-block' ) ) {
			return;
		}

		var doc = inserter.ownerDocument;
		var btn = doc.createElement( 'button' );

		btn.type = 'button';
		btn.className =
			'components-button block-editor-inserter__toggle is-next-40px-default-size has-icon gutenview-remove-block';
		btn.setAttribute( 'aria-label', label() );
		btn.setAttribute( 'title', label() );
		btn.innerHTML = MINUS_SVG;

		// Don't let the editor treat this as a canvas click / selection change.
		btn.addEventListener( 'mousedown', function ( e ) {
			e.preventDefault();
			e.stopPropagation();
		} );
		btn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			e.stopPropagation();
			removeCurrentBlock();
		} );

		inserter.insertBefore( btn, inserter.firstChild );
	}

	/**
	 * Decorate every empty-block inserter currently in a document.
	 *
	 * @param {Document} doc
	 */
	function scan( doc ) {
		if ( ! doc || ! doc.querySelectorAll ) {
			return;
		}
		var found = doc.querySelectorAll( '.block-editor-block-list__empty-block-inserter' );
		for ( var i = 0; i < found.length; i++ ) {
			decorate( found[ i ] );
		}
	}

	/**
	 * Whether a watched document has been discarded by the editor.
	 *
	 * A detached iframe's document loses its defaultView, which is the cheapest
	 * reliable signal. The outer document is never stale.
	 *
	 * @param {Document} doc
	 * @return {boolean}
	 */
	function isStale( doc ) {
		if ( doc === document ) {
			return false;
		}
		return ! doc.defaultView || ! doc.documentElement;
	}

	/**
	 * Disconnect and drop any watcher whose document is gone.
	 */
	function prune() {
		for ( var i = watchers.length - 1; i >= 0; i-- ) {
			if ( ! isStale( watchers[ i ].doc ) ) {
				continue;
			}
			try {
				if ( watchers[ i ].obs ) {
					watchers[ i ].obs.disconnect();
				}
			} catch ( e ) {
				// Already torn down with its document.
			}
			watchers.splice( i, 1 );
		}
	}

	/**
	 * Whether this document already has a watcher.
	 *
	 * @param {Document} doc
	 * @return {boolean}
	 */
	function isWatched( doc ) {
		for ( var i = 0; i < watchers.length; i++ ) {
			if ( watchers[ i ].doc === doc ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Observe a document for the inserter appearing. rAF-throttled, since the
	 * editor mutates constantly.
	 *
	 * @param {Document} doc
	 */
	function watch( doc ) {
		if ( ! doc || isWatched( doc ) ) {
			return;
		}
		var target = doc.body || doc.documentElement;
		if ( ! target ) {
			return;
		}
		scan( doc );

		var win = doc.defaultView || window;
		var MO = win.MutationObserver || window.MutationObserver;
		if ( ! MO ) {
			watchers.push( { doc: doc, obs: null } );
			return;
		}

		var queued = false;
		var obs = new MO( function () {
			if ( queued ) {
				return;
			}
			queued = true;
			win.requestAnimationFrame( function () {
				queued = false;
				scan( doc );
			} );
		} );
		obs.observe( target, { childList: true, subtree: true } );
		watchers.push( { doc: doc, obs: obs } );
	}

	/**
	 * Core may render this inserter in the outer document or inside the canvas
	 * iframe depending on context, so cover both.
	 */
	function ensure() {
		prune();
		watch( document );
		var iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
		if ( iframe && iframe.contentDocument ) {
			watch( iframe.contentDocument );
		}
	}

	function boot() {
		ensure();
		setInterval( ensure, 1000 );
	}

	if ( document.readyState !== 'loading' ) {
		boot();
	} else {
		document.addEventListener( 'DOMContentLoaded', boot );
	}
} )();
