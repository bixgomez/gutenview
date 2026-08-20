=== GutenView ===
Contributors: fezziwigmedia
Tags: block editor, gutenberg, editor, usability
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Make the WordPress block editor's hidden editing affordances visible and discoverable.

== Description ==

The block editor hides most of its controls behind hover states and precise mouse
positioning. Where a block begins and ends, that a block can be selected at all,
and where a new block would go are invisible until the cursor happens to land in
the right place. Experienced users have learned to live with this. Clients,
editors, and anyone who updates a page once a month have not.

GutenView makes those controls visible. Every enhancement is a separate setting,
and they all start switched on, so you can see what the plugin does right away
and then switch off anything your editors do not need.

It is not a page builder. The block editor stays exactly as it is, and GutenView
only removes friction around it. Blocks do not need to be rewritten or to opt in,
so it works with core blocks, ACF blocks, and third-party blocks alike. Disable
the plugin and the editor behaves as it always did.

= Block outlines =

Draw a boundary around blocks so their edges are visible. Choose "Always" to
outline every block, or "On hover" to show the boundary only for the block under
the cursor. Selected blocks and their parent containers are distinguished, so
it is clear which block you are in and what it sits inside.

Colors follow your WordPress admin color scheme.

= Add-block hints =

Place a faint "+" at each block boundary, and between columns, so it is obvious
where a new block would go. As you approach one, WordPress's own inserter takes
over, so clicking behaves exactly as it normally does.

= Add-block buttons at the edges =

Add a working "+" above the first block and beneath the final one, the two spots
where WordPress offers no inserter of its own. There is always an obvious place
to start writing and to continue, rather than a thin strip of page to hunt for.

= Delete button in the block toolbar =

Deleting a block is a common, deliberate action, but WordPress keeps it inside
the toolbar's overflow ("three dots") menu. This adds a Delete button to the
toolbar itself, in its own group just before that menu. It is withheld for
blocks WordPress will not let you remove, and deletion undoes normally with
Ctrl+Z.

= Remove-block button =

Put a matching "minus" button beside the "+" that appears on a new empty block,
so a block added by accident can be removed on the spot instead of through the
toolbar's overflow menu. Removal undoes normally with Ctrl+Z.

= View in same tab =

Add a "View" button that opens the post in the current tab, next to the stock
button that opens a new one, so a long editing session stops piling up browser
tabs.

= Reposition the save notice =

Move the "saved" confirmation from the far bottom-left corner up to the
top-right, near the Save button you just clicked.

= Adjustable editor sidebar =

Give the editor settings sidebar a roomier starting width and add a draggable
edge so each editor can choose how much room it needs. The resize control also
works with the keyboard, and WordPress remembers each editor's chosen width. It
can grow to 75% of the viewport, making it useful for quick responsive checks
inside the editor.

== Installation ==

Choose either installation method:

* With Composer: run `composer require bixgomez/gutenview:^0.1` from a
  Composer-managed WordPress project.
* Manually: upload the `gutenview` folder to `/wp-content/plugins/`.

Then:

1. Activate the plugin through the "Plugins" screen in WordPress.
2. Go to Settings > GutenView (or the "Settings" link in the plugin's row on the
   Plugins screen) to review the enhancements.

Every enhancement starts switched on, so the plugin does its thing as soon as it
is activated. Turn off anything you do not want, or use the master switch to
suppress all of them at once without losing your individual choices.

== Frequently Asked Questions ==

= Is this a page builder? =

No. GutenView adds no blocks, no layout system, and no templates. It makes the
existing block editor's controls easier to see. Everything you build stays
standard block markup.

= Will it work with my blocks? =

Yes. GutenView does not require blocks to support it, so core blocks, ACF blocks,
and third-party blocks all work without modification.

= What happens if I deactivate it? =

The editor returns to normal immediately. GutenView only adds editor styling and
editor controls, and changes nothing about your content.

= Does it change how my site looks to visitors? =

No. Everything GutenView does happens inside the editor. The front end is
untouched.

= Can I turn on just one thing? =

Yes. Every enhancement is a separate setting, so you can switch off the ones you
do not want and keep the rest. There is also a master switch that turns
everything off at once while remembering your individual choices.

== Changelog ==

= 0.1.0 =
* Settings page (Settings > GutenView) with a master switch and per-feature toggles.
* "Settings" link in the plugin's row on the Plugins screen.
* Every enhancement switched on by default, seeded on first activation.
* Block outlines, with off, on-hover, and always modes, including selected-block and parent-container states.
* Add-block hints between top-level blocks and between columns.
* Add-block buttons above the first and below the final top-level block.
* Delete button in the block toolbar, in its own group before the overflow menu.
* Remove-block button beside the new-block inserter.
* "View in same tab" button in the editor header.
* Option to reposition the "saved" notice near the Save button.
* Wider, editor-adjustable settings sidebar with a saved per-editor width.
