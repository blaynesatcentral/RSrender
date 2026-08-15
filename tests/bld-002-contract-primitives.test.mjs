import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, URL } from "node:url";
import { test } from "node:test";

import {
  canonicalizeJson,
  ContractPrimitiveError,
  contractPrimitivesRevision,
  defineOpaqueIdentityCodec,
  isMpt,
  isPhysicalUnit,
  isSha256Digest,
  MPT_PER_INCH,
  MPT_PER_POINT,
  MPT_ROUNDING_MODE,
  mptToPhysicalLength,
  parseMpt,
  parseOpaqueIdentity,
  parseSha256Digest,
  PHYSICAL_UNITS,
  physicalLengthToMpt,
  SHA256_ALGORITHM,
  sha256Bytes,
  sha256CanonicalJson,
  sha256Utf8,
} from "../packages/contracts/dist/index.js";

const propertySeeds = [0x0020_2608, 0x1451_9001, 0x7fff_ffc5];

function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function expectCode(code, action) {
  assert.throws(action, (error) => error instanceof ContractPrimitiveError && error.code === code);
}

test("opaque identity codecs preserve exact strings and never coerce", () => {
  assert.equal(contractPrimitivesRevision, "bld-002-v1");
  const sourceEntity = defineOpaqueIdentityCodec("SourceEntityIdentity");
  const identity = "urn:rsrender:fixture:fx-01:exploration:00042";
  assert.equal(sourceEntity.kind, "SourceEntityIdentity");
  assert.equal(sourceEntity.parse(identity), identity);
  assert.equal(
    sourceEntity.parse("urn:rsrender:fixture:fx-01:探索:😀"),
    "urn:rsrender:fixture:fx-01:探索:😀",
  );
  assert.equal(sourceEntity.format(sourceEntity.parse(" 00042 ")), " 00042 ");
  assert.notEqual(sourceEntity.parse("00042"), sourceEntity.parse("42"));
  assert.equal(sourceEntity.is(identity), true);
  assert.equal(sourceEntity.is(42), false);
  expectCode("IDENTITY_NOT_STRING", () => sourceEntity.parse(42));
  expectCode("IDENTITY_EMPTY", () => sourceEntity.parse(""));
  expectCode("IDENTITY_INVALID_UNICODE", () => sourceEntity.parse("\ud800"));
  expectCode("IDENTITY_KIND_INVALID", () => defineOpaqueIdentityCodec(""));
  assert.equal(
    parseOpaqueIdentity("file-looking-but-opaque/C:/sample"),
    "file-looking-but-opaque/C:/sample",
  );
});

test("opaque identity property vectors round-trip exactly for three recorded seeds", () => {
  for (const seed of propertySeeds) {
    const random = generator(seed);
    const codec = defineOpaqueIdentityCodec(`fixture-kind-${seed}`);
    for (let index = 0; index < 1_000; index += 1) {
      const ordinal = Math.floor(random() * 1_000_000_000)
        .toString()
        .padStart(9, "0");
      const identity = `urn:rsrender:fixture:fx-01:entity:${seed.toString(16)}:${ordinal}`;
      assert.equal(codec.format(codec.parse(identity)), identity);
    }
  }
});

test("mpt is a signed safe integer and physical conversions round exactly once", () => {
  assert.equal(MPT_PER_POINT, 1_000);
  assert.equal(MPT_PER_INCH, 72_000);
  assert.equal(MPT_ROUNDING_MODE, "half-away-from-zero-v1");
  assert.deepEqual(PHYSICAL_UNITS, ["mpt", "pt", "in", "mm", "cm"]);
  assert.equal(parseMpt(-0), 0);
  assert.equal(isMpt(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isMpt(0.1), false);
  assert.equal(isPhysicalUnit("mm"), true);
  assert.equal(isPhysicalUnit("px"), false);
  assert.equal(physicalLengthToMpt(1, "pt"), 1_000);
  assert.equal(physicalLengthToMpt(1, "in"), 72_000);
  assert.equal(physicalLengthToMpt(25.4, "mm"), 72_000);
  assert.equal(physicalLengthToMpt(2.54, "cm"), 72_000);
  assert.equal(physicalLengthToMpt(0.0005, "pt"), 1);
  assert.equal(physicalLengthToMpt(-0.0005, "pt"), -1);
  assert.equal(physicalLengthToMpt(1.5, "mpt"), 2);
  assert.equal(physicalLengthToMpt(-1.5, "mpt"), -2);
  assert.equal(mptToPhysicalLength(72_000, "in"), 1);
  assert.equal(mptToPhysicalLength(72_000, "mm"), 25.4);
  expectCode("MPT_NOT_SAFE_INTEGER", () => parseMpt(1.1));
  expectCode("MPT_NOT_SAFE_INTEGER", () => parseMpt("1000"));
  expectCode("PHYSICAL_VALUE_NOT_FINITE", () => physicalLengthToMpt(Number.NaN, "pt"));
  expectCode("PHYSICAL_VALUE_NOT_FINITE", () =>
    physicalLengthToMpt(Number.POSITIVE_INFINITY, "pt"),
  );
  expectCode("PHYSICAL_UNIT_INVALID", () => physicalLengthToMpt(1, "px"));
  expectCode("PHYSICAL_VALUE_OUT_OF_RANGE", () =>
    physicalLengthToMpt(Number.MAX_SAFE_INTEGER, "in"),
  );
});

test("mpt property vectors preserve canonical integer geometry for three recorded seeds", () => {
  for (const seed of propertySeeds) {
    const random = generator(seed);
    for (let index = 0; index < 1_000; index += 1) {
      const mpt = Math.floor(random() * 2_000_001) - 1_000_000;
      assert.equal(physicalLengthToMpt(mpt, "mpt"), mpt);
      assert.equal(physicalLengthToMpt(mpt / 1_000, "pt"), mpt);
      assert.equal(parseMpt(mpt), mpt);
    }
  }
});

test("canonical JSON follows UTF-8 JCS scalar, number, escaping, and UTF-16 key ordering rules", () => {
  assert.equal(
    canonicalizeJson({ numbers: [Number("333333333.33333329"), 1e30, 4.5, 2e-3, 1e-27] }),
    '{"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}',
  );
  assert.equal(canonicalizeJson({ s: '\u000f\n"\\/' }), '{"s":"\\u000f\\n\\"\\\\/"}');
  assert.equal(
    canonicalizeJson({
      "€": "Euro Sign",
      "\r": "Carriage Return",
      דּ: "Hebrew Letter Dalet With Dagesh",
      1: "One",
      "😀": "Emoji: Grinning Face",
      "\u0080": "Control",
      ö: "Latin Small Letter O With Diaeresis",
    }),
    '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
  );
  assert.equal(canonicalizeJson(-0), "0");
  const nullPrototype = Object.create(null);
  nullPrototype.b = 2;
  nullPrototype.a = 1;
  assert.equal(canonicalizeJson(nullPrototype), '{"a":1,"b":2}');
});

test("canonical JSON rejects non-I-JSON, hidden, executable, sparse, and cyclic structures", () => {
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(undefined));
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(1n));
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(Number.NaN));
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(Number.POSITIVE_INFINITY));
  expectCode("CANONICAL_JSON_INVALID_UNICODE", () => canonicalizeJson("\udfff"));
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(new Date(0)));
  const sparse = [];
  sparse.length = 1;
  expectCode("CANONICAL_JSON_SPARSE_ARRAY", () => canonicalizeJson(sparse));
  const extraArray = [1];
  extraArray.extra = 2;
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(extraArray));
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get: () => 1 });
  expectCode("CANONICAL_JSON_ACCESSOR", () => canonicalizeJson(accessor));
  const hidden = {};
  Object.defineProperty(hidden, "value", { enumerable: false, value: 1 });
  expectCode("CANONICAL_JSON_ACCESSOR", () => canonicalizeJson(hidden));
  const symbolObject = { value: 1 };
  symbolObject[Symbol("hidden")] = 2;
  expectCode("CANONICAL_JSON_UNSUPPORTED", () => canonicalizeJson(symbolObject));
  const cyclic = {};
  cyclic.self = cyclic;
  expectCode("CANONICAL_JSON_CYCLE", () => canonicalizeJson(cyclic));
});

test("canonical JSON property vectors ignore insertion order for three recorded seeds", () => {
  for (const seed of propertySeeds) {
    const random = generator(seed);
    for (let index = 0; index < 1_000; index += 1) {
      const entries = [
        [`a-${index}`, Math.floor(random() * 1_000_000)],
        [`é-${index}`, Math.floor(random() * 1_000_000)],
        [`€-${index}`, Math.floor(random() * 1_000_000)],
      ];
      const forward = Object.fromEntries(entries);
      const reverse = Object.fromEntries([...entries].reverse());
      assert.equal(canonicalizeJson(forward), canonicalizeJson(reverse));
    }
  }
});

test("SHA-256 is exact, lowercase, algorithm-qualified, and verified against standard vectors", () => {
  assert.equal(SHA256_ALGORITHM, "sha256");
  const vectors = [
    ["", "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "The quick brown fox jumps over the lazy dog",
      "sha256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    ],
    ["€😀", "sha256:aa6ac38b88868c15ec32bf6cca0dda3ffa2595bdf3e1ae98c328b799f889b9ac"],
  ];
  for (const [input, expected] of vectors) assert.equal(sha256Utf8(input), expected);
  for (const length of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 121, 127, 128, 129, 1_000]) {
    const bytes = Uint8Array.from({ length }, (_, index) => (index * 131 + length) & 0xff);
    const expected = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    assert.equal(sha256Bytes(bytes), expected);
  }
  assert.equal(
    sha256Bytes(Uint8Array.from({ length: 1_000_000 }, () => 0x61)),
    "sha256:cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
  );
  const digest = sha256CanonicalJson({ b: 2, a: 1 });
  assert.equal(digest, sha256Utf8('{"a":1,"b":2}'));
  assert.equal(isSha256Digest(digest), true);
  assert.equal(parseSha256Digest(digest), digest);
  assert.equal(isSha256Digest(digest.toUpperCase()), false);
  expectCode("DIGEST_INVALID", () => parseSha256Digest(digest.slice("sha256:".length)));
  expectCode("DIGEST_INVALID", () => parseSha256Digest(digest.toUpperCase()));
  expectCode("SHA256_INPUT_INVALID", () => sha256Bytes([1, 2, 3]));
  expectCode("SHA256_INPUT_INVALID", () => sha256Utf8(Uint8Array.of(1)));
  expectCode("UTF8_INVALID_UNICODE", () => sha256Utf8("\ud800"));
});

test("SHA-256 property vectors match the independent Node oracle for three recorded seeds", () => {
  for (const seed of propertySeeds) {
    const random = generator(seed);
    for (let index = 0; index < 1_000; index += 1) {
      const bytes = Uint8Array.from({ length: Math.floor(random() * 257) }, () =>
        Math.floor(random() * 256),
      );
      const expected = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      assert.equal(sha256Bytes(bytes), expected);
    }
  }
});

test("canonical and digest property vectors remain deterministic for three recorded seeds", () => {
  for (const seed of propertySeeds) {
    const random = generator(seed);
    for (let index = 0; index < 1_000; index += 1) {
      const input = {
        id: `urn:rsrender:fixture:fx-01:entity:${seed}:${index}`,
        magnitude: Math.floor(random() * 2_000_001) - 1_000_000,
        states: [null, false, true, `value-${Math.floor(random() * 1_000_000)}`],
      };
      const canonical = canonicalizeJson(input);
      assert.equal(canonicalizeJson(JSON.parse(canonical)), canonical);
      assert.equal(sha256CanonicalJson(input), sha256Utf8(canonical));
    }
  }
});

test("three fresh processes repeat the same canonical contract vectors twice", () => {
  const script = fileURLToPath(new URL("./fixtures/bld-002/cross-process.mjs", import.meta.url));
  const outputs = [];
  for (let repetition = 0; repetition < 2; repetition += 1) {
    for (let processIndex = 0; processIndex < 3; processIndex += 1) {
      const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      outputs.push(result.stdout.trim());
    }
  }
  assert.equal(new Set(outputs).size, 1);
  const result = JSON.parse(outputs[0]);
  assert.equal(result.contractRevision, "bld-002-v1");
  assert.equal(result.unitMpt, 72_000);
  assert.match(result.digest, /^sha256:[0-9a-f]{64}$/u);
});
