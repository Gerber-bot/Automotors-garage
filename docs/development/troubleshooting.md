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
1. Run the safe stopping script to release the port:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1 -Port 4000
   ```
2. If another application occupies port 4000, specify an alternative port:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1 -Port 4001
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
- Only when the PID is definitively proven inactive (dead process from crash/power cut) is the stale lockfile safely removed.
- **No silent destructive recovery**: If persistent storage files are corrupted, the engine halts immediately and preserves all existing files untouched. No data directories are ever automatically wiped.
- Manual recovery steps (only after backing up existing data):
  ```powershell
  # 1. Ensure all node processes are stopped
  powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1 -Port 4000

  # 2. Back up existing data
  Copy-Item -Recurse .data/postgres_dev .data/postgres_dev_backup

  # 3. If an explicit clean state is desired for development:
  Remove-Item -Recurse -Force .data/postgres_dev

  # 4. If re-seeding the demo environment:
  powershell -ExecutionPolicy Bypass -File scripts/seed-demo.ps1 -Environment demo
  ```
  ```

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
powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
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
