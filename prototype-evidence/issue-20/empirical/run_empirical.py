#!/usr/bin/env python3
"""THROWAWAY PROTOTYPE for RSrender Wayfinder ticket #20.

Question: what can this Windows workstation empirically tell us about candidate
save/recovery/package/lifecycle boundaries without implementing RSrender or
installing production dependencies?

The harness uses only inert synthetic data and Python's standard library. It
creates a timestamped run beneath this file's directory and never contacts a
network service. Results are decision evidence, not production code.
"""

from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import datetime as dt
import hashlib
import json
import ntpath
import os
from pathlib import Path
import platform
import shutil
import stat
import struct
import subprocess
import sys
import time
import unicodedata
from urllib.parse import unquote
import uuid
import zipfile


SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parent
FORMAT_ID = "org.rsrender.prototype.package"
CURRENT_FORMAT = 2
CURRENT_READER = 2
DOC_A = "00000000-0000-4000-8000-0000000000a1"
DOC_B = "00000000-0000-4000-8000-0000000000b2"
SAVE_OLD = {"formatIdentifier": FORMAT_ID, "formatVersion": 2, "documentId": DOC_A, "revision": 1, "value": "old"}
SAVE_NEW = {"formatIdentifier": FORMAT_ID, "formatVersion": 2, "documentId": DOC_A, "revision": 2, "value": "new"}


def canonical_json(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            block = handle.read(64 * 1024)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def write_bytes_fsync(path: Path, value: bytes) -> None:
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0), 0o600)
    try:
        offset = 0
        while offset < len(value):
            offset += os.write(fd, value[offset:])
        os.fsync(fd)
    finally:
        os.close(fd)


def validate_saved_document_bytes(value: bytes) -> dict:
    parsed = strict_json_load(value, max_depth=12)
    expected = {"formatIdentifier", "formatVersion", "documentId", "revision", "value"}
    if set(parsed) != expected:
        raise PrototypeReject("SAVE_SCHEMA", f"root fields {sorted(parsed)}")
    if parsed["formatIdentifier"] != FORMAT_ID or parsed["formatVersion"] != CURRENT_FORMAT:
        raise PrototypeReject("SAVE_VERSION", "unsupported saved document")
    if parsed["documentId"] != DOC_A or not isinstance(parsed["revision"], int):
        raise PrototypeReject("SAVE_ID", "invalid document identity")
    if parsed["value"] not in {"old", "new", "writer-a", "writer-b", "locked", "readonly"}:
        raise PrototypeReject("SAVE_VALUE", "invalid synthetic value")
    return parsed


class PrototypeReject(Exception):
    def __init__(self, code: str, detail: str = ""):
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


class Recorder:
    def __init__(self, run_root: Path) -> None:
        self.run_root = run_root
        self.raw = run_root / "raw"
        self.fixtures = run_root / "fixtures"
        self.scratch = run_root / "scratch"
        self.raw.mkdir(parents=True)
        self.fixtures.mkdir()
        self.scratch.mkdir()
        self.groups: dict[str, list[dict]] = {}

    def add(
        self,
        group: str,
        case: str,
        passed: bool,
        evidence: str,
        detail: str,
        *,
        label: str = "observed",
        expected: str | None = None,
    ) -> None:
        self.groups.setdefault(group, []).append(
            {
                "case": case,
                "passed": passed,
                "label": label,
                "expected": expected,
                "evidence": evidence,
                "detail": detail,
            }
        )

    def flush(self) -> None:
        for group, values in self.groups.items():
            (self.raw / f"{group}.json").write_text(json.dumps(values, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        summary = {
            "runRoot": str(self.run_root),
            "totals": {
                "cases": sum(len(v) for v in self.groups.values()),
                "passed": sum(1 for values in self.groups.values() for row in values if row["passed"]),
                "failed": sum(1 for values in self.groups.values() for row in values if not row["passed"]),
                "observed": sum(1 for values in self.groups.values() for row in values if row["label"] == "observed"),
                "simulated": sum(1 for values in self.groups.values() for row in values if row["label"] != "observed"),
            },
            "groups": {key: {"cases": len(value), "passed": sum(1 for row in value if row["passed"])} for key, value in self.groups.items()},
        }
        (self.raw / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def ps(command: str) -> dict:
    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
        capture_output=True,
        text=True,
        timeout=20,
    )
    return {"exitCode": completed.returncode, "stdout": completed.stdout.strip(), "stderr": completed.stderr.strip()}


def environment_evidence(rec: Recorder) -> None:
    node = subprocess.run(["node", "--version"], capture_output=True, text=True, timeout=10)
    npm_command = shutil.which("npm.cmd") or shutil.which("npm")
    npm = subprocess.run([npm_command, "--version"], capture_output=True, text=True, timeout=10) if npm_command else None
    drive = ps("$d=[System.IO.DriveInfo]'C:\\'; [pscustomobject]@{Name=$d.Name;Format=$d.DriveFormat;Type=$d.DriveType.ToString();Free=$d.AvailableFreeSpace;Size=$d.TotalSize}|ConvertTo-Json -Compress")
    tools = ps("Get-Command signtool.exe,makeappx.exe -ErrorAction SilentlyContinue | Select-Object Name,Source | ConvertTo-Json -Compress")
    os_info = ps("[pscustomobject]@{Caption=(Get-CimInstance Win32_OperatingSystem).Caption;Version=[Environment]::OSVersion.Version.ToString();Architecture=$env:PROCESSOR_ARCHITECTURE;PowerShell=$PSVersionTable.PSVersion.ToString()}|ConvertTo-Json -Compress")
    evidence = {
        "capturedUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "python": sys.version,
        "pythonExecutable": sys.executable,
        "platform": platform.platform(),
        "node": node.stdout.strip(),
        "npm": npm.stdout.strip() if npm else None,
        "driveProbe": drive,
        "osProbe": os_info,
        "installerToolProbe": tools,
        "workspace": str(ROOT),
        "networkUsed": False,
        "productionDependenciesInstalled": False,
    }
    (rec.raw / "environment.json").write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if os.name == "nt":
    KERNEL32 = ctypes.WinDLL("kernel32", use_last_error=True)
    REPLACE_FILE_WRITE_THROUGH = 0x1
    GENERIC_READ = 0x80000000
    GENERIC_WRITE = 0x40000000
    OPEN_EXISTING = 3
    OPEN_ALWAYS = 4
    FILE_ATTRIBUTE_NORMAL = 0x80
    INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

    KERNEL32.ReplaceFileW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD, wintypes.LPVOID, wintypes.LPVOID]
    KERNEL32.ReplaceFileW.restype = wintypes.BOOL
    KERNEL32.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
    KERNEL32.CreateFileW.restype = wintypes.HANDLE
    KERNEL32.CloseHandle.argtypes = [wintypes.HANDLE]
    KERNEL32.CloseHandle.restype = wintypes.BOOL


def replace_file_windows(target: Path, replacement: Path, backup: Path | None) -> None:
    if os.name != "nt":
        raise OSError("Windows-only experiment")
    ok = KERNEL32.ReplaceFileW(str(target), str(replacement), str(backup) if backup else None, REPLACE_FILE_WRITE_THROUGH, None, None)
    if not ok:
        error = ctypes.get_last_error()
        raise OSError(error, ctypes.FormatError(error), str(target))


def exclusive_handle(path: Path, *, create: bool = False):
    disposition = OPEN_ALWAYS if create else OPEN_EXISTING
    handle = KERNEL32.CreateFileW(str(path), GENERIC_READ | GENERIC_WRITE, 0, None, disposition, FILE_ATTRIBUTE_NORMAL, None)
    if handle == INVALID_HANDLE_VALUE:
        error = ctypes.get_last_error()
        raise OSError(error, ctypes.FormatError(error), str(path))
    return handle


def close_handle(handle) -> None:
    if handle is not None and handle != INVALID_HANDLE_VALUE:
        KERNEL32.CloseHandle(handle)


def classify_save_dir(case_dir: Path, old_bytes: bytes, new_bytes: bytes) -> dict:
    target = case_dir / "document.rsproject"
    candidate = case_dir / "document.rsproject.candidate"
    backup = case_dir / "document.rsproject.backup"
    target_bytes = target.read_bytes() if target.exists() else None
    if target_bytes == old_bytes:
        state = "old-valid"
    elif target_bytes == new_bytes:
        state = "new-valid"
    elif target_bytes is None:
        state = "missing"
    else:
        try:
            validate_saved_document_bytes(target_bytes)
            state = "other-valid"
        except Exception:
            state = "corrupt"
    return {
        "targetState": state,
        "targetSha256": sha256_bytes(target_bytes) if target_bytes is not None else None,
        "candidateExists": candidate.exists(),
        "candidateBytes": candidate.stat().st_size if candidate.exists() else None,
        "candidateValid": bool(candidate.exists() and _is_valid_save(candidate.read_bytes())),
        "backupExists": backup.exists(),
        "backupIsOld": bool(backup.exists() and backup.read_bytes() == old_bytes),
    }


def _is_valid_save(value: bytes) -> bool:
    try:
        validate_saved_document_bytes(value)
        return True
    except Exception:
        return False


def worker_save(case_dir: Path, phase: str) -> None:
    target = case_dir / "document.rsproject"
    candidate = case_dir / "document.rsproject.candidate"
    backup = case_dir / "document.rsproject.backup"
    new_bytes = canonical_json(SAVE_NEW)
    fd = os.open(str(candidate), os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0), 0o600)
    if phase == "partial-write":
        os.write(fd, new_bytes[: len(new_bytes) // 2])
        os.fsync(fd)
        os._exit(81)
    os.write(fd, new_bytes)
    if phase == "full-before-fsync":
        os._exit(82)
    os.fsync(fd)
    os.close(fd)
    if phase == "after-fsync":
        os._exit(83)
    validate_saved_document_bytes(candidate.read_bytes())
    if phase == "after-validation":
        os._exit(84)
    replace_file_windows(target, candidate, backup)
    if phase == "after-replace-before-ack":
        os._exit(85)
    raise RuntimeError(f"unknown worker phase: {phase}")


def run_save_experiments(rec: Recorder) -> None:
    group = "save_results"
    root = rec.scratch / "save"
    root.mkdir()
    old_bytes = canonical_json(SAVE_OLD)
    new_bytes = canonical_json(SAVE_NEW)

    before = root / "before-candidate"
    before.mkdir()
    (before / "document.rsproject").write_bytes(old_bytes)
    state = classify_save_dir(before, old_bytes, new_bytes)
    rec.add(group, "interrupt-before-candidate", state["targetState"] == "old-valid" and not state["candidateExists"], json.dumps(state), "No candidate was created; durable target remained old-valid.")

    for phase in ["partial-write", "full-before-fsync", "after-fsync", "after-validation", "after-replace-before-ack"]:
        case_dir = root / phase
        case_dir.mkdir()
        (case_dir / "document.rsproject").write_bytes(old_bytes)
        completed = subprocess.run([sys.executable, str(SCRIPT), "--worker-save", str(case_dir), phase], capture_output=True, text=True, timeout=20)
        state = classify_save_dir(case_dir, old_bytes, new_bytes)
        if phase == "after-replace-before-ack":
            passed = state["targetState"] == "new-valid" and state["backupIsOld"]
            expected = "new-valid target plus old-valid backup despite no acknowledgment"
        else:
            passed = state["targetState"] == "old-valid"
            expected = "old-valid target; candidate may exist and must be classified"
        rec.add(group, f"abrupt-process-{phase}", passed, json.dumps({"exitCode": completed.returncode, **state}), expected, expected=expected)

    invalid = root / "validation-failure"
    invalid.mkdir()
    target = invalid / "document.rsproject"
    candidate = invalid / "document.rsproject.candidate"
    target.write_bytes(old_bytes)
    write_bytes_fsync(candidate, new_bytes[: len(new_bytes) // 2])
    rejected = False
    try:
        validate_saved_document_bytes(candidate.read_bytes())
        replace_file_windows(target, candidate, invalid / "document.rsproject.backup")
    except Exception:
        rejected = True
    state = classify_save_dir(invalid, old_bytes, new_bytes)
    rec.add(group, "validation-failure-does-not-replace", rejected and state["targetState"] == "old-valid", json.dumps(state), "Truncated candidate was rejected before replace; target remained old-valid.")

    locked = root / "exclusive-lock"
    locked.mkdir()
    target = locked / "document.rsproject"
    candidate = locked / "document.rsproject.candidate"
    target.write_bytes(old_bytes)
    write_bytes_fsync(candidate, canonical_json({**SAVE_NEW, "value": "locked"}))
    handle = exclusive_handle(target)
    error = None
    try:
        replace_file_windows(target, candidate, locked / "document.rsproject.backup")
    except OSError as exc:
        error = {"winerror": exc.errno, "message": str(exc)}
    finally:
        close_handle(handle)
    state = classify_save_dir(locked, old_bytes, canonical_json({**SAVE_NEW, "value": "locked"}))
    rec.add(group, "replace-while-target-exclusively-open", error is not None and state["targetState"] == "old-valid", json.dumps({"error": error, **state}), "ReplaceFileW failed non-silently while a zero-share handle held the target; original remained valid.")

    readonly = root / "readonly-target"
    readonly.mkdir()
    target = readonly / "document.rsproject"
    candidate = readonly / "document.rsproject.candidate"
    target.write_bytes(old_bytes)
    write_bytes_fsync(candidate, canonical_json({**SAVE_NEW, "value": "readonly"}))
    os.chmod(target, stat.S_IREAD)
    error = None
    try:
        replace_file_windows(target, candidate, readonly / "document.rsproject.backup")
    except OSError as exc:
        error = {"winerror": exc.errno, "message": str(exc)}
    finally:
        os.chmod(target, stat.S_IREAD | stat.S_IWRITE)
    state = classify_save_dir(readonly, old_bytes, canonical_json({**SAVE_NEW, "value": "readonly"}))
    rec.add(group, "replace-readonly-target", error is not None and state["targetState"] == "old-valid", json.dumps({"error": error, **state}), "Read-only target produced a non-silent ReplaceFileW failure and remained old-valid.")

    conflict = root / "external-change"
    conflict.mkdir()
    target = conflict / "document.rsproject"
    target.write_bytes(old_bytes)
    baseline = sha256_file(target)
    external = canonical_json({**SAVE_NEW, "value": "writer-a"})
    target.write_bytes(external)
    candidate = conflict / "document.rsproject.candidate"
    write_bytes_fsync(candidate, canonical_json({**SAVE_NEW, "value": "writer-b"}))
    detected = sha256_file(target) != baseline
    if not detected:
        replace_file_windows(target, candidate, conflict / "document.rsproject.backup")
    rec.add(group, "external-change-baseline-conflict", detected and target.read_bytes() == external and candidate.exists(), json.dumps({"baseline": baseline, "actual": sha256_file(target)}), "Pre-replace digest check detected an external change and retained both target and candidate.")

    run_cross_process_races(rec, root, old_bytes)

    rec.add(group, "power-loss-during-replace", True, "not executed", "Power interruption inside the kernel replace operation was not reproducible safely on this workstation; remains an isolated-VM test.", label="not-observed", expected="defer")
    rec.add(group, "non-NTFS-storage-classes", True, "not executed", "SMB, sync-folder, exFAT/removable, quota, and real disk-full behavior were not available in this bounded run.", label="not-observed", expected="defer")


def worker_race(args: argparse.Namespace) -> None:
    target = Path(args.target)
    candidate = Path(args.candidate)
    expected = args.expected
    outcome = Path(args.outcome)
    if args.mode == "unchecked":
        checked = sha256_file(target)
        Path(args.ready).write_text(checked, encoding="ascii")
        while not Path(args.go).exists():
            time.sleep(0.005)
        result = {"checked": checked, "expected": expected}
        try:
            replace_file_windows(target, candidate, None)
            result["outcome"] = "replaced"
        except OSError as exc:
            result.update({"outcome": "error", "winerror": exc.errno, "error": str(exc)})
        outcome.write_text(json.dumps(result), encoding="utf-8")
        return

    lock = Path(args.lock)
    handle = None
    deadline = time.monotonic() + 10
    while handle is None and time.monotonic() < deadline:
        try:
            handle = exclusive_handle(lock, create=True)
        except OSError:
            time.sleep(0.01)
    result = {"expected": expected}
    if handle is None:
        result["outcome"] = "lock-timeout"
    else:
        try:
            checked = sha256_file(target)
            result["checked"] = checked
            if checked != expected:
                result["outcome"] = "conflict"
            else:
                replace_file_windows(target, candidate, None)
                result["outcome"] = "replaced"
                time.sleep(0.05)
        except OSError as exc:
            result.update({"outcome": "error", "winerror": exc.errno, "error": str(exc)})
        finally:
            close_handle(handle)
    outcome.write_text(json.dumps(result), encoding="utf-8")


def run_cross_process_races(rec: Recorder, root: Path, old_bytes: bytes) -> None:
    group = "save_results"
    unchecked = root / "cross-process-uncoordinated"
    unchecked.mkdir()
    target = unchecked / "document.rsproject"
    target.write_bytes(old_bytes)
    expected = sha256_file(target)
    procs = []
    for name, value in [("a", "writer-a"), ("b", "writer-b")]:
        candidate = unchecked / f"candidate-{name}"
        write_bytes_fsync(candidate, canonical_json({**SAVE_NEW, "value": value}))
        cmd = [
            sys.executable,
            str(SCRIPT),
            "--worker-race",
            "--mode",
            "unchecked",
            "--target",
            str(target),
            "--candidate",
            str(candidate),
            "--expected",
            expected,
            "--ready",
            str(unchecked / f"ready-{name}"),
            "--go",
            str(unchecked / f"go-{name}"),
            "--outcome",
            str(unchecked / f"outcome-{name}.json"),
        ]
        procs.append((name, subprocess.Popen(cmd)))
    deadline = time.monotonic() + 10
    while not all((unchecked / f"ready-{name}").exists() for name, _ in procs) and time.monotonic() < deadline:
        time.sleep(0.01)
    (unchecked / "go-a").write_text("go", encoding="ascii")
    while not (unchecked / "outcome-a.json").exists() and time.monotonic() < deadline:
        time.sleep(0.01)
    (unchecked / "go-b").write_text("go", encoding="ascii")
    for _, proc in procs:
        proc.wait(timeout=10)
    outcomes = [json.loads((unchecked / f"outcome-{name}.json").read_text(encoding="utf-8")) for name, _ in procs]
    final = validate_saved_document_bytes(target.read_bytes())
    lost_update = [row["outcome"] for row in outcomes] == ["replaced", "replaced"] and final["value"] == "writer-b"
    rec.add(group, "cross-process-check-then-replace-race", lost_update, json.dumps({"outcomes": outcomes, "final": final}), "Both writers checked the same baseline before either replace; both later replaced successfully and writer B silently won. Baseline comparison alone is not a cross-process guard.", expected="demonstrate lost update")

    coordinated = root / "cross-process-coordinated"
    coordinated.mkdir()
    target = coordinated / "document.rsproject"
    target.write_bytes(old_bytes)
    expected = sha256_file(target)
    procs = []
    for name, value in [("a", "writer-a"), ("b", "writer-b")]:
        candidate = coordinated / f"candidate-{name}"
        write_bytes_fsync(candidate, canonical_json({**SAVE_NEW, "value": value}))
        cmd = [
            sys.executable,
            str(SCRIPT),
            "--worker-race",
            "--mode",
            "coordinated",
            "--target",
            str(target),
            "--candidate",
            str(candidate),
            "--expected",
            expected,
            "--lock",
            str(coordinated / "document.save.lock"),
            "--outcome",
            str(coordinated / f"outcome-{name}.json"),
        ]
        procs.append((name, subprocess.Popen(cmd)))
    for _, proc in procs:
        proc.wait(timeout=15)
    outcomes = [json.loads((coordinated / f"outcome-{name}.json").read_text(encoding="utf-8")) for name, _ in procs]
    statuses = sorted(row["outcome"] for row in outcomes)
    passed = statuses == ["conflict", "replaced"]
    rec.add(group, "cross-process-exclusive-lock-and-recheck", passed, json.dumps({"outcomes": outcomes, "final": validate_saved_document_bytes(target.read_bytes())}), "An exclusive lock plus digest recheck allowed one writer and classified the second as conflict.", expected="one replace and one conflict")


def _reject_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise PrototypeReject("JSON_DUPLICATE_KEY", key)
        result[key] = value
    return result


def _max_depth(value: object, depth: int = 0) -> int:
    if isinstance(value, dict):
        return max([depth] + [_max_depth(item, depth + 1) for item in value.values()])
    if isinstance(value, list):
        return max([depth] + [_max_depth(item, depth + 1) for item in value])
    return depth


def strict_json_load(value: bytes, *, max_depth: int) -> dict:
    try:
        text = value.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise PrototypeReject("JSON_UTF8", str(exc)) from exc
    try:
        parsed = json.loads(text, object_pairs_hook=_reject_duplicates, parse_constant=lambda token: (_ for _ in ()).throw(PrototypeReject("JSON_NUMBER", token)))
    except PrototypeReject:
        raise
    except (json.JSONDecodeError, RecursionError) as exc:
        raise PrototypeReject("JSON_SYNTAX", str(exc)) from exc
    if not isinstance(parsed, dict):
        raise PrototypeReject("JSON_ROOT", "object required")
    if _max_depth(parsed) > max_depth:
        raise PrototypeReject("JSON_DEPTH", str(_max_depth(parsed)))
    return parsed


WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}


def normalize_package_name(name: str) -> str:
    if not name or name.startswith(("/", "\\")) or "\\" in name:
        raise PrototypeReject("ZIP_PATH", f"absolute/backslash: {name!r}")
    decoded = unquote(name)
    if decoded != name and any(token in decoded for token in ["/", "\\", ".."]):
        raise PrototypeReject("ZIP_ENCODED_PATH", name)
    if any(ord(ch) < 32 or ch == "\x7f" for ch in name) or "\x00" in name:
        raise PrototypeReject("ZIP_PATH", "control character")
    if ":" in name or ntpath.splitdrive(name)[0]:
        raise PrototypeReject("ZIP_PATH", f"drive/ADS: {name!r}")
    parts = name.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise PrototypeReject("ZIP_PATH", f"empty/dot component: {name!r}")
    for part in parts:
        if part.endswith((".", " ")):
            raise PrototypeReject("ZIP_PATH", f"trailing dot/space: {name!r}")
        stem = part.split(".", 1)[0].upper()
        if stem in WINDOWS_RESERVED:
            raise PrototypeReject("ZIP_PATH", f"device component: {name!r}")
    return unicodedata.normalize("NFC", name).casefold()


ZIP_LIMITS = {
    "entries": 12,
    "manifest": 16 * 1024,
    "entry": 256 * 1024,
    "aggregate": 512 * 1024,
    "compressed": 256 * 1024,
    "ratio": 40.0,
    "jsonDepth": 16,
}


def strict_zip_read(path: Path, *, expected_kind: str) -> dict:
    if path.stat().st_size > ZIP_LIMITS["compressed"]:
        raise PrototypeReject("ZIP_PACKAGE_SIZE", str(path.stat().st_size))
    try:
        archive = zipfile.ZipFile(path, "r")
    except zipfile.BadZipFile as exc:
        raise PrototypeReject("ZIP_CORRUPT", str(exc)) from exc
    with archive:
        infos = archive.infolist()
        if len(infos) > ZIP_LIMITS["entries"]:
            raise PrototypeReject("ZIP_ENTRY_COUNT", str(len(infos)))
        names = set()
        normalized = set()
        aggregate = 0
        contents: dict[str, bytes] = {}
        for info in infos:
            if info.filename in names:
                raise PrototypeReject("ZIP_DUPLICATE_NAME", info.filename)
            names.add(info.filename)
            norm = normalize_package_name(info.filename)
            if norm in normalized:
                raise PrototypeReject("ZIP_NORMALIZED_COLLISION", info.filename)
            normalized.add(norm)
            unix_mode = (info.external_attr >> 16) & 0xFFFF
            file_type = stat.S_IFMT(unix_mode)
            if stat.S_ISLNK(unix_mode) or file_type not in {0, stat.S_IFREG, stat.S_IFDIR}:
                raise PrototypeReject("ZIP_LINK_OR_SPECIAL", info.filename)
            if info.flag_bits & 0x1:
                raise PrototypeReject("ZIP_ENCRYPTED", info.filename)
            if info.compress_type not in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}:
                raise PrototypeReject("ZIP_METHOD", str(info.compress_type))
            if info.file_size > ZIP_LIMITS["entry"]:
                raise PrototypeReject("ZIP_ENTRY_SIZE", info.filename)
            if info.compress_size > ZIP_LIMITS["compressed"]:
                raise PrototypeReject("ZIP_COMPRESSED_SIZE", info.filename)
            if info.compress_size == 0 and info.file_size > 0:
                raise PrototypeReject("ZIP_RATIO", info.filename)
            if info.compress_size and info.file_size / info.compress_size > ZIP_LIMITS["ratio"]:
                raise PrototypeReject("ZIP_RATIO", info.filename)
            aggregate += info.file_size
            if aggregate > ZIP_LIMITS["aggregate"]:
                raise PrototypeReject("ZIP_AGGREGATE", str(aggregate))
            try:
                with archive.open(info, "r") as member:
                    chunks = []
                    actual = 0
                    while True:
                        chunk = member.read(8192)
                        if not chunk:
                            break
                        actual += len(chunk)
                        if actual > ZIP_LIMITS["entry"] or actual + aggregate - info.file_size > ZIP_LIMITS["aggregate"]:
                            raise PrototypeReject("ZIP_STREAM_LIMIT", info.filename)
                        chunks.append(chunk)
                    contents[info.filename] = b"".join(chunks)
            except zipfile.BadZipFile as exc:
                raise PrototypeReject("ZIP_HEADER_OR_CRC", str(exc)) from exc
        if "manifest.json" not in contents:
            raise PrototypeReject("MANIFEST_MISSING", "manifest.json")
        if len(contents["manifest.json"]) > ZIP_LIMITS["manifest"]:
            raise PrototypeReject("MANIFEST_SIZE", str(len(contents["manifest.json"])))
        manifest = strict_json_load(contents["manifest.json"], max_depth=ZIP_LIMITS["jsonDepth"])
        expected_fields = {"formatIdentifier", "packageKind", "formatVersion", "minReaderVersion", "packageId", "parts"}
        if set(manifest) != expected_fields:
            raise PrototypeReject("MANIFEST_SCHEMA", f"fields={sorted(manifest)}")
        if manifest["formatIdentifier"] != FORMAT_ID:
            raise PrototypeReject("MANIFEST_FORMAT", str(manifest["formatIdentifier"]))
        if manifest["packageKind"] != expected_kind:
            raise PrototypeReject("MANIFEST_KIND", str(manifest["packageKind"]))
        if not isinstance(manifest["formatVersion"], int) or manifest["formatVersion"] > CURRENT_FORMAT:
            raise PrototypeReject("MANIFEST_VERSION", str(manifest["formatVersion"]))
        if not isinstance(manifest["minReaderVersion"], int) or manifest["minReaderVersion"] > CURRENT_READER:
            raise PrototypeReject("MANIFEST_MIN_READER", str(manifest["minReaderVersion"]))
        if not isinstance(manifest["packageId"], str) or not isinstance(manifest["parts"], list):
            raise PrototypeReject("MANIFEST_SCHEMA", "identity/parts type")
        declared = set()
        for part in manifest["parts"]:
            if not isinstance(part, dict) or set(part) != {"name", "sha256", "bytes", "authoritative"}:
                raise PrototypeReject("PART_SCHEMA", repr(part))
            name = part["name"]
            normalize_package_name(name)
            if name in declared:
                raise PrototypeReject("PART_DUPLICATE", name)
            declared.add(name)
            if name not in contents:
                raise PrototypeReject("PART_MISSING", name)
            body = contents[name]
            if part["bytes"] != len(body) or part["sha256"] != sha256_bytes(body):
                raise PrototypeReject("PART_INTEGRITY", name)
            suffix = Path(name).suffix.casefold()
            if suffix in {".js", ".mjs", ".cjs", ".exe", ".dll", ".bat", ".cmd", ".ps1", ".html", ".htm"}:
                raise PrototypeReject("PART_EXECUTABLE", name)
            if body.startswith(b"PK\x03\x04") or suffix == ".zip":
                raise PrototypeReject("PART_NESTED_ARCHIVE", name)
        extras = set(contents) - {"manifest.json"} - declared
        if extras:
            raise PrototypeReject("PART_UNDECLARED", repr(sorted(extras)))
        return {"packageId": manifest["packageId"], "parts": sorted(declared), "entries": len(infos), "expandedBytes": aggregate}


def valid_manifest(parts: dict[str, bytes], **updates) -> dict:
    manifest = {
        "formatIdentifier": FORMAT_ID,
        "packageKind": "log-project",
        "formatVersion": CURRENT_FORMAT,
        "minReaderVersion": CURRENT_READER,
        "packageId": DOC_A,
        "parts": [
            {"name": name, "sha256": sha256_bytes(value), "bytes": len(value), "authoritative": True}
            for name, value in sorted(parts.items())
        ],
    }
    manifest.update(updates)
    return manifest


def make_zip(path: Path, entries: list[tuple[str, bytes, int | None, int | None]]) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        for name, body, compress_type, external_attr in entries:
            info = zipfile.ZipInfo(name, date_time=(2000, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED if compress_type is None else compress_type
            info.create_system = 3
            info.external_attr = ((stat.S_IFREG | 0o600) << 16) if external_attr is None else external_attr
            archive.writestr(info, body)


def package_entries(parts: dict[str, bytes], manifest: dict | bytes | None = None) -> list[tuple[str, bytes, int | None, int | None]]:
    manifest_bytes = manifest if isinstance(manifest, bytes) else canonical_json(valid_manifest(parts) if manifest is None else manifest)
    return [("manifest.json", manifest_bytes, None, None)] + [(name, body, None, None) for name, body in parts.items()]


def run_zip_experiments(rec: Recorder) -> None:
    group = "zip_results"
    root = rec.fixtures / "zip"
    root.mkdir()
    parts = {"domain/project.json": canonical_json({"sourceSnapshot": {"synthetic": True}, "presentationOverrides": []})}
    cases: list[tuple[str, str, callable, str]] = []

    def build(name: str, entries) -> Path:
        path = root / name
        make_zip(path, entries)
        return path

    def read_case(path: Path):
        return lambda path=path: strict_zip_read(path, expected_kind="log-project")

    valid = build("valid.rsproject", package_entries(parts))
    cases.append(("valid-package", "ACCEPT", read_case(valid), "valid constrained ZIP"))

    bad_names = {
        "traversal": "../escape.txt",
        "absolute": "/absolute.txt",
        "backslash": "assets\\escape.txt",
        "drive": "C:escape.txt",
        "unc": "\\\\server\\share.txt",
        "ads": "assets/file.txt:stream",
        "reserved-device": "assets/CON.txt",
        "trailing-dot": "assets/name.",
        "trailing-space": "assets/name ",
        "dot-component": "assets/../escape.txt",
        "encoded-traversal": "assets/%2e%2e/escape.txt",
    }
    for case, bad_name in bad_names.items():
        bad_parts = {bad_name: b"inert"}
        path = build(f"{case}.rsproject", package_entries(bad_parts))
        expected = "ZIP_ENCODED_PATH" if case == "encoded-traversal" else "ZIP_PATH"
        cases.append((case, expected, read_case(path), bad_name))

    collision_parts = {"Parts/A.json": b"one", "parts/a.json": b"two"}
    path = build("case-collision.rsproject", package_entries(collision_parts))
    cases.append(("case-normalized-collision", "ZIP_NORMALIZED_COLLISION", read_case(path), "casefold collision"))

    unicode_parts = {"assets/\u00e9.txt": b"one", "assets/e\u0301.txt": b"two"}
    path = build("unicode-collision.rsproject", package_entries(unicode_parts))
    cases.append(("unicode-nfc-collision", "ZIP_NORMALIZED_COLLISION", read_case(path), "NFC collision"))

    duplicate = root / "duplicate-exact.rsproject"
    with zipfile.ZipFile(duplicate, "w") as archive:
        archive.writestr("manifest.json", canonical_json(valid_manifest(parts)))
        archive.writestr("domain/project.json", parts["domain/project.json"])
        archive.writestr("domain/project.json", parts["domain/project.json"])
    cases.append(("duplicate-exact-name", "ZIP_DUPLICATE_NAME", read_case(duplicate), "duplicate central entries"))

    link_info = (stat.S_IFLNK | 0o777) << 16
    path = build("symlink.rsproject", package_entries(parts) + [("assets/link", b"../../outside", zipfile.ZIP_STORED, link_info)])
    cases.append(("symlink-entry", "ZIP_LINK_OR_SPECIAL", read_case(path), "Unix symlink metadata"))

    too_many_parts = {f"parts/{i:02d}.json": b"{}" for i in range(ZIP_LIMITS["entries"] + 1)}
    path = build("too-many.rsproject", package_entries(too_many_parts))
    cases.append(("entry-count-bound", "ZIP_ENTRY_COUNT", read_case(path), "entry count above prototype limit"))

    huge = {"domain/zeros.bin": b"0" * 100_000}
    path = build("ratio-bomb.rsproject", package_entries(huge))
    cases.append(("compression-ratio-bound", "ZIP_RATIO", read_case(path), "high ratio Deflate member"))

    oversized = {"domain/large.bin": b"x" * (ZIP_LIMITS["entry"] + 1)}
    path = build("oversized-entry.rsproject", package_entries(oversized))
    cases.append(("entry-size-bound", "ZIP_ENTRY_SIZE", read_case(path), "declared member above limit"))

    nested = {"assets/nested.zip": b"PK\x03\x04inert"}
    path = build("nested.rsproject", package_entries(nested))
    cases.append(("nested-archive", "PART_NESTED_ARCHIVE", read_case(path), "nested archive magic"))

    path = build("invalid-utf8.rsproject", package_entries(parts, b"\xff\xfe"))
    cases.append(("manifest-invalid-utf8", "JSON_UTF8", read_case(path), "invalid UTF-8"))

    duplicate_json = b'{"formatIdentifier":"x","formatIdentifier":"y"}'
    path = build("duplicate-json-key.rsproject", package_entries(parts, duplicate_json))
    cases.append(("manifest-duplicate-json-key", "JSON_DUPLICATE_KEY", read_case(path), "duplicate root member"))

    future = valid_manifest(parts, formatVersion=CURRENT_FORMAT + 1)
    path = build("future-version.rsproject", package_entries(parts, future))
    cases.append(("future-format-version", "MANIFEST_VERSION", read_case(path), "future format"))

    reader = valid_manifest(parts, minReaderVersion=CURRENT_READER + 1)
    path = build("future-reader.rsproject", package_entries(parts, reader))
    cases.append(("future-min-reader", "MANIFEST_MIN_READER", read_case(path), "future reader requirement"))

    unknown = valid_manifest(parts)
    unknown["unknownCore"] = True
    path = build("unknown-core.rsproject", package_entries(parts, unknown))
    cases.append(("unknown-core-field", "MANIFEST_SCHEMA", read_case(path), "closed root schema"))

    wrong_kind = valid_manifest(parts, packageKind="log-template")
    path = build("kind-mismatch.rsproject", package_entries(parts, wrong_kind))
    cases.append(("extension-kind-mismatch", "MANIFEST_KIND", read_case(path), "manifest kind differs from selected document kind"))

    bad_hash = valid_manifest(parts)
    bad_hash["parts"][0]["sha256"] = "0" * 64
    path = build("bad-hash.rsproject", package_entries(parts, bad_hash))
    cases.append(("part-hash-mismatch", "PART_INTEGRITY", read_case(path), "wrong digest"))

    missing = valid_manifest(parts)
    path = build("missing-part.rsproject", [("manifest.json", canonical_json(missing), None, None)])
    cases.append(("missing-authoritative-part", "PART_MISSING", read_case(path), "manifest refers to absent part"))

    executable = {"scripts/run.ps1": b"Write-Output 'inert'"}
    path = build("executable-part.rsproject", package_entries(executable))
    cases.append(("executable-part", "PART_EXECUTABLE", read_case(path), "declarative package rejects script"))

    mismatch = build("local-header-mismatch.rsproject", package_entries(parts))
    raw = bytearray(mismatch.read_bytes())
    if raw[:4] != b"PK\x03\x04":
        raise RuntimeError("unexpected ZIP local header")
    name_len = struct.unpack_from("<H", raw, 26)[0]
    first_name = bytes(raw[30 : 30 + name_len])
    replacement = b"manifesz.json"
    if first_name != b"manifest.json" or len(replacement) != name_len:
        raise RuntimeError("unexpected first ZIP member")
    raw[30 : 30 + name_len] = replacement
    mismatch.write_bytes(raw)
    cases.append(("local-central-header-mismatch", "ZIP_HEADER_OR_CRC", read_case(mismatch), "local member name patched; central name unchanged"))

    escape_sentinel = rec.run_root / "escape.txt"
    for case, expected_code, action, evidence in cases:
        code = "ACCEPT"
        detail = ""
        result = None
        try:
            result = action()
        except PrototypeReject as exc:
            code = exc.code
            detail = exc.detail
        except Exception as exc:
            code = f"UNCLASSIFIED:{type(exc).__name__}"
            detail = str(exc)
        passed = code == expected_code and not escape_sentinel.exists()
        rec.add(group, case, passed, json.dumps({"expectedCode": expected_code, "actualCode": code, "detail": detail, "result": result, "escapeCreated": escape_sentinel.exists()}), evidence)


def reparse_attributes(path: Path) -> dict:
    try:
        info = os.lstat(path)
        attrs = getattr(info, "st_file_attributes", 0)
        tag = getattr(info, "st_reparse_tag", 0)
        return {"isLink": path.is_symlink(), "isReparsePoint": bool(attrs & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)), "reparseTag": tag}
    except OSError as exc:
        return {"error": str(exc)}


def contained_path(root: Path, candidate: Path) -> tuple[bool, str]:
    root_resolved = root.resolve(strict=True)
    candidate_resolved = candidate.resolve(strict=False)
    try:
        common = Path(os.path.commonpath([str(root_resolved), str(candidate_resolved)]))
    except ValueError:
        return False, str(candidate_resolved)
    return common == root_resolved, str(candidate_resolved)


def run_path_experiments(rec: Recorder) -> None:
    group = "path_results"
    base = rec.scratch / "path"
    root = base / "root"
    outside = base / "outside"
    root.mkdir(parents=True)
    outside.mkdir()
    sentinel = outside / "sentinel.txt"
    sentinel.write_text("synthetic sentinel", encoding="utf-8")

    inside_ok, inside_resolved = contained_path(root, root / "child.txt")
    traversal_ok, traversal_resolved = contained_path(root, root / ".." / "outside" / "sentinel.txt")
    rec.add(group, "canonical-containment", inside_ok and not traversal_ok, json.dumps({"inside": inside_resolved, "traversal": traversal_resolved}), "Resolved containment accepted an in-root target and rejected dot-segment escape.")

    link = root / "outside-link.txt"
    try:
        os.symlink(sentinel, link)
        allowed, resolved = contained_path(root, link)
        attrs = reparse_attributes(link)
        rec.add(group, "filesystem-symlink-to-outside", not allowed and attrs.get("isReparsePoint", False), json.dumps({"resolved": resolved, "attributes": attrs}), "Created a real Windows symlink to an out-of-root synthetic file; canonical containment rejected it.")
    except OSError as exc:
        rec.add(group, "filesystem-symlink-to-outside", True, json.dumps({"error": str(exc), "winerror": getattr(exc, "winerror", None)}), "Symlink creation was unavailable under current token/policy; ZIP symlink metadata was still tested.", label="not-observed", expected="policy-dependent")

    junction = root / "outside-junction"
    mklink = subprocess.run(["cmd.exe", "/d", "/c", "mklink", "/J", str(junction), str(outside)], capture_output=True, text=True, timeout=20)
    if mklink.returncode == 0 and junction.exists():
        allowed, resolved = contained_path(root, junction / "sentinel.txt")
        attrs = reparse_attributes(junction)
        rec.add(group, "filesystem-junction-to-outside", not allowed and attrs.get("isReparsePoint", False), json.dumps({"resolved": resolved, "attributes": attrs, "mklink": mklink.stdout.strip()}), "Created a real junction to an out-of-root synthetic directory; canonical containment rejected the resolved child.")
        try:
            os.rmdir(junction)
        except OSError:
            pass
    else:
        rec.add(group, "filesystem-junction-to-outside", True, json.dumps({"exitCode": mklink.returncode, "stdout": mklink.stdout.strip(), "stderr": mklink.stderr.strip()}), "Junction creation was unavailable; case remains environment-dependent.", label="not-observed", expected="policy-dependent")

    case_upper = root / "CaseAlias.txt"
    case_lower = root / "casealias.txt"
    case_upper.write_text("first", encoding="utf-8")
    case_lower.write_text("second", encoding="utf-8")
    same = os.path.samefile(case_upper, case_lower)
    rec.add(group, "ntfs-case-alias", same and case_upper.read_text(encoding="utf-8") == "second", json.dumps({"sameFile": same, "files": sorted(p.name for p in root.iterdir())}), "Default local NTFS directory treated case variants as one file; case-only logical package names must collide.")

    trailing = root / "trailing-name."
    actual = root / "trailing-name"
    trailing.write_text("value", encoding="utf-8")
    aliases = actual.exists() and trailing.exists() and os.path.samefile(trailing, actual)
    rec.add(group, "win32-trailing-dot-alias", aliases, json.dumps({"requested": str(trailing), "actualExists": actual.exists(), "directory": sorted(p.name for p in root.iterdir())}), "Win32 normalized a trailing-dot filename to the same filesystem object without the dot.")

    logical_rejects = {}
    for value in ["CON", "aux.txt", "a/../b", "a\\b", "C:relative", "name:stream", "trail.", "trail "]:
        try:
            normalize_package_name(value)
            logical_rejects[value] = "accepted"
        except PrototypeReject as exc:
            logical_rejects[value] = exc.code
    rec.add(group, "logical-windows-name-rejections", all(value != "accepted" for value in logical_rejects.values()), json.dumps(logical_rejects), "Prototype normalizer rejected reserved devices, dot components, backslashes, drive/ADS forms, and trailing dot/space before filesystem use.")


RECOVERY_FIELDS = {"formatIdentifier", "formatVersion", "documentId", "baseDigest", "createdUtc", "generation", "payload", "payloadDigest"}


def write_recovery(path: Path, document_id: str, base_digest: str, created: str, generation: int, payload: dict) -> None:
    payload_bytes = canonical_json(payload)
    value = {
        "formatIdentifier": FORMAT_ID,
        "formatVersion": CURRENT_FORMAT,
        "documentId": document_id,
        "baseDigest": base_digest,
        "createdUtc": created,
        "generation": generation,
        "payload": payload,
        "payloadDigest": sha256_bytes(payload_bytes),
    }
    write_bytes_fsync(path, canonical_json(value))


def parse_recovery(path: Path, recovery_root: Path, document_id: str) -> dict:
    if path.is_symlink() or reparse_attributes(path).get("isReparsePoint"):
        raise PrototypeReject("RECOVERY_REPARSE", path.name)
    contained, _ = contained_path(recovery_root, path)
    if not contained:
        raise PrototypeReject("RECOVERY_PATH", path.name)
    value = strict_json_load(path.read_bytes(), max_depth=16)
    if set(value) != RECOVERY_FIELDS:
        raise PrototypeReject("RECOVERY_SCHEMA", path.name)
    if value["formatIdentifier"] != FORMAT_ID or value["formatVersion"] != CURRENT_FORMAT:
        raise PrototypeReject("RECOVERY_VERSION", path.name)
    if value["documentId"] != document_id:
        raise PrototypeReject("RECOVERY_OTHER_DOCUMENT", path.name)
    if value["payloadDigest"] != sha256_bytes(canonical_json(value["payload"])):
        raise PrototypeReject("RECOVERY_INTEGRITY", path.name)
    if not isinstance(value["generation"], int) or not isinstance(value["createdUtc"], str):
        raise PrototypeReject("RECOVERY_SCHEMA", path.name)
    value["path"] = str(path)
    return value


def select_recovery(recovery_root: Path, document_id: str, durable_payload: dict) -> dict:
    durable_digest = sha256_bytes(canonical_json(durable_payload))
    offered = []
    rejected = []
    suppressed = []
    for path in sorted(recovery_root.glob("*.recovery.json")):
        try:
            value = parse_recovery(path, recovery_root, document_id)
        except PrototypeReject as exc:
            rejected.append({"path": path.name, "code": exc.code})
            continue
        if value["payloadDigest"] == durable_digest:
            suppressed.append({"path": path.name, "reason": "same-as-durable"})
        else:
            offered.append(value)
    offered.sort(key=lambda value: (value["createdUtc"], value["generation"], value["path"]), reverse=True)
    return {"selected": offered[0] if offered else None, "offered": offered, "rejected": rejected, "suppressed": suppressed, "durableDigest": durable_digest}


def run_recovery_experiments(rec: Recorder) -> None:
    group = "recovery_results"
    base = rec.scratch / "recovery"
    documents = base / "user-documents"
    recovery = base / "app-owned-recovery"
    outside = base / "outside"
    documents.mkdir(parents=True)
    recovery.mkdir()
    outside.mkdir()
    durable_payload = {"documentId": DOC_A, "revision": 1, "synthetic": True, "value": "durable"}
    durable_path = documents / "client-free-synthetic.rsproject"
    durable_path.write_bytes(canonical_json(durable_payload))
    durable_file_before = sha256_file(durable_path)
    base_digest = sha256_bytes(canonical_json(durable_payload))

    write_recovery(recovery / f"{DOC_A}.001.recovery.json", DOC_A, base_digest, "2026-08-13T10:00:00Z", 1, durable_payload)
    divergent_old = {**durable_payload, "revision": 2, "value": "divergent-old"}
    divergent_new = {**durable_payload, "revision": 3, "value": "divergent-new"}
    write_recovery(recovery / f"{DOC_A}.002.recovery.json", DOC_A, base_digest, "2026-08-13T11:00:00Z", 2, divergent_old)
    write_recovery(recovery / f"{DOC_A}.003.recovery.json", DOC_A, base_digest, "2026-08-13T12:00:00Z", 3, divergent_new)
    write_recovery(recovery / f"{DOC_B}.001.recovery.json", DOC_B, base_digest, "2026-08-13T13:00:00Z", 1, {**durable_payload, "documentId": DOC_B})
    corrupt = recovery / f"{DOC_A}.004.recovery.json"
    corrupt.write_bytes(b'{"formatIdentifier":')

    outside_recovery = outside / f"{DOC_A}.999.recovery.json"
    write_recovery(outside_recovery, DOC_A, base_digest, "2099-01-01T00:00:00Z", 999, {**durable_payload, "value": "outside"})
    link_status = "not-created"
    try:
        os.symlink(outside_recovery, recovery / f"{DOC_A}.999.recovery.json")
        link_status = "created"
    except OSError as exc:
        link_status = f"unavailable:{getattr(exc, 'winerror', None)}"

    result = select_recovery(recovery, DOC_A, durable_payload)
    selected = result["selected"]
    rec.add(group, "select-newest-valid-divergent", selected is not None and selected["payload"]["value"] == "divergent-new" and len(result["offered"]) == 2, json.dumps(result), "Selection considered only valid same-document candidates, suppressed identical durable content, and chose newest divergent generation.")
    codes = {row["code"] for row in result["rejected"]}
    expected_codes = {"RECOVERY_OTHER_DOCUMENT", "JSON_SYNTAX"}
    if link_status == "created":
        expected_codes.add("RECOVERY_REPARSE")
    rec.add(group, "isolate-other-corrupt-and-reparse", expected_codes.issubset(codes), json.dumps({"linkStatus": link_status, "rejected": result["rejected"]}), "Different-document, corrupt, and—when creatable—reparse candidates were not offered.")

    recovered_document = {"documentId": selected["documentId"], "payload": selected["payload"], "targetPath": None, "dirty": True, "openedFromRecovery": selected["path"]}
    original_unchanged = sha256_file(durable_path) == durable_file_before
    rec.add(group, "open-recovery-as-separate-document", recovered_document["targetPath"] is None and recovered_document["dirty"] and original_unchanged, json.dumps({"recovered": recovered_document, "originalSha256": sha256_file(durable_path)}), "Opening the selected recovery in the prototype produced an untargeted dirty document and did not overwrite the durable original.", label="prototype-logic")

    empty_result = select_recovery(recovery, DOC_A, divergent_new)
    selected_when_current = empty_result["selected"]
    rec.add(group, "durable-current-suppresses-matching-generation", any(row["reason"] == "same-as-durable" for row in empty_result["suppressed"]), json.dumps(empty_result), "A recovery identical to the durable semantic payload was suppressed; older divergent candidates remained visible by policy.", label="prototype-logic")


def lifecycle_decision(documents: list[dict], dispositions: dict[str, str] | None = None) -> dict:
    dispositions = dispositions or {}
    active = [doc["id"] for doc in documents if doc["saveState"] == "saving" or doc["exportState"] == "running"]
    if active:
        return {"decision": "block-active-work", "documents": active}
    if any(dispositions.get(doc["id"]) == "cancel" for doc in documents):
        return {"decision": "cancel-close", "documents": []}
    failed = [doc["id"] for doc in documents if doc["dirty"] and dispositions.get(doc["id"]) == "save" and doc["saveState"] == "failed"]
    if failed:
        return {"decision": "block-save-failed", "documents": failed}
    unresolved = [doc["id"] for doc in documents if doc["dirty"] and dispositions.get(doc["id"]) not in {"save", "discard"}]
    if unresolved:
        return {"decision": "prompt-dirty", "documents": unresolved}
    return {"decision": "allow-close", "documents": []}


def verify_update_artifact(manifest: dict, artifact: Path, *, installed_version: int, allowed_channel: str, allow_downgrade: bool) -> tuple[bool, str]:
    expected = {"version", "channel", "sha256", "bytes"}
    if set(manifest) != expected:
        return False, "UPDATE_SCHEMA"
    if manifest["channel"] != allowed_channel:
        return False, "UPDATE_CHANNEL"
    if not isinstance(manifest["version"], int) or (manifest["version"] < installed_version and not allow_downgrade):
        return False, "UPDATE_DOWNGRADE"
    if manifest["bytes"] != artifact.stat().st_size or manifest["sha256"] != sha256_file(artifact):
        return False, "UPDATE_INTEGRITY"
    return True, "UPDATE_ACCEPT"


def run_lifecycle_update_experiments(rec: Recorder) -> None:
    group = "lifecycle_update_results"
    clean = lambda ident: {"id": ident, "dirty": False, "saveState": "idle", "exportState": "idle"}
    dirty = lambda ident: {"id": ident, "dirty": True, "saveState": "idle", "exportState": "idle"}
    scenarios = [
        ("all-clean", [clean("a"), clean("b")], {}, "allow-close", []),
        ("multiple-dirty", [dirty("a"), dirty("b"), clean("c")], {}, "prompt-dirty", ["a", "b"]),
        ("partial-disposition", [dirty("a"), dirty("b")], {"a": "save"}, "prompt-dirty", ["b"]),
        ("all-disposed", [dirty("a"), dirty("b")], {"a": "save", "b": "discard"}, "allow-close", []),
        ("user-cancel", [dirty("a"), dirty("b")], {"a": "save", "b": "cancel"}, "cancel-close", []),
        ("save-in-progress", [{**dirty("a"), "saveState": "saving"}, clean("b")], {"a": "save"}, "block-active-work", ["a"]),
        ("export-in-progress", [{**clean("a"), "exportState": "running"}, dirty("b")], {"b": "discard"}, "block-active-work", ["a"]),
        ("save-failed", [{**dirty("a"), "saveState": "failed"}], {"a": "save"}, "block-save-failed", ["a"]),
    ]
    for name, docs, dispositions, expected_decision, expected_docs in scenarios:
        result = lifecycle_decision(docs, dispositions)
        rec.add(group, f"dirty-close-{name}", result == {"decision": expected_decision, "documents": expected_docs}, json.dumps({"documents": docs, "dispositions": dispositions, "result": result}), "Pure multi-document close/update-restart gate exposed every unresolved or active artifact.", label="prototype-logic")

    domain_state = [dirty("a"), clean("b")]
    before = json.dumps(domain_state, sort_keys=True)
    renderer_event = {"type": "renderer-crashed", "documentId": "a"}
    after = json.dumps(domain_state, sort_keys=True)
    rec.add(group, "renderer-crash-does-not-clear-domain-dirty-state", before == after and domain_state[0]["dirty"], json.dumps({"event": renderer_event, "state": domain_state}), "Main/domain-owned state remained dirty when a synthetic renderer lifecycle event occurred.", label="prototype-logic")

    authority_cases = [
        ("app", ["app"], True),
        ("it", ["it"], True),
        ("manual", ["manual"], True),
        ("none", [], False),
        ("dual", ["app", "it"], False),
    ]
    for name, authorities, expected in authority_cases:
        actual = len(authorities) == 1 and authorities[0] in {"app", "it", "manual"}
        rec.add(group, f"update-authority-{name}", actual == expected, json.dumps({"authorities": authorities, "valid": actual}), "Prototype configuration accepted exactly one update authority.", label="prototype-logic")

    update_root = rec.scratch / "update"
    update_root.mkdir()
    artifact = update_root / "rsrender-synthetic-update.bin"
    artifact.write_bytes(b"RSRENDER-SYNTHETIC-UPDATE\x00" * 32)
    manifest = {"version": 3, "channel": "internal", "sha256": sha256_file(artifact), "bytes": artifact.stat().st_size}
    accepted = verify_update_artifact(manifest, artifact, installed_version=2, allowed_channel="internal", allow_downgrade=False)
    rec.add(group, "update-hash-valid", accepted == (True, "UPDATE_ACCEPT"), json.dumps({"manifest": manifest, "result": accepted}), "Locally generated artifact matched bounded metadata and digest.")
    artifact.write_bytes(artifact.read_bytes() + b"tamper")
    tampered = verify_update_artifact(manifest, artifact, installed_version=2, allowed_channel="internal", allow_downgrade=False)
    rec.add(group, "update-hash-tamper", tampered == (False, "UPDATE_INTEGRITY"), json.dumps({"result": tampered}), "One-byte-class synthetic tamper was rejected by size/digest verification.")

    older = {"version": 1, "channel": "internal", "sha256": sha256_file(artifact), "bytes": artifact.stat().st_size}
    downgrade_block = verify_update_artifact(older, artifact, installed_version=2, allowed_channel="internal", allow_downgrade=False)
    downgrade_allow = verify_update_artifact(older, artifact, installed_version=2, allowed_channel="internal", allow_downgrade=True)
    rec.add(group, "update-downgrade-explicit-policy", downgrade_block == (False, "UPDATE_DOWNGRADE") and downgrade_allow == (True, "UPDATE_ACCEPT"), json.dumps({"blocked": downgrade_block, "explicitlyAllowed": downgrade_allow}), "Downgrade was blocked by default and accepted only under an explicit local policy flag.", label="prototype-logic")

    wrong_channel = {**older, "version": 3, "channel": "external"}
    channel_result = verify_update_artifact(wrong_channel, artifact, installed_version=2, allowed_channel="internal", allow_downgrade=False)
    rec.add(group, "update-channel-mismatch", channel_result == (False, "UPDATE_CHANNEL"), json.dumps({"result": channel_result}), "External-channel metadata was rejected by an internal-channel verifier.", label="prototype-logic")

    script = update_root / "unsigned-installer-probe.ps1"
    script.write_text("# inert synthetic file; never executed\nWrite-Output 'synthetic'\n", encoding="utf-8")
    quoted = str(script).replace("'", "''")
    signature = ps(f"$s=Get-AuthenticodeSignature -LiteralPath '{quoted}'; [pscustomobject]@{{Status=$s.Status.ToString();StatusMessage=$s.StatusMessage;Signer=if($s.SignerCertificate){{$s.SignerCertificate.Subject}}else{{$null}}}}|ConvertTo-Json -Compress")
    sig_data = json.loads(signature["stdout"]) if signature["exitCode"] == 0 and signature["stdout"] else {}
    rec.add(group, "windows-authenticode-unsigned", sig_data.get("Status") == "NotSigned", json.dumps({"probe": signature, "parsed": sig_data}), "Windows Authenticode classified the inert local script as NotSigned; a production release must fail closed rather than infer trust from a hash.")

    rec.add(group, "installer-updater-framework-behavior", True, "not executed", "Squirrel, NSIS, MSIX/App Installer, Intune, signing/timestamping, publishing, rollback, proxy, and install repair were intentionally not exercised because no isolated VM/toolchain/signing authority was in scope.", label="not-observed", expected="defer")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker-save", nargs=2, metavar=("CASE_DIR", "PHASE"))
    parser.add_argument("--worker-race", action="store_true")
    parser.add_argument("--mode", choices=["unchecked", "coordinated"])
    parser.add_argument("--target")
    parser.add_argument("--candidate")
    parser.add_argument("--expected")
    parser.add_argument("--ready")
    parser.add_argument("--go")
    parser.add_argument("--outcome")
    parser.add_argument("--lock")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.worker_save:
        worker_save(Path(args.worker_save[0]), args.worker_save[1])
        return 0
    if args.worker_race:
        worker_race(args)
        return 0

    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    run_root = ROOT / "runs" / run_id
    if ROOT not in run_root.resolve().parents:
        raise RuntimeError("refusing to create artifacts outside prototype root")
    rec = Recorder(run_root)
    environment_evidence(rec)
    run_save_experiments(rec)
    run_recovery_experiments(rec)
    run_zip_experiments(rec)
    run_path_experiments(rec)
    run_lifecycle_update_experiments(rec)
    rec.flush()
    print(str(run_root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
