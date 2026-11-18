# How the content of this site is written

This site is the updates log of Home Assistant Material: one page per version, with the
changes explained in plain words and a small working demo for each new feature.

The site generator reads three things. Writers only touch the last two.

| What | Where | Who writes it |
| --- | --- | --- |
| The change list (every version and its commits) | `data/changes.json`, one version per file in `data/slices/<build>.json` | Fetched from the product's update feed. Never edited by hand. |
| The words for a version | `content/<build>.json` | A writer |
| The demos for a version | `demos/<build>/<id>.html` | A writer |

## `content/<build>.json`

```json
{
  "build": 457,
  "headline": "Camera recording around the clock, and a Settings search that finds more",
  "summary": "Two to four plain sentences on what this version brings to someone using the product.",
  "summary_yue": "The same summary in properly written Hong Kong Cantonese.",
  "highlights": [
    {
      "id": "settings-search",
      "title": "Settings search finds pages inside the cards",
      "areas": ["interface"],
      "what": "Two to four sentences: what it is and what a person can now do.",
      "what_yue": "The same in Hong Kong Cantonese.",
      "why": "One or two sentences on the problem it solves.",
      "try": ["Step one of trying it in the demo.", "Step two.", "What you should see."],
      "sha": ["0622bb442"],
      "demo": "demos/457/settings-search.html"
    }
  ],
  "other": [
    { "title": "A plain one-line description of a smaller change", "sha": ["915c77f71"] }
  ],
  "no_feature_note": "Only when highlights is empty: one sentence saying this version is housekeeping and what kind."
}
```

Rules:

- `build` matches the file name. `id` is lower-case letters, digits and hyphens, unique in the file.
- `areas` values come from the change list: `interface`, `core`, `supervisor`, `os`, `deploy`,
  `docs`, `design`, `build`.
- Every `sha` must be a commit of that version in `data/slices/<build>.json`. Every commit of the
  version appears exactly once, in one highlight's `sha` list or in one `other` entry. Several
  commits that belong to one feature share one highlight.
- A highlight is something a person using the product can see or do: a new page, control, setting,
  behaviour or fix they would notice. Record-keeping, documentation, build and design-file commits
  go to `other`.
- A highlight may also list `more_demos`: extra working demos for the same feature. Each entry has a `title`, a `demo` path inside that version's `demos/<build>/` folder, and a `try` list. Each extra demo gets its own tab. Use it when one commit shows several demos, because each commit can belong to only one highlight. Every demo file in a version's folder must be named by its content file (`check` reports any that are not).
- Say only what the commit titles and explanations in the slice support. Do not invent features,
  numbers, screens or settings. If a commit is unclear, describe it only as far as its text goes.
- Plain words, sentence case, no jargon, no exclamation marks, no "simply" or "just". Write for
  someone who uses a smart home, not for a programmer. Never mention commit hashes in the prose.
- Cantonese is written the way it is spoken in Hong Kong, in traditional characters, not a
  word-for-word translation of the English.
- If a version has nothing a user would notice, `highlights` is `[]`, `no_feature_note` says so,
  and there is no demo. Never make up a demo for a version that has no feature.

## `demos/<build>/<id>.html`

One complete, self-contained page per highlight that lets a visitor try the feature with pretend
data. It is shown inside a frame on the version's page and can be opened alone.

- Starts with `<!doctype html>`, has `<html lang="en">`, a `<title>`, a viewport meta tag, and
  links exactly one outside file: `<link rel="stylesheet" href="../../assets/demo.css">`.
  Everything else (extra CSS, all JavaScript) is inline in the page. No other files, no images
  from elsewhere, no fonts, no network requests of any kind, no `localStorage`, no cookies.
- The body is `<main class="demo" data-demo="<id>">` and contains, in order: an `<h1>` naming the
  feature, a one-sentence `<p class="muted">` saying what to do, the working interface, and
  `<p class="demo-pretend">This is a demonstration with pretend data. Nothing is saved.</p>`.
- It must really work: the visitor's actions change what is shown, the way the feature does. A
  search filters, a toggle switches, a wizard moves through its steps and can go back, a list can
  be changed, a progress bar advances, a wrong entry shows its error. A picture of an interface or
  a button that only shows a message is not a demo.
- Include a `<button data-demo-reset>` labelled "Start again" that puts the demo back to its first
  state.
- Use the classes of `assets/demo.css` (read that file first): `.card`, `.note`, `.row`, `.stack`,
  `.grid`, `.list`, `.chip`, `.badge`, `.bar`, `.switch`, `button.filled`, `button.tonal`,
  `label.field`. Colours only through its variables (`var(--p)`, `var(--on)`, `var(--sl0)` and so
  on), so light and dark both work.
- Real controls only: `<button>`, `<input>` with a `<label>`, `<select>`. Everything reachable and
  usable with the keyboard, visible focus, every control at least 48 px tall, results announced
  in an element with `aria-live="polite"`.
- Works at 320 px wide with no sideways page scroll, and at 880 px.
- No errors in the browser console. Plain JavaScript, no libraries, wrapped in one
  `<script>` at the end of the body.
- Text in English only, same wording rules as above.
