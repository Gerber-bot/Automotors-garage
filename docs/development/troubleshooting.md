# Local Environment Troubleshooting Guide

This document lists common troubleshooting scenarios encountered during local development on Windows, along with root causes and recommended resolutions.

---

## 1. Port Conflict (`EADDRINUSE`)

### Symptom
When starting the development or demo server, you encounter:
```text
[FAIL] El puerto 4000 ya esta ocupado por otro proceso: node.
```
Or in backend logs:
```text
Error: listen EADDRINUSE: address already in use 0.0.0.0:4000
```

### Root Cause
An earlier instance of Node.js or another service is already listening on port 4000.

### Resolution
1. Confirm which installation owns the port. If this installation has a verified process record, use its stopping script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action STOP
   ```
   Or via npm:
   ```bash
   npm run dev:stop
   ```
2. If another application owns the port, do not stop it with this installation's script. Coordinate with its owner or choose a free port for this installation:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action START -BackendPort 4001
   ```

---

## 2. PGlite Lock File or Abrupt Termination (`postmaster.pid` / `Aborted()`)

### Symptom
After an unexpected computer shutdown, power loss, or forcefully killing Node.js via Task Manager, the backend fails to start with:
```text
RuntimeError: Aborted(). Build with -sASSERTIONS for more info.
```

### Root Cause
Embedded PostgreSQL (PGlite) uses a `postmaster.pid` lock file and requires write-ahead logs to close cleanly. If power is interrupted mid-write, PostgreSQL treats the data directory as locked or inconsistent.

### Resolution
The repository follows a strict **fail-safe data protection policy**:
- `DatabaseFactory` checks for `postmaster.pid` and actively verifies whether the recorded PID is currently running in the operating system. If an active process holds the lock, execution halts immediately with `[CRITICAL_DATA_PROTECTION]` to avoid concurrent write corruption.
- Do not assume a stale-looking PID proves that a directory is unused; inspect the process and retain the data for recovery.
- **No silent destructive recovery**: If persistent storage files are corrupted, the engine halts immediately and preserves all existing files untouched. No data directories are ever automatically wiped.
- Manual recovery: stop only processes verified as belonging to this installation, preserve `.data/postgres_dev`, and take an external backup before investigating a lock or corruption. Do not delete the data directory or run the demo seeder as a recovery shortcut.

### Exclusive claim (`.automotors.lock`)

Each PGlite directory is claimed atomically before the engine opens it, so two independent processes cannot initialize the same files simultaneously. The claim is removed only after a clean `close()`.

If startup reports `[CRITICAL_DATA_PROTECTION] PGlite directory is already claimed or requires manual review`, the previous process either is still running or ended without closing cleanly. Confirm with the process identity recorded in the file (`pid`) and this installation's process records; if that PID no longer exists and no other process uses the directory, back up the directory, remove only `.automotors.lock`, and retry. Never remove the claim while a process may still be running, and never delete the data directory to bypass it.

---

## 3. PowerShell Execution Policy Restriction

### Symptom
Attempting to run a script results in:
```text
File ... cannot be loaded because running scripts is disabled on this system.
```

### Root Cause
Windows PowerShell default execution policy is set to `Restricted`.

### Resolution
Always include `-ExecutionPolicy Bypass` when invoking scripts:
```powershell
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action START
```
Or set execution policy for the current user once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 4. Log Inspection

When diagnosing runtime issues, inspect the separated stdout and stderr log files in `.logs/`:

| Log File | Contents | Command to Inspect |
| :--- | :--- | :--- |
| `.logs/server_dev.log` | Development server standard output & access logs | `Get-Content .logs/server_dev.log -Tail 30` |
| `.logs/server_dev.err.log` | Development server errors and warnings | `Get-Content .logs/server_dev.err.log -Tail 30` |
| `.logs/server_demo.log` | Demo server standard output & access logs | `Get-Content .logs/server_demo.log -Tail 30` |
| `.logs/server_demo.err.log` | Demo server errors and warnings | `Get-Content .logs/server_demo.err.log -Tail 30` |

To stream logs in real time:
```powershell
Get-Content .logs/server_dev.log -Wait
```

---

## 5. TypeScript Type Checking Failures

To verify monorepo type safety across all packages without executing tests:
```bash
npm run typecheck
```
Or:
```powershell
npx tsc --noEmit
```
All packages are configured under strict TypeScript with zero `any` tolerance.
