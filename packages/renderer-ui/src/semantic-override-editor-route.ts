export const semanticEditorScriptUrl = "rsrender-shell://document/semantic-editor.js" as const;

export const semanticOverrideEditorHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>RSrender semantic override editor</title>
  <script src="${semanticEditorScriptUrl}" defer></script>
</head>
<body>
  <main aria-labelledby="editor-title">
    <h1 id="editor-title">RSrender semantic override editor</h1>
    <p id="editor-summary">Edit one display value without changing its source original.</p>

    <section aria-labelledby="document-state-title">
      <h2 id="document-state-title">Document state</h2>
      <dl>
        <dt>Working revision</dt><dd><output id="working-revision">Refreshing</output></dd>
        <dt>Durable revision</dt><dd><output id="durable-revision">Refreshing</output></dd>
        <dt>Dirty</dt><dd><output id="dirty-state">Refreshing</output></dd>
        <dt>History</dt><dd><output id="history-state">Refreshing</output></dd>
      </dl>
      <button id="refetch" type="button">Refetch full projection</button>
    </section>

    <section aria-labelledby="values-title">
      <h2 id="values-title">Source and effective display values</h2>
      <table>
        <caption>Select exactly one eligible field to create a Display Value Override.</caption>
        <thead>
          <tr>
            <th scope="col">Select</th>
            <th scope="col">Field</th>
            <th scope="col">Source original</th>
            <th scope="col">Type</th>
            <th scope="col">Unit</th>
            <th scope="col">Source provenance</th>
            <th scope="col">Effective display</th>
            <th scope="col">Effective provenance</th>
            <th scope="col">Override</th>
          </tr>
        </thead>
        <tbody id="value-rows"></tbody>
      </table>
    </section>

    <form id="override-form" aria-describedby="override-instructions form-error" novalidate>
      <fieldset>
        <legend>Create or replace a Display Value Override</legend>
        <p id="override-instructions">The source original remains immutable. Apply changes only the effective display value.</p>
        <p><label for="override-value">Replacement display value</label><br>
          <input id="override-value" name="override-value" type="text" autocomplete="off" aria-describedby="override-instructions form-error"></p>
        <p><label for="expected-type">Expected value type</label><br>
          <input id="expected-type" name="expected-type" type="text" readonly></p>
        <p><label for="expected-unit">Expected unit</label><br>
          <input id="expected-unit" name="expected-unit" type="text" readonly></p>
        <p><label for="override-reason">Rationale</label><br>
          <textarea id="override-reason" name="override-reason" rows="3" aria-describedby="override-instructions form-error"></textarea></p>
        <p id="form-error" role="alert"></p>
        <button id="apply-override" type="submit">Apply override</button>
      </fieldset>
    </form>

    <section aria-labelledby="history-title">
      <h2 id="history-title">History</h2>
      <button id="undo" type="button">Undo</button>
      <button id="redo" type="button">Redo</button>
      <p id="history-reason"></p>
    </section>

    <section aria-labelledby="diagnostics-title">
      <h2 id="diagnostics-title">Diagnostic facts</h2>
      <ul id="diagnostics"></ul>
    </section>

    <p id="editor-status" role="status" aria-live="polite" aria-atomic="true">Loading full projection.</p>
  </main>
</body>
</html>
`;
