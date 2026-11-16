// The owner's required feature list, with the honest state of each on this site.
// states: built (written and run in a browser test), partly, none (not built), na (cannot apply, with a reason).
// Keep this list and docs/feature-inventory.md in step: `node check.mjs` compares them.
export const PAGES = ['home', 'version', 'compare', 'features', 'settings'];

// [id, name, group, state, what it is here, where it is / what is missing, cantonese name]
const F = [
  ['language', 'Language modes', 'Language and personalisation', 'built', 'English, Hong Kong Cantonese, or both together, switched from the header on every page. Site chrome and the Cantonese notes in the data follow the mode.', 'Header button on every page; Settings. Release notes that have no Cantonese text stay in English.', '語言模式'],
  ['funny-emoji', 'Playfulness sliders and emoji', 'Language and personalisation', 'none', 'Two sliders (one per language) for the tone of the site copy, and an emoji switch for dialogs.', 'Not built. The site copy has one tone.', '趣味程度同表情符號'],
  ['personal-vocabulary', 'Personal wording file', 'Language and personalisation', 'built', 'Load a wording file from your device to replace words on the page. Checked in full, size-bounded, kept only in this browser, replaceable and clearable. Ships empty.', 'Settings, Your wording. Applies to the page text at load and when loaded.', '個人用字檔案'],
  ['school-mode', 'School mode', 'Language and personalisation', 'none', 'Renames the product in the interface and quietens playful extras.', 'Not built.', '學校模式'],
  ['narration', 'Spoken narrator', 'Language and personalisation', 'none', 'Reads the page aloud with the browser voices, with a voice picker per language.', 'Not built.', '朗讀'],
  ['scheduled-settings', 'Scheduled settings', 'Language and personalisation', 'none', 'Language and appearance that change on a schedule.', 'Not built.', '定時設定'],
  ['adhd-modes', 'Focus, Calm and Reading aids', 'Language and personalisation', 'none', 'Aids that reduce distraction, alone or together.', 'Not built.', '專注模式'],
  ['dim-sum', 'Dim sum surprise', 'Language and personalisation', 'none', 'A rare small surprise, never during a task, off in school mode.', 'Not built.', '點心驚喜'],
  ['dim-sum-photo-source', 'Dim sum photo source', 'Language and personalisation', 'na', 'Any dim sum picture comes from the owner\'s public photo source by link.', 'Not applicable while there is no dim sum surprise.', '點心相片來源'],

  ['material-design', 'Material Design 3', 'Look and layout', 'partly', 'Material Design 3 tokens, shape, type scale and components.', 'Colour, shape and controls follow the product tokens in assets/demo.css. The vendored Google Sans Flex font is not shipped yet, so the system font is used.', 'Material Design 3 設計'],
  ['workflow-navigation', 'Navigation by task', 'Look and layout', 'built', 'The header and the home page lead to versions, calendar, compare, features and settings; every link works.', 'Checked by the link check on every generated page.', '按工作導覽'],
  ['motion', 'Material motion and reduced motion', 'Look and layout', 'partly', 'Small transitions, with a complete reduced-motion path (system setting and a Settings switch).', 'A few transitions exist (the progress ring, toggles); Reduce motion and the system setting stop them. No animation editor.', '動態效果'],
  ['live-charts', 'Live charts', 'Look and layout', 'partly', 'A changes-per-day chart with pointer and keyboard scrubbing on the home page.', 'A changes-per-day line chart on the home page (smooth line, pointer and arrow-key scrubbing). There is no build-progress history to chart.', '即時圖表'],
  ['appearance-editor', 'Per-element appearance editor', 'Look and layout', 'none', 'Right-click any element to change colours, type, shape and spacing.', 'Not built.', '外觀編輯器'],
  ['color-picker', 'Colour picker and rainbow', 'Look and layout', 'none', 'A full colour picker with format translation.', 'Not built.', '色彩選擇器'],
  ['logo-customization', 'Custom logo', 'Look and layout', 'none', 'Replace the site logo with your own image, locally.', 'Not built.', '自訂標誌'],
  ['overlay-panels', 'Overlay panels', 'Look and layout', 'partly', 'Dialogs paint their own surface and close with Escape.', 'Dialogs cannot be moved or resized.', '浮層面板'],
  ['collapse-filters', 'Collapsible filters', 'Look and layout', 'built', 'The version filters collapse, show what is active while collapsed, and remember their state for the visit.', 'Home page, Versions.', '可摺疊篩選'],
  ['accessibility-sizing', 'Text size, contrast and target size', 'Look and layout', 'built', 'Text size 100 to 200 percent, more contrast and larger targets.', 'Settings, Accessibility. A full 320 px to 1440 px layout check runs in the test script; the 125, 150 and 200 percent display-scale matrix was not run.', '字體大細同對比'],
  ['functional-ui', 'Every control works', 'Look and layout', 'partly', 'No dead controls; empty results say so.', 'Checked by the browser test for the controls it exercises, not every control.', '控制項全部有效'],

  ['tabs', 'Tabs inside the site', 'Navigation and search', 'none', 'Open pages as tabs, close, reorder, and a New tab list.', 'Not built. Open selected versions opens browser tabs instead.', '分頁'],
  ['regex-search', 'Pattern builder beside every search', 'Navigation and search', 'partly', 'A pattern builder with pattern, flags, test text, matches and explanation, kept in step with the search field.', 'Built beside the home, header, version, compare, features, settings and palette searches. It is not a full RegexBuddy-level builder: no replace mode, no saved-pattern library, no engine choice, and the browser cannot interrupt a slow pattern.', '樣式建構器'],
  ['command-palette', 'Command palette', 'Navigation and search', 'built', 'Ctrl+Shift+F opens a palette that searches every page, setting and action.', 'Every page; its search has a pattern builder.', '指令面板'],
  ['context-menus', 'Context menus', 'Navigation and search', 'none', 'A menu on every element by right-click, keyboard and touch-and-hold.', 'Not built.', '右鍵選單'],
  ['menu-shortcuts', 'Menu shortcuts', 'Navigation and search', 'partly', 'Shortcut shown for each item and working.', 'Only the palette shortcut and Escape exist.', '選單快速鍵'],
  ['rich-controls', 'Rich controls', 'Navigation and search', 'partly', 'Sliders, selects and pickers where a value is shown.', 'Selects, chips, segmented buttons and switches. The confirmation uses a slider. No steppers or pickers elsewhere.', '豐富控制項'],
  ['guided-forms', 'Guided forms', 'Navigation and search', 'none', 'Step-by-step forms with validation.', 'There is no form on this site that needs steps.', '引導式表單'],
  ['info-icon-guidance', 'Info buttons', 'Navigation and search', 'partly', 'An info button beside each control that explains it.', 'Settings only.', '資訊按鈕'],
  ['settings-explanations', 'Settings with explanations', 'Navigation and search', 'built', 'Each setting says what it does and its default, and can be reset; with its own search and pattern builder.', 'Settings page.', '設定說明'],
  ['blank-editors', 'Presets for empty editors', 'Navigation and search', 'na', 'Any empty editor offers presets.', 'Not applicable: the site has no editor.', '空白編輯器範本'],

  ['super-confirmation', 'Two-key confirmation with slider', 'Safety and locks', 'built', 'Resetting everything needs two separate keys and a slider pushed all the way; nothing is typed.', 'Settings, Reset everything.', '雙鑰匙確認'],
  ['element-locks', 'Toy locks', 'Safety and locks', 'none', 'Speed-bump locks on any element.', 'Not built.', '玩具鎖'],
  ['support-tickets', 'Recovery desk', 'Safety and locks', 'na', 'Tickets, unlock ladder, authenticator and QR pairing that belong to the locks.', 'Not applicable without locks.', '支援工單'],
  ['honest-monetization', 'Free, nothing hidden', 'Safety and locks', 'built', 'Free, no adverts, no nagging, nothing behind payment.', 'Stated on the features page; true of the whole site.', '誠實收費'],

  ['local-history', 'Local history', 'Records and messages', 'none', 'A list of your own settings changes with restore.', 'Not built. Notifications keep a short log of messages, but settings changes cannot be restored from a history.', '本機紀錄'],
  ['exports', 'Exports', 'Records and messages', 'built', 'Export lists and comparisons as JSON, CSV, Markdown, plain text, HTML and print.', 'Versions list, change lists, compare result.', '匯出'],
  ['bulk-actions', 'Multi-select and bulk actions', 'Records and messages', 'built', 'Select several versions or changes; export, compare or open the selection.', 'Versions list and change lists.', '批量操作'],
  ['changelog', 'Changelog viewer', 'Records and messages', 'built', 'This site is a changelog viewer for the product. The site\'s own history is in its repository.', 'Whole site.', '更新日誌'],
  ['rendered-provider-text', 'Data rendered as text', 'Records and messages', 'built', 'Text from the data is escaped and shown as formatted text, never as markup.', 'All generated and scripted output escapes text.', '資料文字渲染'],
  ['notifications', 'Toasts and notification centre', 'Records and messages', 'built', 'Non-blocking toasts for exports and copies, kept in a notification centre.', 'Bell in the header.', '通知'],

  ['file-converter', 'File converter', 'Built-in tools', 'none', 'A file converter that runs in the browser.', 'Not built.', '檔案轉換器'],
  ['base64-tools', 'Base64 tools', 'Built-in tools', 'none', 'A Base64 toolkit that runs in the browser.', 'Not built.', 'Base64 工具'],
  ['virtual-disk-manager', 'Virtual disk manager', 'Built-in tools', 'na', 'A Windows virtual disk manager.', 'Cannot run on a public web page: it needs operating system access.', '虛擬磁碟管理員'],
  ['ollama-suite', 'Local model manager', 'Built-in tools', 'na', 'A local model manager.', 'Cannot run on a public web page: it needs a local service and files.', '本機模型管理員'],
  ['progress-recovery', 'Progress and recovery where it started', 'Built-in tools', 'partly', 'Progress shows where the action started, and a failure offers recovery there.', 'The build strip offers Refresh on failure; data loading errors say what to do. Exports have no progress because they are instant.', '進度同復原'],

  ['completeness-parity', 'Feature inventory', 'Completeness and evidence', 'built', 'A hand-written list of every feature here with its state.', 'docs/feature-inventory.md, compared with this list by check.mjs.', '功能清單'],
  ['front-provenance', 'Version and last-updated time on the front page', 'Completeness and evidence', 'built', 'The home page shows the site version and when it was last built, in 24-hour time.', 'Home page.', '版本同更新時間'],
  ['product-evidence', 'Real screenshots', 'Completeness and evidence', 'none', 'Real screenshots wherever a surface is described.', 'Not built. Test screenshots are kept locally and are not published.', '真實截圖'],
  ['design-reference-parity', 'Match the design boards', 'Completeness and evidence', 'partly', 'The pages follow the two design boards.', 'Section order and content follow the boards; exact visual parity was not measured.', '設計稿相符'],
  ['cheap-layout-matrix', 'No clipping matrix', 'Completeness and evidence', 'partly', 'No clipping at 320 px and up, in English, Cantonese and both, light and dark, at 100 to 200 percent.', 'The browser test checks for sideways scroll at 320 px and 1280 px in English, Cantonese and both languages, in light and dark. The 125, 150 and 200 percent display scales, and per-element clipping, were not measured.', '版面檢查'],

  ['landing-site', 'Phone-ready Material site', 'Site', 'built', 'Works from 320 px; features move, none are removed.', 'All pages; sideways scroll checked at 320 px.', '手機版網站'],
  ['feature-articles', 'One article per feature', 'Site', 'built', 'Every feature on this list has its own article page.', 'features/<id>/.', '功能文章'],
  ['vendored-fonts', 'Fonts shipped with the site', 'Site', 'partly', 'No font is loaded from another site.', 'True: the system font stack is used and nothing is loaded from other sites. The owner\'s Google Sans Flex files are not copied in yet: copying them from the project site was refused by the sandbox in this pass.', '自備字體'],
  ['shared-link-embed', 'Link preview', 'Site', 'built', 'Open Graph tags and a preview image for pasted links.', 'Every page; assets/social-preview.png.', '連結預覽'],
  ['homepage-link', 'Repository About link', 'Site', 'na', 'The repository About link points at the deployed site.', 'Not applicable to this change: set in the hosting step, not in the files.', '倉庫網址'],
  ['animation-editor', 'Animation and transition editor', 'Site', 'none', 'Per-kind on/off, duration, delay, easing and distance, with profiles.', 'Not built.', '動畫編輯器'],
];

export const FEATURES = F.map(([id, name, group, state, what, where, yue]) => ({ id, name, group, state, what, where, yue }));
export const STATE_LABEL = { built: 'Built and run', partly: 'Partly built', none: 'Not built', na: 'Does not apply' };
export const STATE_LABEL_YUE = { built: '已整好並運行過', partly: '整咗部分', none: '未整', na: '唔適用' };

const ALL = 'home, version, compare, features, settings';
export const PAGES_OF = {
  'material-design': ALL, 'workflow-navigation': ALL, motion: ALL, 'functional-ui': ALL, 'accessibility-sizing': ALL, language: ALL, 'personal-vocabulary': ALL, notifications: ALL, 'command-palette': ALL,
  'overlay-panels': ALL, 'honest-monetization': 'features', 'rendered-provider-text': ALL, changelog: 'home, version, compare', exports: 'home (versions), version (changes), compare, settings',
  'bulk-actions': 'home (versions), version (changes)', 'collapse-filters': 'home (versions)', 'live-charts': 'home', 'regex-search': 'home, version, compare, features, settings, palette, header', 'settings-explanations': 'settings',
  'super-confirmation': 'settings', 'info-icon-guidance': 'settings', 'rich-controls': 'home, settings', 'front-provenance': 'home', 'completeness-parity': 'features', 'feature-articles': 'features',
  'shared-link-embed': ALL, 'landing-site': ALL, 'cheap-layout-matrix': ALL, 'design-reference-parity': 'home, version', 'progress-recovery': 'home, version', 'menu-shortcuts': 'palette', 'vendored-fonts': ALL, 'product-evidence': 'none',
};
