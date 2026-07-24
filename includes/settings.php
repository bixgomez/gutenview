<?php
/**
 * GutenView settings accessors.
 *
 * Data-layer helpers for reading plugin settings. Always loaded (not admin-only)
 * so feature modules can consult settings in the editor and on the front end.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Default settings values.
 *
 * The single source of truth for setting keys and their defaults. Every new
 * toggle should add its key/default here.
 *
 * @return array
 */
function gutenview_default_settings() {
	return array(
		'enabled'             => true,  // Master switch.
		'view_same_tab'       => false, // Same-tab "View" button in the editor header.
		'reposition_snackbar' => false, // Move the "saved" notice up near the Save button.
		'block_outlines'      => 'off', // Block boundary outlines: 'off' | 'hover' | 'always'.
		'add_block_links'     => false, // Persistent "ghost +" hint between top-level blocks.
		'remove_block_button' => false, // "Minus" button beside the empty-block inserter.
		'end_block_inserter'  => false, // Real "+" button below the final top-level block.
	);
}

/**
 * Get all settings, merged over defaults.
 *
 * @return array
 */
function gutenview_get_settings() {
	$stored = get_option( GUTENVIEW_OPTION, array() );

	if ( ! is_array( $stored ) ) {
		$stored = array();
	}

	return wp_parse_args( $stored, gutenview_default_settings() );
}

/**
 * Get a single setting value.
 *
 * @param string $key Setting key.
 * @return mixed Setting value, or null if the key is unknown.
 */
function gutenview_get_setting( $key ) {
	$settings = gutenview_get_settings();

	return array_key_exists( $key, $settings ) ? $settings[ $key ] : null;
}

/**
 * Whether GutenView's enhancements are globally enabled (master switch).
 *
 * Feature modules should check this before doing any work.
 *
 * @return bool
 */
function gutenview_is_enabled() {
	return (bool) gutenview_get_setting( 'enabled' );
}
