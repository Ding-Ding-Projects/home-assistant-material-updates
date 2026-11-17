# Home Assistant Material updates

A release-notes site for Home Assistant Material: one page per version with the changes explained in plain words (English and Hong Kong Cantonese), a working demo of each new feature, a searchable and filterable list of versions, a calendar, a comparison page, a features page with the honest state of every required site feature, and a settings page.

It is a static site. `build.mjs` writes it into `_site/`, and `.github/workflows/pages.yml` publishes that folder with GitHub Pages. Every link is relative, so it works at a project path.

## Build and check

Needs Node 22 or newer. No dependencies.

| Command | What it does |
| --- | --- |
| `npm run fetch` | Downloads the public change list and rewrites `data/changes.json` and `data/slices/`. If the download fails the existing files are kept. |
| `npm run build` | Writes the whole site into `_site/`. |
| `npm run check` | Validates content files, demo pages, generated links and the feature inventory. `--warn-only` reports without failing. |
| `npm test` | Opens every demo and the main pages in a headless browser (Playwright, found locally or in the product's `frontend/` folder) and checks console errors, outside requests, sideways scrolling, the language, theme and layout matrix, and the site features. Skipped with a message when Playwright is not available. |
| `npm run serve` | Serves `_site/` on `http://127.0.0.1:8080/`. |
| `node make-preview.mjs` | Redraws `assets/social-preview.png` (the preview image for pasted links). |
| `node make-inventory.mjs` | Rewrites `docs/feature-inventory.md` from `features.mjs`. |

## Content

The words for a version live in `content/<build>.json` and its demos in `demos/<build>/<id>.html`. The exact format is in [CONTRIBUTING.md](CONTRIBUTING.md). A version without a content file still gets a page with its raw change list; a highlight without a demo file says "Demo not available yet".

## Data sources

- `data/changes.json` and `data/slices/*.json`: the product's public update feed, `https://raw.githubusercontent.com/Ding-Ding-Projects/home-assistant-material/channel/changes.json`, fetched at build time. Never edited by hand.
- `features.mjs` and `docs/feature-inventory.md`: the list of features this site owes, each with its state. States are only changed after the feature has been run.

## Components

Every <select> on the site is upgraded in the browser to a searchable list box (`assets/site.js`, styles in `assets/extras.css`). The native select stays in the page for no-script use and form values; choosing sets its value and fires `input` and `change`, so other code is unaffected. Selects added later (dialogs, editors) are upgraded automatically. A multi-select form is used where a list can grow (`data-cb-multi`). The change lists on a version page and on the compare page are filtered by area bars (toggle buttons), a build list (compare only), an explanation-only switch, a sort and a search, and keep that state in the page address.

## Privacy

The site sets no cookies and has no analytics. In the browser it reads only its own files, plus two public GitHub API addresses for the "Update coming soon" strip (the recent runs of the release workflow and the jobs of the active run). Choices (language for the visit, theme, text size, an optional wording file you load yourself, and notifications) are kept only in your browser's storage. The personal wording control ships empty and no wording file is bundled.

## Known gaps

See `docs/feature-inventory.md` for every feature and its state. The vendored font files are not copied in yet, so the system font stack is used.
