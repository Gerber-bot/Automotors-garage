# Guide: Windows USB Serial Setup for Automotors Diagnostics

## 1. Supported Hardware & USB Adapters

Automotors Diagnostics interfaces with standard ELM327-compatible and STN-based OBD-II scan tools equipped with USB serial interfaces.

### Recommended Adapters & Chipsets
| Adapter Model | Chipset | Recommended Baud Rate | Stability |
| :--- | :--- | :--- | :--- |
| **OBDLink SX USB** | STN1110 / FTDI | 115,200 baud | High (Recommended) |
| **ELM327 USB (Genuine FTDI)** | FTDI FT232RL | 38,400 baud | High |
| **ELM327 USB (CH340 Clone)** | WCH CH340G / CH340T | 38,400 baud | Medium (Check drivers) |
| **ELM327 USB (CP2102)** | Silicon Labs CP210x | 38,400 baud | High |

> [!CAUTION]
> Avoid low-grade counterfeit ELM327 v2.1 chips with fake PIC microcontrollers. They frequently drop CAN frames on 500k bus speeds and fail to respond to standard AT initialization sequences (`ATSP0` / `ATSP6`).

---

## 2. Windows Driver Installation & Verification

### 2.1 Driver Links by Chipset
1. **FTDI FT232R**: Windows Update installs drivers automatically. If required, download the VCP (Virtual COM Port) driver from [ftdichip.com](https://ftdichip.com/drivers/vcp-drivers/).
2. **WCH CH340**: Download the official Windows CH341SER driver from [wch-ic.com](https://www.wch-ic.com/downloads/CH341SER_EXE.html).
3. **Silicon Labs CP210x**: Download the Universal Windows Driver from [silabs.com](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).

### 2.2 Verifying COM Port in Windows Device Manager
1. Connect the USB OBD-II adapter to an available USB 2.0 / 3.0 port on the Windows workstation.
2. Press `Win + X` and select **Device Manager** (`devmgmt.msc`).
3. Expand the **Ports (COM & LPT)** section.
4. Verify an entry such as:
   - `USB Serial Port (COM3)`
   - `USB-SERIAL CH340 (COM4)`
   - `Silicon Labs CP210x USB to UART Bridge (COM5)`
5. Right-click the port -> **Properties** -> **Port Settings**:
   - Bits per second: `38400` (or `115200` for OBDLink SX)
   - Data bits: `8`
   - Parity: `None`
   - Stop bits: `1`
   - Flow control: `None`
   - Under **Advanced**, ensure **Latency Timer (msec)** is set to `1` or `2` for lowest jitter.

---

## 3. Vehicle Physical Connection Procedure

### 3.1 J1962 16-Pin Connector Pinout
The vehicle's OBD-II diagnostic socket conforms to SAE J1962:
- **Pin 4**: Chassis Ground
- **Pin 5**: Signal Ground
- **Pin 6**: CAN High (ISO 15765-4, 500 kbps)
- **Pin 14**: CAN Low (ISO 15765-4, 500 kbps)
- **Pin 16**: Permanent +12V Battery Power

### 3.2 Reference Vehicle Location (Renault Logan 1.6 2020)
In the Renault Logan II (Phase 2), the 16-pin OBD-II port is located **inside the glove compartment** on the upper left-hand side, protected by a removable plastic snap cover.

### 3.3 Physical Bench & Workshop Safety Checklist
1. **Vehicle Immobilization**: Ensure the vehicle's handbrake is firmly engaged and transmission is in Neutral / Park.
2. **Battery Support**: For diagnostic sessions exceeding 15 minutes with the ignition ON, connect an external battery maintainer (13.6V) to prevent vehicle battery drain.
3. **Connection Sequence**:
   - Engine OFF, ignition switch in OFF position.
   - Plug 16-pin OBD-II male adapter into vehicle socket.
   - Verify power LED illuminates.
   - Plug USB cable into Windows PC.
   - Turn ignition switch to **ON / Contact** position (do not start engine initially).
   - Launch Automotors Garage UI (`http://localhost:3000/`) and select **Diagnóstico OBD-II**.
   - Choose **USB Serial Windows (COM)** and click **Conectar**.

---

## 4. Simulator vs Physical Hardware Bench Testing

Automotors Garage provides both a high-fidelity software simulator and a physical hardware driver:

| Dimension | Simulator Mode (`ObdSimulatorTransport`) | Physical Mode (`WindowsUsbObdTransport`) |
| :--- | :--- | :--- |
| **Execution Environment** | Entirely in-process, zero hardware required | Requires physical ELM327 USB cable & vehicle/ECU bench |
| **Noise & Artifacts** | Synthetic mathematical oscillation | Real-world electrical noise, ground bounce, dropped packets |
| **DTC Findings** | Configured/injected fault codes | Actual stored/pending codes from vehicle EEPROM |
| **Safety Invariant** | Guaranteed 100% safe | Read-only guard actively prevents ECU clearing/writing |
| **Verification Tag** | Recorded with `isVerified: false`, `origin: SIMULATED` | Recorded with `isVerified: true`, `origin: USB_SERIAL_ELM327` |

---

## 5. Troubleshooting Common Connection Issues

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| `NO DATA` | Ignition key is in OFF position or ECU is asleep | Turn ignition key to ON position. Start engine if testing live RPM. |
| `UNABLE TO CONNECT` | Incorrect baud rate or unsupported protocol | Verify port baud rate (38,400 baud for standard ELM327). |
| `BUS BUSY` | Excessive bus traffic or noisy ground | Check physical connector pins for corrosion or bent terminals. |
| Port not detected in UI | Missing Windows VCP driver | Verify Device Manager shows no yellow exclamation mark on the COM device. |
| Read-Only Violation Error | Attempting restricted commands | Automotors enforces a read-only whitelist. Clear DTC commands (`04`) are deliberately prohibited. |
| Battery Voltage Mismatch | High load / harness resistance | Remember that `ATRV` measures line voltage at Pin 16, which may drop 0.3V below battery terminal voltage under load. |
