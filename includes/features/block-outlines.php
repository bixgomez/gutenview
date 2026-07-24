<?php
/**
 * Feature: Block outlines.
 *
 * Draws dashed boundaries around editor blocks so their edges are visible.
 * Mode is 'off', 'hover', or 'always'.
 *
 * Enqueued on `enqueue_block_assets` (guarded to admin) rather than
 * `enqueue_block_editor_assets`, because in WP 6.3+ the editor canvas is an
 * iframe and only `enqueue_block_assets` styles reach inside it.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueue the block-outline stylesheet into the editor canvas, per mode.
 *
 * @return void
 */
function gutenview_block_outlines_enqueue() {
	// Editor canvas only (this hook also fires on the front end).
	if ( ! is_admin() ) {
		return;
	}

	if ( ! gutenview_is_enabled() ) {
		return;
	}

	$mode = gutenview_get_setting( 'block_outlines' );

	/*
	 * This also constrains $mode to a known-safe value before it is used to build
	 * an asset path below. The stored setting is already whitelisted on save, so
	 * this is the second of two gates rather than the only one.
	 */
	if ( 'hover' !== $mode && 'always' !== $mode ) {
		return;
	}

	// Shared base: colour language, line geometry, hover state, motion.
	gutenview_enqueue_style( 'gutenview-block-outlines', 'assets/css/block-outlines.css' );

	// Mode layer, declared dependent on the base so it always loads after it.
	gutenview_enqueue_style(
		'gutenview-block-outlines-' . $mode,
		'assets/css/block-outlines-' . $mode . '.css',
		array( 'gutenview-block-outlines' )
	);
}
add_action( 'enqueue_block_assets', 'gutenview_block_outlines_enqueue' );
