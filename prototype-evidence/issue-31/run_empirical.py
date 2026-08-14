"""THROWAWAY PROTOTYPE for RSrender Wayfinder issue #31.

Question: which combination of single-application routing, per-document
ownership, and explicit Windows commit authority prevents silent lost updates
for inert local files? This is decision evidence, not application code.
"""

from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
import uuid


SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parent
DOCUMENT_ID = "00000000-0000-4000-8000-000000000031"


def canonical(value: dict) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def document(revision: int, value: str) -> dict:
    return {"documentId": DOCUMENT_ID, "formatVersion": 1, "revision": revision, "value": value}


def parse_document(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if set(value) != {"documentId", "formatVersion", "revision", "value"}:
        raise ValueError("closed schema mismatch")
    if value["documentId"] != DOCUMENT_ID or value["formatVersion"] != 1:
        raise ValueError("identity/version mismatch")
    if not isinstance(value["revision"], int) or value["revision"] < 1 or not isinstance(value["value"], str):
        raise ValueError("invalid domain value")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while block := handle.read(64 * 1024):
            digest.update(block)
    return digest.hexdigest()


def write_fsync(path: Path, payload: dict) -> None:
    data = canonical(payload)
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, "O_BINARY", 0), 0o600)
    try:
        offset = 0
        while offset < len(data):
            offset += os.write(fd, data[offset:])
        os.fsync(fd)
    finally:
        os.close(fd)
    parse_document(path)


if os.name == "nt":
    KERNEL32 = ctypes.WinDLL("kernel32", use_last_error=True)
    REPLACE_FILE_WRITE_THROUGH = 0x1
    GENERIC_READ = 0x80000000
    GENERIC_WRITE = 0x40000000
    OPEN_ALWAYS = 4
    FILE_ATTRIBUTE_NORMAL = 0x80
    INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

    KERNEL32.ReplaceFileW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD, wintypes.LPVOID, wintypes.LPVOID]
    KERNEL32.ReplaceFileW.restype = wintypes.BOOL
    KERNEL32.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
    KERNEL32.CreateFileW.restype = wintypes.HANDLE
    KERNEL32.CloseHandle.argtypes = [wintypes.HANDLE]
    KERNEL32.CloseHandle.restype = wintypes.BOOL
    KERNEL32.GetVolumeInformationW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD), wintypes.LPWSTR, wintypes.DWORD]
    KERNEL32.GetVolumeInformationW.restype = wintypes.BOOL


def replace_file(target: Path, candidate: Path, backup: Path | None = None) -> None:
    if os.name != "nt":
        raise OSError("Windows-only prototype")
    ok = KERNEL32.ReplaceFileW(str(target), str(candidate), str(backup) if backup else None, REPLACE_FILE_WRITE_THROUGH, None, None)
    if not ok:
        code = ctypes.get_last_error()
        raise OSError(code, ctypes.FormatError(code), str(target))


def acquire_zero_share(path: Path):
    handle = KERNEL32.CreateFileW(str(path), GENERIC_READ | GENERIC_WRITE, 0, None, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, None)
    if handle == INVALID_HANDLE_VALUE:
        code = ctypes.get_last_error()
        raise OSError(code, ctypes.FormatError(code), str(path))
    return handle


def close_handle(handle) -> None:
    if handle is not None and handle != INVALID_HANDLE_VALUE:
        KERNEL32.CloseHandle(handle)


def filesystem_for(path: Path) -> dict:
    root = Path(path.anchor)
    volume_name = ctypes.create_unicode_buffer(261)
    filesystem_name = ctypes.create_unicode_buffer(261)
    serial = wintypes.DWORD()
    max_component = wintypes.DWORD()
    flags = wintypes.DWORD()
    ok = KERNEL32.GetVolumeInformationW(str(root), volume_name, len(volume_name), ctypes.byref(serial), ctypes.byref(max_component), ctypes.byref(flags), filesystem_name, len(filesystem_name))
    return {
        "root": str(root),
        "observed": bool(ok),
        "filesystem": filesystem_name.value if ok else None,
        "volumeName": volume_name.value if ok else None,
        "serial": serial.value if ok else None,
        "error": None if ok else ctypes.get_last_error(),
    }


def wait_for(path: Path, timeout: float = 10.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.exists():
            return True
        time.sleep(0.01)
    return False


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class Recorder:
    def __init__(self, run_dir: Path):
        self.run_dir = run_dir
        self.raw = run_dir / "raw"
        self.scratch = run_dir / "scratch"
        self.raw.mkdir(parents=True)
        self.scratch.mkdir()
        self.groups: dict[str, list[dict]] = {}

    def add(self, group: str, case_id: str, passed: bool, evidence: str, detail: dict, implication: str) -> None:
        self.groups.setdefault(group, []).append({
            "id": case_id,
            "passed": bool(passed),
            "evidence": evidence,
            "detail": detail,
            "implication": implication,
        })

    def finish(self, environment: dict) -> dict:
        rows = []
        for group, values in self.groups.items():
            write_json(self.raw / f"{group}.json", {"group": group, "results": values})
            rows.extend({"group": group, **row} for row in values)
        counts: dict[str, int] = {}
        for row in rows:
            counts[row["evidence"]] = counts.get(row["evidence"], 0) + 1
        summary = {
            "question": "Which combination of single-application routing, per-document ownership, and explicit Windows commit authority prevents silent local lost updates?",
            "runDirectory": str(self.run_dir),
            "environment": environment,
            "total": len(rows),
            "passed": sum(1 for row in rows if row["passed"]),
            "failed": sum(1 for row in rows if not row["passed"]),
            "evidenceCounts": counts,
            "results": rows,
        }
        write_json(self.raw / "environment.json", environment)
        write_json(self.raw / "summary.json", summary)
        return summary


def try_acquire(path: Path, timeout: float, cancel: Path | None = None):
    started = time.monotonic()
    last_error = None
    while time.monotonic() - started < timeout:
        if cancel and cancel.exists():
            return None, "cancelled", int((time.monotonic() - started) * 1000), last_error
        try:
            return acquire_zero_share(path), "acquired", int((time.monotonic() - started) * 1000), last_error
        except OSError as exc:
            last_error = {"winerror": exc.errno, "message": str(exc)}
            time.sleep(0.01)
    return None, "busy-timeout", int((time.monotonic() - started) * 1000), last_error


def worker_lock_commit(args: argparse.Namespace) -> None:
    target = Path(args.target)
    candidate = Path(args.candidate)
    lock = Path(args.lock)
    marker = Path(args.marker)
    outcome = Path(args.outcome)
    cancel = Path(args.cancel) if args.cancel else None
    ready = Path(args.ready) if args.ready else None
    go = Path(args.go) if args.go else None
    nonce = args.nonce or uuid.uuid4().hex
    handle, acquire_state, wait_ms, error = try_acquire(lock, args.timeout, cancel)
    result = {"ownerId": args.owner, "ownerNonce": nonce, "acquire": acquire_state, "waitMs": wait_ms, "lastAcquireError": error}
    if handle is None:
        result["outcome"] = "cancelled" if acquire_state == "cancelled" else "commit-authority-busy"
        write_json(outcome, result)
        return
    try:
        prior_marker = read_json(marker) if marker.exists() else None
        result["priorMarker"] = prior_marker
        write_json(marker, {"ownerId": args.owner, "ownerNonce": nonce, "pid": os.getpid(), "createdUtc": datetime.now(timezone.utc).isoformat()})
        if ready:
            ready.write_text("ready", encoding="ascii")
        if args.crash_after_acquire:
            while True:
                time.sleep(1)
        if go:
            while not go.exists():
                if cancel and cancel.exists():
                    result["outcome"] = "cancelled-after-acquire"
                    write_json(outcome, result)
                    return
                time.sleep(0.01)
        if args.hold_ms:
            time.sleep(args.hold_ms / 1000)
        checked = sha256(target)
        result["checkedInsideAuthority"] = checked
        result["expectedBaseline"] = args.expected
        if checked != args.expected:
            result["outcome"] = "external-baseline-conflict"
        else:
            if args.handoff:
                handoff = Path(args.handoff)
                write_json(handoff, {
                    "documentId": DOCUMENT_ID,
                    "fromOwner": args.owner,
                    "toOwner": args.handoff_to,
                    "baseline": checked,
                    "transferNonce": uuid.uuid4().hex,
                })
                result["outcome"] = "handoff-ready"
                result["handoff"] = read_json(handoff)
            else:
                if args.required_handoff:
                    token = read_json(Path(args.required_handoff))
                    valid = token.get("documentId") == DOCUMENT_ID and token.get("toOwner") == args.owner and token.get("baseline") == checked
                    result["handoffValidatedInsideAuthority"] = valid
                    if not valid:
                        result["outcome"] = "handoff-token-conflict"
                        write_json(outcome, result)
                        return
                replace_file(target, candidate, target.with_suffix(target.suffix + f".{args.owner}.backup"))
                result["outcome"] = "committed"
                result["committed"] = parse_document(target)
        write_json(outcome, result)
    finally:
        own_marker = False
        own_marker_removed_before_release = False
        try:
            own_marker = marker.exists() and read_json(marker).get("ownerNonce") == nonce
            if own_marker:
                marker.unlink()
            own_marker_removed_before_release = own_marker and not marker.exists()
        except Exception:
            pass
        close_handle(handle)
        try:
            lock.unlink()
            lock_cleanup = True
        except OSError:
            lock_cleanup = not lock.exists()
        if outcome.exists():
            saved = read_json(outcome)
            saved["ownedMarkerRemovedBeforeRelease"] = own_marker_removed_before_release
            saved["markerPresentWhenOutcomeFinalized"] = marker.exists()
            saved["lockPathRemovedOrReowned"] = lock_cleanup or lock.exists()
            write_json(outcome, saved)


def worker_broker(args: argparse.Namespace) -> None:
    target = Path(args.target)
    instance_lock = Path(args.lock)
    request_dir = Path(args.requests)
    outcome_dir = Path(args.outcomes)
    ready = Path(args.ready)
    go = Path(args.go) if args.go else None
    handle, acquire_state, wait_ms, error = try_acquire(instance_lock, args.timeout)
    if handle is None:
        write_json(Path(args.broker_outcome), {"outcome": "single-application-busy", "acquire": acquire_state, "waitMs": wait_ms, "error": error})
        return
    try:
        ready.write_text("ready", encoding="ascii")
        if go:
            while not go.exists():
                time.sleep(0.01)
        processed = []
        for request_path in sorted(request_dir.glob("*.json")):
            request = read_json(request_path)
            checked = sha256(target)
            row = {"requestId": request["requestId"], "expected": request["expected"], "checkedInsideOwner": checked}
            if checked != request["expected"]:
                row["outcome"] = "external-baseline-conflict"
            else:
                replace_file(target, Path(request["candidate"]), target.with_suffix(target.suffix + f".{request['requestId']}.backup"))
                row["outcome"] = "committed"
                row["committed"] = parse_document(target)
            write_json(outcome_dir / f"{request['requestId']}.json", row)
            processed.append(row)
        write_json(Path(args.broker_outcome), {"outcome": "completed", "processed": processed})
    finally:
        close_handle(handle)
        try:
            instance_lock.unlink()
        except OSError:
            pass


def spawn_lock_worker(case: Path, owner: str, target: Path, candidate: Path, expected: str, **options) -> subprocess.Popen:
    cmd = [
        sys.executable, str(SCRIPT), "--worker", "lock-commit",
        "--owner", owner,
        "--target", str(target),
        "--candidate", str(candidate),
        "--expected", expected,
        "--lock", str(case / "document.commit.lock"),
        "--marker", str(case / "document.commit.owner.json"),
        "--outcome", str(case / f"outcome-{owner}.json"),
        "--timeout", str(options.get("timeout", 5)),
    ]
    for name in ["ready", "go", "cancel", "handoff", "handoff_to", "required_handoff", "nonce"]:
        if options.get(name) is not None:
            cmd.extend([f"--{name.replace('_', '-')}", str(options[name])])
    if options.get("hold_ms") is not None:
        cmd.extend(["--hold-ms", str(options["hold_ms"])])
    if options.get("crash_after_acquire"):
        cmd.append("--crash-after-acquire")
    return subprocess.Popen(cmd)


def run_single_application(rec: Recorder) -> None:
    group = "single_application"
    case = rec.scratch / group / "two-routed-writers"
    (case / "requests").mkdir(parents=True)
    (case / "outcomes").mkdir()
    target = case / "document.rsrp"
    write_fsync(target, document(1, "old"))
    baseline = sha256(target)
    for request_id, value in [("writer-a", "a"), ("writer-b", "b")]:
        candidate = case / f"candidate-{request_id}.rsrp"
        write_fsync(candidate, document(2, value))
        write_json(case / "requests" / f"{request_id}.json", {"requestId": request_id, "expected": baseline, "candidate": str(candidate)})
    ready = case / "broker.ready"
    go = case / "broker.go"
    broker_outcome = case / "broker.json"
    cmd = [sys.executable, str(SCRIPT), "--worker", "broker", "--target", str(target), "--lock", str(case / "application.instance.lock"), "--requests", str(case / "requests"), "--outcomes", str(case / "outcomes"), "--ready", str(ready), "--go", str(go), "--broker-outcome", str(broker_outcome), "--timeout", "3"]
    broker = subprocess.Popen(cmd)
    if not wait_for(ready):
        raise RuntimeError("broker did not become ready")

    second_outcome = case / "broker-second.json"
    second_ready = case / "broker-second.ready"
    second_cmd = [sys.executable, str(SCRIPT), "--worker", "broker", "--target", str(target), "--lock", str(case / "application.instance.lock"), "--requests", str(case / "requests"), "--outcomes", str(case / "outcomes"), "--ready", str(second_ready), "--broker-outcome", str(second_outcome), "--timeout", "0.2"]
    second = subprocess.run(second_cmd, capture_output=True, text=True, timeout=5)
    go.write_text("go", encoding="ascii")
    broker.wait(timeout=10)
    first = read_json(broker_outcome)
    second_result = read_json(second_outcome)
    statuses = [item["outcome"] for item in first["processed"]]
    rec.add(group, "one-broker-routes-two-writers", statuses == ["committed", "external-baseline-conflict"] and parse_document(target)["value"] == "a", "observed", {"broker": first, "final": parse_document(target)}, "One live broker serialized both requests and rechecked each baseline; the second stale request became a stable conflict.")
    rec.add(group, "second-broker-denied-while-owner-live", second.returncode == 0 and second_result["outcome"] == "single-application-busy", "observed", second_result, "Single-application routing needs an actual process authority; an in-memory singleton flag would not prove this boundary.")

    restart = rec.scratch / group / "broker-crash-restart"
    (restart / "requests").mkdir(parents=True)
    (restart / "outcomes").mkdir()
    target = restart / "document.rsrp"
    write_fsync(target, document(1, "old"))
    candidate = restart / "candidate.rsrp"
    write_fsync(candidate, document(2, "after-restart"))
    write_json(restart / "requests" / "writer.json", {"requestId": "writer", "expected": sha256(target), "candidate": str(candidate)})
    ready = restart / "first.ready"
    never_go = restart / "first.go"
    first_outcome = restart / "first.json"
    first_cmd = [sys.executable, str(SCRIPT), "--worker", "broker", "--target", str(target), "--lock", str(restart / "application.instance.lock"), "--requests", str(restart / "requests"), "--outcomes", str(restart / "outcomes"), "--ready", str(ready), "--go", str(never_go), "--broker-outcome", str(first_outcome), "--timeout", "3"]
    first_broker = subprocess.Popen(first_cmd)
    if not wait_for(ready):
        raise RuntimeError("crash broker did not become ready")
    first_broker.terminate()
    first_broker.wait(timeout=5)
    restart_ready = restart / "restart.ready"
    restart_outcome = restart / "restart.json"
    restart_cmd = [sys.executable, str(SCRIPT), "--worker", "broker", "--target", str(target), "--lock", str(restart / "application.instance.lock"), "--requests", str(restart / "requests"), "--outcomes", str(restart / "outcomes"), "--ready", str(restart_ready), "--broker-outcome", str(restart_outcome), "--timeout", "3"]
    restarted = subprocess.run(restart_cmd, capture_output=True, text=True, timeout=10)
    result = read_json(restart_outcome)
    rec.add(group, "broker-crash-restart-replays-pending-request", restarted.returncode == 0 and result["processed"][0]["outcome"] == "committed" and parse_document(target)["value"] == "after-restart", "observed", {"terminatedExit": first_broker.returncode, "restart": result, "final": parse_document(target)}, "A persistent request survived broker loss and a restarted sole broker rechecked the file before commit. Production still needs authenticated/idempotent command journaling.")


def run_per_document(rec: Recorder) -> None:
    group = "per_document"
    case = rec.scratch / group / "parallel-documents"
    case.mkdir(parents=True)
    processes = []
    for suffix in ["a", "b"]:
        doc_dir = case / suffix
        doc_dir.mkdir()
        target = doc_dir / "document.rsrp"
        candidate = doc_dir / "candidate.rsrp"
        write_fsync(target, document(1, f"old-{suffix}"))
        write_fsync(candidate, document(2, f"new-{suffix}"))
        ready = doc_dir / "ready"
        go = doc_dir / "go"
        process = spawn_lock_worker(doc_dir, f"owner-{suffix}", target, candidate, sha256(target), ready=ready, go=go)
        processes.append((suffix, process, ready, go, target, doc_dir))
    both_ready = all(wait_for(item[2]) for item in processes)
    for item in processes:
        item[3].write_text("go", encoding="ascii")
    for item in processes:
        item[1].wait(timeout=10)
    outcomes = [read_json(item[5] / f"outcome-owner-{item[0]}.json") for item in processes]
    rec.add(group, "different-documents-owned-concurrently", both_ready and all(row["outcome"] == "committed" for row in outcomes), "observed", {"outcomes": outcomes}, "Per-document authority permits independent documents to commit concurrently; application-global save serialization is unnecessary.")

    handoff = rec.scratch / group / "ownership-handoff"
    handoff.mkdir(parents=True)
    target = handoff / "document.rsrp"
    candidate_a = handoff / "candidate-a.rsrp"
    candidate_b = handoff / "candidate-b.rsrp"
    write_fsync(target, document(1, "old"))
    write_fsync(candidate_a, document(2, "unused-by-a"))
    write_fsync(candidate_b, document(2, "owner-b"))
    baseline = sha256(target)
    token = handoff / "handoff.json"
    a = spawn_lock_worker(handoff, "owner-a", target, candidate_a, baseline, handoff=token, handoff_to="owner-b")
    a.wait(timeout=10)
    a_result = read_json(handoff / "outcome-owner-a.json")
    b = spawn_lock_worker(handoff, "owner-b", target, candidate_b, baseline, required_handoff=token)
    b.wait(timeout=10)
    b_result = read_json(handoff / "outcome-owner-b.json")
    passed = a_result["outcome"] == "handoff-ready" and b_result["outcome"] == "committed" and b_result.get("handoffValidatedInsideAuthority") and parse_document(target)["value"] == "owner-b"
    rec.add(group, "explicit-handoff-token-and-baseline", passed, "observed", {"from": a_result, "to": b_result, "final": parse_document(target)}, "Handoff is an explicit routing transition; the receiver still acquires commit authority and validates both token and target baseline inside it.")

    wrong = {"documentId": DOCUMENT_ID, "fromOwner": "owner-a", "toOwner": "wrong-owner", "baseline": sha256(target), "transferNonce": uuid.uuid4().hex}
    wrong_token = handoff / "wrong-handoff.json"
    write_json(wrong_token, wrong)
    candidate_c = handoff / "candidate-c.rsrp"
    write_fsync(candidate_c, document(3, "should-not-commit"))
    c = spawn_lock_worker(handoff, "owner-c", target, candidate_c, sha256(target), required_handoff=wrong_token)
    c.wait(timeout=10)
    c_result = read_json(handoff / "outcome-owner-c.json")
    rec.add(group, "handoff-token-mismatch-is-stable-conflict", c_result["outcome"] == "handoff-token-conflict" and parse_document(target)["value"] == "owner-b", "observed", c_result, "A handoff token is scoped to document, receiver, and baseline; mismatch does not mutate the target.")

    rec.add(group, "pid-alone-never-identifies-document-owner", True, "simulated", {"marker": {"pid": os.getpid(), "ownerNonce": "prior-process-start"}, "currentProcessPid": os.getpid(), "decision": "OWNER_IDENTITY_AMBIGUOUS"}, "A reused or still-live PID cannot distinguish process start/session identity; PID is diagnostic only, never authority.")


def run_windows_lock(rec: Recorder) -> None:
    group = "windows_lock"
    two = rec.scratch / group / "two-writers"
    two.mkdir(parents=True)
    target = two / "document.rsrp"
    write_fsync(target, document(1, "old"))
    baseline = sha256(target)
    procs = []
    for owner, value, hold in [("writer-a", "a", 250), ("writer-b", "b", 0)]:
        candidate = two / f"candidate-{owner}.rsrp"
        write_fsync(candidate, document(2, value))
        procs.append(spawn_lock_worker(two, owner, target, candidate, baseline, hold_ms=hold))
    for process in procs:
        process.wait(timeout=10)
    outcomes = [read_json(two / f"outcome-{owner}.json") for owner in ["writer-a", "writer-b"]]
    statuses = sorted(row["outcome"] for row in outcomes)
    rec.add(group, "two-writers-lock-and-inside-recheck", statuses == ["committed", "external-baseline-conflict"], "observed", {"outcomes": outcomes, "final": parse_document(target)}, "An exclusive zero-share handle serialized local writers; the inside-authority baseline recheck classified the loser as conflict.")

    crash = rec.scratch / group / "owner-crash"
    crash.mkdir(parents=True)
    target = crash / "document.rsrp"
    write_fsync(target, document(1, "old"))
    baseline = sha256(target)
    abandoned = crash / "candidate-crashed.rsrp"
    successor = crash / "candidate-successor.rsrp"
    write_fsync(abandoned, document(2, "crashed"))
    write_fsync(successor, document(2, "successor"))
    ready = crash / "crashed.ready"
    crashed = spawn_lock_worker(crash, "crashed-owner", target, abandoned, baseline, ready=ready, crash_after_acquire=True, nonce="crashed-nonce")
    if not wait_for(ready):
        raise RuntimeError("crash owner did not acquire")
    marker_before = read_json(crash / "document.commit.owner.json")
    crashed.terminate()
    crashed.wait(timeout=5)
    successor_process = spawn_lock_worker(crash, "successor", target, successor, baseline, nonce="successor-nonce")
    successor_process.wait(timeout=10)
    result = read_json(crash / "outcome-successor.json")
    rec.add(group, "owner-crash-releases-os-authority", result["outcome"] == "committed" and result.get("priorMarker", {}).get("ownerNonce") == "crashed-nonce" and parse_document(target)["value"] == "successor", "observed", {"terminatedExit": crashed.returncode, "staleMarker": marker_before, "successor": result}, "Windows released the zero-share handle when the owner process terminated. The marker survived only as diagnostic stale metadata and was not broken by TTL/PID logic.")

    stale = rec.scratch / group / "stale-marker-live-pid"
    stale.mkdir(parents=True)
    target = stale / "document.rsrp"
    candidate = stale / "candidate.rsrp"
    write_fsync(target, document(1, "old"))
    write_fsync(candidate, document(2, "new-owner"))
    write_json(stale / "document.commit.owner.json", {"ownerId": "old-owner", "ownerNonce": "old-start", "pid": os.getpid(), "createdUtc": "2000-01-01T00:00:00Z"})
    process = spawn_lock_worker(stale, "new-owner", target, candidate, sha256(target))
    process.wait(timeout=10)
    result = read_json(stale / "outcome-new-owner.json")
    rec.add(group, "live-pid-stale-marker-does-not-override-os-authority", result["outcome"] == "committed" and result.get("priorMarker", {}).get("pid") == os.getpid(), "observed", result, "Even a marker naming a currently live PID was not authority. Successful OS-handle acquisition plus inside-authority recheck governed commit.")

    delayed = rec.scratch / group / "delayed-owner"
    delayed.mkdir(parents=True)
    target = delayed / "document.rsrp"
    write_fsync(target, document(1, "old"))
    baseline = sha256(target)
    for owner, value in [("slow-owner", "slow"), ("waiter", "waiter")]:
        write_fsync(delayed / f"candidate-{owner}.rsrp", document(2, value))
    ready = delayed / "slow.ready"
    go = delayed / "slow.go"
    slow = spawn_lock_worker(delayed, "slow-owner", target, delayed / "candidate-slow-owner.rsrp", baseline, ready=ready, go=go)
    if not wait_for(ready):
        raise RuntimeError("slow owner did not acquire")
    waiter = spawn_lock_worker(delayed, "waiter", target, delayed / "candidate-waiter.rsrp", baseline, timeout=4)
    time.sleep(0.35)
    go.write_text("go", encoding="ascii")
    slow.wait(timeout=10)
    waiter.wait(timeout=10)
    slow_result = read_json(delayed / "outcome-slow-owner.json")
    waiter_result = read_json(delayed / "outcome-waiter.json")
    rec.add(group, "delayed-owner-waiter-becomes-conflict", slow_result["outcome"] == "committed" and waiter_result["outcome"] == "external-baseline-conflict" and waiter_result["waitMs"] >= 250, "observed", {"owner": slow_result, "waiter": waiter_result}, "Waiting for authority does not preserve a stale commit right; the waiter must recheck after acquisition and become conflict.")

    cancel_case = rec.scratch / group / "waiter-cancellation"
    cancel_case.mkdir(parents=True)
    target = cancel_case / "document.rsrp"
    write_fsync(target, document(1, "old"))
    baseline = sha256(target)
    holder_candidate = cancel_case / "candidate-holder.rsrp"
    waiter_candidate = cancel_case / "candidate-waiter.rsrp"
    write_fsync(holder_candidate, document(2, "holder"))
    write_fsync(waiter_candidate, document(2, "cancelled-waiter"))
    ready = cancel_case / "holder.ready"
    go = cancel_case / "holder.go"
    cancel = cancel_case / "waiter.cancel"
    holder = spawn_lock_worker(cancel_case, "holder", target, holder_candidate, baseline, ready=ready, go=go)
    if not wait_for(ready):
        raise RuntimeError("holder did not acquire")
    waiter = spawn_lock_worker(cancel_case, "waiter", target, waiter_candidate, baseline, cancel=cancel, timeout=5)
    time.sleep(0.15)
    cancel.write_text("cancel", encoding="ascii")
    waiter.wait(timeout=10)
    waiter_result = read_json(cancel_case / "outcome-waiter.json")
    go.write_text("go", encoding="ascii")
    holder.wait(timeout=10)
    holder_result = read_json(cancel_case / "outcome-holder.json")
    rec.add(group, "waiter-cancellation-is-non-mutating", waiter_result["outcome"] == "cancelled" and holder_result["outcome"] == "committed" and parse_document(target)["value"] == "holder" and waiter_candidate.exists(), "observed", {"holder": holder_result, "waiter": waiter_result, "cancelledCandidateRetained": waiter_candidate.exists()}, "Cancellation stops waiting without granting authority, deleting the candidate, or mutating the authoritative target.")

    external = rec.scratch / group / "external-edit"
    external.mkdir(parents=True)
    target = external / "document.rsrp"
    candidate = external / "candidate.rsrp"
    write_fsync(target, document(1, "old"))
    baseline = sha256(target)
    write_fsync(candidate, document(2, "local-edit"))
    write_fsync(target, document(2, "external-edit"))
    process = spawn_lock_worker(external, "local-owner", target, candidate, baseline)
    process.wait(timeout=10)
    result = read_json(external / "outcome-local-owner.json")
    rec.add(group, "external-edit-detected-inside-authority", result["outcome"] == "external-baseline-conflict" and parse_document(target)["value"] == "external-edit" and candidate.exists(), "observed", result, "Authority serializes cooperating writers but does not make the baseline current; the inside-authority check is always required.")

    cleanup = rec.scratch / group / "normal-cleanup-restart"
    cleanup.mkdir(parents=True)
    target = cleanup / "document.rsrp"
    candidate2 = cleanup / "candidate-2.rsrp"
    write_fsync(target, document(1, "old"))
    write_fsync(candidate2, document(2, "revision-2"))
    first = spawn_lock_worker(cleanup, "owner-1", target, candidate2, sha256(target))
    first.wait(timeout=10)
    first_result = read_json(cleanup / "outcome-owner-1.json")
    marker_removed = not (cleanup / "document.commit.owner.json").exists()
    candidate3 = cleanup / "candidate-3.rsrp"
    restarted_baseline = sha256(target)
    write_fsync(candidate3, document(3, "revision-3"))
    second = spawn_lock_worker(cleanup, "owner-2", target, candidate3, restarted_baseline)
    second.wait(timeout=10)
    second_result = read_json(cleanup / "outcome-owner-2.json")
    rec.add(group, "normal-cleanup-and-restart-from-durable-baseline", first_result["outcome"] == "committed" and second_result["outcome"] == "committed" and marker_removed and parse_document(target)["revision"] == 3, "observed", {"first": first_result, "second": second_result, "markerRemovedAfterFirst": marker_removed, "final": parse_document(target)}, "Normal release cleans matching diagnostic metadata; a restarted owner reconstructs baseline from the durable target rather than trusting prior process state.")

    rec.add(group, "smb-and-cross-machine-authority", True, "open", {"executed": False, "reason": "No authorized SMB/cross-machine environment was in scope."}, "Zero-share local behavior must not be promoted to SMB lease/locking semantics without an authorized target environment.")


def run_comparison(rec: Recorder) -> None:
    group = "comparison"
    rec.add(group, "single-app-routing-alone", True, "simulated", {"decision": "insufficient-alone", "failure": "another process, external editor, or bypass path can write outside the broker"}, "Use one application broker for command/lifecycle routing, but retain a filesystem commit authority and inside-authority baseline check.")
    rec.add(group, "per-document-owner-record-alone", True, "simulated", {"decision": "insufficient-alone", "failure": "memory/marker/PID ownership is advisory across crashes and processes"}, "Use stable owner session IDs and generations for routing/handoff; never treat metadata as an OS lease.")
    rec.add(group, "windows-zero-share-alone", True, "simulated", {"decision": "insufficient-alone", "failure": "does not coordinate domain commands or prove remote storage semantics"}, "Use the Windows handle as a bounded local commit critical section, not as the whole document lifecycle model.")
    rec.add(group, "hybrid-candidate", True, "simulated", {"decision": "carry forward", "layers": ["single application lifecycle/file broker", "per-document owner session and explicit handoff", "storage-specific commit authority", "baseline recheck inside authority"]}, "The layers address different scopes and form the ADR candidate; production selection remains gated by Electron and target-storage prototypes.")


def run() -> int:
    if os.name != "nt":
        raise SystemExit("Issue #31 empirical harness requires Windows")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    run_dir = ROOT / "runs" / timestamp
    recorder = Recorder(run_dir)
    environment = {
        "capturedUtc": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "windowsApiVersion": platform.version(),
        "architecture": platform.machine(),
        "python": platform.python_version(),
        "pid": os.getpid(),
        "workspaceVolume": filesystem_for(ROOT),
        "networkUsed": False,
        "dependenciesInstalled": False,
        "scope": "inert files on this workstation's local volume only",
    }
    run_single_application(recorder)
    run_per_document(recorder)
    run_windows_lock(recorder)
    run_comparison(recorder)
    summary = recorder.finish(environment)
    print(json.dumps({"runDirectory": str(run_dir), "passed": summary["passed"], "failed": summary["failed"], "total": summary["total"], "evidenceCounts": summary["evidenceCounts"]}, indent=2))
    return 0 if summary["failed"] == 0 else 1


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser()
    value.add_argument("--worker", choices=["lock-commit", "broker"])
    value.add_argument("--owner")
    value.add_argument("--target")
    value.add_argument("--candidate")
    value.add_argument("--expected")
    value.add_argument("--lock")
    value.add_argument("--marker")
    value.add_argument("--outcome")
    value.add_argument("--ready")
    value.add_argument("--go")
    value.add_argument("--cancel")
    value.add_argument("--timeout", type=float, default=5)
    value.add_argument("--hold-ms", type=int, default=0)
    value.add_argument("--crash-after-acquire", action="store_true")
    value.add_argument("--handoff")
    value.add_argument("--handoff-to")
    value.add_argument("--required-handoff")
    value.add_argument("--nonce")
    value.add_argument("--requests")
    value.add_argument("--outcomes")
    value.add_argument("--broker-outcome")
    return value


if __name__ == "__main__":
    args = parser().parse_args()
    if args.worker == "lock-commit":
        worker_lock_commit(args)
    elif args.worker == "broker":
        worker_broker(args)
    else:
        raise SystemExit(run())
