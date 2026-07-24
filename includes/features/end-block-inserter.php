<?php
/**
 * Feature: Add-block button at the end.
 *
 * A real, working "+" below the final top-level block. No native inserter exists
 * in that spot (which is why the cosmetic ghost is suppressed there), so this
 * button performs the insert itself.
 *
 * The JS runs in the outer editor document and reaches into the canvas; the CSS
 * styles an element inside the canvas, so it goes on `enqueue_block_assets`.
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
function gutenview_end_block_inserter_enabled() {
	return gutenview_is_enabled() && gutenview_get_setting( 'end_block_inserter' );
}

/**
 * Enqueue the end-inserter script.
 *
 * @return void
 */
function gutenview_end_block_inserter_enqueue_script() {
	if ( ! gutenview_end_block_inserter_enabled() ) {
		return;
	}

	gutenview_enqueue_script(
		'gutenview-end-block-inserter',
		'assets/js/end-block-inserter.js',
		array( 'wp-data', 'wp-blocks', 'wp-i18n' ),
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'gutenview_end_block_inserter_enqueue_script' );

/**
 * Enqueue the end-inserter stylesheet into the canvas.
 *
 * @return void
 */
function gutenview_end_block_inserter_enqueue_style() {
	if ( ! is_admin() || ! gutenview_end_block_inserter_enabled() ) {
		return;
	}

	gutenview_enqueue_style( 'gutenview-end-block-inserter', 'assets/css/end-block-inserter.css' );
}
add_action( 'enqueue_block_assets', 'gutenview_end_block_inserter_enqueue_style' );
