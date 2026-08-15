import {
  createApplicationVersionResult,
  parseApplicationVersion,
  validateApplicationVersionQuery,
} from "@rsrender/contracts";
import type {
  ApplicationVersion,
  ApplicationVersionQuery,
  ApplicationVersionResult,
} from "@rsrender/contracts";

export const applicationVersionQueryHandlerRevision = "bld-012-v1" as const;

export type ApplicationVersionQueryHandlerResult =
  | ApplicationVersionResult
  | {
      readonly kind: "rejected";
      readonly code: "APPLICATION_VERSION_QUERY_MALFORMED";
    };

export interface ApplicationVersionQueryPort {
  readonly query: (input: unknown) => Promise<ApplicationVersionQueryHandlerResult>;
}

export type ApplicationVersionQueryHandlerCreationResult =
  | { readonly accepted: true; readonly service: ApplicationVersionQueryPort }
  | { readonly accepted: false; readonly code: "APPLICATION_VERSION_INVALID" };

class FixedApplicationVersionQueryHandler implements ApplicationVersionQueryPort {
  readonly #version: ApplicationVersion;

  constructor(version: ApplicationVersion) {
    this.#version = version;
  }

  async query(input: unknown): Promise<ApplicationVersionQueryHandlerResult> {
    await Promise.resolve();
    const query = validateApplicationVersionQuery(input);
    if (!query.accepted) {
      return Object.freeze({
        kind: "rejected",
        code: "APPLICATION_VERSION_QUERY_MALFORMED",
      });
    }
    return this.#result(query.value);
  }

  #result(query: ApplicationVersionQuery): ApplicationVersionResult {
    const result = createApplicationVersionResult({
      requestId: query.requestId,
      version: this.#version,
    });
    if (!result.accepted) throw new Error("APPLICATION_VERSION_RESULT_INVARIANT");
    return result.value;
  }
}

export function createApplicationVersionQueryHandler(
  version: unknown,
): ApplicationVersionQueryHandlerCreationResult {
  try {
    return Object.freeze({
      accepted: true,
      service: new FixedApplicationVersionQueryHandler(parseApplicationVersion(version)),
    });
  } catch {
    return Object.freeze({ accepted: false, code: "APPLICATION_VERSION_INVALID" });
  }
}
