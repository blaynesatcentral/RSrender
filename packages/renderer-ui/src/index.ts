/** Stable marker for the accepted renderer-ui package boundary. */
export const packageBoundary = "@rsrender/renderer-ui" as const;

/**
 * The BLD-006 page is deliberately inert. It has no script, preload, remote
 * resource, input, link, command, or application state.
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
    <p>No application capabilities are available.</p>
  </main>
</body>
</html>
`;
