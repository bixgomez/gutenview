<?php
/**
 * Feature: Adjustable editor sidebar.
 *
 * Gives the block editor's settings sidebar a roomier default width and an
 * accessible resize handle. The editor's chosen width is stored through
 * WordPress's preferences data store.
 *
 * Both assets target the editor chrome in the outer admin document, so they
 * load on `enqueue_block_editor_assets`.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueue the adjustable-sidebar assets, if enabled.
 *
 * @return void
 */
function gutenview_adjustable_sidebar_enqueue() {
	if ( ! gutenview_is_enabled() || ! gutenview_get_setting( 'adjustable_sidebar' ) ) {
		return;
	}

	gutenview_enqueue_style(
		'gutenview-adjustable-sidebar',
		'assets/css/adjustable-sidebar.css'
	);

	gutenview_enqueue_script(
		'gutenview-adjustable-sidebar',
		'assets/js/adjustable-sidebar.js',
		array( 'wp-data', 'wp-dom-ready', 'wp-edit-post', 'wp-i18n', 'wp-preferences' ),
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'gutenview_adjustable_sidebar_enqueue' );
