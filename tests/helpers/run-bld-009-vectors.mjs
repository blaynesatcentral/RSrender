import { sha256Utf8 } from "../../packages/contracts/dist/index.js";
import { encodeLogProjectAggregate } from "../../packages/domain/dist/aggregate-skeleton.js";
import { fx07Project } from "./bld-009-fixtures.mjs";

const encoded = encodeLogProjectAggregate(fx07Project());
if (!encoded.accepted) throw new Error(encoded.code);
process.stdout.write(`${sha256Utf8(encoded.json)}\n`);
