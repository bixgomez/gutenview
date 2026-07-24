<?php
/**
 * Feature: Reposition the save snackbar.
 *
 * Moves the block editor's "saved" snackbar notice from the far bottom-left
 * corner up to the top-right, near the Save button.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueue the snackbar-position stylesheet in the block editor, if enabled.
 *
 * @return void
 */
function gutenview_snackbar_position_enqueue() {
	if ( ! gutenview_is_enabled() || ! gutenview_get_setting( 'reposition_snackbar' ) ) {
		return;
	}

	gutenview_enqueue_style( 'gutenview-snackbar-position', 'assets/css/snackbar-position.css' );
}
add_action( 'enqueue_block_editor_assets', 'gutenview_snackbar_position_enqueue' );
