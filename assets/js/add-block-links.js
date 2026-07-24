/**
 * GutenView: Add-block hints (measuring helper).
 *
 * Positions the cosmetic "ghost +" dead-center in the (theme-variable) gap after
 * each top-level block. It does NOT touch insertion, the block tree, or React.
 * It only measures gaps and writes one CSS custom property as an inline style on
 * each block, which the stylesheet reads:
 *
 *   --gutenview-gap  the measured pixel gap to the next block (ghost offset)
 *
 * No hover/fade logic is needed: WordPress's own between-block inserter is a
 * high-z-index popover that simply renders on top of the ghost when you approach
 * a boundary, and the ghost is pointer-events:none so it never interferes.
 *
 * React leaves unknown inline custom properties alone, so nothing is fought.
 *
 * @package GutenView
 */

( function () {
	'use strict';

	var GAP_DEFAULT = 32; // px: ghost offset after the last block (no next block to measure).
	var MAX_COLUMNS = 6;  // Core Columns caps at 6; past that, WP shows no "Add column" +.

	var subscribed = false;
	var lastEmptyId = null;

	var state = {
		doc: null,
		win: null,
		root: null,
		ro: null,
		mo: null,
		onResize: null,
		rafPos: null,
	};

	/**
	 * The document that holds the blocks: the canvas iframe, or the main
	 * document for non-iframe editors.
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
	 * @return {Element[]}
	 */
	function topLevelBlocks() {
		if ( ! state.root ) {
			return [];
		}
		var out = [];
		var kids = state.root.children;
		for ( var i = 0; i < kids.length; i++ ) {
			if ( kids[ i ].classList && kids[ i ].classList.contains( 'block-editor-block-list__block' ) ) {
				out.push( kids[ i ] );
			}
		}
		return out;
	}

	/**
	 * Client id of the selected block IF it is a brand-new, untouched default
	 * block, otherwise null.
	 *
	 * Core deliberately offers no between-block inserter next to such a block
	 * (the empty block already IS the insertion point), so a ghost in either
	 * adjacent gap would promise something that can't be clicked.
	 *
	 * @return {string|null}
	 */
	function selectedEmptyBlockId() {
		if ( ! window.wp || ! window.wp.data || ! window.wp.blocks ) {
			return null;
		}
		try {
			var select = window.wp.data.select( 'core/block-editor' );
			var clientId = select.getSelectedBlockClientId();
			if ( ! clientId || ! window.wp.blocks.isUnmodifiedDefaultBlock ) {
				return null;
			}
			var block = select.getBlock( clientId );
			if ( block && window.wp.blocks.isUnmodifiedDefaultBlock( block ) ) {
				return clientId;
			}
		} catch ( e ) {
			// Store API changed / unavailable: fail open (ghosts just stay visible).
		}
		return null;
	}

	/**
	 * Measured gap (px) below a block, to the next top-level block.
	 *
	 * @param {Element[]} blocks
	 * @param {number}    i
	 * @return {number}
	 */
	function gapBelow( blocks, i ) {
		if ( i >= blocks.length - 1 ) {
			return GAP_DEFAULT;
		}
		var a = blocks[ i ].getBoundingClientRect();
		var b = blocks[ i + 1 ].getBoundingClientRect();
		return Math.max( 0, Math.round( b.top - a.bottom ) );
	}

	/**
	 * The next sibling that is a column block, or null.
	 *
	 * @param {Element} col
	 * @return {Element|null}
	 */
	function nextColumn( col ) {
		var n = col.nextElementSibling;
		while ( n ) {
			if ( n.getAttribute && 'core/column' === n.getAttribute( 'data-type' ) ) {
				return n;
			}
			n = n.nextElementSibling;
		}
		return null;
	}

	/**
	 * How many column blocks are in this column's set (its parent Columns block).
	 *
	 * @param {Element} col
	 * @return {number}
	 */
	function columnCount( col ) {
		var parent = col.parentElement;
		if ( ! parent ) {
			return 1;
		}
		var n = 0;
		for ( var i = 0; i < parent.children.length; i++ ) {
			var child = parent.children[ i ];
			if ( child.getAttribute && 'core/column' === child.getAttribute( 'data-type' ) ) {
				n++;
			}
		}
		return n;
	}

	/**
	 * Measure horizontal gaps between columns and flag the last column of each set.
	 */
	function updateColumns() {
		var cols = state.doc.querySelectorAll( '.block-editor-block-list__block[data-type="core/column"]' );
		for ( var i = 0; i < cols.length; i++ ) {
			var col = cols[ i ];
			// At the max, WordPress shows no "Add column" +, so neither do we.
			if ( columnCount( col ) >= MAX_COLUMNS ) {
				col.style.setProperty( '--gutenview-col-ghost-display', 'none' );
				continue;
			}
			var next = nextColumn( col );
			if ( next ) {
				var gap = Math.max( 0, Math.round( next.getBoundingClientRect().left - col.getBoundingClientRect().right ) );
				col.style.setProperty( '--gutenview-col-gap', gap + 'px' );
				col.style.removeProperty( '--gutenview-col-ghost-display' );
			} else {
				// No native inserter after the last column, so hide that ghost.
				col.style.setProperty( '--gutenview-col-ghost-display', 'none' );
			}
		}
	}

	/**
	 * Write the gap offsets onto every block (vertical) and column (horizontal).
	 */
	function updatePositions() {
		state.rafPos = null;

		var blocks = topLevelBlocks();
		var last = blocks.length - 1;
		var emptyId = selectedEmptyBlockId();

		for ( var i = 0; i < blocks.length; i++ ) {
			blocks[ i ].style.setProperty( '--gutenview-gap', gapBelow( blocks, i ) + 'px' );

			// No native inserter exists after the final block.
			var hide = ( i === last );

			// Nor in either gap touching a brand-new empty block, so don't promise one.
			if ( emptyId ) {
				var next = blocks[ i + 1 ];
				if ( blocks[ i ].getAttribute( 'data-block' ) === emptyId ) {
					hide = true; // Gap below the empty block.
				}
				if ( next && next.getAttribute( 'data-block' ) === emptyId ) {
					hide = true; // Gap above the empty block.
				}
			}

			if ( hide ) {
				blocks[ i ].style.setProperty( '--gutenview-ghost-display', 'none' );
			} else {
				blocks[ i ].style.removeProperty( '--gutenview-ghost-display' );
			}
			// A void block (e.g. a separator <hr>) can't host ::after, so the ghost
			// for the gap below it is carried by THIS block's ::before instead.
			if ( i > 0 && 'HR' === blocks[ i - 1 ].tagName ) {
				blocks[ i ].style.setProperty( '--gutenview-prevsep-gap', gapBelow( blocks, i - 1 ) + 'px' );

				/*
				 * That carried ghost needs its own visibility flag. The `hide`
				 * computed above was written to the separator, whose ::after never
				 * renders, so without this the suppression is silently lost and a
				 * ghost appears beside a selected empty block after a separator.
				 */
				if ( emptyId && (
					blocks[ i ].getAttribute( 'data-block' ) === emptyId ||
					blocks[ i - 1 ].getAttribute( 'data-block' ) === emptyId
				) ) {
					blocks[ i ].style.setProperty( '--gutenview-prevsep-display', 'none' );
				} else {
					blocks[ i ].style.removeProperty( '--gutenview-prevsep-display' );
				}
			} else {
				blocks[ i ].style.removeProperty( '--gutenview-prevsep-gap' );
				blocks[ i ].style.removeProperty( '--gutenview-prevsep-display' );
			}
		}

		updateColumns();
	}

	function schedulePositions() {
		if ( state.rafPos || ! state.win ) {
			return;
		}
		state.rafPos = state.win.requestAnimationFrame( updatePositions );
	}

	function detach() {
		try { if ( state.ro ) { state.ro.disconnect(); } } catch ( e ) {}
		try { if ( state.mo ) { state.mo.disconnect(); } } catch ( e ) {}
		if ( state.win && state.onResize ) {
			state.win.removeEventListener( 'resize', state.onResize );
		}
		state.ro = state.mo = state.onResize = null;
	}

	function attach( doc ) {
		detach();
		state.doc = doc;
		state.win = doc.defaultView || window;
		state.root = doc.querySelector( '.is-root-container' );
		if ( ! state.root ) {
			return;
		}

		updatePositions();

		if ( state.win.ResizeObserver ) {
			state.ro = new state.win.ResizeObserver( schedulePositions );
			state.ro.observe( state.root );
		}
		var MO = state.win.MutationObserver || window.MutationObserver;
		if ( MO ) {
			state.mo = new MO( schedulePositions );
			state.mo.observe( state.root, { childList: true, subtree: true } );
		}
		state.onResize = schedulePositions;
		state.win.addEventListener( 'resize', state.onResize );
	}

	/**
	 * Attach to the current canvas, re-attaching if it changed (e.g. the editor
	 * swapped/reloaded the iframe on a mode switch).
	 */
	function ensure() {
		var doc = getCanvasDoc();
		if ( ! doc ) {
			return;
		}
		if ( doc !== state.doc || ! ( state.root && state.root.isConnected ) ) {
			attach( doc );
		} else {
			schedulePositions();
		}
	}

	/**
	 * Re-run when the selected-empty-block state flips, since that decides whether
	 * the adjacent ghosts should show. Selection changes are attribute changes,
	 * which the DOM observers deliberately don't watch (far too noisy), so the
	 * store is the right signal. Only schedules work when the value actually
	 * changes, rather than on every store tick.
	 */
	function subscribeToSelection() {
		if ( subscribed || ! window.wp || ! window.wp.data || ! window.wp.data.subscribe ) {
			return;
		}
		subscribed = true;
		window.wp.data.subscribe( function () {
			var id = selectedEmptyBlockId();
			if ( id !== lastEmptyId ) {
				lastEmptyId = id;
				schedulePositions();
			}
		} );
	}

	function boot() {
		ensure();
		subscribeToSelection();
		setInterval( function () {
			ensure();
			subscribeToSelection(); // Retry until wp.data is available.
		}, 1000 );
	}

	if ( document.readyState !== 'loading' ) {
		boot();
	} else {
		document.addEventListener( 'DOMContentLoaded', boot );
	}
} )();
