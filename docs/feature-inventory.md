# Feature inventory

Every feature the owner requires of this site, one row per feature id, with an honest state. The list lives in `features.mjs`; this file is written from it by `node make-inventory.mjs`, and `node check.mjs` fails when the two disagree.

States:

- **built**: written and exercised by `node test-demos.mjs` in a real browser. The check names what it covered.
- **partly**: part exists and was run; the missing part is stated.
- **none**: not built in this pass.
- **na**: cannot apply, with the specific reason.

Totals: 35 built, 14 partly, 1 not built, 6 not applicable, out of 56.

Pages: home (index.html), version (releases/N/), compare, features (and its articles), settings.


## Language and personalisation

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `language` | Language modes | built (Built and run) | home, version, compare, features, settings | Header button on every page; Settings. Release notes that have no Cantonese text stay in English. |
| `funny-emoji` | Playfulness sliders and emoji | built (Built and run) | all pages (settings) | Settings, Voice and tone: two level 1 to 5 sliders (English, Cantonese) for 24 chrome strings (headings, buttons, empty states, toasts), level 3 being the normal wording, and an emoji switch for dialog titles and toasts (default off). Facts and numbers never change. |
| `personal-vocabulary` | Personal wording file | built (Built and run) | home, version, compare, features, settings | Settings, Your wording. Applies to the page text at load and when loaded. |
| `school-mode` | School mode | built (Built and run) | all pages (settings) | Settings, School mode: renames the brand in the header, holds playfulness at 1, and turns off emoji, the dim sum surprise and narration autoplay; one button restores everything. Page content that names the product is not rewritten. |
| `narration` | Spoken narrator | partly (Partly built) | all pages (settings, menu) | Settings and the phone menu: Read this page, per-section Read buttons, per-language voice pickers, speed, pitch, pause, resume, stop, honest messages. Only the controls and the no-voice message were verified; actual speech and Cantonese voices were not heard. |
| `scheduled-settings` | Scheduled settings | built (Built and run) | settings | Settings, Scheduled settings: rules by time range and weekday (ranges may cross midnight) that set language, colours or playfulness; applied on load and every minute; a line says which rule is active. |
| `adhd-modes` | Focus, Calm and Reading aids | built (Built and run) | all pages (settings) | Settings, Reading aids: Focus, Calm and Reading (with a ruler that follows pointer and keyboard focus), alone or combined. |
| `dim-sum` | Dim sum surprise | built (Built and run) | all pages | About one visit in ten, at most once per visit, a small text card names a dish from a built-in list of 22; off in school mode and Calm; never while typing or in a dialog. No picture, nothing loaded. |
| `dim-sum-photo-source` | Dim sum photo source | na (Does not apply) | - | Not applicable while there is no dim sum surprise. |

## Look and layout

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `material-design` | Material Design 3 | partly (Partly built) | home, version, compare, features, settings | Colour, shape and controls follow the product tokens in assets/demo.css. The vendored Google Sans Flex font is not shipped yet, so the system font is used. |
| `workflow-navigation` | Navigation by task | built (Built and run) | home, version, compare, features, settings | Checked by the link check on every generated page. |
| `motion` | Material motion and reduced motion | partly (Partly built) | home, version, compare, features, settings | A few transitions exist (the progress ring, toggles); Reduce motion and the system setting stop them. No animation editor. |
| `live-charts` | Live charts | partly (Partly built) | home | A changes-per-day line chart on the home page (smooth line, pointer and arrow-key scrubbing). There is no build-progress history to chart. |
| `appearance-editor` | Per-element appearance editor | built (Built and run) | all pages (settings, context menu) | Settings and the context menu: ten element kinds; colours, radius, padding, size, weight, letter spacing; live preview, undo, redo, reset, JSON export and import, kept in this browser. |
| `color-picker` | Colour picker and rainbow | built (Built and run) | settings | HSL sliders, hex, RGB and HSL fields that translate both ways, eyedropper where supported, recent colours, contrast read-out, rainbow (static under reduced motion). |
| `logo-customization` | Custom logo | built (Built and run) | all pages (settings) | Settings, Your logo: PNG, JPEG, WebP or SVG up to 2 MB drawn to a 96 px canvas and stored locally; reset restores the shipped logo. |
| `overlay-panels` | Overlay panels | partly (Partly built) | home, version, compare, features, settings | Dialogs cannot be moved or resized. |
| `collapse-filters` | Collapsible filters | built (Built and run) | home (versions) | Home page, Versions. |
| `accessibility-sizing` | Text size, contrast and target size | built (Built and run) | home, version, compare, features, settings | Settings, Accessibility. A full 320 px to 1440 px layout check runs in the test script; the 125, 150 and 200 percent display-scale matrix was not run. |
| `functional-ui` | Every control works | partly (Partly built) | home, version, compare, features, settings | Checked by the browser test for the controls it exercises, not every control. |

## Navigation and search

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `tabs` | Tabs inside the site | built (Built and run) | all pages | A tab strip under the header: open from version cards, feature cards and palette results, switch (scroll kept), close, close others, reorder by keyboard (Alt+arrows) and drag, a New tab list with search and pattern builder; remembered for the visit. |
| `regex-search` | Pattern builder beside every search | partly (Partly built) | home, version, compare, features, settings, palette, header | Built beside the home, header, version, compare, features, settings and palette searches. It is not a full RegexBuddy-level builder: no replace mode, no saved-pattern library, no engine choice, and the browser cannot interrupt a slow pattern. |
| `command-palette` | Command palette | built (Built and run) | home, version, compare, features, settings | Every page; its search has a pattern builder. |
| `context-menus` | Context menus | built (Built and run) | all pages | Right-click, Shift+F10 or the Menu key, and touch-and-hold (600 ms) open the element menu; Shift+right-click keeps the browser menu. Touch-and-hold was not run on a real touch device. |
| `menu-shortcuts` | Menu shortcuts | built (Built and run) | palette | Each context menu item shows Alt+Shift+letter and the shortcuts work on the focused or last-used element. |
| `rich-controls` | Rich controls | partly (Partly built) | home, settings | Every select is a searchable list box (search with the pattern builder, month groups, keyboard, anchored panel or phone bottom sheet, multi-select for builds), plus chips, area bars that filter, segmented buttons and switches. The confirmation uses a slider. No steppers or date pickers. |
| `guided-forms` | Guided forms | partly (Partly built) | version | Each version page has a step-by-step update wizard (back, next, ticks, summary) with the plain list kept for no-script. No other form on the site needs steps. |
| `info-icon-guidance` | Info buttons | partly (Partly built) | settings | Settings only. |
| `settings-explanations` | Settings with explanations | built (Built and run) | settings | Settings page. |
| `blank-editors` | Presets for empty editors | na (Does not apply) | - | Not applicable: the site has no editor. |

## Safety and locks

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `super-confirmation` | Two-key confirmation with slider | built (Built and run) | settings | Settings, Reset everything. |
| `element-locks` | Toy locks | built (Built and run) | all pages | Context menu, Lock this element: 4-digit PIN on a keypad, salted SHA-256 digest only, blocks the element, list in Settings, forgotten-PIN path through the two-key confirmation. A speed bump, not security. |
| `support-tickets` | Recovery desk | na (Does not apply) | - | Not applicable without locks. |
| `honest-monetization` | Free, nothing hidden | built (Built and run) | features | Stated on the features page; true of the whole site. |

## Records and messages

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `local-history` | Local history | built (Built and run) | settings | Settings, History: last 100 changes to settings, appearance, schedules and the logo with 24-hour time, restore, export, clear (two-key confirmation). |
| `exports` | Exports | built (Built and run) | home (versions), version (changes), compare, settings | Versions list, change lists, compare result. |
| `bulk-actions` | Multi-select and bulk actions | built (Built and run) | home (versions), version (changes) | Versions list and change lists. |
| `changelog` | Changelog viewer | built (Built and run) | home, version, compare | Whole site. |
| `rendered-provider-text` | Data rendered as text | built (Built and run) | home, version, compare, features, settings | All generated and scripted output escapes text. |
| `notifications` | Toasts and notification centre | built (Built and run) | home, version, compare, features, settings | Bell in the header. |

## Built-in tools

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `file-converter` | File converter | built (Built and run) | tools | tools/convert/: images between PNG, JPEG and WebP with a quality slider, UTF-8 and Base64, JSON to CSV, CSV to JSON, JSON pretty or minify; each states its limits. |
| `base64-tools` | Base64 tools | built (Built and run) | tools | tools/base64/: UTF-8 safe encode and decode, URL-safe variant, file to Base64 and back, live validation with the position of the first bad character, size read-out. |
| `virtual-disk-manager` | Virtual disk manager | na (Does not apply) | - | Cannot run on a public web page: it needs operating system access. |
| `ollama-suite` | Local model manager | na (Does not apply) | - | Cannot run on a public web page: it needs a local service and files. |
| `progress-recovery` | Progress and recovery where it started | partly (Partly built) | home, version | The build strip offers Refresh on failure; data loading errors say what to do. Exports have no progress because they are instant. |

## Completeness and evidence

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `completeness-parity` | Feature inventory | built (Built and run) | features | docs/feature-inventory.md, compared with this list by check.mjs. |
| `front-provenance` | Version and last-updated time on the front page | built (Built and run) | home | Home page. |
| `product-evidence` | Real screenshots | none (Not built) | - | Not built. Test screenshots are kept locally and are not published. |
| `design-reference-parity` | Match the design boards | partly (Partly built) | home, version | Section order and content follow the boards; exact visual parity was not measured. |
| `cheap-layout-matrix` | No clipping matrix | partly (Partly built) | home, version, compare, features, settings | The browser test checks for sideways scroll at 320 px and 1280 px in English, Cantonese and both languages, in light and dark. The 125, 150 and 200 percent display scales, and per-element clipping, were not measured. |

## Site

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `landing-site` | Phone-ready Material site | built (Built and run) | home, version, compare, features, settings | All pages; sideways scroll checked at 320 px. |
| `feature-articles` | One article per feature | built (Built and run) | features | features/<id>/. |
| `vendored-fonts` | Fonts shipped with the site | partly (Partly built) | home, version, compare, features, settings | True: the system font stack is used and nothing is loaded from other sites. The owner's Google Sans Flex files are not copied in yet: copying them from the project site was refused by the sandbox in this pass. |
| `shared-link-embed` | Link preview | built (Built and run) | home, version, compare, features, settings | Every page; assets/social-preview.png. |
| `homepage-link` | Repository About link | na (Does not apply) | - | Not applicable to this change: set in the hosting step, not in the files. |
| `animation-editor` | Animation and transition editor | built (Built and run) | all pages (settings) | Settings, Animation: per kind on or off, duration, delay, stagger, easing presets and a cubic-bezier editor with a drawn curve (number fields, not draggable), distance, global speed, master switch, four profiles plus your own, JSON import and export, live preview; reduced motion always wins. |

## What was not run

- The 125, 150 and 200 percent display-scale matrix and per-element clipping measurement.
- Screen reader testing. Keyboard operation was exercised for the calendar, the chart, the palette, the dialogs and the tabs.
- The deployed site: nothing was published or opened from the hosting address.
- The "Update coming soon" strip against the real GitHub API; the test answers its two addresses with pretend data.
