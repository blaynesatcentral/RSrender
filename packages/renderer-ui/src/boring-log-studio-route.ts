export const boringLogStudioScriptUrl = "rsrender-shell://document/semantic-editor.js" as const;
export const boringLogStudioStylesheetUrl =
  "rsrender-shell://document/boring-log-studio.css" as const;

function embeddedSceneJson(scene: unknown): string {
  return JSON.stringify(scene).replaceAll("<", "\\u003c");
}

export function createBoringLogStudioHtml(scene: unknown = null): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>RSrender Boring Log Studio</title>
  <link rel="stylesheet" href="${boringLogStudioStylesheetUrl}">
  <script id="resolved-page-scene" type="application/json">${embeddedSceneJson(scene)}</script>
  <script src="${boringLogStudioScriptUrl}" defer></script>
</head>
<body>
  <div class="app-shell">
    <header class="titlebar">
      <div class="brand-mark" aria-hidden="true">RS</div>
      <div class="brand-copy"><strong>RSrender</strong><span>Boring Log Studio</span></div>
      <div class="document-title"><span class="saved-dot" aria-hidden="true"></span>Synthetic Site Boring Log</div>
      <div class="window-meta">Structured scene · Page 1 of 1</div>
    </header>
    <nav class="tabs" role="tablist" aria-label="Application commands">
      <button class="tab is-active" id="ribbon-tab-home" data-ribbon-tab="home" role="tab" aria-selected="true" aria-controls="ribbon" type="button">Home</button>
      <button class="tab" id="ribbon-tab-layout" data-ribbon-tab="layout" role="tab" aria-selected="false" aria-controls="ribbon" type="button">Layout</button>
      <button class="tab" id="ribbon-tab-data" data-ribbon-tab="data" role="tab" aria-selected="false" aria-controls="ribbon" type="button">Data</button>
      <button class="tab" id="ribbon-tab-review" data-ribbon-tab="review" role="tab" aria-selected="false" aria-controls="ribbon" type="button">Review</button>
      <button class="tab" id="ribbon-tab-publish" data-ribbon-tab="publish" role="tab" aria-selected="false" aria-controls="ribbon" type="button">Publish</button>
    </nav>
    <section class="ribbon" id="ribbon" role="tabpanel" aria-labelledby="ribbon-tab-home" aria-label="Home commands">
      <div class="ribbon-group" data-ribbon-panel="home"><button type="button" id="select-page"><span>▱</span>Page</button><button type="button" id="select-body"><span>▥</span>Log Body</button><small>Selection</small></div>
      <div class="ribbon-group" data-ribbon-panel="home"><button type="button" id="undo" disabled><span>↶</span>Undo</button><button type="button" id="redo" disabled><span>↷</span>Redo</button><small>History</small></div>
      <div class="ribbon-group" data-ribbon-panel="layout" hidden><button type="button" id="fit-page"><span>□</span>Fit Page</button><button type="button" id="actual-size"><span>1:1</span>Actual</button><small>Page view</small></div>
      <div class="ribbon-group" data-ribbon-panel="data" hidden><button type="button" id="inspect-samples"><span>│</span>Samples</button><button type="button" id="inspect-track"><span>⌁</span>Data Track</button><small>Structured data</small></div>
      <div class="ribbon-group" data-ribbon-panel="review" hidden><button type="button" id="validate-document"><span>✓</span>Validate</button><button type="button" id="show-diagnostics"><span>!</span>Diagnostics</button><small>Review</small></div>
      <div class="ribbon-group" data-ribbon-panel="publish" hidden><button type="button" id="export-pdf" disabled><span>⇩</span>Export PDF</button><small>Output</small></div>
      <div class="ribbon-message"><strong>Resolved Page Scene</strong><span id="scene-summary">Loading structured page…</span></div>
    </section>
    <main class="workspace">
      <aside class="pane contents-pane" aria-labelledby="contents-title">
        <div class="pane-heading"><div><span class="eyebrow">DOCUMENT</span><h1 id="contents-title">Contents</h1></div><button type="button" aria-label="Contents options">•••</button></div>
        <label class="search"><span aria-hidden="true">⌕</span><input id="contents-filter" type="search" placeholder="Filter layers" autocomplete="off"></label>
        <div class="tree-toolbar" aria-label="Contents display mode"><button class="is-active" type="button">Drawing order</button><button type="button">Source</button></div>
        <div id="contents-tree" class="contents-tree" role="tree" aria-label="Boring log semantic hierarchy"></div>
      </aside>
      <section class="canvas-workspace" aria-labelledby="canvas-title">
        <header class="canvas-tab"><span class="page-icon" aria-hidden="true"></span><h2 id="canvas-title">Boring Log — Page 1</h2><span>×</span></header>
        <div class="canvas-toolbar"><button id="select-tool" class="is-active" type="button">↖ Select</button><button id="pan-tool" type="button">✋ Pan</button><span></span><output id="canvas-scale">100%</output></div>
        <div id="canvas-stage" class="canvas-stage"><div id="page-shadow" class="page-shadow"><div id="svg-page" class="svg-page" aria-busy="true"></div></div></div>
      </section>
      <aside class="pane properties-pane" aria-labelledby="properties-title">
        <div class="pane-heading"><div><span class="eyebrow">INSPECTOR</span><h2 id="properties-title">Properties</h2></div><button type="button" aria-label="Properties options">•••</button></div>
        <div class="property-tabs" role="tablist"><button id="property-tab-element" class="is-active" role="tab" aria-selected="true" aria-controls="property-element-panel" type="button">Element</button><button id="property-tab-diagnostics" role="tab" aria-selected="false" aria-controls="property-diagnostics-panel" type="button">Diagnostics <span id="diagnostic-badge">0</span></button></div>
        <div id="properties-scroll" class="properties-scroll" tabindex="0" aria-label="Properties panel content">
          <section id="property-element-panel" role="tabpanel" aria-labelledby="property-tab-element">
            <section id="selection-empty" class="empty-selection"><span aria-hidden="true">⌁</span><strong>Select a page element</strong><p>Choose an item in Contents or directly on the page.</p></section>
            <section id="selection-properties" hidden>
              <div class="selection-card"><span id="selection-role">Page element</span><strong id="selection-name">None</strong><small id="selection-provenance">Computed</small></div>
              <details class="property-group" open><summary>Identity</summary><div class="property-group-body"><dl><dt>Semantic ID</dt><dd id="property-semantic-id">—</dd><dt>Node role</dt><dd id="property-role">—</dd><dt>Scene nodes</dt><dd id="property-node-count">—</dd></dl></div></details>
              <details class="property-group" open><summary>Content & geometry</summary><div class="property-group-body"><label>Text or value<textarea id="property-content" rows="3" readonly></textarea></label><button id="apply-property" class="apply-property" type="button" disabled>Apply property</button><p id="property-help" class="property-help">Select an editable structured value.</p><dl><dt>Bounds</dt><dd id="property-bounds">—</dd></dl></div></details>
              <details class="property-group" open><summary>Data provenance</summary><div class="property-group-body"><dl><dt>Source</dt><dd id="property-source-original">—</dd><dt>Effective</dt><dd id="property-effective-value">—</dd></dl><p id="property-provenance">—</p></div></details>
            </section>
          </section>
          <section id="property-diagnostics-panel" class="diagnostics-panel" role="tabpanel" aria-labelledby="property-tab-diagnostics" hidden><h3>Diagnostics</h3><ul id="diagnostics-list"></ul></section>
        </div>
      </aside>
    </main>
    <footer class="statusbar"><span class="status-ready">● Ready</span><span id="selection-status">No selection</span><span class="status-spacer"></span><span id="page-status">Page 1 of 1</span><button type="button" id="zoom-out" aria-label="Zoom out">−</button><input id="zoom" type="range" min="40" max="160" step="10" value="100" aria-label="Canvas zoom"><button type="button" id="zoom-in" aria-label="Zoom in">＋</button><output id="zoom-value">100%</output></footer>
    <p id="editor-status" role="status" aria-live="polite" aria-atomic="true">Loading structured scene.</p>
  </div>
</body>
</html>`;
}
