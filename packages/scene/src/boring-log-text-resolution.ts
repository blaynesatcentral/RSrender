import {
  validateResolvedBoringLogPageScene,
  type BoringLogRenderDiagnostic,
  type ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

export const boringLogTextResolutionRevision = "bld-033-text-resolution-v1" as const;

export type BoringLogTextResolutionResult =
  | Readonly<{ readonly accepted: true; readonly scene: ResolvedBoringLogPageScene }>
  | Readonly<{
      readonly accepted: false;
      readonly code: "BORING_LOG_TEXT_SCENE_REJECTED" | "BORING_LOG_TEXT_RESULTS_REJECTED";
    }>;

function rejected(
  code: Exclude<BoringLogTextResolutionResult, { readonly accepted: true }>["code"],
): BoringLogTextResolutionResult {
  return Object.freeze({ accepted: false, code });
}

/** Replaces derived text results without rebuilding or changing renderer-neutral geometry. */
export function applyBoringLogTextMeasurements(
  sceneInput: unknown,
  textResultsInput: unknown,
): BoringLogTextResolutionResult {
  try {
    const scene = validateResolvedBoringLogPageScene(sceneInput);
    if (!scene.accepted) return rejected("BORING_LOG_TEXT_SCENE_REJECTED");
    if (!Array.isArray(textResultsInput)) return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
    const candidate = validateResolvedBoringLogPageScene({
      ...scene.value,
      textResults: textResultsInput,
    });
    if (!candidate.accepted) return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");

    const requests = new Map(
      candidate.value.textRequests.map((request) => [request.measurementId, request]),
    );
    const textDiagnostics: BoringLogRenderDiagnostic[] = [];
    const absoluteInk = new Map<
      string,
      Readonly<{
        readonly semanticId: string;
        readonly xMpt: number;
        readonly yMpt: number;
        readonly widthMpt: number;
        readonly heightMpt: number;
      }>
    >();
    const textNodes = new Map(
      candidate.value.pages.flatMap((page) =>
        page.nodes
          .filter((node) => node.kind === "text")
          .map((node) => [node.measurementId, { node, page }] as const),
      ),
    );
    for (const [index, result] of candidate.value.textResults.entries()) {
      const request = requests.get(result.measurementId);
      if (
        request === undefined ||
        candidate.value.textRequests[index]?.measurementId !== result.measurementId
      ) {
        return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
      }
      let consumedEnd = request.sourceStartUtf16;
      for (const line of result.lines) {
        if (line.sourceStartUtf16 !== consumedEnd) {
          return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
        }
        consumedEnd = line.sourceEndUtf16;
      }
      if (
        consumedEnd > request.sourceEndUtf16 ||
        (result.overflow === "none" && consumedEnd !== request.sourceEndUtf16)
      ) {
        return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
      }
      if (result.overflow !== "none") {
        textDiagnostics.push({
          code: "BORING_LOG_TEXT_OVERFLOW",
          severity: result.overflow === "continued" ? "warning" : "error",
          message: `Text measurement ${result.measurementId} resolved with ${result.overflow}`,
          semanticId: request.sourceIdentity,
        });
      }
      const textNode = textNodes.get(result.measurementId);
      if (textNode === undefined) return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
      const absolute = Object.freeze({
        semanticId: textNode.node.semanticId,
        xMpt: textNode.node.frame.xMpt + result.inkBounds.xMpt,
        yMpt: textNode.node.frame.yMpt + result.inkBounds.yMpt,
        widthMpt: result.inkBounds.widthMpt,
        heightMpt: result.inkBounds.heightMpt,
      });
      absoluteInk.set(result.measurementId, absolute);
      const outsideFrame =
        result.inkBounds.xMpt < 0 ||
        result.inkBounds.yMpt < 0 ||
        result.inkBounds.xMpt + result.inkBounds.widthMpt > textNode.node.frame.widthMpt ||
        result.inkBounds.yMpt + result.inkBounds.heightMpt > textNode.node.frame.heightMpt ||
        absolute.xMpt < 0 ||
        absolute.yMpt < 0 ||
        absolute.xMpt + absolute.widthMpt > textNode.page.widthMpt ||
        absolute.yMpt + absolute.heightMpt > textNode.page.heightMpt;
      if (outsideFrame) {
        textDiagnostics.push({
          code: "BORING_LOG_TEXT_INK_OUTSIDE_FRAME",
          severity: "error",
          message: `Text measurement ${result.measurementId} exceeds its renderer-neutral frame`,
          semanticId: request.sourceIdentity,
        });
      }
    }
    const orderedInk = [...absoluteInk.entries()].sort(([left], [right]) =>
      left.localeCompare(right, "en-US"),
    );
    for (let leftIndex = 0; leftIndex < orderedInk.length; leftIndex += 1) {
      const [leftId, left] = orderedInk[leftIndex]!;
      if (left.widthMpt === 0 || left.heightMpt === 0) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < orderedInk.length; rightIndex += 1) {
        const [rightId, right] = orderedInk[rightIndex]!;
        if (right.widthMpt === 0 || right.heightMpt === 0) continue;
        const overlaps =
          Math.min(left.xMpt + left.widthMpt, right.xMpt + right.widthMpt) >
            Math.max(left.xMpt, right.xMpt) &&
          Math.min(left.yMpt + left.heightMpt, right.yMpt + right.heightMpt) >
            Math.max(left.yMpt, right.yMpt);
        if (overlaps) {
          textDiagnostics.push({
            code: "BORING_LOG_TEXT_COLLISION",
            severity: "error",
            message: `Text measurements ${leftId} and ${rightId} have intersecting ink bounds`,
            semanticId: left.semanticId,
          });
        }
      }
    }
    const retainedDiagnostics = candidate.value.diagnostics.filter(
      ({ code }) =>
        code !== "BORING_LOG_TEXT_OVERFLOW" &&
        code !== "BORING_LOG_TEXT_INK_OUTSIDE_FRAME" &&
        code !== "BORING_LOG_TEXT_COLLISION",
    );
    const diagnostics = Object.freeze([...retainedDiagnostics, ...textDiagnostics]);
    const pagePlan = {
      ...candidate.value.pagePlan,
      overflow:
        textDiagnostics.length === 0
          ? ("none" as const)
          : candidate.value.textResults.some(({ overflow }) => overflow === "continued")
            ? ("continued" as const)
            : ("clipped-with-diagnostic" as const),
      diagnostics,
    };
    const resolved = validateResolvedBoringLogPageScene({
      ...candidate.value,
      pagePlan,
      diagnostics,
    });
    return resolved.accepted
      ? Object.freeze({ accepted: true, scene: resolved.value })
      : rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
  } catch {
    return rejected("BORING_LOG_TEXT_RESULTS_REJECTED");
  }
}
