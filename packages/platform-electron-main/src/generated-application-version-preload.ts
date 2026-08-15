import {
  APPLICATION_VERSION_BOOTSTRAP_CHANNEL,
  APPLICATION_VERSION_QUERY_CHANNEL,
} from "./application-version-route-broker.js";

export const generatedApplicationVersionPreloadRevision = "bld-012-v1" as const;

function generateSource(initialSequence: number): string {
  return `"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const bootstrapChannel = ${JSON.stringify(APPLICATION_VERSION_BOOTSTRAP_CHANNEL)};
const queryChannel = ${JSON.stringify(APPLICATION_VERSION_QUERY_CHANNEL)};
const exactKeys = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const bootstrap = ipcRenderer.invoke(bootstrapChannel).then((value) => {
  if (!exactKeys(value, ["accepted", "transportVersion", "generation", "capability"]) || value.accepted !== true || value.transportVersion !== 1 || !Number.isSafeInteger(value.generation) || value.generation <= 0 || typeof value.capability !== "string" || !/^[0-9a-f]{64}$/.test(value.capability)) throw new Error("APPLICATION_VERSION_UNAVAILABLE");
  return Object.freeze({ generation: value.generation, capability: value.capability });
}).catch(() => { throw new Error("APPLICATION_VERSION_UNAVAILABLE"); });
let sequence = ${String(initialSequence)};
let inFlight = false;
const application = Object.freeze({
  getVersion: async function getVersion() {
    if (arguments.length !== 0) throw new Error("APPLICATION_VERSION_ARGUMENTS_REJECTED");
    if (inFlight) throw new Error("APPLICATION_VERSION_QUERY_IN_FLIGHT");
    inFlight = true;
    try {
      const binding = await bootstrap;
      if (sequence >= Number.MAX_SAFE_INTEGER) throw new Error("APPLICATION_VERSION_UNAVAILABLE");
      sequence += 1;
      const requestId = "urn:rsrender:application-version:" + String(binding.generation) + ":" + String(sequence);
      let response;
      try {
        response = await ipcRenderer.invoke(queryChannel, {
          transportVersion: 1,
          messageType: "application-version-query",
          capability: binding.capability,
          generation: binding.generation,
          sequence,
          query: { contractVersion: 1, messageType: "query", kind: "application.version", scope: "application", requestId }
        });
      } catch {
        throw new Error("APPLICATION_VERSION_UNAVAILABLE");
      }
      if (exactKeys(response, ["accepted", "code"]) && response.accepted === false && typeof response.code === "string") throw new Error("APPLICATION_VERSION_UNAVAILABLE");
      if (!exactKeys(response, ["accepted", "transportVersion", "generation", "sequence", "result"]) || response.accepted !== true || response.transportVersion !== 1 || response.generation !== binding.generation || response.sequence !== sequence) throw new Error("APPLICATION_VERSION_UNAVAILABLE");
      const result = response.result;
      if (!exactKeys(result, ["contractVersion", "messageType", "kind", "requestId", "version"]) || result.contractVersion !== 1 || result.messageType !== "query-result" || result.kind !== "application.version.result" || result.requestId !== requestId || typeof result.version !== "string" || result.version.length < 1 || result.version.length > 128 || !/^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$/.test(result.version)) throw new Error("APPLICATION_VERSION_UNAVAILABLE");
      return Object.freeze({ ...result });
    } finally {
      inFlight = false;
    }
  }
});
contextBridge.exposeInMainWorld("rsrender", Object.freeze({ application }));
`;
}

export function generateApplicationVersionPreloadSource(): string {
  return generateSource(0);
}

/** Test-only source variant for proving the otherwise unreachable overflow boundary. */
export function generateApplicationVersionPreloadQualificationSource(
  initialSequence: unknown,
): string {
  if (
    typeof initialSequence !== "number" ||
    !Number.isSafeInteger(initialSequence) ||
    initialSequence < 0
  ) {
    throw new Error("QUALIFICATION_SEQUENCE_INVALID");
  }
  return generateSource(initialSequence);
}
