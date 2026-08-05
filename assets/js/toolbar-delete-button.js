/**
 * GutenView: Delete button in the block toolbar.
 *
 * Deleting a block is a common, deliberate action that core files away in the
 * toolbar's overflow menu ("three dots"), so it costs two clicks and a hunt. This
 * puts it in the toolbar itself.
 *
 * Unlike GutenView's other editor features this one does NOT touch the DOM. The
 * block toolbar is React-owned and re-renders constantly, so anything injected
 * into it by hand would be fought and eventually lost. Instead it extends the
 * toolbar the way core intends, through the `editor.BlockEdit` filter and a
 * BlockControls fill.
 *
 * Group "other" is what puts it in its own toolbar group, second from the end:
 * core renders the slots in order (parent, block, default, inline, other) and then
 * the settings menu, and every non-default group's slot wraps its fills in a
 * ToolbarGroup of their own. So no ToolbarGroup is created here; doing that would
 * nest one group inside another.
 *
 * @package GutenView
 */

( function () {
	'use strict';

	var wp = window.wp;

	if ( ! wp || ! wp.hooks || ! wp.element || ! wp.compose || ! wp.data || ! wp.blockEditor || ! wp.components ) {
		return;
	}

	var el = wp.element.createElement;

	/* Core's trash icon, so the control reads as native. */
	var TRASH_PATH =
		'M12 5.5A2.25 2.25 0 0 0 9.878 7h4.244A2.251 2.251 0 0 0 12 5.5ZM12 4a3.751 3.751 0 0 0-3.675 3H5v1.5h1.27l.818 8.997a2.75 2.75 0 0 0 2.739 2.501h4.347a2.75 2.75 0 0 0 2.738-2.5L17.73 8.5H19V7h-3.325A3.751 3.751 0 0 0 12 4Zm4.224 4.5H7.776l.806 8.861a1.25 1.25 0 0 0 1.245 1.137h4.347a1.25 1.25 0 0 0 1.245-1.137l.805-8.861Z';

	/**
	 * Translated button label, if wp.i18n is available.
	 *
	 * @return {string}
	 */
	function label() {
		if ( wp.i18n && wp.i18n.__ ) {
			return wp.i18n.__( 'Delete block', 'gutenview' );
		}
		return 'Delete block';
	}

	/**
	 * The trash icon as a React element.
	 *
	 * @return {Object}
	 */
	function icon() {
		return el(
			'svg',
			{
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				width: 24,
				height: 24,
				'aria-hidden': 'true',
				focusable: 'false',
			},
			el( 'path', { fillRule: 'evenodd', clipRule: 'evenodd', d: TRASH_PATH } )
		);
	}

	/**
	 * Add the control to the selected block's toolbar.
	 *
	 * The button is withheld when core would refuse the removal anyway: locked
	 * blocks, and blocks whose parent does not allow removing its children. Offering
	 * a delete button that silently does nothing would be worse than not offering
	 * one, and core's own menu item hides itself under the same condition.
	 *
	 * Nothing is added during a multi-block selection, where no single block's edit
	 * component is the selected one. Core's own toolbar behaves the same way.
	 */
	var withDeleteButton = wp.compose.createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			var clientId = props.clientId;

			var canRemove = wp.data.useSelect(
				function ( select ) {
					var store = select( 'core/block-editor' );

					if ( ! store || ! store.canRemoveBlock ) {
						return false;
					}
					return !! store.canRemoveBlock( clientId );
				},
				[ clientId ]
			);

			if ( ! props.isSelected || ! canRemove ) {
				return el( BlockEdit, props );
			}

			return el(
				wp.element.Fragment,
				null,
				el( BlockEdit, props ),
				el(
					wp.blockEditor.BlockControls,
					{ group: 'other' },
					el( wp.components.ToolbarButton, {
						icon: icon(),
						label: label(),
						onClick: function () {
							wp.data.dispatch( 'core/block-editor' ).removeBlock( clientId );
						},
					} )
				)
			);
		};
	}, 'gutenviewWithDeleteButton' );

	wp.hooks.addFilter( 'editor.BlockEdit', 'gutenview/toolbar-delete-button', withDeleteButton );
} )();
