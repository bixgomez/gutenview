<?php
/**
 * GutenView admin settings page (Settings -> GutenView).
 *
 * @package GutenView
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the GutenView settings page under the Settings menu.
 *
 * @return void
 */
function gutenview_register_settings_page() {
	add_options_page(
		__( 'GutenView', 'gutenview' ),   // Page <title>.
		__( 'GutenView', 'gutenview' ),   // Menu label.
		'manage_options',                 // Capability.
		'gutenview',                      // Menu slug.
		'gutenview_render_settings_page'  // Render callback.
	);
}
add_action( 'admin_menu', 'gutenview_register_settings_page' );

/**
 * Register the plugin's setting, sections, and fields.
 *
 * @return void
 */
function gutenview_register_settings() {
	register_setting(
		'gutenview_settings_group',
		GUTENVIEW_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'gutenview_sanitize_settings',
			'default'           => array(),
		)
	);

	// General section, the master enable switch.
	add_settings_section(
		'gutenview_section_general',
		__( 'General', 'gutenview' ),
		'__return_false',
		'gutenview'
	);

	add_settings_field(
		'gutenview_field_enabled',
		__( 'Enable GutenView', 'gutenview' ),
		'gutenview_render_checkbox_field',
		'gutenview',
		'gutenview_section_general',
		array(
			'key'         => 'enabled',
			'label_for'   => 'gutenview_enabled',
			'label'       => __( 'Enable GutenView editor enhancements', 'gutenview' ),
			'description' => __( 'Master switch. Turn every GutenView enhancement off at once without losing your individual toggle choices.', 'gutenview' ),
		)
	);

	// View & Save section, quality-of-life editor tweaks.
	add_settings_section(
		'gutenview_section_view',
		__( 'View &amp; Save', 'gutenview' ),
		'gutenview_render_view_section',
		'gutenview'
	);

	add_settings_field(
		'gutenview_field_view_same_tab',
		__( 'View in same tab', 'gutenview' ),
		'gutenview_render_checkbox_field',
		'gutenview',
		'gutenview_section_view',
		array(
			'key'         => 'view_same_tab',
			'label_for'   => 'gutenview_view_same_tab',
			'label'       => __( 'Add a "View" button that opens the post in the same tab', 'gutenview' ),
			'description' => __( 'Adds a same-tab View button next to the stock one (which keeps opening a new tab), so you stop piling up browser tabs while editing.', 'gutenview' ),
		)
	);

	add_settings_field(
		'gutenview_field_reposition_snackbar',
		__( 'Reposition save notice', 'gutenview' ),
		'gutenview_render_checkbox_field',
		'gutenview',
		'gutenview_section_view',
		array(
			'key'         => 'reposition_snackbar',
			'label_for'   => 'gutenview_reposition_snackbar',
			'label'       => __( 'Move the "saved" notice up near the Save button', 'gutenview' ),
			'description' => __( 'Relocates the block editor snackbar from the far bottom-left corner to the top-right, near where you clicked Save.', 'gutenview' ),
		)
	);

	// Discoverability section, affordance toggles land here as features are built.
	add_settings_section(
		'gutenview_section_discoverability',
		__( 'Discoverability', 'gutenview' ),
		'gutenview_render_discoverability_section',
		'gutenview'
	);

	add_settings_field(
		'gutenview_field_block_outlines',
		__( 'Block outlines', 'gutenview' ),
		'gutenview_render_select_field',
		'gutenview',
		'gutenview_section_discoverability',
		array(
			'key'         => 'block_outlines',
			'label_for'   => 'gutenview_block_outlines',
			'choices'     => array(
				'off'    => __( 'Off', 'gutenview' ),
				'hover'  => __( 'On hover', 'gutenview' ),
				'always' => __( 'Always', 'gutenview' ),
			),
			'description' => __( 'Draw a dashed boundary around blocks so their edges are visible. "On hover" shows it only for the block under the cursor (and the selected block); "Always" outlines every block.', 'gutenview' ),
		)
	);

	add_settings_field(
		'gutenview_field_add_block_links',
		__( 'Add-block hints', 'gutenview' ),
		'gutenview_render_checkbox_field',
		'gutenview',
		'gutenview_section_discoverability',
		array(
			'key'         => 'add_block_links',
			'label_for'   => 'gutenview_add_block_links',
			'label'       => __( 'Show a persistent "+" between blocks', 'gutenview' ),
			'description' => __( 'Places a faint "+" hint at each block boundary so you can see where new blocks go. As you approach it, it steps aside and WordPress\'s own inserter takes over, so clicking works exactly like normal.', 'gutenview' ),
		)
	);

	add_settings_field(
		'gutenview_field_remove_block_button',
		__( 'Remove-block button', 'gutenview' ),
		'gutenview_render_checkbox_field',
		'gutenview',
		'gutenview_section_discoverability',
		array(
			'key'         => 'remove_block_button',
			'label_for'   => 'gutenview_remove_block_button',
			'label'       => __( 'Add a "remove block" button beside the new-block "+"', 'gutenview' ),
			'description' => __( 'Puts a matching minus button next to the "+" that appears on a new empty block, so an accidentally added block can be removed on the spot instead of hunting through the toolbar menu.', 'gutenview' ),
		)
	);

	add_settings_field(
		'gutenview_field_end_block_inserter',
		__( 'Add-block button at the end', 'gutenview' ),
		'gutenview_render_checkbox_field',
		'gutenview',
		'gutenview_section_discoverability',
		array(
			'key'         => 'end_block_inserter',
			'label_for'   => 'gutenview_end_block_inserter',
			'label'       => __( 'Show a "+" below the last block', 'gutenview' ),
			'description' => __( 'Adds a working "add block" button beneath the final top-level block, so there is always an obvious place to continue writing instead of hunting for the right spot to click.', 'gutenview' ),
		)
	);
}
add_action( 'admin_init', 'gutenview_register_settings' );

/**
 * Sanitize the settings array on save.
 *
 * @param mixed $input Raw submitted value.
 * @return array Sanitized settings.
 */
function gutenview_sanitize_settings( $input ) {
	$input = is_array( $input ) ? $input : array();

	$output = array();

	// Boolean toggles (checkbox present === on).
	$output['enabled']             = ! empty( $input['enabled'] );
	$output['view_same_tab']       = ! empty( $input['view_same_tab'] );
	$output['reposition_snackbar'] = ! empty( $input['reposition_snackbar'] );
	$output['add_block_links']     = ! empty( $input['add_block_links'] );
	$output['remove_block_button'] = ! empty( $input['remove_block_button'] );
	$output['end_block_inserter']  = ! empty( $input['end_block_inserter'] );

	// Block outlines mode (whitelist).
	$allowed_modes            = array( 'off', 'hover', 'always' );
	$mode                     = isset( $input['block_outlines'] ) ? $input['block_outlines'] : 'off';
	$output['block_outlines'] = in_array( $mode, $allowed_modes, true ) ? $mode : 'off';

	return $output;
}

/**
 * Render a boolean checkbox field.
 *
 * @param array $args {
 *     @type string $key         Setting key within the GutenView option.
 *     @type string $label_for   Input id.
 *     @type string $label       Checkbox label.
 *     @type string $description Optional help text.
 * }
 * @return void
 */
function gutenview_render_checkbox_field( $args ) {
	$key = isset( $args['key'] ) ? $args['key'] : '';

	if ( '' === $key ) {
		return;
	}

	$id          = isset( $args['label_for'] ) ? $args['label_for'] : 'gutenview_' . $key;
	$label       = isset( $args['label'] ) ? $args['label'] : '';
	$description = isset( $args['description'] ) ? $args['description'] : '';
	?>
	<label for="<?php echo esc_attr( $id ); ?>">
		<input
			type="checkbox"
			id="<?php echo esc_attr( $id ); ?>"
			name="<?php echo esc_attr( GUTENVIEW_OPTION ); ?>[<?php echo esc_attr( $key ); ?>]"
			value="1"
			<?php checked( (bool) gutenview_get_setting( $key ) ); ?>
		/>
		<?php echo esc_html( $label ); ?>
	</label>
	<?php if ( '' !== $description ) : ?>
		<p class="description"><?php echo esc_html( $description ); ?></p>
	<?php endif; ?>
	<?php
}

/**
 * Render a select (dropdown) field.
 *
 * @param array $args {
 *     @type string $key         Setting key within the GutenView option.
 *     @type string $label_for   Select id.
 *     @type array  $choices     value => label pairs.
 *     @type string $description Optional help text.
 * }
 * @return void
 */
function gutenview_render_select_field( $args ) {
	$key = isset( $args['key'] ) ? $args['key'] : '';

	if ( '' === $key || empty( $args['choices'] ) || ! is_array( $args['choices'] ) ) {
		return;
	}

	$id          = isset( $args['label_for'] ) ? $args['label_for'] : 'gutenview_' . $key;
	$description = isset( $args['description'] ) ? $args['description'] : '';
	$current     = (string) gutenview_get_setting( $key );
	?>
	<select
		id="<?php echo esc_attr( $id ); ?>"
		name="<?php echo esc_attr( GUTENVIEW_OPTION ); ?>[<?php echo esc_attr( $key ); ?>]"
	>
		<?php foreach ( $args['choices'] as $value => $label ) : ?>
			<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current, (string) $value ); ?>>
				<?php echo esc_html( $label ); ?>
			</option>
		<?php endforeach; ?>
	</select>
	<?php if ( '' !== $description ) : ?>
		<p class="description"><?php echo esc_html( $description ); ?></p>
	<?php endif; ?>
	<?php
}

/**
 * Intro copy for the View & Save section.
 *
 * @return void
 */
function gutenview_render_view_section() {
	echo '<p>' . esc_html__( 'Small quality-of-life tweaks around viewing and saving.', 'gutenview' ) . '</p>';
}

/**
 * Intro copy for the Discoverability section.
 *
 * @return void
 */
function gutenview_render_discoverability_section() {
	echo '<p>' . esc_html__( 'Editor affordance toggles will appear here.', 'gutenview' ) . '</p>';
}

/**
 * Render the settings page.
 *
 * @return void
 */
function gutenview_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

		<p><?php esc_html_e( "Make the block editor's hidden editing affordances visible and discoverable.", 'gutenview' ); ?></p>

		<form action="options.php" method="post">
			<?php
			settings_fields( 'gutenview_settings_group' );
			do_settings_sections( 'gutenview' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}
