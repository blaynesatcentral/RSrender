export {
  EMPTY_SHELL_SECURITY_PROFILE,
  EMPTY_SHELL_URL,
  type EmptyShellSecurityProfile,
} from "./security-profile.js";

/** Stable marker for the accepted platform-electron-main package boundary. */
export const packageBoundary = "@rsrender/platform-electron-main" as const;
