/** Stable marker for the accepted renderer-ui package boundary. */
export const packageBoundary = "@rsrender/renderer-ui" as const;

/**
 * The page remains inert markup. BLD-012 adds one isolated-preload application
 * version query without adding page script, remote resources, input, or state.
 */
export const inertShellHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>RSrender security shell</title>
</head>
<body>
  <main aria-label="Empty security shell">
    <h1>RSrender security shell</h1>
    <p>One read-only application version query is available.</p>
  </main>
</body>
</html>
`;
