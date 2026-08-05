<?php
/**
 * Feature: Delete button in the block toolbar.
 *
 * Puts a dedicated Delete control in the block toolbar, in its own group just
 * before the overflow ("three dots") menu, instead of leaving deletion buried
 * inside that menu.
 *
 * This one is a React extension rather than a DOM tweak, so it registers through
 * the `editor.BlockEdit` filter and needs the editor's script packages. It has no
 * stylesheet: the control is built from core's own ToolbarButton and should look
 * exactly like its neighbours.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether this feature should load.
 *
 * @return bool
 */
function gutenview_toolbar_delete_button_enabled() {
	return gutenview_is_enabled() && gutenview_get_setting( 'toolbar_delete_button' );
}

/**
 * Enqueue the toolbar delete-button script.
 *
 * @return void
 */
function gutenview_toolbar_delete_button_enqueue_script() {
	if ( ! gutenview_toolbar_delete_button_enabled() ) {
		return;
	}

	gutenview_enqueue_script(
		'gutenview-toolbar-delete-button',
		'assets/js/toolbar-delete-button.js',
		array(
			'wp-block-editor',
			'wp-components',
			'wp-compose',
			'wp-data',
			'wp-element',
			'wp-hooks',
			'wp-i18n',
		),
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'gutenview_toolbar_delete_button_enqueue_script' );
