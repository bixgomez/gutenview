/**
 * GutenView: Add-block buttons at the edges.
 *
 * Places a real, working "+" above the first top-level block and below the final
 * one, so there is always an obvious place to start writing and to continue.
 *
 * Note these are deliberately NOT ghost hints: those are cosmetic decoys that hand
 * off to WordPress's own between-block inserter, and no native inserter exists at
 * either outer edge, which is exactly why the ghosts are suppressed there. So these
 * buttons do the insert themselves, via the public block-editor store actions. The
 * result is undoable with the editor's normal undo.
 *
 * The buttons are injected into the canvas (the iframe in WP 6.3+), on either side
 * of the block list, and re-placed if React moves or removes them.
 *
 * @package GutenView
 */

( function () {
	'use strict';

	/*
	 * Core's plus icon, so it reads as the same family as the native inserters.
	 * The width/height attributes are only a fallback; edge-block-inserters.css sets
	 * the real size, which changes between the resting and hover states.
	 */
	var PLUS_SVG =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M11 12.5V17.5H12.5V12.5H17.5V11H12.5V6H11V11H6V12.5H11Z"></path></svg>';

	/*
	 * Fallback gap (px) for a document with fewer than two top-level blocks, where
	 * there is no block-to-block spacing to measure. Same value add-block-links.js
	 * falls back to, so the two features agree.
	 */
	var GAP_DEFAULT = 32;

	/* The two edges, in DOM order. */
	var EDGES = [ 'start', 'end' ];

	/*
	 * The canvas document currently being watched, and its observer.
	 *
	 * Only one canvas exists at a time, and the editor swaps it on post-to-post
	 * navigation and when toggling the code editor. The previous one has to be
	 * disconnected rather than merely forgotten: an observer left connected to a
	 * discarded document keeps that whole tree alive for the rest of the session.
	 */
	var current = { doc: null, obs: null };

	/* Per-edge client id of the block that edge currently touches. */
	var lastSeen = { start: null, end: null };

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
	 * Top-level blocks (direct children of the root container).
	 *
	 * @param {Element|null} root
	 * @return {Element[]}
	 */
	function topLevelBlocks( root ) {
		var out = [];
		if ( ! root ) {
			return out;
		}
		var kids = root.children;
		for ( var i = 0; i < kids.length; i++ ) {
			if ( kids[ i ].classList && kids[ i ].classList.contains( 'block-editor-block-list__block' ) ) {
				out.push( kids[ i ] );
			}
		}
		return out;
	}

	/**
	 * The block an edge sits against.
	 *
	 * @param {Element[]} blocks
	 * @param {string}    edge   'start' or 'end'.
	 * @return {Element|null}
	 */
	function edgeBlock( blocks, edge ) {
		if ( ! blocks.length ) {
			return null;
		}

		return 'start' === edge ? blocks[ 0 ] : blocks[ blocks.length - 1 ];
	}

	/**
	 * Client id of the block at an edge, used to notice when a block lands at (or
	 * leaves) that end of the document.
	 *
	 * @param {Element[]} blocks
	 * @param {string}    edge
	 * @return {string|null}
	 */
	function edgeBlockId( blocks, edge ) {
		var block = edgeBlock( blocks, edge );

		return block ? block.getAttribute( 'data-block' ) : null;
	}

	/**
	 * The theme's gap between top-level blocks, measured from the pair nearest the
	 * given edge.
	 *
	 * @param {Element[]} blocks
	 * @param {string}    edge
	 * @return {number} Pixels.
	 */
	function blockGap( blocks, edge ) {
		if ( blocks.length < 2 ) {
			return GAP_DEFAULT;
		}
		var above = 'start' === edge ? blocks[ 0 ] : blocks[ blocks.length - 2 ];
		var below = 'start' === edge ? blocks[ 1 ] : blocks[ blocks.length - 1 ];

		return Math.max( 0, Math.round( below.getBoundingClientRect().top - above.getBoundingClientRect().bottom ) );
	}

	/**
	 * Add a block at one end of the document and select it.
	 *
	 * @param {string} edge 'start' or 'end'.
	 */
	function addBlockAtEdge( edge ) {
		if ( ! window.wp || ! window.wp.data ) {
			return;
		}
		try {
			var select = window.wp.data.select( 'core/block-editor' );
			var dispatch = window.wp.data.dispatch( 'core/block-editor' );
			var order = select.getBlockOrder();

			if ( order && order.length ) {
				if ( 'start' === edge ) {
					dispatch.insertBeforeBlock( order[ 0 ] );
				} else {
					dispatch.insertAfterBlock( order[ order.length - 1 ] );
				}
			} else if ( window.wp.blocks ) {
				// Empty document: just insert a paragraph.
				dispatch.insertBlock( window.wp.blocks.createBlock( 'core/paragraph' ) );
			}
		} catch ( e ) {
			// Store API changed / unavailable: fail silently.
		}
	}

	/**
	 * Sit a button where a between-block inserter would sit: centered in one theme
	 * gap outside the block it belongs to.
	 *
	 * Themes decide their own block spacing, and the buttons are siblings of the
	 * block list rather than part of it, so the offset has to be measured rather
	 * than guessed. Each edge is moved by whichever property costs no layout there,
	 * which is also what makes a single measuring pass enough:
	 *
	 *   - The start button is offset with `top`, against the zero-height footprint
	 *     the stylesheet gives it. Nothing else moves, so the top of the document
	 *     sits exactly where it would if the button were not there at all.
	 *   - The end button uses margin-top. It is last in the flow, so the room it
	 *     takes is room at the bottom of the canvas, with nothing below to displace.
	 *
	 * Skipped while a button is hovered or focused, where the CSS scale is in
	 * effect: getBoundingClientRect() reports transformed geometry, so measuring
	 * then would chase the button's own hover state.
	 *
	 * @param {Element}   btn
	 * @param {Element[]} blocks
	 * @param {string}    edge
	 */
	function position( btn, blocks, edge ) {
		try {
			if ( btn.matches( ':hover' ) || btn.matches( ':focus-visible' ) ) {
				return;
			}
		} catch ( e ) {
			// Selector unsupported: fall through and position anyway.
		}

		var block = edgeBlock( blocks, edge );
		if ( ! block ) {
			btn.style.removeProperty( 'top' );
			btn.style.removeProperty( 'margin-top' );
			return;
		}

		var isStart = ( 'start' === edge );
		var side    = isStart ? 'top' : 'marginTop';
		var rect    = btn.getBoundingClientRect();
		var edgeBox = block.getBoundingClientRect();
		var half    = blockGap( blocks, edge ) / 2;

		var center  = rect.top + ( rect.height / 2 );
		var target  = isStart ? edgeBox.top - half : edgeBox.bottom + half;
		var offset  = parseFloat( btn.style[ side ] ) || 0;
		var next    = Math.round( offset + target - center );

		if ( next !== offset ) {
			btn.style[ side ] = next + 'px';
		}
	}

	/**
	 * Replay the CSS fade-in. The animation only runs when an element is created,
	 * and these buttons persist across edits (they are merely re-placed), so it has
	 * to be restarted explicitly: clear the animation, force a reflow, hand it back.
	 *
	 * @param {Element} btn
	 */
	function restartFade( btn ) {
		btn.style.animation = 'none';
		void btn.offsetWidth; // Force reflow so the animation can re-trigger.
		btn.style.animation = '';
	}

	/**
	 * Build a button for one edge.
	 *
	 * @param {Document} doc
	 * @param {string}   edge
	 * @return {Element}
	 */
	function build( doc, edge ) {
		var btn = doc.createElement( 'button' );
		var label = ( window.wp && window.wp.i18n && window.wp.i18n.__ )
			? window.wp.i18n.__( 'Add block', 'gutenview' )
			: 'Add block';

		btn.type = 'button';
		btn.className = 'gutenview-edge-inserter gutenview-edge-inserter--' + edge;
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
			addBlockAtEdge( edge );
		} );

		return btn;
	}

	/**
	 * Whether a button already sits on its own side of the block list.
	 *
	 * @param {Element} btn
	 * @param {Element} root
	 * @param {string}  edge
	 * @return {boolean}
	 */
	function isPlaced( btn, root, edge ) {
		return 'start' === edge
			? btn.nextElementSibling === root
			: btn.previousElementSibling === root;
	}

	/**
	 * Put a button on its own side of the block list.
	 *
	 * @param {Element} btn
	 * @param {Element} root
	 * @param {string}  edge
	 */
	function place( btn, root, edge ) {
		root.parentNode.insertBefore( btn, 'start' === edge ? root : root.nextSibling );
	}

	/**
	 * Make sure exactly one button sits on each side of the block list.
	 *
	 * @param {Document} doc
	 */
	function ensureButtons( doc ) {
		var root = doc.querySelector( '.is-root-container' );
		if ( ! root || ! root.parentNode ) {
			return;
		}

		var blocks = topLevelBlocks( root );

		for ( var i = 0; i < EDGES.length; i++ ) {
			var edge = EDGES[ i ];
			var btn = doc.querySelector( '.gutenview-edge-inserter--' + edge );
			var id = edgeBlockId( blocks, edge );

			if ( btn && btn.isConnected ) {
				// React may have moved things around; keep it beside the list.
				if ( ! isPlaced( btn, root, edge ) ) {
					place( btn, root, edge );
				}
				// A block arrived at (or left) this edge: fade back in at the new spot.
				if ( id !== lastSeen[ edge ] ) {
					lastSeen[ edge ] = id;
					restartFade( btn );
				}
			} else {
				// Freshly built: the CSS animation plays on its own, so just record the id.
				lastSeen[ edge ] = id;
				btn = build( doc, edge );
				place( btn, root, edge );
			}

			position( btn, blocks, edge );
		}
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
		lastSeen.start = null;
		lastSeen.end = null;
	}

	/**
	 * Watch a document, re-placing the buttons as the editor re-renders.
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
		ensureButtons( doc );

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
				ensureButtons( doc );
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
		ensureButtons( doc );
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
