import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  rsrenderAppIconBytes,
  rsrenderAppIconMediaType,
  rsrenderAppIconRevision,
  rsrenderAppIconSvg,
} from "../tooling/rsrender-app-icon.mjs";

function iconEntries(bytes) {
  assert.equal(bytes.readUInt16LE(0), 0, "ICO reserved field must be zero");
  assert.equal(bytes.readUInt16LE(2), 1, "ICO type must be icon");
  const count = bytes.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    return Object.freeze({
      width: bytes[offset] || 256,
      height: bytes[offset + 1] || 256,
      colorCount: bytes[offset + 2],
      planes: bytes.readUInt16LE(offset + 4),
      bitsPerPixel: bytes.readUInt16LE(offset + 6),
      byteLength: bytes.readUInt32LE(offset + 8),
      byteOffset: bytes.readUInt32LE(offset + 12),
    });
  });
}

test("BLD-054 admits an independently authored RSrender boring-log icon at Windows sizes", () => {
  assert.equal(rsrenderAppIconRevision, "bld-054-app-icon-v1");
  assert.equal(rsrenderAppIconMediaType, "image/vnd.microsoft.icon");
  assert.match(rsrenderAppIconSvg, /RSrender boring-log mark/u);
  assert.match(rsrenderAppIconSvg, /layered earth profile/u);
  assert.match(rsrenderAppIconSvg, /#17324d/u);
  assert.doesNotMatch(rsrenderAppIconSvg, /Electron|OpenJS|data:image/iu);

  const bytes = rsrenderAppIconBytes();
  const entries = iconEntries(bytes);
  assert.deepEqual(
    entries.map(({ width, height }) => [width, height]),
    [
      [256, 256],
      [64, 64],
      [32, 32],
      [16, 16],
    ],
  );
  for (const entry of entries) {
    assert.equal(entry.planes, 1);
    assert.equal(entry.bitsPerPixel, 32);
    assert.ok(entry.byteLength > 100);
    const payload = bytes.subarray(entry.byteOffset, entry.byteOffset + 8);
    assert.ok(
      payload
        .subarray(0, 8)
        .every(
          (value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
        ) || payload.readUInt32LE(0) === 40,
      "ICO image payload must be PNG or a Windows DIB",
    );
  }
  assert.equal(entries.at(-1).byteOffset + entries.at(-1).byteLength, bytes.byteLength);
});

test("BLD-054 sends the admitted icon through the existing Windows packager path", async () => {
  const packager = await readFile(
    new URL("../tooling/shell-package-bld026.mjs", import.meta.url),
    "utf8",
  );
  assert.match(packager, /writeRsrenderAppIcon\(appIconPath\)/u);
  assert.match(packager, /icon: appIconPath/u);
  assert.match(packager, /rsrenderAppIconRevision/u);
  assert.match(packager, /BLD054_ICON_NOT_APPLIED/u);
  assert.doesNotMatch(packager, /copyFile\(admittedExecutable/u);
  assert.doesNotMatch(packager, /electron-default-candidate|Electron default/iu);
});
