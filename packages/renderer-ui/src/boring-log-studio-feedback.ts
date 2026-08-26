export type StudioFeedbackSeverity = "info" | "success" | "warning" | "danger";

export type StudioFeedbackPresentation = Readonly<{
  severity: StudioFeedbackSeverity;
  severityLabel: "Status" | "Complete" | "Attention" | "Problem";
  showBanner: boolean;
}>;

const dangerPattern =
  /\b(?:failed|rejected|invalid|unavailable|read-only|must|cannot|outside|not connected|no longer|requires)\b|^(?:select at least|choose a different|enter (?:a )?valid)\b|\bno .+ available\b/iu;
const warningPattern =
  /\b(?:cancelled|canceled|unchanged|locked|pinned|nothing|no geometry change)\b/iu;
const successPattern =
  /\b(?:applied|completed|exported|loaded|rendered|passed|saved|opened|connected|selected)\b/iu;

export function resolveStudioFeedbackPresentation(message: string): StudioFeedbackPresentation {
  const normalized = message.trim();
  if (dangerPattern.test(normalized)) {
    return Object.freeze({ severity: "danger", severityLabel: "Problem", showBanner: true });
  }
  if (warningPattern.test(normalized)) {
    return Object.freeze({ severity: "warning", severityLabel: "Attention", showBanner: true });
  }
  if (successPattern.test(normalized)) {
    return Object.freeze({ severity: "success", severityLabel: "Complete", showBanner: false });
  }
  return Object.freeze({ severity: "info", severityLabel: "Status", showBanner: false });
}
