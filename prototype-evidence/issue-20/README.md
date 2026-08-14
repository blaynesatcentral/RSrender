# RSrender issue #20 prototype evidence

Throwaway primary-source artifacts for GitHub issue #20. Nothing in this directory is application code or a selected production dependency.

- Open `rsrender-lifecycle-state-model.html` directly to exercise the lifecycle reducer.
- From the repository worktree root, run `python prototype-evidence/issue-20/empirical/run_empirical.py` to create a fresh inert Windows result set.
- `empirical/findings.md` records the authoritative bounded run and its limitations.
- `decision-draft.md` separates Adopt, Reject, and Open conclusions; it explicitly does not close the broad issue.

The captured run uses only synthetic data. It does not contact RSLog, contain credentials/client data, or prove behavior on SMB, sync folders, exFAT, signed installers, or Electron's embedded Node runtime.
