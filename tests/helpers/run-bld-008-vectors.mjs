import { createHash } from "node:crypto";

import {
  decodeDomainValueRecord,
  encodeDomainValueRecord,
} from "../../packages/domain/dist/value-record.js";
import {
  fx04BoundaryRecords,
  fx04Revision,
  fx12BoundaryRecords,
  fx12Revision,
} from "./bld-008-fixtures.mjs";

const results = [...fx04BoundaryRecords, ...fx12BoundaryRecords].map((record) => ({
  decoded: decodeDomainValueRecord(record),
  encoded: encodeDomainValueRecord(record),
}));
const canonical = JSON.stringify({ fx04Revision, fx12Revision, results });
const environment = new Intl.DateTimeFormat().resolvedOptions();
console.log(
  JSON.stringify({
    digest: createHash("sha256").update(canonical, "utf8").digest("hex"),
    locale: environment.locale,
    timeZone: environment.timeZone,
  }),
);
