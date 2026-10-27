# LAN Access & Mobile Device Testing Guide

This guide describes how to access and test **Automotors Garage** from mobile devices (smartphones, tablets, secondary laptops) connected to the same local area network (LAN / Wi-Fi).

---

## 1. Architecture & Network Binding

By default in standard local development, the Automotors Garage backend binds to loopback (`HOST=127.0.0.1`), ensuring the service is accessible only from the host workstation.

When running in **LAN mode**:
- The backend binds to `HOST=0.0.0.0` on port `4000`.
- The server listens for incoming HTTP traffic across all active IPv4 network interfaces on the machine.
- Production safeguard: binding to `0.0.0.0` is strictly rejected when `NODE_ENV=production` unless an explicit `ALLOW_PRODUCTION_LAN=true` flag is supplied.

---

## 2. Launching in LAN Mode

### One-Click Launcher (Windows Explorer)
Double-click **`INICIAR_MODO_MOVIL.bat`** in the repository root.

### PowerShell Script
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-mobile.ps1 -Port 4000
```

### Output Example
```text
=======================================================
 AUTOMOTORS GARAGE -- MOBILE DEVELOPMENT
=======================================================
  Servidor: ONLINE
  Puerto  : 4000
  Modo    : LAN (0.0.0.0)

  PC:
  http://localhost:4000/demo

  CELULAR:
  http://192.168.0.39:4000/demo
=======================================================
```

---

## 3. Windows Defender Firewall Configuration

Windows Defender Firewall filters inbound network connections according to the active network connection profile (**Private** vs **Public**).

### Recommended Safe Inbound Rule
To permit devices on your local Wi-Fi to reach port 4000 without opening the port to the public Internet, run the following command in an **Elevated (Administrator) PowerShell terminal**:

```powershell
New-NetFirewallRule -DisplayName "Automotors Garage LAN Dev" `
  -Direction Inbound `
  -LocalPort 4000 `
  -Protocol TCP `
  -Action Allow `
  -Profile Private `
  -RemoteAddress LocalSubnet
```

### Key Security Safeguards
- **Profile**: Restricts access exclusively to networks marked as **Private** (home/office). It does not apply to Public Wi-Fi hotspots.
- **RemoteAddress**: Restricts incoming packets strictly to **`LocalSubnet`** (e.g., `192.168.0.0/24`). Traffic from outside the local network is dropped.
- **No Port Forwarding**: Never configure router NAT or port forwarding to port 4000.
- **Removal**: To remove the rule after testing:
  ```powershell
  Remove-NetFirewallRule -DisplayName "Automotors Garage LAN Dev"
  ```

---

## 4. Mobile Compatibility & Zero-Localhost Verification

Mobile devices cannot resolve `localhost` to your computer (on a smartphone, `localhost` points to the phone itself). Automotors Garage ensures full mobile compatibility:

1. **Relative API Requests**: All browser `fetch()` calls in the frontend use origin-relative paths (`/api/v1/auth/login`, `/api/v1/vehicles`, `/api/v1/work-orders/quick-service`). The browser resolves them against `http://<LAN_IP>:4000/` automatically.
2. **CORS Headers**: In development/demo, the backend emits `Access-Control-Allow-Origin: *` and permits `Authorization`, `Content-Type`, `x-tenant-id`, and `x-request-id` headers.
3. **Authentication & Session Tokens**: Auth tokens are transferred via standard HTTP `Authorization: Bearer <jwt>` headers, avoiding third-party cookie restrictions on mobile browsers (Safari ITP / Chrome third-party cookie partitioning).
4. **Responsive Layout**: Dark mode SaaS interface with touch-friendly controls, mobile-first cards, and legible typography.

---

## 5. Local HTTPS Assessment for Hardware Features

Certain modern Web APIs are restricted by browser security policies to **Secure Contexts** (`window.isSecureContext === true`):

| Feature | API | Localhost Behavior | LAN IP (`http://192.168.x.x:4000`) |
| :--- | :--- | :--- | :--- |
| **Voice Notes & Audio Notes** | `navigator.mediaDevices.getUserMedia` | Allowed (Trustworthy) | **Blocked by default** on mobile browsers |
| **OBD2 Barcode/Camera Scanner** | `navigator.mediaDevices.getUserMedia` | Allowed (Trustworthy) | **Blocked by default** on mobile browsers |
| **PWA Service Workers** | `navigator.serviceWorker.register` | Allowed (Trustworthy) | **Blocked by default** on mobile browsers |
| **Quick Service Entry & CRUD** | Standard DOM & fetch API | Allowed | **Fully Functional** |
| **Vehicle Passport & Timeline** | Standard DOM & fetch API | Allowed | **Fully Functional** |

### How to Enable Secure Context on Mobile Devices

#### Option A: Chrome Android Flags (Zero Installation)
If testing on an Android device running Google Chrome:
1. Open Chrome on the phone and navigate to:
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enter your LAN IP and port:
   `http://192.168.0.39:4000`
3. Tap **Enabled** and tap **Relaunch**.
4. Chrome now treats your PC's LAN IP as a Secure Context, unlocking microphone and camera features without certificates!

#### Option B: Trusted Local TLS with `mkcert` (iOS & Android)
For full end-to-end HTTPS with valid mobile certificates:
1. Install `mkcert` on the development workstation:
   ```powershell
   choco install mkcert
   mkcert -install
   ```
2. Generate certificates for both localhost and your LAN IP:
   ```powershell
   mkcert -key-file certs/dev.key -cert-file certs/dev.crt localhost 127.0.0.1 192.168.0.39
   ```
3. Export root CA certificate (`mkcert -CAROOT`) and install it onto your phone:
   - **Android**: Settings > Security > Encryption & credentials > Install a certificate > CA certificate.
   - **iOS**: Send `rootCA.pem` via AirDrop/iCloud > Install Profile > Settings > General > About > Certificate Trust Settings > Enable Full Trust.

---

## 6. Testing Checklist

- [x] PC loopback access (`http://localhost:4000/demo`) responds 200 OK.
- [x] LAN IP access (`http://192.168.0.39:4000/demo`) responds 200 OK.
- [x] Liveness probe (`/health/live`) responds 200 OK over LAN.
- [x] Readiness probe (`/health/ready`) verifies database health over LAN.
- [x] User authentication (`/api/v1/auth/login`) issues valid JWT to LAN origin.
- [x] Protected endpoints (`/api/v1/vehicles`) accept Bearer token over LAN.
- [x] Multi-tenant isolation verified over LAN (Cross-tenant requests blocked with 403).
