# Automotors Garage — Design System Specification

## 1. Visual Identity & Design Philosophy

Automotors Garage delivers a high-trust, commercial-grade SaaS experience designed specifically for automotive workshop operations, fleet intelligence, and certified vehicle history. The visual identity avoids juvenile aesthetics, generic template clutter, and developer-oriented debugging dumps.

### Core Principles

1. **Automotive Technology Focus**: Precision, clarity, and industrial efficiency. High-density data presented with calm hierarchy.
2. **Dark Mode Canvas**: Rooted in `#020617` (slate-950) to minimize eye fatigue in workshop bay lighting conditions and maximize contrast for operational alerts.
3. **Emerald Brand Accent**: `#10b981` (emerald-500) represents vehicle health, verified maintenance, and certified cryptographic history.
4. **Zero Raw Emojis**: Iconography is strictly rendered using Lucide React SVG icons with consistent stroke weights (1.5–2.5).
5. **Human-in-the-Loop Clarity**: Mandatory human confirmation boundaries are visually highlighted with distinctive badge indicators and clear modal dialogs.

---

## 2. Design Tokens

The central token repository is located at [`apps/frontend/src/design-system/tokens.ts`](../../apps/frontend/src/design-system/tokens.ts) and synchronized with Tailwind CSS configuration.

### 2.1 Color Palette

| Token Group | Value / Hex | Usage |
| :--- | :--- | :--- |
| `surface.background` | `#020617` | Root app background (slate-950) |
| `surface.card` | `#0b132b` | Primary card surface |
| `surface.cardElevated` | `#111c3d` | Elevated modal dialogs and slide-over sheets |
| `surface.border` | `rgba(255, 255, 255, 0.08)` | Subtle border dividers |
| `surface.borderHighlight` | `rgba(16, 185, 129, 0.3)` | Emerald highlight border for active states |
| `brand[500]` | `#10b981` | Primary emerald action color |
| `brand[600]` | `#059669` | Interactive hover & active state |
| `text.primary` | `#f8fafc` | High-contrast body text and headings (slate-50) |
| `text.secondary` | `#cbd5e1` | Secondary text (slate-300) |
| `text.muted` | `#94a3b8` | Metadata, timestamps, and input labels (slate-400) |

### 2.2 Semantic Status System

Every operational status has an unambiguous, four-part token definition (`bg`, `border`, `text`, `dot`):

- **Success (`#10b981`)**: Closed orders, completed maintenance, certified passport timelines.
- **Warning (`#f59e0b`)**: Upcoming OEM maintenance alerts, pending parts, inspection due.
- **Danger (`#f43f5e`)**: Critical overdue maintenance, DTC OBD-2 faults, validation failures.
- **Info (`#0ea5e9`)**: In-progress AI transcription, non-critical diagnostic logs.
- **InProgress (`#6366f1`)**: Active bay work orders, diagnostic scanning in progress.

### 2.3 Typography & Hierarchy

- **Primary Sans**: `Inter`, `-apple-system`, `sans-serif`. Used for UI chrome, headings, metrics, and data tables.
- **Monospace**: `JetBrains Mono`, `monospace`. Strictly used for vehicle VINs, license plates, DTC codes, odometer readings, and monetary figures.
- **Scales**:
  - `xs`: 12px (labels, timestamps, badges)
  - `sm`: 14px (table cells, descriptions)
  - `base`: 16px (body text, inputs — prevents iOS Safari auto-zoom)
  - `lg`: 18px (subheadings, card titles)
  - `xl`: 20px (page titles, dialog headers)
  - `2xl`: 24px (KPI primary metrics)

---

## 3. Elevation & Surfaces

Surfaces follow strict z-index layering to avoid visual clutter and coordinate stacking:

- **Canvas**: Flat background (`#020617`).
- **Cards**: Flat dark surface with 1px border (`rgba(255, 255, 255, 0.08)`).
- **Elevated Modals**: Backdrop blur (`backdrop-blur-sm`), z-index `50`, dark navy background (`#0f172a`), deep shadow (`0 20px 25px -5px rgba(0, 0, 0, 0.5)`).
- **Mobile Bottom Navigation**: Fixed bottom, z-index `40`, `bg-slate-900/95`, backdrop blur.
