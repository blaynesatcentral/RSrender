import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const fontRoot = path.join(root, "packages", "platform-electron-main", "assets", "fonts");

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function sfntTables(bytes) {
  if (bytes.length < 12) throw new Error("FONT_SFNT_HEADER_INVALID");
  const count = bytes.readUInt16BE(4);
  const tables = new Map();
  for (let index = 0; index < count; index += 1) {
    const recordOffset = 12 + index * 16;
    if (recordOffset + 16 > bytes.length) throw new Error("FONT_SFNT_DIRECTORY_INVALID");
    const tag = bytes.toString("ascii", recordOffset, recordOffset + 4);
    const offset = bytes.readUInt32BE(recordOffset + 8);
    const length = bytes.readUInt32BE(recordOffset + 12);
    if (offset + length > bytes.length) throw new Error(`FONT_SFNT_TABLE_INVALID:${tag}`);
    tables.set(tag, bytes.subarray(offset, offset + length));
  }
  return tables;
}

function decodeName(table, platformId, encodingId, offset, length) {
  const bytes = table.subarray(offset, offset + length);
  if (platformId === 0 || platformId === 3) {
    if (bytes.length % 2 !== 0) return null;
    let value = "";
    for (let index = 0; index < bytes.length; index += 2) {
      value += String.fromCharCode(bytes.readUInt16BE(index));
    }
    return value;
  }
  if (platformId === 1 && encodingId === 0) return bytes.toString("latin1");
  return null;
}

function names(table) {
  if (table === undefined || table.length < 6) throw new Error("FONT_NAME_TABLE_INVALID");
  const count = table.readUInt16BE(2);
  const storageOffset = table.readUInt16BE(4);
  const byId = new Map();
  for (let index = 0; index < count; index += 1) {
    const recordOffset = 6 + index * 12;
    if (recordOffset + 12 > table.length) throw new Error("FONT_NAME_RECORD_INVALID");
    const platformId = table.readUInt16BE(recordOffset);
    const encodingId = table.readUInt16BE(recordOffset + 2);
    const languageId = table.readUInt16BE(recordOffset + 4);
    const nameId = table.readUInt16BE(recordOffset + 6);
    const length = table.readUInt16BE(recordOffset + 8);
    const offset = storageOffset + table.readUInt16BE(recordOffset + 10);
    if (offset + length > table.length) throw new Error("FONT_NAME_BYTES_INVALID");
    const decoded = decodeName(table, platformId, encodingId, offset, length);
    if (decoded === null || decoded.length === 0) continue;
    const rank = platformId === 3 && languageId === 0x0409 ? 0 : platformId === 3 ? 1 : 2;
    const current = byId.get(nameId);
    if (current === undefined || rank < current.rank) byId.set(nameId, { rank, value: decoded });
  }
  const value = (id) => byId.get(id)?.value ?? null;
  return {
    family: value(16) ?? value(1),
    subfamily: value(17) ?? value(2),
    fullName: value(4),
    postScriptName: value(6),
  };
}

function digestTables(tables, tags) {
  const hash = createHash("sha256");
  for (const tag of tags) {
    const table = tables.get(tag);
    if (table === undefined) throw new Error(`FONT_REQUIRED_TABLE_MISSING:${tag}`);
    hash.update(tag, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(table.length);
    hash.update(length);
    hash.update(table);
  }
  return `sha256:${hash.digest("hex")}`;
}

const files = (await readdir(fontRoot)).filter((name) => name.endsWith(".ttf")).sort();
const result = [];
for (const fileName of files) {
  const bytes = await readFile(path.join(fontRoot, fileName));
  const tables = sfntTables(bytes);
  const os2 = tables.get("OS/2");
  if (os2 === undefined || os2.length < 10) throw new Error("FONT_OS2_TABLE_INVALID");
  result.push({
    fileName,
    bytes: bytes.length,
    byteDigest: sha256(bytes),
    names: names(tables.get("name")),
    weightClass: os2.readUInt16BE(4),
    fsType: os2.readUInt16BE(8),
    metricsDigest: digestTables(tables, ["OS/2", "head", "hhea", "hmtx", "maxp"]),
    glyphCoverageDigest: digestTables(tables, ["cmap"]),
  });
}

const serialized = `${JSON.stringify(
  { schema: "rsrender.admitted-source-font-inspection.v1", fonts: result },
  null,
  2,
)}\n`;
if (process.argv.includes("--write")) {
  await writeFile(path.join(root, "artifacts", "bld-042-source-font-inspection.json"), serialized);
} else {
  console.log(serialized);
}
