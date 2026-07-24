<?php
/**
 * GutenView asset helpers.
 *
 * Feature modules all enqueue the same way, so the shared parts live here: path
 * building, cache-bust versioning, and translation wiring. A feature module
 * should only have to say which file it wants and what it depends on.
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cache-busting version for an asset.
 *
 * Released files do not change between plugin versions, so GUTENVIEW_VERSION is
 * the correct buster in production and costs nothing. During development the
 * files change constantly, so under SCRIPT_DEBUG fall back to the file's mtime
 * to avoid stale-cache confusion. This keeps the filesystem stat out of normal
 * page loads.
 *
 * @param string $rel_path Path relative to the plugin directory.
 * @return string
 */
function gutenview_asset_version( $rel_path ) {
	if ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) {
		$abs_path = GUTENVIEW_DIR . $rel_path;

		if ( file_exists( $abs_path ) ) {
			return (string) filemtime( $abs_path );
		}
	}

	return GUTENVIEW_VERSION;
}

/**
 * Enqueue a GutenView stylesheet.
 *
 * @param string $handle   Stylesheet handle.
 * @param string $rel_path Path relative to the plugin directory.
 * @param array  $deps     Stylesheet dependencies, for guaranteed load order.
 * @return void
 */
function gutenview_enqueue_style( $handle, $rel_path, $deps = array() ) {
	wp_enqueue_style(
		$handle,
		GUTENVIEW_URL . $rel_path,
		$deps,
		gutenview_asset_version( $rel_path )
	);
}

/**
 * Enqueue a GutenView script.
 *
 * Pass $translated for any script containing wp.i18n calls. Without the
 * matching wp_set_script_translations() call WordPress never loads a translation
 * file for the handle, and every __() in that script silently returns English
 * regardless of locale.
 *
 * @param string $handle     Script handle.
 * @param string $rel_path   Path relative to the plugin directory.
 * @param array  $deps       Script dependencies.
 * @param bool   $translated Whether the script contains translatable strings.
 * @return void
 */
function gutenview_enqueue_script( $handle, $rel_path, $deps = array(), $translated = false ) {
	wp_enqueue_script(
		$handle,
		GUTENVIEW_URL . $rel_path,
		$deps,
		gutenview_asset_version( $rel_path ),
		true
	);

	if ( $translated ) {
		wp_set_script_translations( $handle, 'gutenview' );
	}
}
