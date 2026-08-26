import assert from "node:assert/strict";
import test from "node:test";
import { TextEncoder } from "node:util";

import { inspectRsLogProjectCatalog } from "../packages/platform-electron-main/dist/index.js";

test("pre-UX recovery admits current optional catalog whitespace", () => {
  const result = inspectRsLogProjectCatalog(
    new TextEncoder().encode(
      JSON.stringify([
        {
          id: "provider-project-identity",
          title: "",
          jobNo: "  SYN-001\t",
          clientName: "Synthetic\r\nClient",
          siteLocation: "\t",
          boreholeCount: 2,
          isActive: true,
          isExample: false,
        },
      ]),
    ),
  );
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.projects[0].title, "Untitled RSLog project");
  assert.equal(result.projects[0].jobNumber, "SYN-001");
  assert.equal(result.projects[0].clientName, "Synthetic Client");
  assert.equal(result.projects[0].siteLocation, null);
});
