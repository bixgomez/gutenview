/**
 * GutenView: Add-block button at the end.
 *
 * Places a real, working "+" button below the final top-level block, so there is
 * always an obvious place to continue writing.
 *
 * Note this is deliberately NOT one of the ghost hints: those are cosmetic decoys
 * that hand off to WordPress's own between-block inserter, and no native inserter
 * exists after the last block, which is exactly why the ghost is suppressed there.
 * So this button does the insert itself, via the public block-editor store action.
 * The result is undoable with the editor's normal undo.
 *
 * The button is injected into the canvas (the iframe in WP 6.3+), just after the
 * block list, and re-placed if React moves or removes it.
 *
 * @package GutenView
 */

( function () {
	'use strict';

	/* Core's plus icon, so it reads as the same family as the native inserters. */
	var PLUS_SVG =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M11 12.5V17.5H12.5V12.5H17.5V11H12.5V6H11V11H6V12.5H11Z"></path></svg>';

	/*
	 * The canvas document currently being watched, and its observer.
	 *
	 * Only one canvas exists at a time, and the editor swaps it on post-to-post
	 * navigation and when toggling the code editor. The previous one has to be
	 * disconnected rather than merely forgotten: an observer left connected to a
	 * discarded document keeps that whole tree alive for the rest of the session.
	 */
	var current = { doc: null, obs: null };
	var lastSeenId = null;

	/**
	 * The document holding the blocks: the canvas iframe, or the main document
	 * for non-iframe editors.
	 *
	 * @return {Document|null}
	 */
	function getCanvasDoc() {
		var iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
		if ( iframe && iframe.contentDocument && iframe.contentDocument.querySelector( '.is-root-container' ) ) {
			return iframe.contentDocument;
		}
		if ( document.querySelector( '.is-root-container' ) ) {
			return document;
		}
		return null;
	}

	/**
	 * Append a new block at the end of the document and select it.
	 */
	function addBlockAtEnd() {
		if ( ! window.wp || ! window.wp.data ) {
			return;
		}
		try {
			var select = window.wp.data.select( 'core/block-editor' );
			var dispatch = window.wp.data.dispatch( 'core/block-editor' );
			var order = select.getBlockOrder();

			if ( order && order.length ) {
				dispatch.insertAfterBlock( order[ order.length - 1 ] );
			} else if ( window.wp.blocks ) {
				// Empty document: just insert a paragraph.
				dispatch.insertBlock( window.wp.blocks.createBlock( 'core/paragraph' ) );
			}
		} catch ( e ) {
			// Store API changed / unavailable: fail silently.
		}
	}

	/**
	 * Client id of the last top-level block, used to notice when a block lands at
	 * (or leaves) the end of the document.
	 *
	 * @param {Document} doc
	 * @return {string|null}
	 */
	function lastBlockId( doc ) {
		var root = doc.querySelector( '.is-root-container' );
		if ( ! root ) {
			return null;
		}
		var kids = root.children;
		var last = null;
		for ( var i = 0; i < kids.length; i++ ) {
			if ( kids[ i ].classList && kids[ i ].classList.contains( 'block-editor-block-list__block' ) ) {
				last = kids[ i ];
			}
		}
		return last ? last.getAttribute( 'data-block' ) : null;
	}

	/**
	 * Replay the CSS fade-in. The animation only runs when an element is created,
	 * and this button persists across edits (it is merely re-placed), so it has to
	 * be restarted explicitly: clear the animation, force a reflow, hand it back.
	 *
	 * @param {Element} btn
	 */
	function restartFade( btn ) {
		btn.style.animation = 'none';
		void btn.offsetWidth; // Force reflow so the animation can re-trigger.
		btn.style.animation = '';
	}

	/**
	 * Build the button.
	 *
	 * @param {Document} doc
	 * @return {Element}
	 */
	function build( doc ) {
		var btn = doc.createElement( 'button' );
		var label = ( window.wp && window.wp.i18n && window.wp.i18n.__ )
			? window.wp.i18n.__( 'Add block', 'gutenview' )
			: 'Add block';

		btn.type = 'button';
		btn.className = 'gutenview-end-inserter';
		btn.setAttribute( 'aria-label', label );
		btn.setAttribute( 'title', label );
		btn.innerHTML = PLUS_SVG;

		// Don't let the editor treat this as a canvas click / selection change.
		btn.addEventListener( 'mousedown', function ( e ) {
			e.preventDefault();
			e.stopPropagation();
		} );
		btn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			e.stopPropagation();
			addBlockAtEnd();
		} );

		return btn;
	}

	/**
	 * Make sure exactly one button sits immediately after the block list.
	 *
	 * @param {Document} doc
	 */
	function ensureButton( doc ) {
		var root = doc.querySelector( '.is-root-container' );
		if ( ! root || ! root.parentNode ) {
			return;
		}

		var btn = doc.querySelector( '.gutenview-end-inserter' );
		var id = lastBlockId( doc );

		if ( btn && btn.isConnected ) {
			// React may have moved things around; keep it just after the list.
			if ( btn.previousElementSibling !== root ) {
				root.parentNode.insertBefore( btn, root.nextSibling );
			}
			// A block arrived at (or left) the end: fade back in at the new spot.
			if ( id !== lastSeenId ) {
				lastSeenId = id;
				restartFade( btn );
			}
			return;
		}

		// Freshly built: the CSS animation plays on its own, so just record the id.
		lastSeenId = id;
		root.parentNode.insertBefore( build( doc ), root.nextSibling );
	}

	/**
	 * Stop watching the current canvas and release it.
	 */
	function detach() {
		if ( current.obs ) {
			try {
				current.obs.disconnect();
			} catch ( e ) {
				// Already torn down with its document.
			}
		}
		current.doc = null;
		current.obs = null;
		lastSeenId = null;
	}

	/**
	 * Watch a document, re-placing the button as the editor re-renders.
	 * rAF-throttled, since the editor mutates constantly.
	 *
	 * @param {Document} doc
	 */
	function watch( doc ) {
		if ( ! doc || current.doc === doc ) {
			return;
		}
		var target = doc.body || doc.documentElement;
		if ( ! target ) {
			return;
		}

		// A new canvas replaces the old one, so let the old one go first.
		detach();
		current.doc = doc;
		ensureButton( doc );

		var win = doc.defaultView || window;
		var MO = win.MutationObserver || window.MutationObserver;
		if ( ! MO ) {
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
				ensureButton( doc );
			} );
		} );
		obs.observe( target, { childList: true, subtree: true } );
		current.obs = obs;
	}

	function ensure() {
		var doc = getCanvasDoc();
		if ( ! doc ) {
			// Canvas is gone (or reloading); release it and wait for the next one.
			detach();
			return;
		}
		watch( doc );
		ensureButton( doc );
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
