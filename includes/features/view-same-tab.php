<?php
/**
 * Feature: View in same tab.
 *
 * Adds a "View" button to the block editor header that opens the post in the
 * same tab, next to the stock button (which keeps opening a new tab). Also makes
 * the "saved" snackbar's View link open in the same tab.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueue the same-tab view script in the block editor, if enabled.
 *
 * @return void
 */
function gutenview_view_same_tab_enqueue() {
	if ( ! gutenview_is_enabled() || ! gutenview_get_setting( 'view_same_tab' ) ) {
		return;
	}

	gutenview_enqueue_script(
		'gutenview-view-same-tab',
		'assets/js/view-same-tab.js',
		array( 'wp-dom-ready', 'wp-i18n' ),
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'gutenview_view_same_tab_enqueue' );
