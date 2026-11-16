# Feature inventory

Every feature the owner requires of this site, one row per feature id, with an honest state. The list lives in `features.mjs`; this file is written from it by `node make-inventory.mjs`, and `node check.mjs` fails when the two disagree.

States:

- **built**: written and exercised by `node test-demos.mjs` in a real browser. The check names what it covered.
- **partly**: part exists and was run; the missing part is stated.
- **none**: not built in this pass.
- **na**: cannot apply, with the specific reason.

Totals: 19 built, 13 partly, 18 not built, 6 not applicable, out of 56.

Pages: home (index.html), version (releases/N/), compare, features (and its articles), settings.


## Language and personalisation

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `language` | Language modes | built (Built and run) | home, version, compare, features, settings | Header button on every page; Settings. Release notes that have no Cantonese text stay in English. |
| `funny-emoji` | Playfulness sliders and emoji | none (Not built) | - | Not built. The site copy has one tone. |
| `personal-vocabulary` | Personal wording file | built (Built and run) | home, version, compare, features, settings | Settings, Your wording. Applies to the page text at load and when loaded. |
| `school-mode` | School mode | none (Not built) | - | Not built. |
| `narration` | Spoken narrator | none (Not built) | - | Not built. |
| `scheduled-settings` | Scheduled settings | none (Not built) | - | Not built. |
| `adhd-modes` | Focus, Calm and Reading aids | none (Not built) | - | Not built. |
| `dim-sum` | Dim sum surprise | none (Not built) | - | Not built. |
| `dim-sum-photo-source` | Dim sum photo source | na (Does not apply) | - | Not applicable while there is no dim sum surprise. |

## Look and layout

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `material-design` | Material Design 3 | partly (Partly built) | home, version, compare, features, settings | Colour, shape and controls follow the product tokens in assets/demo.css. The vendored Google Sans Flex font is not shipped yet, so the system font is used. |
| `workflow-navigation` | Navigation by task | built (Built and run) | home, version, compare, features, settings | Checked by the link check on every generated page. |
| `motion` | Material motion and reduced motion | partly (Partly built) | home, version, compare, features, settings | A few transitions exist (the progress ring, toggles); Reduce motion and the system setting stop them. No animation editor. |
| `live-charts` | Live charts | partly (Partly built) | home | A changes-per-day line chart on the home page (smooth line, pointer and arrow-key scrubbing). There is no build-progress history to chart. |
| `appearance-editor` | Per-element appearance editor | none (Not built) | - | Not built. |
| `color-picker` | Colour picker and rainbow | none (Not built) | - | Not built. |
| `logo-customization` | Custom logo | none (Not built) | - | Not built. |
| `overlay-panels` | Overlay panels | partly (Partly built) | home, version, compare, features, settings | Dialogs cannot be moved or resized. |
| `collapse-filters` | Collapsible filters | built (Built and run) | home (versions) | Home page, Versions. |
| `accessibility-sizing` | Text size, contrast and target size | built (Built and run) | home, version, compare, features, settings | Settings, Accessibility. A full 320 px to 1440 px layout check runs in the test script; the 125, 150 and 200 percent display-scale matrix was not run. |
| `functional-ui` | Every control works | partly (Partly built) | home, version, compare, features, settings | Checked by the browser test for the controls it exercises, not every control. |

## Navigation and search

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `tabs` | Tabs inside the site | none (Not built) | - | Not built. Open selected versions opens browser tabs instead. |
| `regex-search` | Pattern builder beside every search | partly (Partly built) | home, version, compare, features, settings, palette, header | Built beside the home, header, version, compare, features, settings and palette searches. It is not a full RegexBuddy-level builder: no replace mode, no saved-pattern library, no engine choice, and the browser cannot interrupt a slow pattern. |
| `command-palette` | Command palette | built (Built and run) | home, version, compare, features, settings | Every page; its search has a pattern builder. |
| `context-menus` | Context menus | none (Not built) | - | Not built. |
| `menu-shortcuts` | Menu shortcuts | partly (Partly built) | palette | Only the palette shortcut and Escape exist. |
| `rich-controls` | Rich controls | partly (Partly built) | home, settings | Selects, chips, segmented buttons and switches. The confirmation uses a slider. No steppers or pickers elsewhere. |
| `guided-forms` | Guided forms | none (Not built) | - | There is no form on this site that needs steps. |
| `info-icon-guidance` | Info buttons | partly (Partly built) | settings | Settings only. |
| `settings-explanations` | Settings with explanations | built (Built and run) | settings | Settings page. |
| `blank-editors` | Presets for empty editors | na (Does not apply) | - | Not applicable: the site has no editor. |

## Safety and locks

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `super-confirmation` | Two-key confirmation with slider | built (Built and run) | settings | Settings, Reset everything. |
| `element-locks` | Toy locks | none (Not built) | - | Not built. |
| `support-tickets` | Recovery desk | na (Does not apply) | - | Not applicable without locks. |
| `honest-monetization` | Free, nothing hidden | built (Built and run) | features | Stated on the features page; true of the whole site. |

## Records and messages

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `local-history` | Local history | none (Not built) | - | Not built. Notifications keep a short log of messages, but settings changes cannot be restored from a history. |
| `exports` | Exports | built (Built and run) | home (versions), version (changes), compare, settings | Versions list, change lists, compare result. |
| `bulk-actions` | Multi-select and bulk actions | built (Built and run) | home (versions), version (changes) | Versions list and change lists. |
| `changelog` | Changelog viewer | built (Built and run) | home, version, compare | Whole site. |
| `rendered-provider-text` | Data rendered as text | built (Built and run) | home, version, compare, features, settings | All generated and scripted output escapes text. |
| `notifications` | Toasts and notification centre | built (Built and run) | home, version, compare, features, settings | Bell in the header. |

## Built-in tools

| id | Feature | State | Pages | Where it is, or what is missing |
| --- | --- | --- | --- | --- |
| `file-converter` | File converter | none (Not built) | - | Not built. |
| `base64-tools` | Base64 tools | none (Not built) | - | Not built. |
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
| `animation-editor` | Animation and transition editor | none (Not built) | - | Not built. |

## What was not run

- The 125, 150 and 200 percent display-scale matrix and per-element clipping measurement.
- Screen reader testing. Keyboard operation was exercised for the calendar, the chart, the palette, the dialogs and the tabs.
- The deployed site: nothing was published or opened from the hosting address.
- The "Update coming soon" strip against the real GitHub API; the test answers its two addresses with pretend data.
