<?php
/**
 * GutenView activation routine.
 *
 * Seeds the settings option the first time the plugin is activated so a new
 * install starts with every enhancement switched on.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Write the default settings on first activation.
 *
 * Runs during the activation request, before the plugin is considered active,
 * so it loads the settings accessors itself instead of relying on the normal
 * bootstrap. Uses add_option(), which leaves an existing option untouched, so
 * reactivating never overwrites choices an editor has already made.
 *
 * @return void
 */
function gutenview_activate() {
	require_once GUTENVIEW_DIR . 'includes/settings.php';

	add_option( GUTENVIEW_OPTION, gutenview_default_settings() );
}
