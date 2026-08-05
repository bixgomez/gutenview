# GutenView

Makes the WordPress block editor's hidden editing affordances visible and
discoverable.

This is the developer-facing document. For the user-facing description that
WordPress.org publishes, see `readme.txt`.

## What it is

Gutenberg hides most of its editing affordances behind hover states and precise
mouse positioning. Where a block begins and ends, that a block is selectable at
all, and where a new block would go are all invisible until you happen to put the
cursor in the right place. Experienced users have internalized this. Clients,
editors, marketing teams, and anyone who edits a page once a month have not.

GutenView surfaces those affordances. Each one is independently configurable, so
a site can turn on only what its editors need.

## What it is not

It is not a page builder. It is not Elementor, Divi, or Beaver Builder, and it
does not aim to become them. Gutenberg stays Gutenberg. GutenView only removes
friction around it.

It does not require blocks to be rewritten or to opt in. It works with core, ACF,
third-party, and custom blocks without any block-author integration.

Disable the plugin and the editor behaves exactly as it did before. Every feature
is additive and reversible.

## Requirements

- WordPress 6.5 or later
- PHP 7.4 or later

There is no build step. The plugin ships plain PHP, CSS, and JavaScript, all
loaded directly. Nothing needs compiling, and there are no npm or Composer
dependencies.

## Architecture

```
gutenview.php                      Bootstrap, constants, feature module loading
uninstall.php                      Removes the settings option when deleted
readme.txt                         WordPress.org directory listing
README.md                          This file
includes/
  settings.php                     Data accessors, defaults (single source of truth)
  activation.php                   Seeds the defaults on first activation
  assets.php                       Shared enqueue helpers: versioning, translations
  admin/
    settings-page.php              Settings -> GutenView, field renderers, sanitizer
  features/
    <feature>.php                  One file per feature
assets/
  css/<feature>.css                Per-feature styles
  js/<feature>.js                  Per-feature scripts
```

Block outlines are the one feature with more than one stylesheet, because the
setting has two visible modes. They load as a base plus a mode layer:

```
block-outlines.css          Colour language, line geometry, hover, motion
  + block-outlines-always.css   Visible resting line, ancestor chain, selected
  + block-outlines-hover.css    Reveal on hover only, selection left alone
```

The mode file declares the base as a stylesheet dependency, so load order is
guaranteed rather than incidental. Anything both modes agree on belongs in the
base. This split exists because the two files were previously independent, and
months of refinement to the colours and geometry landed in only one of them, so
switching modes silently produced a stale design.

Every directory also carries a silence `index.php`.

### Settings

All settings live in a single array option, `gutenview_settings`, referenced
through the `GUTENVIEW_OPTION` constant.

`gutenview_default_settings()` in `includes/settings.php` is the single source of
truth for setting keys and their defaults. Nothing else should hardcode a key or
a default value.

Accessors:

- `gutenview_get_settings()` returns stored values merged over defaults
- `gutenview_get_setting( $key )` returns one value, or `null` for unknown keys
- `gutenview_is_enabled()` reports the master switch

Every setting defaults on, so a fresh install shows what the plugin does without
anyone having to go hunting through a settings page first. Editors switch off
whatever they do not want. Turning the master switch off suppresses every
feature while preserving each individual toggle, so a site can disable the
plugin's effects wholesale without losing its configuration.

`gutenview_activate()` in `includes/activation.php` writes the defaults to the
option on first activation. It uses `add_option()`, so reactivating an existing
install never overwrites choices already made.

Because every setting lives inside that one option, `uninstall.php` only has to
delete a single key. Note that it repeats the option name as a literal string,
since WordPress loads `uninstall.php` without the main plugin file and
`GUTENVIEW_OPTION` therefore does not exist at that point. If the constant ever
changes, change it in both places.

### Feature modules

Each feature is one self-contained file in `includes/features/`. A feature
module is responsible for exactly three things:

1. Checking `gutenview_is_enabled()` and its own setting key
2. Returning early if either is off
3. Enqueueing its own assets on the correct hook

Feature modules are loaded admin-only from `gutenview_bootstrap()`, since the
block editor runs in wp-admin. `includes/settings.php` and `includes/assets.php`
are loaded unconditionally so settings and enqueue helpers are available anywhere.

Modules do not call `wp_enqueue_style()` or `wp_enqueue_script()` directly. They
use `gutenview_enqueue_style()` and `gutenview_enqueue_script()` from
`includes/assets.php`, which centralize path building, cache-bust versioning, and
translation registration. A feature module should only have to say which file it
wants and what it depends on.

## The enqueue rule

Read this before adding any feature. It is the constraint most likely to cost
you an afternoon.

**The WordPress 7.0 editor canvas is an iframe.** Assets destined for the canvas
and assets destined for the surrounding admin page load through different hooks:

| Target | Hook | Use for |
|---|---|---|
| Editor canvas (iframe) | `enqueue_block_assets` (guard with `is_admin()`) | CSS that styles blocks: outlines, ghost hints, anything drawn on or around block markup |
| Outer admin document | `enqueue_block_editor_assets` | Editor chrome UI (header buttons, snackbar), and all JavaScript, including scripts that reach into the canvas |

CSS enqueued on `enqueue_block_editor_assets` never reaches the canvas, so a rule
that looks correct will simply do nothing. This is the usual cause of "my styles
aren't applying."

Some features need both. `remove-block-button.php` enqueues its CSS on both
hooks because core may render the target popover in either document depending on
context.

## Design principles

**Never fight React, and never fight core.** Gutenberg owns the block tree and
re-renders it whenever it likes. Anything injected into that tree gets torn out,
and anything that competes with core's own styles produces intermittent bugs that
are miserable to reproduce.

The add-block hints are the clearest expression of this. They are cosmetic
`::after` pseudo-elements carrying `pointer-events: none`. The JavaScript only
*measures* the gaps between blocks and writes inline custom properties, which
React ignores because it does not recognize them. All actual block insertion is
performed by WordPress's own inserter. Because the native inserter renders as a
high z-index popover, it simply covers the hint on approach, so the handoff needs
no code at all.

**Prefer CSS.** Most affordances are pure editor styling. CSS is cheap, safe,
fully reversible, and cannot break the editor's behavior. Reach for JavaScript
only when something genuinely has to be measured or dispatched.

**Extend core's UI through core's own extension points.** The corollary to not
fighting React: where an affordance belongs *inside* a React-owned component, do
not inject it. The toolbar delete button is the one feature that lives inside
such a component, and it registers through the `editor.BlockEdit` filter with a
BlockControls fill, so React renders it and keeps rendering it. See
`toolbar-delete-button.js`.

**Every affordance is independently configurable.** Sites differ, and editors
differ. Nothing is bundled into an all-or-nothing mode.

**Solve one pain point well.** This is a family of small independent
enhancements, not a framework.

## Gotchas

**The pseudo-element budget is nearly spent.** Block wrappers have only
`::before` and `::after`. The add-block hints use `::after` (and `::before` on
blocks that follow a separator), and core itself uses `::after` to draw the
`.is-highlighted` ring. Any new block-level decoration has to account for what is
already claimed. Where core and GutenView collide, GutenView yields: see the
`.is-highlighted` rule at the end of `add-block-links.css`, which hands the
pseudo-element back to core for the duration of the highlight.

**The selected-block outline needs `!important`.** Gutenberg sets that outline
through inline styles from JavaScript, which an ordinary stylesheet rule cannot
override.

**`color-mix()` sets a browser floor.** The outline colors derive hover and
ancestor tints from `--wp-admin-theme-color` via `color-mix()`, which requires
Chrome 111+, Firefox 113+, or Safari 16.2+. Substitute plain hex values if that
floor is ever too high.

**Void elements cannot render pseudo-elements.** A separator block is an `<hr>`,
so it can never paint its own hint. The gap below one is drawn by the *next*
block's `::before` instead. Two consecutive separators remain an unsolved edge
case, deemed rare enough to leave.

**Mirror core's limits rather than inventing them.** `MAX_COLUMNS` in
`add-block-links.js` is 6 because core's Columns block caps there and stops
offering its own "Add column" control. When core hides an affordance, GutenView
hides its hint for the same affordance.

**Blocks inside the canvas inherit the theme's editor styles.** Classic themes
style bare `button` elements, so any real control injected into the canvas has to
reset its own appearance explicitly rather than assume a neutral starting point.
See `edge-block-inserters.css`.

## Features

| Setting key | Default | Section | What it does |
|---|---|---|---|
| `enabled` | `true` | General | Master switch |
| `view_same_tab` | `true` | View & Save | Adds a same-tab View button beside the stock new-tab one |
| `reposition_snackbar` | `true` | View & Save | Moves the saved notice from bottom-left to top-right |
| `adjustable_sidebar` | `true` | Editor Layout | Makes the settings sidebar wider and editor-adjustable |
| `block_outlines` | `'always'` | Discoverability | Block boundary outlines: `off`, `hover`, or `always` |
| `add_block_links` | `true` | Discoverability | Faint "+" hints between top-level blocks and between columns |
| `remove_block_button` | `true` | Discoverability | Minus button beside the new-block "+" |
| `edge_block_inserters` | `true` | Discoverability | Working "+" above the first and below the final top-level block |
| `toolbar_delete_button` | `true` | Discoverability | Delete control in the block toolbar, out of the overflow menu |

`block_outlines` is the only non-boolean setting. It is sanitized against a
whitelist; anything unrecognized falls back to `off`.

The adjustable sidebar stores its enabled state with the other site-wide
GutenView settings. Its pixel width is different: each editor chooses that value
independently, and the JavaScript stores it through WordPress's preferences data
store. The resize separator lives under `document.body`, outside Gutenberg's
React-owned tree, and tracks the sidebar edge with `ResizeObserver`. It starts
at 400 pixels and can grow to 75% of the viewport, so it also works as a quick
responsive-testing canvas.

## Adding a feature

1. Add the setting key and its default to `gutenview_default_settings()` in
   `includes/settings.php`. Default to on, like every other setting.
2. Add a sanitizer entry in `gutenview_sanitize_settings()` in
   `includes/admin/settings-page.php`. Booleans use `! empty()`; anything with a
   fixed set of values gets a whitelist check.
3. Register the field with `add_settings_field()` in the appropriate section,
   using `gutenview_render_checkbox_field()` or `gutenview_render_select_field()`.
4. Create `includes/features/<feature>.php`. Gate on `gutenview_is_enabled()` and
   your own key, then enqueue on the hook the enqueue rule above calls for.
5. Add assets under `assets/css/` and `assets/js/`, named after the feature.
6. Require the new module from `gutenview_bootstrap()` in `gutenview.php`, inside
   the `is_admin()` block.

Enqueue through `gutenview_enqueue_style()` and `gutenview_enqueue_script()`
rather than the WordPress functions directly, so versioning and translation
wiring stay in one place. If the script contains any user-facing strings, pass
`true` as the final argument and add `wp-i18n` to its dependencies.

If a canvas style animates anything, give it a `prefers-reduced-motion` block.
If it injects an interactive control, give that control a `:focus-visible` rule
with a real outline. Both are covered under accessibility below.

## Accessibility

The plugin's whole purpose is making the editor easier to perceive and operate,
so it has to hold itself to that standard rather than only improving the visual
case.

**Translate anything that becomes an accessible name.** Several labels are set as
`aria-label`, so an untranslated string is announced in English to a screen
reader user on a non-English site. Note also that
`view-same-tab.js` deliberately overwrites core's label on the stock View button;
that replacement must be translated, or it is a regression against WordPress.

**Write i18n strings as literals inside `__()`.** The extraction tooling reads
the source statically, so `__( someVariable, 'gutenview' )` produces a string
that can never appear in a `.pot` file and therefore can never be translated,
even though the code looks correct. See `labels()` in `view-same-tab.js` for the
shape that works.

**Respect `prefers-reduced-motion`.** Every stylesheet that animates carries a
reduce block. When removing an animation, check whether the element depends on
the animation's end state for its resting appearance: the add-block hints start
at `opacity: 0` and are only revealed by the fade, so their reduce block has to
restate the resting opacity or they would vanish entirely.

**Injected controls need real focus indicators.** An opacity or colour shift
shared with `:hover` is not a focus indicator. Use `:focus-visible` with an
actual outline, and remember that the canvas is subject to the theme's editor
styles, so nothing about default focus rendering can be assumed.

**Decorative things should stay invisible to assistive technology.** The
add-block hints are pseudo-elements precisely so they are not announced. They are
decoys for the eye; announcing them would be noise.

## Coding standards

The plugin targets the WordPress Coding Standards, which WordPress.org requires:

- Prefix everything with `gutenview_`, including functions, option keys, and
  asset handles
- Text domain is `gutenview`, matching the plugin slug; all user-facing strings
  are translatable
- Sanitize on input, escape on output
- Gate admin actions on capability checks
- No minified or obfuscated code
- No external requests. The plugin phones home to nothing.

## Distribution

Target is the WordPress.org plugin directory, under GPL-2.0-or-later.

Outstanding before submission:

- Confirm the `gutenview` slug is available
- Run Plugin Check
- Add screenshots
- `Requires at least` is set to 6.5. Development was against 7.0; the plugin is
  also being tested on 6.9. The 6.5 to 6.8 range is a declared floor that has not
  been verified directly, so spot-check it before relying on it.

WordPress.org discourages "Gutenberg" in plugin names and slugs. "GutenView"
should be acceptable, but confirm before release.
