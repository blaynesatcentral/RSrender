import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const driverPath = new URL("../tooling/bld-052-coordinate-driver.ps1", import.meta.url);
const ledgerPath = new URL(
  "../artifacts/bld-052-coordinate-usability-triage.json",
  import.meta.url,
);

test("BLD-052 provides a dependency-free coordinate-only Windows driver", async () => {
  await access(driverPath);
  const source = await readFile(driverPath, "utf8");

  for (const operation of [
    '"launch"',
    '"focus"',
    '"screenshot"',
    '"click"',
    '"move"',
    '"doubleclick"',
    '"rightclick"',
    '"drag"',
    '"scroll"',
    '"key"',
    '"type"',
    '"wait"',
    '"resize"',
    '"close"',
  ]) {
    assert.match(source, new RegExp(`\\b${operation.slice(1, -1)}\\b`, "u"));
  }

  for (const requiredApi of [
    "Start-Process",
    "SetCursorPos",
    "GetCursorPos",
    "SendInput",
    "SetForegroundWindow",
    "SwitchToThisWindow",
    "GetForegroundWindow",
    "AttachThreadInput",
    "PrintWindow",
    "SendMessage",
    "ScreenToClient",
    "GetKeyboardState",
    "SetKeyboardState",
    "MapVirtualKey",
    "MAPVK_VK_TO_VSC",
    "WM_LBUTTONDBLCLK",
    "WM_MOUSEWHEEL",
    "WM_CHAR",
    "Get-BoundedLabel",
    "actionFile",
    "driverScriptFull",
    "SOURCE_DIGEST_NAME_INVALID",
    '"driver" =',
    '"actionFile" =',
    "windowHandle",
    "captureMode",
    "rect = [ordered]",
    "CopyFromScreen",
    "CreateJobObject",
    "AssignProcessToJobObject",
    "TerminateAndCloseJob",
    'Send-KeyChord "ESC"',
    "BLD052_TIMEOUT",
    "action-transcript.jsonl",
    "coordinateOnly = $true",
    "syntheticDataOnly = $true",
  ]) {
    assert.ok(source.includes(requiredApi), `missing ${requiredApi}`);
  }

  for (const forbidden of [
    "querySelector",
    "getElementById",
    "document.",
    "evaluate(",
    "ExecuteJavaScript",
    "webContents",
    "ipcRenderer",
    "UIAutomation",
    "Playwright",
    "Selenium",
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden app/DOM surface: ${forbidden}`);
  }

  assert.match(source, /ValidateRange\(1, 250\)/u);
  assert.match(source, /ValidateRange\(1, 900\)/u);
  assert.match(source, /textSha256/u);
  assert.match(source, /executableSha256/u);
  assert.match(source, /foreground-sendinput/u);
  assert.match(source, /window-message/u);
  assert.match(source, /windowMessageKeyboard = Use-WindowMessagePointerInput \$context/u);
  assert.match(source, /Send-WindowKeyChord \$context\.window \$key/u);
  assert.match(source, /Convert-KeyMessageLParam/u);
  assert.match(source, /SetKeyboardState\(\$priorState\)/u);
  assert.match(source, /WM_KEYDOWN.*Convert-KeyMessageLParam/u);
  assert.match(source, /WM_KEYUP.*Convert-KeyMessageLParam/u);
  assert.match(source, /foreground -and -not \$windowMessageKeyboard\) \{ Send-KeyChord \$key \}/u);
  assert.match(source, /Send-WindowUnicodeText \$context\.window \$text/u);
  assert.match(source, /"MOVE_X"/u);
  assert.match(source, /"move"[\s\S]*Set-DesktopCursor \$x \$y/u);
  assert.match(source, /"desktop-cursor"/u);
  assert.match(source, /inputMode =/u);
  assert.match(source, /windowRect =/u);
  assert.match(source, /workflow = \$workflow/u);
  assert.match(source, /persona = \$persona/u);
  assert.match(source, /sourceDigests = \[ordered\] @\{/u);
});

test("BLD-052 retains machine-checkable persona coverage and triage findings", async () => {
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  assert.equal(ledger.schema, "rsrender.bld052.coordinate-usability-triage.v1");
  assert.equal(ledger.syntheticDataOnly, true);
  assert.equal(ledger.completedSyntheticPass.result, "PASS");
  assert.equal(ledger.completedSyntheticPass.actionCount, 35);
  assert.deepEqual(
    ledger.personas.map(({ id }) => id),
    [
      "first-time",
      "geotechnical-editor",
      "power-user",
      "touchpad",
      "keyboard-accessibility",
      "constrained-viewport",
      "persistence-import-export",
      "error-recovery",
    ],
  );
  assert.deepEqual(
    ledger.findings.map(({ title }) => title),
    ["DPI Properties clipping", "Data em dashes", "High-DPI modifier chords were no-ops"],
  );
  for (const finding of ledger.findings) {
    assert.ok(finding.status, `missing triage status for ${finding.title}`);
    assert.ok(finding.severity, `missing triage severity for ${finding.title}`);
    assert.ok(finding.reproSteps.length > 0, `missing repro steps for ${finding.title}`);
  }
});
