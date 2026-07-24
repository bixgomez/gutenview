/**
 * GutenView: Adjustable editor sidebar.
 *
 * Keeps Gutenberg's complementary-area panel at an editor-controlled width and
 * adds a pointer and keyboard operable separator at its inner edge. The
 * separator is appended to document.body rather than Gutenberg's React-owned
 * tree, so normal editor renders cannot remove it.
 *
 * @package GutenView
 */

( function () {
	'use strict';

	var DEFAULT_WIDTH = 400;
	var MIN_WIDTH = 320;
	var MAX_VIEWPORT_WIDTH_RATIO = 0.75;
	var CORE_WIDTH = 280;
	var KEYBOARD_STEP = 10;
	var MOBILE_BREAKPOINT = 782;
	var PREFERENCE_SCOPE = 'gutenview';
	var PREFERENCE_NAME = 'editorSidebarWidth';
	var FALLBACK_STORAGE_KEY = 'gutenviewEditorSidebarWidth';

	var body;
	var handle;
	var sidebar;
	var sidebarResizeObserver;
	var documentObserver;
	var preferredWidth = DEFAULT_WIDTH;
	var currentWidth = DEFAULT_WIDTH;
	var sidebarSide = 'right';
	var isDragging = false;
	var dragStartX = 0;
	var dragStartWidth = DEFAULT_WIDTH;
	var positionFrame = 0;

	/**
	 * Get translated UI strings.
	 *
	 * @return {{label: string, instructions: string, value: Function}}
	 */
	function labels() {
		if ( window.wp && window.wp.i18n ) {
			return {
				label: window.wp.i18n.__( 'Resize editor sidebar', 'gutenview' ),
				instructions: window.wp.i18n.__(
					'Drag to resize the editor sidebar. Use the arrow keys to resize. Double-click to reset.',
					'gutenview'
				),
				value: function ( width ) {
					return window.wp.i18n.sprintf(
						/* translators: %d: editor sidebar width in pixels. */
						window.wp.i18n.__( 'Editor sidebar width: %d pixels', 'gutenview' ),
						width
					);
				},
			};
		}

		return {
			label: 'Resize editor sidebar',
			instructions:
				'Drag to resize the editor sidebar. Use the arrow keys to resize. Double-click to reset.',
			value: function ( width ) {
				return 'Editor sidebar width: ' + width + ' pixels';
			},
		};
	}

	/**
	 * Whether the editor is using Gutenberg's desktop sidebar layout.
	 *
	 * @return {boolean} True on a desktop editor viewport.
	 */
	function isDesktop() {
		return window.innerWidth >= MOBILE_BREAKPOINT;
	}

	/**
	 * Read the current width limits from the editor workspace.
	 *
	 * The upper limit is 75% of the viewport, capped only when the available
	 * editor workspace is smaller than that. This leaves room for practical
	 * responsive testing directly in the editor.
	 *
	 * @return {{min: number, max: number}} Current pixel limits.
	 */
	function getWidthLimits() {
		var editorBody = document.querySelector( '.interface-interface-skeleton__body' );
		var secondarySidebar;
		var workspaceWidth;
		var secondaryWidth = 0;
		var viewportMaximum = Math.floor(
			window.innerWidth * MAX_VIEWPORT_WIDTH_RATIO
		);
		var maximum;

		if ( ! editorBody ) {
			return {
				min: Math.min( MIN_WIDTH, Math.max( CORE_WIDTH, viewportMaximum ) ),
				max: Math.max( CORE_WIDTH, viewportMaximum ),
			};
		}

		workspaceWidth = editorBody.getBoundingClientRect().width;
		secondarySidebar = editorBody.querySelector(
			'.interface-interface-skeleton__secondary-sidebar'
		);

		if ( secondarySidebar ) {
			secondaryWidth = secondarySidebar.getBoundingClientRect().width;
		}

		maximum = Math.floor( workspaceWidth - secondaryWidth );
		maximum = Math.max( CORE_WIDTH, Math.min( viewportMaximum, maximum ) );

		return {
			min: Math.min( MIN_WIDTH, maximum ),
			max: maximum,
		};
	}

	/**
	 * Constrain a width to the editor's current usable range.
	 *
	 * @param {number} width Requested width.
	 * @return {number} Safe integer width.
	 */
	function constrainWidth( width ) {
		var limits = getWidthLimits();
		var numericWidth = parseInt( width, 10 );

		if ( ! Number.isFinite( numericWidth ) ) {
			numericWidth = DEFAULT_WIDTH;
		}

		return Math.max( limits.min, Math.min( limits.max, numericWidth ) );
	}

	/**
	 * Read the editor's saved width through WordPress preferences.
	 *
	 * Local storage is only used as a compatibility fallback when the preferences
	 * store is unavailable.
	 *
	 * @return {number} Saved or default width.
	 */
	function getSavedWidth() {
		var saved;

		try {
			if ( window.wp && window.wp.data && window.wp.preferences ) {
				saved = window.wp.data
					.select( window.wp.preferences.store )
					.get( PREFERENCE_SCOPE, PREFERENCE_NAME );
			}
		} catch ( error ) {
			saved = null;
		}

		if ( Number.isFinite( Number( saved ) ) && Number( saved ) > 0 ) {
			return Number( saved );
		}

		try {
			saved = window.localStorage.getItem( FALLBACK_STORAGE_KEY );
		} catch ( error ) {
			saved = null;
		}

		return Number.isFinite( Number( saved ) ) && Number( saved ) > 0
			? Number( saved )
			: DEFAULT_WIDTH;
	}

	/**
	 * Persist an editor-selected width.
	 *
	 * @param {number} width Width in pixels.
	 * @return {void}
	 */
	function saveWidth( width ) {
		try {
			if ( window.wp && window.wp.data && window.wp.preferences ) {
				window.wp.data
					.dispatch( window.wp.preferences.store )
					.set( PREFERENCE_SCOPE, PREFERENCE_NAME, width );
				return;
			}
		} catch ( error ) {
			// Fall through to local storage.
		}

		try {
			window.localStorage.setItem( FALLBACK_STORAGE_KEY, String( width ) );
		} catch ( error ) {
			// A blocked storage API should not disable resizing for this session.
		}
	}

	/**
	 * Update the separator's accessible value.
	 *
	 * @return {void}
	 */
	function updateHandleValue() {
		var limits;
		var text;

		if ( ! handle ) {
			return;
		}

		limits = getWidthLimits();
		text = labels();

		handle.setAttribute( 'aria-valuemin', String( limits.min ) );
		handle.setAttribute( 'aria-valuemax', String( limits.max ) );
		handle.setAttribute( 'aria-valuenow', String( currentWidth ) );
		handle.setAttribute( 'aria-valuetext', text.value( currentWidth ) );
	}

	/**
	 * Apply a preferred width to the current viewport.
	 *
	 * @param {number}  width              Preferred width.
	 * @param {boolean} remember           Whether this is a new editor preference.
	 * @param {boolean} preservePreference Whether to retain a larger saved width
	 *                                     while the viewport temporarily limits it.
	 * @return {void}
	 */
	function setWidth( width, remember, preservePreference ) {
		var requestedWidth = parseInt( width, 10 );

		if ( ! Number.isFinite( requestedWidth ) ) {
			requestedWidth = DEFAULT_WIDTH;
		}

		currentWidth = constrainWidth( requestedWidth );

		if ( ! preservePreference ) {
			preferredWidth = currentWidth;
		}

		body.style.setProperty(
			'--gutenview-editor-sidebar-width',
			currentWidth + 'px'
		);

		updateHandleValue();
		scheduleHandlePosition();

		if ( remember ) {
			saveWidth( currentWidth );
		}
	}

	/**
	 * Determine whether a complementary area is active.
	 *
	 * The post editor exposes public selectors for both its standard settings
	 * sidebar and third-party plugin sidebars. The rendered-panel fallback keeps
	 * the feature harmless in editor contexts that do not register that store.
	 *
	 * @return {boolean} True when the settings sidebar is open.
	 */
	function sidebarIsOpen() {
		var select;

		try {
			if ( window.wp && window.wp.data ) {
				select = window.wp.data.select( 'core/edit-post' );

				if (
					select &&
					'function' === typeof select.isEditorSidebarOpened &&
					'function' === typeof select.isPluginSidebarOpened
				) {
					return (
						select.isEditorSidebarOpened() ||
						select.isPluginSidebarOpened()
					);
				}
			}
		} catch ( error ) {
			// Fall back to the rendered editor state.
		}

		return Boolean(
			sidebar &&
				sidebar.querySelector( '.interface-complementary-area__fill' )
		);
	}

	/**
	 * Keep the editor-state body class in sync with WordPress.
	 *
	 * @return {void}
	 */
	function updateOpenState() {
		var isOpen = isDesktop() && sidebarIsOpen();

		body.classList.toggle( 'gutenview-sidebar-is-open', isOpen );

		if ( ! isOpen && isDragging ) {
			endDrag();
		}

		scheduleHandlePosition();
	}

	/**
	 * Position the body-level separator against the sidebar's inner edge.
	 *
	 * @return {void}
	 */
	function positionHandle() {
		var rect;
		var distanceFromLeft;
		var distanceFromRight;
		var separatorX;

		positionFrame = 0;

		if (
			! handle ||
			! sidebar ||
			! body.classList.contains( 'gutenview-sidebar-is-open' )
		) {
			return;
		}

		rect = sidebar.getBoundingClientRect();

		if ( rect.width <= 0 || rect.height <= 0 ) {
			return;
		}

		distanceFromLeft = rect.left;
		distanceFromRight = window.innerWidth - rect.right;
		sidebarSide = distanceFromLeft < distanceFromRight ? 'left' : 'right';
		separatorX = 'left' === sidebarSide ? rect.right : rect.left;

		handle.style.left = separatorX - handle.offsetWidth / 2 + 'px';
		handle.style.top = rect.top + 'px';
		handle.style.height = rect.height + 'px';
		handle.dataset.sidebarSide = sidebarSide;
	}

	/**
	 * Request one separator-position update.
	 *
	 * @return {void}
	 */
	function scheduleHandlePosition() {
		if ( positionFrame ) {
			return;
		}

		positionFrame = window.requestAnimationFrame( positionHandle );
	}

	/**
	 * Observe the current sidebar, replacing observers when React replaces it.
	 *
	 * @return {void}
	 */
	function findSidebar() {
		var nextSidebar = document.querySelector(
			'.interface-interface-skeleton__sidebar'
		);

		if ( nextSidebar === sidebar ) {
			updateOpenState();
			return;
		}

		if ( sidebarResizeObserver ) {
			sidebarResizeObserver.disconnect();
			sidebarResizeObserver = null;
		}

		sidebar = nextSidebar;

		if ( sidebar && window.ResizeObserver ) {
			sidebarResizeObserver = new window.ResizeObserver( scheduleHandlePosition );
			sidebarResizeObserver.observe( sidebar );
		}

		setWidth( preferredWidth, false, true );
		updateOpenState();
	}

	/**
	 * Finish a pointer resize and save its final width.
	 *
	 * @return {void}
	 */
	function endDrag() {
		if ( ! isDragging ) {
			return;
		}

		isDragging = false;
		body.classList.remove( 'gutenview-sidebar-is-resizing' );
		saveWidth( preferredWidth );
	}

	/**
	 * Resize while the separator owns the active pointer.
	 *
	 * @param {PointerEvent} event Pointer event.
	 * @return {void}
	 */
	function onPointerMove( event ) {
		var movement;

		if ( ! isDragging ) {
			return;
		}

		movement =
			'left' === sidebarSide
				? event.clientX - dragStartX
				: dragStartX - event.clientX;

		setWidth( dragStartWidth + movement, false );
	}

	/**
	 * Begin a pointer resize.
	 *
	 * @param {PointerEvent} event Pointer event.
	 * @return {void}
	 */
	function onPointerDown( event ) {
		if ( 0 !== event.button || ! isDesktop() ) {
			return;
		}

		isDragging = true;
		dragStartX = event.clientX;
		dragStartWidth = currentWidth;
		body.classList.add( 'gutenview-sidebar-is-resizing' );
		handle.setPointerCapture( event.pointerId );
		event.preventDefault();
	}

	/**
	 * Resize from the keyboard.
	 *
	 * Arrow keys move the separator in the direction pressed. Home and End move
	 * to the current minimum and maximum.
	 *
	 * @param {KeyboardEvent} event Keyboard event.
	 * @return {void}
	 */
	function onKeyDown( event ) {
		var limits = getWidthLimits();
		var nextWidth = currentWidth;
		var handled = true;

		switch ( event.key ) {
			case 'ArrowLeft':
				nextWidth += 'left' === sidebarSide ? -KEYBOARD_STEP : KEYBOARD_STEP;
				break;
			case 'ArrowRight':
				nextWidth += 'left' === sidebarSide ? KEYBOARD_STEP : -KEYBOARD_STEP;
				break;
			case 'Home':
				nextWidth = limits.min;
				break;
			case 'End':
				nextWidth = limits.max;
				break;
			default:
				handled = false;
		}

		if ( ! handled ) {
			return;
		}

		event.preventDefault();
		setWidth( nextWidth, true );
	}

	/**
	 * Create the resize separator and bind its controls.
	 *
	 * @return {void}
	 */
	function createHandle() {
		var text = labels();

		handle = document.createElement( 'div' );
		handle.className = 'gutenview-sidebar-resize-handle';
		handle.setAttribute( 'role', 'separator' );
		handle.setAttribute( 'aria-orientation', 'vertical' );
		handle.setAttribute( 'aria-label', text.label );
		handle.setAttribute( 'title', text.instructions );
		handle.tabIndex = 0;

		handle.addEventListener( 'pointerdown', onPointerDown );
		handle.addEventListener( 'pointermove', onPointerMove );
		handle.addEventListener( 'pointerup', endDrag );
		handle.addEventListener( 'pointercancel', endDrag );
		handle.addEventListener( 'lostpointercapture', endDrag );
		handle.addEventListener( 'keydown', onKeyDown );
		handle.addEventListener( 'dblclick', function () {
			setWidth( DEFAULT_WIDTH, true );
		} );

		document.body.appendChild( handle );
	}

	/**
	 * Initialize the feature after the editor shell is available.
	 *
	 * @return {void}
	 */
	function boot() {
		body = document.body;
		body.classList.add( 'gutenview-adjustable-sidebar' );

		createHandle();
		preferredWidth = getSavedWidth();
		setWidth( preferredWidth, false, true );
		findSidebar();

		documentObserver = new MutationObserver( findSidebar );
		documentObserver.observe( body, {
			childList: true,
			subtree: true,
		} );

		if ( window.wp && window.wp.data ) {
			window.wp.data.subscribe( updateOpenState );
		}

		window.addEventListener( 'resize', function () {
			setWidth( preferredWidth, false, true );
			updateOpenState();
		} );

		updateOpenState();
	}

	if ( window.wp && window.wp.domReady ) {
		window.wp.domReady( boot );
	} else if ( document.readyState !== 'loading' ) {
		boot();
	} else {
		document.addEventListener( 'DOMContentLoaded', boot );
	}
} )();
