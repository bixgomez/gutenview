<?php
/**
 * Plugin Name:       GutenView
 * Plugin URI:        https://gutenview.com
 * Description:       Makes the WordPress block editor's hidden editing affordances visible and discoverable.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Richard Gilbert
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       gutenview
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin version.
 */
define( 'GUTENVIEW_VERSION', '0.1.0' );

/**
 * Absolute path to the main plugin file.
 */
define( 'GUTENVIEW_FILE', __FILE__ );

/**
 * Absolute path to the plugin directory (with trailing slash).
 */
define( 'GUTENVIEW_DIR', plugin_dir_path( __FILE__ ) );

/**
 * URL to the plugin directory (with trailing slash).
 */
define( 'GUTENVIEW_URL', plugin_dir_url( __FILE__ ) );

/**
 * Option name where all GutenView settings are stored (single array option).
 */
define( 'GUTENVIEW_OPTION', 'gutenview_settings' );

/**
 * Bootstrap the plugin.
 *
 * Feature modules are wired up here as they are built (see the friction-point
 * inventory / roadmap).
 *
 * @return void
 */
function gutenview_bootstrap() {
	// Settings accessors and asset helpers, always available.
	require_once GUTENVIEW_DIR . 'includes/settings.php';
	require_once GUTENVIEW_DIR . 'includes/assets.php';

	// Admin-only UI + editor features (the block editor runs in wp-admin).
	if ( is_admin() ) {
		require_once GUTENVIEW_DIR . 'includes/admin/settings-page.php';
		require_once GUTENVIEW_DIR . 'includes/features/view-same-tab.php';
		require_once GUTENVIEW_DIR . 'includes/features/snackbar-position.php';
		require_once GUTENVIEW_DIR . 'includes/features/block-outlines.php';
		require_once GUTENVIEW_DIR . 'includes/features/add-block-links.php';
		require_once GUTENVIEW_DIR . 'includes/features/remove-block-button.php';
		require_once GUTENVIEW_DIR . 'includes/features/end-block-inserter.php';
	}
}
add_action( 'plugins_loaded', 'gutenview_bootstrap' );
